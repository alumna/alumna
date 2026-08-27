import { jest } from '@jest/globals';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

let captured = [];
const close = jest.fn(async () => {});
const generate = jest.fn(async () => ({ output: [] }));

jest.unstable_mockModule('rolldown', () => ({
	rolldown: async opts => {
		captured.push(opts);
		return {
			generate: async out => generate(out, opts),
			close
		};
	}
}));

const {
	is_package_installed,
	vendor_entry_name,
	svelte_entry_name,
	virtual_svelte_source,
	bundle_vendor,
	minify_module
} = await import('../../src/compile/vendor.js');

beforeEach(() => {
	captured.length = 0;
	generate.mockReset();
	generate.mockResolvedValue({ output: [] });
	close.mockClear();
});

test('vendor_entry_name and svelte_entry_name', () => {
	expect(vendor_entry_name('@scope/pkg')).toBe('scope-pkg');
	expect(vendor_entry_name('a/b')).toBe('a-b');
	expect(vendor_entry_name('!!!')).toBe('___');
	expect(vendor_entry_name('')).toBe('mod');
	expect(svelte_entry_name('svelte')).toBe('svelte-index');
	expect(svelte_entry_name('svelte/internal/client')).toBe('svelte-internal-client');
});

test('virtual_svelte_source branches', () => {
	expect(virtual_svelte_source('svelte', { names: new Set(), namespace: '$', side_effect: false }))
		.toMatch(/export \*/);
	expect(virtual_svelte_source('svelte/x', { names: new Set(), namespace: null, side_effect: true }))
		.toMatch(/^import /);
	expect(virtual_svelte_source('svelte', { names: new Set(), namespace: null, side_effect: false }))
		.toMatch(/export \*/);
	const named = virtual_svelte_source('svelte', {
		names: new Set([ 'default', 'onMount' ]),
		namespace: null,
		side_effect: true
	});
	expect(named).toMatch(/export \{ default \}/);
	expect(named).toMatch(/onMount/);
	expect(named).toMatch(/^import /m);
	expect(virtual_svelte_source('svelte', {
		names: new Set([ 'onMount' ]),
		namespace: null,
		side_effect: false
	})).toMatch(/onMount/);
	expect(virtual_svelte_source('svelte', {
		names: new Set([ 'default' ]),
		namespace: null,
		side_effect: false
	})).toMatch(/export \{ default \}/);
});

test('is_package_installed', () => {
	expect(is_package_installed(process.cwd(), 'svelte')).toBe(true);
	expect(is_package_installed(process.cwd(), 'definitely-not-a-pkg-xyz')).toBe(false);
});

test('bundle_vendor empty maps only alumna when svelte emit is empty', async () => {
	const out = await bundle_vendor({
		svelte_uses: new Map(),
		libraries: [],
		project_root: process.cwd(),
		base: '',
		minify: false,
		sourcemap: false
	});
	expect(out.import_map.imports.alumna).toBe('/_alumna/runtime.js');
	expect(out.files).toEqual({});
	const empty = await bundle_vendor({});
	expect(empty.import_map.imports.alumna).toBe('/_alumna/runtime.js');
});

test('bundle_vendor always maps svelte for the runtime', async () => {
	generate.mockResolvedValueOnce({
		output: [
			{
				type: 'chunk',
				isEntry: true,
				name: 'svelte-index',
				fileName: 'svelte-index-aaa.js',
				code: 'export const mount = 1;'
			}
		]
	});
	const out = await bundle_vendor({
		svelte_uses: new Map(),
		libraries: [],
		project_root: process.cwd(),
		base: '',
		minify: false,
		sourcemap: false
	});
	expect(out.import_map.imports.svelte).toBe('/_alumna/vendor/svelte-index-aaa.js');
	const plugin = captured[0].plugins[0];
	expect(plugin.load('\0alumna-esm-env:esm-env')).toMatch(/DEV = true/);
	expect(plugin.load('\0alumna-esm-env:esm-env/development')).toMatch(/true/);
});

