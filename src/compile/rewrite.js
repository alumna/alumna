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
