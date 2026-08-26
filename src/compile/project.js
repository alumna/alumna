import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { read_app } from './read-app.js';
import { validate_app } from './validate.js';
import { walk_component_graph, deps_for_entries } from './graph.js';
import { compile_component, compile_shell } from './svelte.js';
import { generate_shell_source } from './shell.js';
import { collect_import_uses, merge_svelte_uses, is_bare_library } from './rewrite.js';
import { bundle_vendor, is_package_installed } from './vendor.js';
import { normalize_base, with_base } from '../utils/base.js';

function write_compiled (files, js_path, css_path, compiled, warnings, warning_prefix) {
	files[js_path] = compiled.js;
	if (compiled.map)
		files[js_path + '.map'] = compiled.map;
	else
		delete files[js_path + '.map'];
	if (compiled.css)
		files[css_path] = compiled.css;
	else
		delete files[css_path];
	if (compiled.css_map)
		files[css_path + '.map'] = compiled.css_map;
	else
		delete files[css_path + '.map'];
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
	return { ok: false, errors, warnings: [], files: {}, config: null, import_map: null, css_hrefs: [] };
}

function collect_libraries (components) {
	const libraries = new Set();
	for (const id of Object.keys(components)) {
		const specs = components[id].imports;
		for (let i = 0; i < specs.length; i++) {
			if (is_bare_library(specs[i]))
				libraries.add(specs[i]);
		}
	}
	return [ ...libraries ];
}

export function css_hrefs_for (files, deps, path, base) {
	const hrefs = [];
	const names = deps[path] || [];
	for (let i = 0; i < names.length; i++) {
		const key = 'components/' + names[i] + '.css';
		if (files[key])
			hrefs.push(with_base(base, '/' + key));
	}
	return hrefs;
}

function deps_from_routes (routes, layouts, components) {
	const deps = {};
	for (const path of Object.keys(routes)) {
		const route = routes[path];
		const entries = Object.values(route.areas);
		if (route.layout)
			entries.unshift(layouts[route.layout].component);
		deps[path] = deps_for_entries(components, entries);
	}
	return deps;
}

function entry_ids (routes, layouts) {
	const ids = [];
	for (const name of Object.keys(layouts))
		ids.push(layouts[name].component);
	for (const path of Object.keys(routes)) {
		const areas = routes[path].areas;
		for (const key of Object.keys(areas))
			ids.push(areas[key]);
	}
	return ids;
}

function emit_component (files, warnings, node, { dev, css_mode, want_map, prefix }) {
	const compiled = compile_component(node.source, {
		filename: node.file,
		id: node.id,
		dev,
		css: css_mode,
		sourcemap: want_map,
		base: prefix
	});
	write_compiled(
		files,
		'components/' + node.id + '.js',
		'components/' + node.id + '.css',
		compiled,
		warnings,
		node.id + '.svelte: '
	);
}

function graph_fail (errors) {
	return fail(Object.fromEntries(errors.map((message, i) => [ 'components#' + (i + 1), message ])));
}

function missing_library_fail (missing) {
	const errors = {};
	for (let i = 0; i < missing.length; i++) {
		const spec = missing[i];
		errors[spec] = '"' + spec + '" is not installed.\nRun: alumna add ' + spec;
	}
	return fail(errors);
}

function installed_missing (libraries, root) {
	const missing = [];
	for (let i = 0; i < libraries.length; i++) {
		if (!is_package_installed(root, libraries[i]))
			missing.push(libraries[i]);
	}
	return missing;
}

function svelte_uses_from_files (files) {
	const svelte_uses = new Map();
	for (const key of Object.keys(files)) {
		if (key !== '_alumna/app.js' && !key.startsWith('components/'))
			continue;
		if (!key.endsWith('.js'))
			continue;
		merge_svelte_uses(svelte_uses, collect_import_uses(files[key]).svelte);
	}
	return svelte_uses;
}

// Stable fingerprint of libraries and used Svelte exports. Skip Rolldown when this is unchanged.
function uses_key (libraries, svelte_uses) {
	const libs = libraries.slice();
	libs.sort();
	let key = libs.join(',') + '|';
	const specs = [ ...svelte_uses.keys() ];
	specs.sort();
	for (let i = 0; i < specs.length; i++) {
		const rec = svelte_uses.get(specs[i]);
		const names = [ ...rec.names ];
		names.sort();
		key += specs[i] + ':' + names.join(',') + ':' + rec.namespace + ':' + rec.side_effect + ';';
	}
	return key;
}

function strip_vendor (files) {
	for (const key of Object.keys(files)) {
		if (key.startsWith('_alumna/vendor/'))
			delete files[key];
	}
}

// Drop components that no route or layout can reach any more.
function prune_unused (files, components, routes, layouts) {
	const keep = new Set(deps_for_entries(components, entry_ids(routes, layouts)));
	for (const id of Object.keys(components)) {
		if (keep.has(id))
			continue;
		delete components[id];
		delete files['components/' + id + '.js'];
		delete files['components/' + id + '.js.map'];
		delete files['components/' + id + '.css'];
		delete files['components/' + id + '.css.map'];
	}
}

function write_config (files, config) {
	files['_alumna/config.js'] = 'export default ' + JSON.stringify(config, null, '\t') + ';\n';
}

