import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { pathToFileURL } from 'node:url';
import { rewrite_imports } from '../compile/rewrite.js';
import {
	package_export_file,
	svelte_file_from_exports,
	svelte_import_file
} from './svelte-exports.js';

export const SSG_LINK_MARKER = '.ssg-linked-1';
export const SSG_RUNTIME = 'ssg-runtime';
export const SSG_ESM_ENV = 'export const BROWSER = false;\nexport const DEV = false;\nexport const NODE = true;\n';

const SSG_ENTRIES = [ 'svelte/internal/server', 'svelte/reactivity', 'svelte' ];

function is_inside (root, file) {
	return !relative(root, file).startsWith('..');
}

function is_js (file) {
	return file.endsWith('.js') || file.endsWith('.mjs');
}

function resolve_relative (from_file, spec) {
	const raw = join(dirname(from_file), spec);
	if (existsSync(raw)) {
		if (!statSync(raw).isDirectory())
			return raw;
		const index = join(raw, 'index.js');
		return existsSync(index) ? index : null;
	}
	if (existsSync(raw + '.js'))
		return raw + '.js';
	return null;
}

function list_specifiers (code) {
	const specs = [];
	try {
		rewrite_imports(code, spec => {
			specs.push(spec);
			return spec;
		});
	}
	catch {
		return specs;
	}
	return specs;
}

function collect_ssg_files (root, svelte_dir) {
	const seen = new Set();
	const queue = [];

	function enqueue (file) {
		if (!file || seen.has(file) || !is_inside(svelte_dir, file) || !is_js(file))
			return;
		seen.add(file);
		queue.push(file);
	}

	for (let i = 0; i < SSG_ENTRIES.length; i++)
		enqueue(svelte_file_from_exports(root, SSG_ENTRIES[i]));

	while (queue.length) {
		const file = queue.pop();
		const specs = list_specifiers(readFileSync(file, 'utf8'));
		for (let i = 0; i < specs.length; i++) {
			const spec = specs[i];
			if (!spec || spec.includes(':'))
				continue;
			if (spec.charCodeAt(0) === 46)
				enqueue(resolve_relative(file, spec));
			else if (spec.charCodeAt(0) === 35)
				enqueue(svelte_import_file(root, spec));
			else if (spec === 'svelte' || spec.startsWith('svelte/'))
				enqueue(svelte_file_from_exports(root, spec));
		}
	}

	return [ ...seen ];
}

function out_file (out_dir, svelte_dir, file) {
	return join(out_dir, relative(svelte_dir, file));
}

function resolve_ssg_spec (root, svelte_dir, out_dir, spec) {
	if (!spec || spec.includes(':'))
		return spec;
	if (spec.charCodeAt(0) === 46)
		return spec;
	if (spec.charCodeAt(0) === 35) {
		const orig = svelte_import_file(root, spec);
		return orig ? pathToFileURL(out_file(out_dir, svelte_dir, orig)).href : spec;
	}
	if (spec === 'esm-env' || spec.startsWith('esm-env/'))
		return pathToFileURL(join(out_dir, 'ssg-esm-env.js')).href;
	if (spec === 'svelte' || spec.startsWith('svelte/')) {
		const orig = svelte_file_from_exports(root, spec);
		return orig ? pathToFileURL(out_file(out_dir, svelte_dir, orig)).href : spec;
	}
	const file = package_export_file(root, spec);
	return file ? pathToFileURL(file).href : spec;
}

// Copy the server graph next to svelte-root. Do not rewrite node_modules/svelte:
// Rolldown vendor still needs the original `clsx` / `esm-env` specifiers.
export function link_svelte_ssg (root, force) {
	const marker = join(root, SSG_LINK_MARKER);
	if (!force && existsSync(marker))
		return;

	// Copied .js files are ESM. Node 22–24 treat a folder of .js as CJS unless this is set.
	writeFileSync(join(root, 'package.json'), '{"type":"module"}\n');

	const svelte_dir = join(root, 'node_modules/svelte');
	const out_dir = join(root, SSG_RUNTIME);
	mkdirSync(out_dir, { recursive: true });
	writeFileSync(join(out_dir, 'package.json'), '{"type":"module"}\n');
	writeFileSync(join(out_dir, 'ssg-esm-env.js'), SSG_ESM_ENV);
	const files = collect_ssg_files(root, svelte_dir);

	for (let i = 0; i < files.length; i++) {
		const file = files[i];
		const dest = out_file(out_dir, svelte_dir, file);
		mkdirSync(dirname(dest), { recursive: true });
		const source = readFileSync(file, 'utf8');
		let code = source;
		try {
			code = rewrite_imports(source, spec => resolve_ssg_spec(root, svelte_dir, out_dir, spec));
		}
		catch {
			// keep the original text
		}
		writeFileSync(dest, code);
	}

	writeFileSync(marker, '1\n');
}

export function ssg_file_url (root, spec) {
	const orig = svelte_file_from_exports(root, spec);
	if (!orig)
		return null;
	const linked = join(root, SSG_RUNTIME, relative(join(root, 'node_modules/svelte'), orig));
	if (existsSync(linked))
		return pathToFileURL(linked).href;
	return pathToFileURL(orig).href;
}
