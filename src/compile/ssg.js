import { mkdirSync, writeFileSync, rmSync, mkdtempSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { tmpdir } from 'node:os';
import { render } from 'svelte/server';
import { compile_component, compile_shell, resolve_server_specifier } from './svelte.js';
import { generate_shell_source } from './shell.js';
import { css_hrefs_for } from './project.js';
import { with_base } from '../utils/base.js';
import { inject_html } from '../dev/html.js';
import { ssg_targets, resolve_rebuild_path, resolve_prerender_lists } from './ssg-targets.js';
import { call_route_data } from './data.js';

// Node stub so prerendered components can import { goto, route } from 'alumna'.
const ALUMNA_STUB = `export const route = { path: '', pattern: '', params: {}, query: {}, layout: null };
export function goto () { return Promise.resolve(); }
export function redirect () { return Promise.resolve(); }
export function prefetch () { return Promise.resolve(); }
export function start () { return Promise.resolve(); }
export function should_auto_start () { return false; }
export function boot_runtime () {}
`;

export function html_file_for (path) {
	if (path === '/')
		return 'index.html';
	const clean = path.endsWith('/') ? path.slice(0, -1) : path;
	return clean.slice(1) + '/index.html';
}

export function preload_hrefs_for (deps, path, base) {
	const hrefs = [ with_base(base, '/_alumna/app.js') ];
	const names = deps[path] || [];
	for (let i = 0; i < names.length; i++)
		hrefs.push(with_base(base, '/components/' + names[i] + '.js'));
	return hrefs;
}

function fail (errors, warnings) {
	return { ok: false, errors, warnings: warnings || [], pages: {}, prerender: [], lookup: {}, data_map: {} };
}

function write_js (file, code) {
	mkdirSync(dirname(file), { recursive: true });
	writeFileSync(file, code);
}

function component_js_file (dir, id) {
	return join(dir, 'components', ...id.split('/')) + '.js';
}

function server_resolve (id, project_root) {
	return spec => resolve_server_specifier(spec, id, { project_root });
}

function note_warnings (warnings, prefix, list) {
	for (let i = 0; i < list.length; i++)
		warnings.push(prefix + list[i].message);
}

function compile_server_graph (dir, compiled, project_root, warnings) {
	// Temp .js files are ESM. Node 22–24 treat a folder of .js as CJS unless this is set.
	writeFileSync(join(dir, 'package.json'), '{"type":"module"}\n');
	const components = compiled.graph.components;
	for (const id of Object.keys(components)) {
		const node = components[id];
		if (!node.source) {
			return fail({ [id + '.svelte']: 'Missing source for SSG: ' + id + '.svelte' }, warnings);
		}
		try {
			const out = compile_component(node.source, {
				filename: node.file,
				id,
				dev: false,
				css: 'external',
				sourcemap: false,
				generate: 'server',
				resolve: server_resolve(id, project_root)
			});
			write_js(component_js_file(dir, id), out.js);
			note_warnings(warnings, id + '.svelte: ', out.warnings);
		}
		catch (error) {
			return fail({ [id + '.svelte']: error.message }, warnings);
		}
	}

	try {
		const shell = compile_shell(generate_shell_source(compiled.config.areas, compiled.config.layouts), {
			filename: 'alumna/App.svelte',
			dev: false,
			css: 'external',
			sourcemap: false,
			generate: 'server',
			resolve: server_resolve('', project_root)
		});
		write_js(join(dir, 'App.js'), shell.js);
		note_warnings(warnings, 'App.svelte: ', shell.warnings);
	}
	catch (error) {
		return fail({ 'App.svelte': error.message }, warnings);
	}

	writeFileSync(join(dir, 'alumna.js'), ALUMNA_STUB);
	return null;
}

async function load_server (dir, cache, id) {
	if (cache.has(id))
		return cache.get(id);
	const href = pathToFileURL(component_js_file(dir, id)).href;
	const mod = await import(href);
	cache.set(id, mod.default);
	return mod.default;
}

async function props_for_route (dir, cache, route, areas, layouts) {
	let layout = null;
	if (route.layout && layouts && layouts[route.layout])
		layout = await load_server(dir, cache, layouts[route.layout].component);

	const map = {};
	for (let i = 0; i < areas.length; i++) {
		const area = areas[i];
		const name = route.areas[area];
		map[area] = name ? await load_server(dir, cache, name) : undefined;
	}
	return { layout, areas: map };
}

function read_render (result) {
	return { body: result.body, head: result.head };
}

function set_ssg_route (ssg_route, path, pattern, params, layout) {
	ssg_route.path = path;
	ssg_route.pattern = pattern;
	ssg_route.params = params;
	ssg_route.query = {};
	ssg_route.layout = layout;
}

function jobs_for (compiled, only_paths) {
	if (!only_paths)
		return { ok: true, jobs: ssg_targets(compiled.routes).pages };

	const jobs = [];
	for (let i = 0; i < only_paths.length; i++) {
		const path = only_paths[i];
		const resolved = resolve_rebuild_path(path, compiled.routes);
		if (resolved.error)
			return { ok: false, error_key: 'ssg ' + path, message: resolved.error };
		jobs.push(resolved);
	}
	return { ok: true, jobs };
}

async function pages_for_routes (dir, compiled, src_html, title, base, warnings, only_paths, runtime) {
	const App = (await import(pathToFileURL(join(dir, 'App.js')).href)).default;
	const { route: ssg_route } = await import(pathToFileURL(join(dir, 'alumna.js')).href);
	const cache = new Map();
	const pages = {};
	const selected = jobs_for(compiled, only_paths);
	if (!selected.ok)
		return fail({ [selected.error_key]: selected.message }, warnings);

	const jobs = selected.jobs;
	const prerender = [];
	const data_map = {};
	const areas = compiled.config.areas;
	const layouts = compiled.config.layouts;
	const deps = compiled.config.deps;
	const files = compiled.files;

	for (let i = 0; i < jobs.length; i++) {
		const job = jobs[i];
		const path = job.path;
		const pattern = job.pattern;
		try {
			const route = compiled.routes[pattern];
			set_ssg_route(ssg_route, path, pattern, job.params, route.layout);
			const data = await call_route_data(route, job);
			if (data !== undefined)
				data_map[path] = data;
			const props = await props_for_route(dir, cache, route, areas, layouts);
			props.data = data;
			const html = read_render(render(App, { props }));
			pages[html_file_for(path)] = inject_html(src_html, {
				import_map: compiled.import_map,
				base,
				css_hrefs: css_hrefs_for(files, deps, pattern, base),
				preload_hrefs: preload_hrefs_for(deps, pattern, base),
				title,
				body: html.body,
				head: html.head,
				ssg: true,
				data,
				runtime
			});
			prerender.push(path);
		}
		catch (error) {
			return fail({ ['ssg ' + path]: error.message }, warnings);
		}
	}

	return { ok: true, errors: {}, warnings, pages, prerender, lookup: ssg_targets(compiled.routes).lookup, data_map };
}

export async function render_ssg ({
	compiled,
	src_html,
	title = '',
	base = '',
	project_root,
	tmp_dir,
	paths,
	runtime
} = {}) {
	if (!compiled || !compiled.ok)
		return fail({ ssg: 'Compile failed before SSG' });

	const warnings = [];
	const dir = tmp_dir || mkdtempSync(join(tmpdir(), 'alumna-ssg-'));
	const own_tmp = !tmp_dir;

	try {
		const compile_fail = compile_server_graph(dir, compiled, project_root, warnings);
		if (compile_fail)
			return compile_fail;
		const prerender_errors = await resolve_prerender_lists(compiled.routes);
		if (prerender_errors.length)
			return fail(Object.fromEntries(prerender_errors.map((message, i) => [ 'app.js#' + (i + 1), message ])), warnings);
		return await pages_for_routes(dir, compiled, src_html, title, base, warnings, paths, runtime);
	}
	catch (error) {
		return fail({ ssg: error.message }, warnings);
	}
	finally {
		if (own_tmp)
			rmSync(dir, { recursive: true, force: true });
	}
}