export async function compile_project ({
	src_dir,
	dev = true,
	project_root,
	base = '',
	sourcemap = false,
	ssg = false,
	bundle_vendor: bundle_fn
} = {}) {
	if (!src_dir)
		return fail({ 'app.js': 'Missing "app.js" file' });
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
		return graph_fail(graph.errors);

	const root = project_root || join(src_dir, '..');
	const prefix = normalize_base(base);
	const libraries = collect_libraries(graph.components);
	const missing = installed_missing(libraries, root);
	if (missing.length)
		return missing_library_fail(missing);

	const files = {};
	const warnings = [];
	const css_mode = dev ? 'injected' : 'external';
	const want_map = !!(dev || sourcemap);
	const svelte_uses = new Map();
	const emit_opts = { dev, css_mode, want_map, prefix };

	for (const id of Object.keys(graph.components)) {
		try {
			emit_component(files, warnings, graph.components[id], emit_opts);
			merge_svelte_uses(svelte_uses, collect_import_uses(files['components/' + id + '.js']).svelte);
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
			css: css_mode,
			sourcemap: want_map
		});
		write_compiled(files, '_alumna/app.js', '_alumna/app.css', shell, warnings, 'App.svelte: ');
		merge_svelte_uses(svelte_uses, collect_import_uses(shell.js).svelte);
	}
	catch (error) {
		return fail({ 'App.svelte': error.message });
	}

	const deps = deps_from_routes(validated.routes, validated.layouts, graph.components);

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

	let vendor;
	try {
		vendor = await (bundle_fn || bundle_vendor)({
			svelte_uses,
			libraries,
			project_root: root,
			base: prefix,
			minify: !dev,
			sourcemap: want_map
		});
	}
	catch (error) {
		return fail({ vendor: error.message });
	}

	Object.assign(files, vendor.files);

	const config = {
		dev,
		base: prefix,
		ssg: !!ssg,
		areas: app.areas,
		routes: serialize_routes(validated.routes),
		layouts: validated.layouts,
		middleware: validated.middleware,
		deps
	};

	write_config(files, config);

	return {
		ok: true,
		errors: {},
		warnings,
		files,
		config,
		import_map: vendor.import_map,
		css_hrefs: css_hrefs_for(files, deps, '/', prefix),
		app,
		routes: validated.routes,
		graph
	};
}

// Recompile only the used .svelte files in `ids`. Keep other modules.
// When the child list changes, update route deps. Rebundle vendor only
// when library or Svelte imports change.
export async function update_components (prev, {
	src_dir,
	ids,
	dev = true,
	project_root,
	base = '',
	sourcemap = false,
	bundle_vendor: bundle_fn
} = {}) {
	if (!prev || !prev.ok || !ids || !ids.length)
		return compile_project({ src_dir, dev, project_root, base, sourcemap, bundle_vendor: bundle_fn });

	const root = project_root || join(src_dir, '..');
	const prefix = normalize_base(base);
	const css_mode = dev ? 'injected' : 'external';
	const want_map = !!(dev || sourcemap);
	const emit_opts = { dev, css_mode, want_map, prefix };
	const routes = prev.routes;
	const layouts = prev.config.layouts;
	const prev_key = uses_key(collect_libraries(prev.graph.components), svelte_uses_from_files(prev.files));

	const graph = walk_component_graph(src_dir, ids, prev.graph.components);
	if (graph.errors.length)
		return graph_fail(graph.errors);

	const files = Object.assign({}, prev.files);
	prune_unused(files, graph.components, routes, layouts);

	const libraries = collect_libraries(graph.components);
	const missing = installed_missing(libraries, root);
	if (missing.length)
		return missing_library_fail(missing);

	const warnings = [];
	const id_set = new Set(ids);
	const prev_map = prev.graph.components;

	for (const id of Object.keys(graph.components)) {
		if (!id_set.has(id) && prev_map[id])
			continue;
		try {
			emit_component(files, warnings, graph.components[id], emit_opts);
		}
		catch (error) {
			return fail({ [id + '.svelte']: error.message });
		}
	}

	const deps = deps_from_routes(routes, layouts, graph.components);
	const config = {
		dev,
		base: prefix,
		ssg: !!prev.config.ssg,
		areas: prev.config.areas,
		routes: prev.config.routes,
		layouts,
		middleware: prev.config.middleware,
		deps
	};
	write_config(files, config);

	let import_map = prev.import_map;
	const svelte_uses = svelte_uses_from_files(files);
	if (uses_key(libraries, svelte_uses) !== prev_key) {
		let vendor;
		try {
			vendor = await (bundle_fn || bundle_vendor)({
				svelte_uses,
				libraries,
				project_root: root,
				base: prefix,
				minify: !dev,
				sourcemap: want_map
			});
		}
		catch (error) {
			return fail({ vendor: error.message });
		}
		strip_vendor(files);
		Object.assign(files, vendor.files);
		import_map = vendor.import_map;
	}

	return {
		ok: true,
		errors: {},
		warnings,
		files,
		config,
		import_map,
		css_hrefs: css_hrefs_for(files, deps, '/', prefix),
		app: prev.app,
		routes,
		graph
	};
}
