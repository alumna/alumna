import { compile as svelte_compile } from 'svelte/compiler';
import { createRequire } from 'node:module';
import { join, posix } from 'node:path';
import { pathToFileURL } from 'node:url';
import { rewrite_imports, is_svelte_specifier, is_bare_library } from './rewrite.js';
import { resolve_component_import } from './graph.js';
import { ensure_svelte_root } from '../pack/assets.js';
import { with_base } from '../utils/base.js';

function alumna_require () {
	return createRequire(join(ensure_svelte_root(), 'package.json'));
}

function compile_options (filename, dev, css, generate) {
	return {
		filename,
		generate: generate || 'client',
		css: css || (dev ? 'injected' : 'external'),
		dev: !!dev,
		discloseVersion: false
	};
}

function with_map (code, map, map_name, sourcemap) {
	if (!sourcemap || !map)
		return { js: code, map: null };
	return {
		js: code + '\n//# sourceMappingURL=' + map_name + '\n',
		map: JSON.stringify(map)
	};
}

export function compile_component (source, { filename, id, dev, css, sourcemap, base, generate, resolve }) {
	const result = svelte_compile(source, compile_options(filename, dev, css, generate));
	const resolver = resolve || (spec => resolve_browser_specifier(spec, id, base));
	const js = rewrite_imports(result.js.code, resolver);
	const mapped = with_map(js, result.js.map, id.split('/').pop() + '.js.map', sourcemap);

	return {
		js: mapped.js,
		map: mapped.map,
		css: result.css?.code || '',
		css_map: sourcemap && result.css?.map ? JSON.stringify(result.css.map) : null,
		warnings: result.warnings
	};
}

export function compile_shell (source, { filename, dev, css, sourcemap, generate, resolve }) {
	const result = svelte_compile(source, compile_options(filename, dev, css, generate));
	const code = resolve ? rewrite_imports(result.js.code, resolve) : result.js.code;
	const mapped = with_map(code, result.js.map, 'app.js.map', sourcemap);
	return {
		js: mapped.js,
		map: mapped.map,
		css: result.css?.code || '',
		css_map: sourcemap && result.css?.map ? JSON.stringify(result.css.map) : null,
		warnings: result.warnings
	};
}

export function resolve_browser_specifier (spec, id, base) {
	if (is_svelte_specifier(spec))
		return spec;

	if (spec === 'alumna')
		return with_base(base, '/_alumna/runtime.js');

	const svelte_child = resolve_component_import(id, spec);
	if (svelte_child) {
		if (svelte_child.error)
			return spec;
		return with_base(base, '/components/' + svelte_child.id + '.js');
	}

	if (is_bare_library(spec))
		return spec;

	if (spec.startsWith('.') || spec.startsWith('/'))
		return spec;

	throw new Error('Cannot import "' + spec + '" from ' + id + '.svelte');
}

export function file_url_from (root, spec) {
	try {
		return pathToFileURL(createRequire(join(root, 'package.json')).resolve(spec)).href;
	}
	catch {
		throw new Error('Cannot import "' + spec + '" during SSG');
	}
}

export function file_url_from_alumna (spec) {
	try {
		return pathToFileURL(alumna_require().resolve(spec)).href;
	}
	catch {
		throw new Error('Cannot resolve "' + spec + '" for SSG');
	}
}

function server_from_file (id) {
	return id ? 'components/' + id + '.js' : 'App.js';
}

export function server_relative_import (from_id, to_file) {
	let rel = posix.relative(posix.dirname(server_from_file(from_id)), to_file);
	if (!rel || rel.charCodeAt(0) !== 46)
		rel = './' + rel;
	return rel;
}

export function resolve_server_specifier (spec, id, { project_root } = {}) {
	if (is_svelte_specifier(spec))
		return file_url_from_alumna(spec);

	if (spec === 'alumna')
		return server_relative_import(id, 'alumna.js');

	const svelte_child = resolve_component_import(id, spec);
	if (svelte_child) {
		if (svelte_child.error)
			return spec;
		return server_relative_import(id, 'components/' + svelte_child.id + '.js');
	}

	if (is_bare_library(spec)) {
		if (!project_root)
			throw new Error('Cannot import "' + spec + '" during SSG');
		return file_url_from(project_root, spec);
	}

	if (spec.startsWith('.') || spec.startsWith('/'))
		return spec;

	throw new Error('Cannot import "' + spec + '" from ' + (id || 'App') + '.svelte');
}
