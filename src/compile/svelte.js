import { compile as svelte_compile } from 'svelte/compiler';
import { rewrite_imports, is_svelte_specifier, is_bare_library } from './rewrite.js';
import { resolve_component_import } from './graph.js';
import { with_base } from '../utils/base.js';

function compile_options (filename, dev, css) {
	return {
		filename,
		generate: 'client',
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

export function compile_component (source, { filename, id, dev, css, sourcemap, base }) {
	const result = svelte_compile(source, compile_options(filename, dev, css));
	const js = rewrite_imports(result.js.code, spec => resolve_browser_specifier(spec, id, base));
	const mapped = with_map(js, result.js.map, id.split('/').pop() + '.js.map', sourcemap);

	return {
		js: mapped.js,
		map: mapped.map,
		css: result.css?.code || '',
		css_map: sourcemap && result.css?.map ? JSON.stringify(result.css.map) : null,
		warnings: result.warnings
	};
}

export function compile_shell (source, { filename, dev, css, sourcemap }) {
	const result = svelte_compile(source, compile_options(filename, dev, css));
	const mapped = with_map(result.js.code, result.js.map, 'app.js.map', sourcemap);
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
