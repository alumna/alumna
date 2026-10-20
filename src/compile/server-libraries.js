import { mkdirSync, writeFileSync } from 'node:fs';
import { builtinModules } from 'node:module';
import { dirname, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { is_bare_library, is_svelte_specifier, rewrite_imports } from './rewrite.js';
import { is_package_installed, vendor_entry_name } from './vendor.js';
import { load_rolldown } from './rolldown-load.js';
import { file_url_from_alumna } from './svelte.js';

// SSG runs inside the author binary. That binary cannot resolve a bare npm name
// from a file on disk. Bundle the library graph, then rewrite svelte and alumna
// to file URLs. node: stays external. The compiled binary can load node:.
export function server_library_external (id) {
	if (typeof id !== 'string')
		return false;
	if (id === 'svelte' || id === 'alumna' || id.startsWith('svelte/') || id.startsWith('node:'))
		return true;
	return builtinModules.includes(id);
}

export function server_library_specs (components) {
	const specs = [];
	const seen = new Set();
	if (!components)
		return specs;
	const ids = Object.keys(components);
	for (let i = 0; i < ids.length; i++) {
		const imports = components[ids[i]].imports || [];
		for (let j = 0; j < imports.length; j++) {
			const spec = imports[j];
			if (!is_bare_library(spec) || seen.has(spec))
				continue;
			seen.add(spec);
			specs.push(spec);
		}
	}
	return specs;
}

export function rewrite_server_imports (code, dir) {
	return rewrite_imports(code, spec => {
		if (spec === 'alumna')
			return pathToFileURL(join(dir, 'alumna.js')).href;
		if (is_svelte_specifier(spec))
			return file_url_from_alumna(spec);
		return spec;
	});
}

function chunk_href (dir, file_name) {
	return pathToFileURL(join(dir, 'server-vendor', file_name)).href;
}

export async function bundle_server_libraries ({ project_root, specs, dir } = {}) {
	const list = specs || [];
	const urls = new Map();
	if (!list.length)
		return urls;

	for (let i = 0; i < list.length; i++) {
		if (!is_package_installed(project_root, list[i]))
			throw new Error('Cannot import "' + list[i] + '" during SSG');
	}

	const { rolldown } = await load_rolldown();
	const input = {};
	for (let i = 0; i < list.length; i++)
		input[vendor_entry_name(list[i])] = list[i];

	const bundle = await rolldown({
		input,
		cwd: project_root,
		platform: 'node',
		treeshake: true,
		external: server_library_external
	});

	try {
		const generated = await bundle.generate({
			format: 'esm',
			sourcemapIgnoreList: false,
			entryFileNames: '[name].js',
			chunkFileNames: 'chunk-[hash].js'
		});
		const out_dir = join(dir, 'server-vendor');
		mkdirSync(out_dir, { recursive: true });
		const by_name = new Map();
		const output = generated.output || [];
		for (let i = 0; i < output.length; i++) {
			const item = output[i];
			if (item.type !== 'chunk')
				continue;
			const file = join(out_dir, item.fileName);
			mkdirSync(dirname(file), { recursive: true });
			writeFileSync(file, rewrite_server_imports(item.code, dir));
			if (item.isEntry)
				by_name.set(item.name, chunk_href(dir, item.fileName));
		}
		for (let i = 0; i < list.length; i++) {
			const href = by_name.get(vendor_entry_name(list[i]));
			if (!href)
				throw new Error('Cannot import "' + list[i] + '" during SSG');
			urls.set(list[i], href);
		}
		return urls;
	}
	finally {
		await bundle.close();
	}
}
