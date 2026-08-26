import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { read_app } from './read-app.js';
import { validate_app } from './validate.js';
import { walk_component_graph, deps_for_entries } from './graph.js';
import { compile_component, compile_shell } from './svelte.js';
import { generate_shell_source } from './shell.js';

function write_compiled (files, js_path, css_path, compiled, warnings, warning_prefix) {
	files[js_path] = compiled.js;
	if (compiled.css)
		files[css_path] = compiled.css;
	for (const warning of compiled.warnings)
		warnings.push(warning_prefix + warning.message);
}

function serialize_routes (routes) {
	const out = {};
	for (const path of Object.keys(routes)) {
		const route = routes[path];
		out[path] = {
			areas: route.areas,
			redirect: route.redirect,
			layout: route.layout,
			middleware: route.middleware
		};
	}
	return out;
}

function fail (errors) {
	return { ok: false, errors, warnings: [], files: {}, config: null };
}

export function compile_project ({ src_dir, dev = true }) {
	const app_file = join(src_dir, 'app.js');
	if (!existsSync(app_file))
		return fail({ 'app.js': 'Missing "app.js" file' });

	let app;
	try {
		app = read_app(readFileSync(app_file, 'utf8'), 'src/app.js');
	}
	catch (error) {
		return fail({ 'app.js': error.message });
	}

	const validated = validate_app(app);
	if (validated.errors.length)
		return fail(Object.fromEntries(validated.errors.map((message, i) => [ 'app.js#' + (i + 1), message ])));

	const graph = walk_component_graph(src_dir, validated.components);
	if (graph.errors.length)
		return fail(Object.fromEntries(graph.errors.map((message, i) => [ 'components#' + (i + 1), message ])));

	const files = {};
	const warnings = [];
	const css_mode = dev ? 'injected' : 'external';

	for (const id of Object.keys(graph.components)) {
		const node = graph.components[id];
		try {
			const compiled = compile_component(node.source, {
				filename: node.file,
				id,
				dev,
				css: css_mode
			});
			write_compiled(files, 'components/' + id + '.js', 'components/' + id + '.css', compiled, warnings, id + '.svelte: ');
		}
		catch (error) {
			return fail({ [id + '.svelte']: error.message });
		}
	}

	const shell_source = generate_shell_source(app.areas, validated.layouts);
	try {
		const shell = compile_shell(shell_source, {
			filename: 'alumna/App.svelte',
			dev,
			css: css_mode
		});
		write_compiled(files, '_alumna/app.js', '_alumna/app.css', shell, warnings, 'App.svelte: ');
	}
	catch (error) {
		return fail({ 'App.svelte': error.message });
	}

	const deps = {};
	for (const path of Object.keys(validated.routes)) {
		const route = validated.routes[path];
		const entries = Object.values(route.areas);
		if (route.layout)
			entries.unshift(validated.layouts[route.layout].component);
		deps[path] = deps_for_entries(graph.components, entries);
	}

	const mw_names = new Set(validated.middleware);
	for (const path of Object.keys(validated.routes)) {
		const list = validated.routes[path].middleware;
		for (let i = 0; i < list.length; i++)
			mw_names.add(list[i]);
	}

	for (const name of mw_names) {
		const file = join(src_dir, 'middlewares', name + '.js');
		if (!existsSync(file))
			return fail({ ['middlewares/' + name + '.js']: 'Missing middleware file: ' + name + '.js' });
		files['middlewares/' + name + '.js'] = readFileSync(file, 'utf8');
	}

	const config = {
		dev,
		areas: app.areas,
		routes: serialize_routes(validated.routes),
		layouts: validated.layouts,
		middleware: validated.middleware,
		deps
	};

	files['_alumna/config.js'] = 'export default ' + JSON.stringify(config, null, '\t') + ';\n';

	return {
		ok: true,
		errors: {},
		warnings,
		files,
		config,
		app,
		routes: validated.routes,
		graph
	};
}
