import * as acorn from 'acorn';

// Parse compiled JS and rewrite import/export specifiers. Acorn keeps
// source offsets, so we edit the original string instead of reprinting.

const SVELTE_SPECIFIERS = new Set([
	'svelte',
	'svelte/internal',
	'svelte/internal/client',
	'svelte/internal/server',
	'svelte/internal/disclose-version',
	'svelte/internal/flags/legacy',
	'svelte/internal/flags/async',
	'svelte/internal/flags/tracing',
	'svelte/animate',
	'svelte/easing',
	'svelte/motion',
	'svelte/store',
	'svelte/transition',
	'svelte/events',
	'svelte/legacy',
	'svelte/reactivity'
]);

export function is_svelte_specifier (spec) {
	return SVELTE_SPECIFIERS.has(spec) || spec.startsWith('svelte/');
}

export function is_bare_library (spec) {
	if (typeof spec !== 'string' || !spec)
		return false;
	const c = spec.charCodeAt(0);
	if (c === 46 || c === 47)
		return false;
	if (spec.includes(':'))
		return false;
	if (spec === 'alumna' || is_svelte_specifier(spec))
		return false;
	return true;
}

function parse_module (code) {
	return acorn.parse(code, {
		ecmaVersion: 'latest',
		sourceType: 'module',
		allowHashBang: true,
		ranges: true
	});
}

function walk (node, visit) {
	visit(node);
	for (const key of Object.keys(node)) {
		const value = node[key];
		if (Array.isArray(value)) {
			for (let i = 0; i < value.length; i++) {
				const child = value[i];
				if (child && typeof child === 'object' && child.type)
					walk(child, visit);
			}
		}
		else if (value && typeof value.type === 'string')
			walk(value, visit);
	}
}

const SPECIFIER_TYPES = new Set([
	'ImportDeclaration',
	'ExportAllDeclaration',
	'ExportNamedDeclaration',
	'ImportExpression'
]);

function each_module_specifier (ast, fn) {
	walk(ast, node => {
		if (!SPECIFIER_TYPES.has(node.type))
			return;
		const source = node.source;
		if (!source || source.type !== 'Literal')
			return;
		fn(source);
	});
}

function apply_edits (code, edits) {
	if (!edits.length)
		return code;
	edits.sort((a, b) => a.start - b.start);
	let out = '';
	let last = 0;
	for (let i = 0; i < edits.length; i++) {
		const edit = edits[i];
		out += code.slice(last, edit.start) + edit.next;
		last = edit.end;
	}
	out += code.slice(last);
	return out;
}

export function rewrite_imports (code, resolve) {
	const ast = parse_module(code);
	const edits = [];
	each_module_specifier(ast, source => {
		const spec = source.value;
		const next = resolve(spec);
		if (next === spec)
			return;
		edits.push({
			start: source.start,
			end: source.end,
			next: JSON.stringify(next)
		});
	});
	return apply_edits(code, edits);
}

export function collect_svelte_imports (code) {
	const ast = parse_module(code);
	const found = new Set();
	each_module_specifier(ast, source => {
		if (is_svelte_specifier(source.value))
			found.add(source.value);
	});
	return [ ...found ];
}

function ensure_svelte_rec (map, spec) {
	if (!map.has(spec))
		map.set(spec, { names: new Set(), namespace: null, side_effect: false });
	return map.get(spec);
}

function record_import (svelte, libraries, spec, specifiers) {
	if (is_bare_library(spec))
		libraries.add(spec);
	if (!is_svelte_specifier(spec))
		return;
	const rec = ensure_svelte_rec(svelte, spec);
	if (!specifiers || !specifiers.length) {
		rec.side_effect = true;
		return;
	}
	for (let i = 0; i < specifiers.length; i++) {
		const item = specifiers[i];
		if (item.type === 'ImportNamespaceSpecifier')
			rec.namespace = item.local.name;
		else if (item.type === 'ImportDefaultSpecifier')
			rec.names.add('default');
		else
			rec.names.add((item.imported || item.local).name);
	}
}

// Used Svelte names + bare library specifiers, so vendor chunks can tree-shake.
export function collect_import_uses (code) {
	const ast = parse_module(code);
	const svelte = new Map();
	const libraries = new Set();

	walk(ast, node => {
		if (node.type === 'ImportDeclaration' && node.source && node.source.type === 'Literal')
			record_import(svelte, libraries, node.source.value, node.specifiers);
		else if ((node.type === 'ExportNamedDeclaration' || node.type === 'ExportAllDeclaration')
			&& node.source && node.source.type === 'Literal')
			record_import(svelte, libraries, node.source.value, node.specifiers);
		else if (node.type === 'ImportExpression' && node.source && node.source.type === 'Literal') {
			if (is_bare_library(node.source.value))
				libraries.add(node.source.value);
			if (is_svelte_specifier(node.source.value))
				ensure_svelte_rec(svelte, node.source.value).side_effect = true;
		}
	});

	const ns = new Map();
	for (const rec of svelte.values()) {
		if (rec.namespace)
			ns.set(rec.namespace, rec);
	}

	walk(ast, node => {
		if (node.type !== 'MemberExpression' || node.object.type !== 'Identifier')
			return;
		const rec = ns.get(node.object.name);
		if (!rec)
			return;
		if (!node.computed && node.property.type === 'Identifier')
			rec.names.add(node.property.name);
		else if (node.computed && node.property.type === 'Literal' && typeof node.property.value === 'string')
			rec.names.add(node.property.value);
	});

	return { svelte, libraries };
}

export function merge_svelte_uses (into, from) {
	for (const [ spec, rec ] of from) {
		const acc = ensure_svelte_rec(into, spec);
		for (const name of rec.names)
			acc.names.add(name);
		if (rec.side_effect)
			acc.side_effect = true;
		if (rec.namespace)
			acc.namespace = rec.namespace;
	}
	return into;
}
