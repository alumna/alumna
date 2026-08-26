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

// Node stub so prerendered components can import { goto, route } from 'alumna'.
const ALUMNA_STUB = `export const route = { path: '', pattern: '', params: {}, query: {}, layout: null };
export function goto () { return Promise.resolve(); }
export function redirect () { return Promise.resolve(); }
export function prefetch () { return Promise.resolve(); }
export function start () { return Promise.resolve(); }
export function should_auto_start () { return false; }
export function boot_runtime () {}
`;

export function is_static_route_path (path) {
	return typeof path === 'string'
		&& path.charCodeAt(0) === 47
		&& !path.includes(':')
		&& !path.includes('*');
}

export function static_route_paths (routes) {
	const paths = [];
	for (const path of Object.keys(routes)) {
		if (!is_static_route_path(path))
			continue;
		if (routes[path].redirect)
			continue;
		paths.push(path);
	}
	return paths;
}

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
	return { ok: false, errors, warnings: warnings || [], pages: {}, prerender: [] };
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

async function pages_for_routes (dir, compiled, src_html, title, base, warnings) {
	const App = (await import(pathToFileURL(join(dir, 'App.js')).href)).default;
	const cache = new Map();
	const pages = {};
	const prerender = static_route_paths(compiled.routes);
	const areas = compiled.config.areas;
	const layouts = compiled.config.layouts;
	const deps = compiled.config.deps;
	const files = compiled.files;

	for (let i = 0; i < prerender.length; i++) {
		const path = prerender[i];
		try {
			const props = await props_for_route(dir, cache, compiled.routes[path], areas, layouts);
			const html = read_render(render(App, { props }));
			pages[html_file_for(path)] = inject_html(src_html, {
				import_map: compiled.import_map,
				base,
				css_hrefs: css_hrefs_for(files, deps, path, base),
				preload_hrefs: preload_hrefs_for(deps, path, base),
				title,
				body: html.body,
				head: html.head,
				ssg: true
			});
		}
		catch (error) {
			return fail({ ['ssg ' + path]: error.message }, warnings);
		}
	}

	return { ok: true, errors: {}, warnings, pages, prerender };
}

export async function render_ssg ({
	compiled,
	src_html,
	title = '',
	base = '',
	project_root,
	tmp_dir
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
		return await pages_for_routes(dir, compiled, src_html, title, base, warnings);
	}
	catch (error) {
		return fail({ ssg: error.message }, warnings);
	}
	finally {
		if (own_tmp)
			rmSync(dir, { recursive: true, force: true });
	}
}
