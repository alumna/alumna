import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { compile_project, update_components } from './compile/project.js';
import { create_project } from './new/copy.js';
import { inject_html } from './dev/html.js';
import { create_server, pick_port } from './dev/server.js';
import { watch_src, classify_watch, changed_used_ids } from './dev/watch.js';
import { overlay_html } from './dev/overlay.js';
import { mime } from './dev/mime.js';
import { alumna_root } from './utils/paths.js';
import { load_project_config } from './config/load.js';
import { normalize_base } from './utils/base.js';
import { add_packages } from './add/install.js';
import { minify_module } from './compile/vendor.js';
import { write_build } from './build/write.js';

const RUNTIME_JS = readFileSync(join(alumna_root, 'src/runtime/browser.js'), 'utf8');
const MATCH_JS = readFileSync(join(alumna_root, 'src/compile/match.js'), 'utf8');

function apply_base_to_runtime (code, base) {
	const prefix = normalize_base(base);
	if (!prefix)
		return code;
	return code.replaceAll("from '/_alumna/", "from '" + prefix + "/_alumna/");
}

export class Alumna {
	constructor (config) {
		config = config || {};
		this.cli = {
			cwd: config.cwd || process.cwd(),
			src: config.src,
			build_dir: config.build_dir,
			port: config.port,
			base: config.base,
			sourcemap: config.sourcemap
		};
		this.httpd = null;
		this.stop_watch = null;
		this.last_compiled = null;
		this.config = this.merge_config();
	}

	merge_config () {
		const file = load_project_config(this.cli.cwd);
		this.config = {
			cwd: this.cli.cwd,
			src: this.cli.src || 'src',
			build_dir: this.cli.build_dir || file.build_dir,
			port: this.cli.port ?? file.port,
			base: normalize_base(this.cli.base ?? file.base),
			sourcemap: this.cli.sourcemap ?? file.sourcemap,
			title: file.title || '',
			ssg: file.ssg
		};
		return this.config;
	}

	src_dir () {
		return join(this.config.cwd, this.config.src);
	}

	port_required () {
		return this.cli.port != null && Number.isFinite(this.cli.port);
	}

	async new (target) {
		const dest = create_project(target);
		if (target === '.')
			console.log('Done! Now start developing with "alumna dev".');
		else
			console.log('Done! Now enter your directory with "cd ' + target + '" and start developing with "alumna dev".');
		return dest;
	}

	async add (names) {
		const result = add_packages(this.config.cwd, names);
		console.log('Added ' + result.names.join(', ') + '. Import it in a component.');
		return result;
	}

	async compile ({ dev }) {
		this.merge_config();
		const src_dir = this.src_dir();
		if (!existsSync(src_dir))
			return { ok: false, errors: { src: 'Missing src/ directory. Is this an Alumna project?' } };
		if (!existsSync(join(src_dir, 'index.html')))
			return { ok: false, errors: { 'index.html': 'Missing src/index.html' } };
		return compile_project({
			src_dir,
			dev,
			project_root: this.config.cwd,
			base: this.config.base,
			sourcemap: this.config.sourcemap
		});
	}

	html (compiled) {
		const c = compiled || this.last_compiled;
		return inject_html(readFileSync(join(this.src_dir(), 'index.html'), 'utf8'), {
			import_map: c && c.import_map,
			base: this.config.base,
			css_hrefs: (c && c.css_hrefs) || [],
			title: this.config.title
		});
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
		memory.set('/_alumna/runtime.js', {
			body: apply_base_to_runtime(RUNTIME_JS, this.config.base),
			type: mime('.js')
		});
		memory.set('/index.html', { body: this.html(compiled), type: mime('.html') });
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
		const compiled = await this.compile({ dev: true });
		if (!compiled.ok) {
			this.print_errors(compiled.errors);
			return false;
		}
		this.print_warnings(compiled.warnings);
		this.last_compiled = compiled;

		const memory = this.memory_from(compiled);
		const port = await pick_port(this.config.port, { required: this.port_required() });
		this.httpd = create_server({
			src_dir: this.src_dir(),
			port,
			memory,
			base: this.config.base
		});

		this.stop_watch = watch_src(this.src_dir(), async files => {
			const action = classify_watch(files, this.last_compiled, this.src_dir());
			if (action === 'ignore')
				return;
			if (action === 'reload') {
				this.httpd.reload();
				return;
			}

			const next = action === 'update'
				? await update_components(this.last_compiled, {
					src_dir: this.src_dir(),
					ids: changed_used_ids(files, this.last_compiled),
					dev: true,
					project_root: this.config.cwd,
					base: this.config.base,
					sourcemap: this.config.sourcemap
				})
				: await this.compile({ dev: true });
			if (!next.ok) {
				this.print_errors(next.errors);
				memory.set('/index.html', {
					body: overlay_html(next.errors, this.config.base),
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
		console.log('Listening on http://localhost:' + port + (this.config.base || ''));
		return true;
	}

	async build () {
		const compiled = await this.compile({ dev: false });
		if (!compiled.ok) {
			this.print_errors(compiled.errors);
			return false;
		}
		this.print_warnings(compiled.warnings);

		const runtime = apply_base_to_runtime(
			(await minify_module(RUNTIME_JS, 'runtime.js')).code,
			this.config.base
		);
		const match = (await minify_module(MATCH_JS, 'match.js')).code;

		write_build({
			out: join(this.config.cwd, this.config.build_dir),
			html: this.html(compiled),
			files: compiled.files,
			runtime,
			match,
			manifest: JSON.stringify({
				version: '4.0.0-alpha.2',
				base: this.config.base,
				areas: compiled.config.areas,
				routes: compiled.config.routes,
				deps: compiled.config.deps
			}, null, '\t') + '\n',
			static_dir: join(this.src_dir(), 'static')
		});

		console.log('Build completed successfully at the directory "' + this.config.build_dir + '".');
		return true;
	}

	async preview () {
		const out = join(this.config.cwd, this.config.build_dir);
		if (!existsSync(join(out, 'index.html'))) {
			console.error('Missing build/. Run alumna build first.');
			return false;
		}

		this.merge_config();
		const port = await pick_port(this.config.port || 4040, { required: this.port_required() });
		this.httpd = create_server({
			disk_root: out,
			port,
			memory: new Map(),
			base: this.config.base
		});

		await this.httpd.listen();
		console.log('Preview on http://localhost:' + port + (this.config.base || ''));
		return true;
	}
}