test('bundle_vendor svelte + libraries + assets + maps', async () => {
	const uses = new Map([
		[ 'svelte/internal/client', { names: new Set([ 'from_html' ]), namespace: '$', side_effect: false } ]
	]);
	generate
		.mockResolvedValueOnce({
			output: [
				{ type: 'skip-me' },
				{
					type: 'chunk',
					isEntry: true,
					name: 'svelte-internal-client',
					fileName: 'svelte-internal-client-aaa.js',
					code: 'export const from_html = 1;',
					map: { version: 3 }
				},
				{
					type: 'asset',
					fileName: 'note.txt',
					source: 'hi'
				}
			]
		})
		.mockResolvedValueOnce({
			output: [
				{
					type: 'chunk',
					isEntry: true,
					name: 'marked',
					fileName: 'marked-bbb.js',
					code: 'export const marked = 1;',
					map: '{"version":3}'
				},
				{
					type: 'asset',
					fileName: 'bin.dat',
					source: Buffer.from('ab')
				},
				{
					type: 'chunk',
					isEntry: false,
					fileName: 'chunk-ccc.js',
					code: 'export const x = 1;'
				}
			]
		});

	const out = await bundle_vendor({
		svelte_uses: uses,
		libraries: [ 'marked' ],
		project_root: process.cwd(),
		base: '/app',
		minify: true,
		sourcemap: true
	});
	expect(out.import_map.imports['svelte/internal/client']).toBe('/app/_alumna/vendor/svelte-internal-client-aaa.js');
	expect(out.import_map.imports.marked).toBe('/app/_alumna/vendor/marked-bbb.js');
	expect(out.files['_alumna/vendor/svelte-internal-client-aaa.js']).toMatch(/sourceMappingURL/);
	expect(out.files['_alumna/vendor/note.txt']).toBe('hi');
	expect(Buffer.isBuffer(out.files['_alumna/vendor/bin.dat'])).toBe(true);
	expect(out.files['_alumna/vendor/chunk-ccc.js']).toBe('export const x = 1;');
	expect(out.files['_alumna/vendor/marked-bbb.js.map']).toBe('{"version":3}');

	const svelte_opts = captured.find(opts => opts.plugins);
	const spec = '\0alumna-svelte:svelte/internal/client';
	expect(svelte_opts.plugins[0].resolveId(spec)).toBe(spec);
	expect(svelte_opts.plugins[0].resolveId('other')).toBeUndefined();
	expect(svelte_opts.plugins[0].resolveId('esm-env')).toBe('\0alumna-esm-env:esm-env');
	expect(svelte_opts.plugins[0].resolveId('esm-env/browser')).toBe('\0alumna-esm-env:esm-env/browser');
	expect(svelte_opts.plugins[0].load(spec)).toMatch(/from_html/);
	expect(svelte_opts.plugins[0].load('\0alumna-svelte:svelte')).toMatch(/mount/);
	expect(svelte_opts.plugins[0].load('other')).toBeUndefined();
	expect(svelte_opts.plugins[0].load('\0alumna-esm-env:esm-env')).toMatch(/DEV = false/);
	expect(svelte_opts.plugins[0].load('\0alumna-esm-env:esm-env/browser')).toMatch(/true/);
	expect(svelte_opts.plugins[0].load('\0alumna-esm-env:esm-env/development')).toMatch(/false/);
	expect(svelte_opts.plugins[0].load('\0alumna-esm-env:esm-env/node')).toMatch(/false/);
	expect(svelte_opts.plugins[0].load('\0alumna-esm-env:esm-env/other')).toBeUndefined();
	const lib_opts = captured.find(opts => typeof opts.external === 'function');
	expect(lib_opts.external('svelte')).toBe(true);
	expect(lib_opts.external('svelte/x')).toBe(true);
	expect(lib_opts.external('alumna')).toBe(true);
	expect(lib_opts.external('marked')).toBe(false);
	expect(lib_opts.external(1)).toBe(false);
});

test('bundle_vendor skips missing entry names', async () => {
	generate.mockResolvedValueOnce({
		output: [ { type: 'chunk', isEntry: true, name: 'other', fileName: 'o.js', code: '1' } ]
	});
	const uses = new Map([
		[ 'svelte', { names: new Set([ 'mount' ]), namespace: null, side_effect: false } ]
	]);
	const out = await bundle_vendor({
		svelte_uses: uses,
		libraries: [ 'marked' ],
		project_root: process.cwd(),
		base: '',
		minify: false,
		sourcemap: false
	});
	expect(out.import_map.imports.svelte).toBeUndefined();
});

test('bundle_vendor wraps errors', async () => {
	generate.mockRejectedValueOnce(new Error('boom'));
	await expect(bundle_vendor({
		svelte_uses: new Map([ [ 'svelte', { names: new Set(), namespace: null, side_effect: true } ] ]),
		libraries: [],
		project_root: process.cwd()
	})).rejects.toThrow(/Failed to bundle libraries: boom/);
	generate.mockRejectedValueOnce('plain');
	await expect(bundle_vendor({
		svelte_uses: new Map([ [ 'svelte', { names: new Set(), namespace: null, side_effect: true } ] ]),
		libraries: []
	})).rejects.toThrow(/Failed to bundle libraries: plain/);
});

test('minify_module rewrites and marks imports external', async () => {
	generate.mockResolvedValueOnce({
		output: [ { type: 'chunk', code: 'export const a=1;', map: { version: 3 } } ]
	});
	const out = await minify_module('export const a = 1;', 'runtime.js', { sourcemap: true });
	expect(out.code).toMatch(/sourceMappingURL=runtime\.js\.map/);
	expect(out.map).toMatch(/version/);
	const inline = captured[captured.length - 1];
	const id = '\0alumna-inline:runtime.js';
	expect(inline.plugins[0].resolveId(id)).toBe(id);
	expect(inline.plugins[0].resolveId('svelte')).toEqual({ id: 'svelte', external: true });
	expect(inline.plugins[0].load(id)).toBe('export const a = 1;');
	expect(inline.plugins[0].load('nope')).toBeUndefined();
});

test('minify_module without map', async () => {
	generate.mockResolvedValueOnce({
		output: [ { type: 'chunk', code: 'x', map: null } ]
	});
	const out = await minify_module('x', 'm.js');
	expect(out.code).toBe('x');
	expect(out.map).toBeNull();
});

test('minify_module map as string', async () => {
	generate.mockResolvedValueOnce({
		output: [ { type: 'chunk', code: 'x', map: '{"v":3}' } ]
	});
	const out = await minify_module('x', 'm.js', { sourcemap: true });
	expect(out.map).toBe('{"v":3}');
});

test('is_package_installed with a fake package.json path', () => {
	const dir = mkdtempSync(join(tmpdir(), 'alumna-pkg-'));
	mkdirSync(join(dir, 'node_modules', 'fake-lib'), { recursive: true });
	writeFileSync(join(dir, 'package.json'), '{"type":"module"}\n');
	writeFileSync(join(dir, 'node_modules/fake-lib/package.json'), '{"name":"fake-lib","main":"index.js"}\n');
	writeFileSync(join(dir, 'node_modules/fake-lib/index.js'), 'export const n = 1;\n');
	expect(is_package_installed(dir, 'fake-lib')).toBe(true);
});
