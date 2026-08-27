import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { compile_project, update_components } from './compile/project.js';
import { create_project } from './new/copy.js';
import { inject_html } from './dev/html.js';
import { create_server, pick_port } from './dev/server.js';
import { watch_src, classify_watch, changed_used_ids } from './dev/watch.js';
import { overlay_html } from './dev/overlay.js';
import { mime } from './dev/mime.js';
import { load_project_config } from './config/load.js';
import { normalize_base } from './utils/base.js';
import { add_packages } from './add/install.js';
import { minify_module } from './compile/vendor.js';
import { write_build } from './build/write.js';
import { render_ssg } from './compile/ssg.js';
import { run_rebuild } from './build/rebuild.js';
import { create_notify_server } from './build/notify.js';
import { build_manifest, stringify_manifest, alumna_version } from './build/manifest.js';
import { match_source, runtime_source } from './pack/assets.js';
import { ensure_rolldown } from './compile/rolldown-load.js';
import { call_route_data, ssg_data_module } from './compile/data.js';
import { match_path } from './compile/match.js';

function runtime_js () {
	return runtime_source();
}

function match_js () {
	return match_source();
}

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
			sourcemap: config.sourcemap,
			ssg: config.ssg
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
			ssg: this.cli.ssg || file.ssg
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

	async setup () {
		const dir = await ensure_rolldown();
		console.log('Rolldown is ready.');
		return dir;
	}

	async route_data (path) {
		const compiled = this.last_compiled;
		if (!compiled || !compiled.routes)
			return undefined;
		const hit = match_path(path, compiled.routes);
		if (!hit)
			return undefined;
		return call_route_data(hit.route, {
			path,
			pattern: hit.pattern,
			params: hit.params
		});
	}

	async compile ({ dev, ssg } = {}) {
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
			sourcemap: this.config.sourcemap,
			ssg: ssg ?? this.config.ssg
		});
	}

	html (compiled, extra = {}) {
		const c = compiled || this.last_compiled;
		return inject_html(readFileSync(join(this.src_dir(), 'index.html'), 'utf8'), {
			import_map: extra.import_map || (c && c.import_map),
			base: this.config.base,
			css_hrefs: extra.css_hrefs || (c && c.css_hrefs) || [],
			title: this.config.title,
			preload_hrefs: extra.preload_hrefs,
			body: extra.body,
			head: extra.head,
			ssg: extra.ssg,
			runtime: extra.runtime
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
		memory.set('/_alumna/match.js', { body: match_js(), type: mime('.js') });
		const runtime = apply_base_to_runtime(runtime_js(), this.config.base);
		memory.set('/_alumna/runtime.js', {
			body: runtime,
			type: mime('.js')
		});
		memory.set('/index.html', { body: this.html(compiled, { runtime }), type: mime('.html') });
		return memory;
	}

	// Re-read src/index.html into the memory shell, then the browser can reload.
	refresh_shell (memory) {
		const html_file = join(this.src_dir(), 'index.html');
		if (!existsSync(html_file))
			return;
		const runtime = memory.get('/_alumna/runtime.js');
		memory.set('/index.html', {
			body: this.html(this.last_compiled, { runtime: runtime && runtime.body }),
			type: mime('.html')
		});
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
			base: this.config.base,
			on_data: p => this.route_data(p)
		});

		this.stop_watch = watch_src(this.src_dir(), async files => {
			const action = classify_watch(files, this.last_compiled, this.src_dir());
			if (action === 'ignore')
				return;
			if (action === 'reload') {
				this.refresh_shell(memory);
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
		const want_ssg = this.config.ssg;
		const compiled = await this.compile({ dev: false, ssg: want_ssg });
		if (!compiled.ok) {
			this.print_errors(compiled.errors);
			return false;
		}
		this.print_warnings(compiled.warnings);

		const runtime = apply_base_to_runtime(
			(await minify_module(runtime_js(), 'runtime.js')).code,
			this.config.base
		);
		const match = (await minify_module(match_js(), 'match.js')).code;
		const spa_html = this.html(compiled, { runtime });
		let html = spa_html;
		let pages;
		let prerender = [];
		let lookup = {};

		if (want_ssg) {
			const ssg = await render_ssg({
				compiled,
				src_html: readFileSync(join(this.src_dir(), 'index.html'), 'utf8'),
				title: this.config.title,
				base: this.config.base,
				project_root: this.config.cwd,
				runtime
			});
			if (!ssg.ok) {
				this.print_errors(ssg.errors);
				return false;
			}
			this.print_warnings(ssg.warnings);
			pages = Object.assign({ '_alumna/spa.html': spa_html }, ssg.pages);
			if (pages['index.html']) {
				html = pages['index.html'];
				delete pages['index.html'];
			}
			prerender = ssg.prerender;
			lookup = ssg.lookup;
			compiled.files['_alumna/ssg-data.js'] = ssg_data_module(ssg.data_map);
		}

		write_build({
			out: join(this.config.cwd, this.config.build_dir),
			html,
			pages,
			files: compiled.files,
			runtime,
			match,
			manifest: stringify_manifest(build_manifest({
				version: alumna_version(),
				base: this.config.base,
				ssg: !!want_ssg,
				prerender,
				lookup,
				areas: compiled.config.areas,
				routes: compiled.config.routes,
				deps: compiled.config.deps
			})),
			static_dir: join(this.src_dir(), 'static')
		});

		if (want_ssg)
			console.log('Build completed successfully at the directory "' + this.config.build_dir + '". SSG wrote ' + prerender.length + ' page(s).');
		else
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

	rebuild_ctx () {
		this.merge_config();
		const html_file = join(this.src_dir(), 'index.html');
		return {
			out: join(this.config.cwd, this.config.build_dir),
			compile: () => this.compile({ dev: false, ssg: true }),
			src_html: existsSync(html_file) ? readFileSync(html_file, 'utf8') : '',
			title: this.config.title,
			base: this.config.base,
			project_root: this.config.cwd
		};
	}

	async rebuild (opts = {}) {
		const result = await run_rebuild(this.rebuild_ctx(), opts);
		this.print_warnings(result.warnings);
		if (!result.ok) {
			this.print_errors(result.errors);
			return false;
		}
		console.log('Rebuilt ' + result.paths.length + ' page(s).');
		return true;
	}

	async listen_rebuild () {
		this.merge_config();
		const out = join(this.config.cwd, this.config.build_dir);
		if (!existsSync(join(out, 'alumna-manifest.json'))) {
			console.error('Missing build/. Run alumna build --ssg first.');
			return false;
		}

		const port = await pick_port(this.config.port || 4050, { required: this.port_required() });
		this.httpd = create_notify_server({
			port,
			on_notify: payload => run_rebuild(this.rebuild_ctx(), payload)
		});
		await this.httpd.listen();
		const bound = this.httpd.server.address().port;
		console.log('Rebuild listener on http://127.0.0.1:' + bound + '/notify');
		return true;
	}
}

