import { compile as svelte_compile } from 'svelte/compiler';
import { rewrite_imports, is_svelte_specifier } from './rewrite.js';
import { resolve_component_import } from './graph.js';

function compile_options (filename, dev, css) {
	return {
		filename,
		generate: 'client',
		css: css || (dev ? 'injected' : 'external'),
		dev: !!dev,
		discloseVersion: false
	};
}

export function compile_component (source, { filename, id, dev, css }) {
	const result = svelte_compile(source, compile_options(filename, dev, css));
	const js = rewrite_imports(result.js.code, spec => resolve_browser_specifier(spec, id));

	return {
		js,
		css: result.css?.code || '',
		warnings: result.warnings
	};
}

export function compile_shell (source, { filename, dev, css }) {
	const result = svelte_compile(source, compile_options(filename, dev, css));
	return {
		js: result.js.code,
		css: result.css?.code || '',
		warnings: result.warnings
	};
}

export function resolve_browser_specifier (spec, id) {
	if (is_svelte_specifier(spec))
		return spec;

	if (spec === 'alumna')
		return '/_alumna/runtime.js';

	const svelte_child = resolve_component_import(id, spec);
	if (svelte_child) {
		if (svelte_child.error)
			return spec;
		return '/components/' + svelte_child.id + '.js';
	}

	if (spec.startsWith('.') || spec.startsWith('/'))
		return spec;

	throw new Error(
		'Cannot import "' + spec + '" from ' + id + '.svelte. Run: alumna add ' + spec
	);
}
