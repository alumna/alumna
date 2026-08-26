import { readFileSync, existsSync, mkdirSync, writeFileSync, cpSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { compile_project } from './compile/project.js';
import { create_project } from './new/copy.js';
import { ensure_svelte_vendor } from './dev/vendor-svelte.js';
import { inject_html } from './dev/html.js';
import { create_server, pick_port } from './dev/server.js';
import { watch_src, classify_watch } from './dev/watch.js';
import { overlay_html } from './dev/overlay.js';
import { mime } from './dev/mime.js';
import { alumna_root } from './utils/paths.js';

const RUNTIME_JS = readFileSync(join(alumna_root, 'src/runtime/browser.js'), 'utf8');
const MATCH_JS = readFileSync(join(alumna_root, 'src/compile/match.js'), 'utf8');

export class Alumna {
	constructor (config = {}) {
		this.config = {
			cwd: config.cwd || process.cwd(),
			src: config.src || 'src',
			build_dir: config.build_dir || 'build',
			port: config.port,
			...config
		};
		this.httpd = null;
		this.stop_watch = null;
		this.last_compiled = null;
	}

	src_dir () {
		return join(this.config.cwd, this.config.src);
	}

	async new (target) {
		const dest = create_project(target);
		if (target === '.')
			console.log('Done! Now start developing with "alumna dev".');
		else
			console.log('Done! Now enter your directory with "cd ' + target + '" and start developing with "alumna dev".');
		return dest;
	}

	compile ({ dev }) {
		const src_dir = this.src_dir();
		if (!existsSync(src_dir))
			return { ok: false, errors: { src: 'Missing src/ directory. Is this an Alumna project?' } };
		if (!existsSync(join(src_dir, 'index.html')))
			return { ok: false, errors: { 'index.html': 'Missing src/index.html' } };
		return compile_project({ src_dir, dev });
	}

	html () {
		return inject_html(readFileSync(join(this.src_dir(), 'index.html'), 'utf8'));
	}

	print_errors (errors) {
		let found = false;
		for (const key of Object.keys(errors)) {
			found = true;
			console.error(key + ': ' + errors[key]);
		}
		return found;
	}

	print_warnings (warnings) {
		for (const warning of warnings)
			console.warn('Warning: ' + warning);
	}

	memory_from (compiled) {
		const memory = new Map();
		for (const [ path, body ] of Object.entries(compiled.files)) {
			const url = path.charCodeAt(0) === 47 ? path : '/' + path;
			memory.set(url, { body, type: mime(path) });
		}
		memory.set('/_alumna/match.js', { body: MATCH_JS, type: mime('.js') });
		memory.set('/_alumna/runtime.js', { body: RUNTIME_JS, type: mime('.js') });
		memory.set('/index.html', { body: this.html(), type: mime('.html') });
		return memory;
	}

	async close () {
		if (this.stop_watch) {
			this.stop_watch();
			this.stop_watch = null;
		}
		if (this.httpd) {
			await this.httpd.close();
			this.httpd = null;
		}
	}

	async dev () {
		const vendor_dir = ensure_svelte_vendor();
		const compiled = this.compile({ dev: true });
		if (!compiled.ok) {
			this.print_errors(compiled.errors);
			return false;
		}
		this.print_warnings(compiled.warnings);
		this.last_compiled = compiled;

		const memory = this.memory_from(compiled);
		const port = await pick_port(this.config.port, { required: !!this.config.port });
		this.httpd = create_server({
			src_dir: this.src_dir(),
			port,
			memory,
			vendor_dir
		});

		this.stop_watch = watch_src(this.src_dir(), files => {
			const action = classify_watch(files, this.last_compiled, this.src_dir());
			if (action === 'ignore')
				return;
			if (action === 'reload') {
				this.httpd.reload();
				return;
			}

			const next = this.compile({ dev: true });
			if (!next.ok) {
				this.print_errors(next.errors);
				memory.set('/index.html', {
					body: overlay_html(next.errors),
					type: 'text/html; charset=utf-8'
				});
				this.httpd.reload();
				return;
			}

			this.last_compiled = next;
			this.print_warnings(next.warnings);
			memory.clear();
			for (const [ url, entry ] of this.memory_from(next))
				memory.set(url, entry);
			this.httpd.reload();
		});

		await this.httpd.listen();
		console.log('Listening on http://localhost:' + port);
		return true;
	}

	async build () {
		const vendor_dir = ensure_svelte_vendor();
		const compiled = this.compile({ dev: false });
		if (!compiled.ok) {
			this.print_errors(compiled.errors);
			return false;
		}
		this.print_warnings(compiled.warnings);

		const out = join(this.config.cwd, this.config.build_dir);
		mkdirSync(out, { recursive: true });

		const static_dir = join(this.src_dir(), 'static');
		if (existsSync(static_dir))
			cpSync(static_dir, out, { recursive: true });

		writeFileSync(join(out, 'index.html'), this.html());

		for (const [ path, body ] of Object.entries(compiled.files)) {
			const file = join(out, path);
			mkdirSync(dirname(file), { recursive: true });
			writeFileSync(file, body);
		}

		mkdirSync(join(out, '_alumna'), { recursive: true });
		writeFileSync(join(out, '_alumna', 'match.js'), MATCH_JS);
		writeFileSync(join(out, '_alumna', 'runtime.js'), RUNTIME_JS);
		cpSync(vendor_dir, join(out, '_alumna', 'svelte'), { recursive: true });

		writeFileSync(join(out, 'alumna-manifest.json'), JSON.stringify({
			version: '4.0.0-alpha.1',
			areas: compiled.config.areas,
			routes: compiled.config.routes,
			deps: compiled.config.deps
		}, null, '\t') + '\n');

		console.log('Build completed successfully at the directory "build".');
		return true;
	}

	async preview () {
		const out = join(this.config.cwd, this.config.build_dir);
		if (!existsSync(join(out, 'index.html'))) {
			console.error('Missing build/. Run alumna build first.');
			return false;
		}

		const port = await pick_port(this.config.port || 4040, { required: !!this.config.port });
		this.httpd = create_server({
			disk_root: out,
			port,
			memory: new Map(),
			vendor_dir: join(out, '_alumna', 'svelte')
		});

		await this.httpd.listen();
		console.log('Preview on http://localhost:' + port);
		return true;
	}
}
