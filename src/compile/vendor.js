import { createRequire } from 'node:module';
import { join } from 'node:path';
import { rolldown } from 'rolldown';
import { alumna_root } from '../utils/paths.js';
import { with_base } from '../utils/base.js';

const SVELTE_VIRTUAL = '\0alumna-svelte:';
const INLINE_VIRTUAL = '\0alumna-inline:';

export function is_package_installed (project_root, spec) {
	try {
		createRequire(join(project_root, 'package.json')).resolve(spec);
		return true;
	}
	catch {
		return false;
	}
}

export function vendor_entry_name (spec) {
	return spec.replace(/^@/, '').replace(/\//g, '-').replace(/[^a-zA-Z0-9._-]/g, '_') || 'mod';
}

export function svelte_entry_name (spec) {
	const rest = spec.replace(/^svelte\/?/, '') || 'index';
	return 'svelte-' + vendor_entry_name(rest);
}

// Re-export only the names compiled components use, so Rolldown can drop the rest.
export function virtual_svelte_source (spec, rec) {
	const quoted = JSON.stringify(spec);
	if (rec.namespace && rec.names.size === 0)
		return 'export * from ' + quoted + ';\n';
	if (!rec.names.size) {
		if (rec.side_effect)
			return 'import ' + quoted + ';\n';
		return 'export * from ' + quoted + ';\n';
	}
	const named = [ ...rec.names ].filter(name => name !== 'default');
	let src = '';
	if (rec.names.has('default'))
		src += 'export { default } from ' + quoted + ';\n';
	if (named.length)
		src += 'export { ' + named.join(', ') + ' } from ' + quoted + ';\n';
	if (rec.side_effect)
		src += 'import ' + quoted + ';\n';
	return src;
}

async function generate_bundle ({ input, cwd, minify, sourcemap, plugins, external }) {
	const bundle = await rolldown({
		input,
		cwd,
		platform: 'browser',
		treeshake: true,
		plugins,
		external
	});
	try {
		const output = {
			format: 'esm',
			minify: !!minify,
			entryFileNames: '[name]-[hash].js',
			chunkFileNames: 'chunk-[hash].js',
			sourcemapIgnoreList: false
		};
		if (sourcemap)
			output.sourcemap = true;
		return await bundle.generate(output);
	}
	finally {
		await bundle.close();
	}
}

function files_from_output (output, base, sourcemap) {
	const files = {};
	const entries = {};
	for (let i = 0; i < output.length; i++) {
		const item = output[i];
		if (item.type === 'asset') {
			files['_alumna/vendor/' + item.fileName] = typeof item.source === 'string'
				? item.source
				: Buffer.from(item.source);
			continue;
		}
		if (item.type !== 'chunk')
			continue;
		const path = '_alumna/vendor/' + item.fileName;
		let code = item.code;
		if (sourcemap && item.map)
			code += '\n//# sourceMappingURL=' + item.fileName + '.map\n';
		files[path] = code;
		if (item.map)
			files[path + '.map'] = typeof item.map === 'string' ? item.map : JSON.stringify(item.map);
		if (item.isEntry)
			entries[item.name] = with_base(base, '/' + path);
	}
	return { files, entries };
}

async function bundle_svelte ({ svelte_uses, base, minify, sourcemap }) {
	if (!svelte_uses || !svelte_uses.size)
		return { files: {}, entries: {} };

	const input = {};
	const sources = {};
	for (const [ spec, rec ] of svelte_uses) {
		const name = svelte_entry_name(spec);
		input[name] = SVELTE_VIRTUAL + spec;
		sources[spec] = virtual_svelte_source(spec, rec);
	}

	const result = await generate_bundle({
		input,
		cwd: alumna_root,
		minify,
		sourcemap,
		plugins: [ {
			name: 'alumna-svelte-virtual',
			resolveId (id) {
				if (id.startsWith(SVELTE_VIRTUAL))
					return id;
			},
			load (id) {
				if (id.startsWith(SVELTE_VIRTUAL))
					return sources[id.slice(SVELTE_VIRTUAL.length)];
			}
		} ]
	});
	return files_from_output(result.output, base, sourcemap);
}

async function bundle_libraries ({ libraries, project_root, base, minify, sourcemap }) {
	if (!libraries || !libraries.length)
		return { files: {}, entries: {} };

	const input = {};
	for (let i = 0; i < libraries.length; i++)
		input[vendor_entry_name(libraries[i])] = libraries[i];

	const result = await generate_bundle({
		input,
		cwd: project_root,
		minify,
		sourcemap,
		external (id) {
			return id === 'svelte' || id === 'alumna' || (typeof id === 'string' && id.startsWith('svelte/'));
		}
	});
	return files_from_output(result.output, base, sourcemap);
}

export async function bundle_vendor ({
	svelte_uses,
	libraries,
	project_root,
	base,
	minify,
	sourcemap
}) {
	const files = {};
	const imports = {
		alumna: with_base(base, '/_alumna/runtime.js')
	};

	try {
		const svelte = await bundle_svelte({ svelte_uses, base, minify, sourcemap });
		Object.assign(files, svelte.files);
		if (svelte_uses) {
			for (const spec of svelte_uses.keys()) {
				const url = svelte.entries[svelte_entry_name(spec)];
				if (url)
					imports[spec] = url;
			}
		}

		const libs = await bundle_libraries({ libraries, project_root, base, minify, sourcemap });
		Object.assign(files, libs.files);
		if (libraries) {
			for (let i = 0; i < libraries.length; i++) {
				const spec = libraries[i];
				const url = libs.entries[vendor_entry_name(spec)];
				if (url)
					imports[spec] = url;
			}
		}
	}
	catch (error) {
		throw new Error('Failed to bundle libraries: ' + (error.message || error));
	}

	return { files, import_map: { imports } };
}

export async function minify_module (code, filename, { sourcemap = false } = {}) {
	const id = INLINE_VIRTUAL + filename;
	const bundle = await rolldown({
		input: id,
		plugins: [ {
			name: 'alumna-inline',
			resolveId (spec) {
				if (spec === id)
					return spec;
				return { id: spec, external: true };
			},
			load (spec) {
				if (spec === id)
					return code;
			}
		} ]
	});
	try {
		const output = { format: 'esm', minify: true, sourcemapIgnoreList: false };
		if (sourcemap)
			output.sourcemap = true;
		const generated = await bundle.generate(output);
		const chunk = generated.output.find(item => item.type === 'chunk');
		let next = chunk.code;
		if (sourcemap && chunk.map)
			next += '\n//# sourceMappingURL=' + filename + '.map\n';
		return {
			code: next,
			map: chunk.map ? (typeof chunk.map === 'string' ? chunk.map : JSON.stringify(chunk.map)) : null
		};
	}
	finally {
		await bundle.close();
	}
}
