import { join, posix } from 'node:path';
import { readFileSync, existsSync } from 'node:fs';
import { parse } from 'svelte/compiler';

function collect_imports_from_ast (ast) {
	const specs = [];

	function from_program (program) {
		const body = program && program.body;
		if (!body)
			return;
		for (let i = 0; i < body.length; i++) {
			const node = body[i];
			// Any statement with a string module source is an import or re-export.
			if (node.source && node.source.value)
				specs.push(node.source.value);
		}
	}

	from_program(ast && ast.instance && ast.instance.content);
	from_program(ast && ast.module && ast.module.content);
	return specs;
}

// Resolve ./Foo.svelte under src/components. Reject paths that leave that folder.
export function resolve_component_import (from_id, spec) {
	if (!spec.endsWith('.svelte') && !spec.endsWith('.svelte.js'))
		return null;

	const from_dir = posix.dirname(from_id);
	let resolved = posix.normalize(posix.join(from_dir === '.' ? '' : from_dir, spec));
	if (resolved.endsWith('.svelte.js'))
		resolved = resolved.slice(0, -10);
	else
		resolved = resolved.slice(0, -7);

	if (!resolved || resolved === '..' || resolved.startsWith('../'))
		return { error: 'Import escapes src/components: ' + spec + ' from ' + from_id };

	return { id: resolved };
}

export function read_component_source (src_dir, id) {
	const file = join(src_dir, 'components', id + '.svelte');
	if (!existsSync(file))
		return { file, source: null };
	return { file, source: readFileSync(file, 'utf8') };
}

export function parse_component_imports (source, filename) {
	const ast = parse(source, {
		filename,
		modern: true
	});
	return collect_imports_from_ast(ast);
}

export function walk_component_graph (src_dir, entry_ids) {
	const components = {};
	const errors = [];
	const queue = [ ...entry_ids ];

	while (queue.length) {
		const id = queue.pop();
		if (components[id])
			continue;

		const { file, source } = read_component_source(src_dir, id);
		if (source === null) {
			errors.push('Non-existent component file: ' + id + '.svelte');
			components[id] = { id, file, source: null, imports: [], children: [] };
			continue;
		}

		let specs = [];
		try {
			specs = parse_component_imports(source, file);
		}
		catch (error) {
			errors.push('Failed to parse ' + id + '.svelte: ' + error.message);
			components[id] = { id, file, source, imports: [], children: [] };
			continue;
		}

		const children = [];
		for (const spec of specs) {
			if (!spec.endsWith('.svelte') && !spec.endsWith('.svelte.js'))
				continue;
			const resolved = resolve_component_import(id, spec);
			if (resolved.error) {
				errors.push(resolved.error);
				continue;
			}
			children.push(resolved.id);
			queue.push(resolved.id);
		}

		components[id] = { id, file, source, imports: specs, children };
	}

	return { components, errors };
}

export function deps_for_entries (components, entry_ids) {
	const deps = [];
	const seen = new Set();

	function visit (id) {
		if (seen.has(id))
			return;
		seen.add(id);
		const node = components[id];
		if (!node)
			return;
		for (const child of node.children)
			visit(child);
		deps.push(id);
	}

	for (const id of entry_ids)
		visit(id);

	return deps;
}
