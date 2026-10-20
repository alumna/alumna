import { jest } from '@jest/globals';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

let captured = [];
const close = jest.fn(async () => {});
const generate = jest.fn(async () => ({ output: [] }));

jest.unstable_mockModule('rolldown', () => ({
	rolldown: async opts => {
		captured.push(opts);
		return {
			generate: async () => generate(),
			close
		};
	}
}));

const {
	bundle_server_libraries,
	rewrite_server_imports,
	server_library_external,
	server_library_specs
} = await import('../../src/compile/server-libraries.js');

beforeEach(() => {
	captured.length = 0;
	generate.mockReset();
	generate.mockResolvedValue({ output: [] });
	close.mockClear();
});

function installed_app () {
	const dir = mkdtempSync(join(tmpdir(), 'alumna-srv-'));
	mkdirSync(join(dir, 'node_modules/wrap'), { recursive: true });
	writeFileSync(join(dir, 'node_modules/wrap/package.json'), '{"name":"wrap"}\n');
	return dir;
}

test('server_library_external keeps node, svelte, and alumna outside the bundle', () => {
	expect(server_library_external('svelte')).toBe(true);
	expect(server_library_external('alumna')).toBe(true);
	expect(server_library_external('svelte/internal/server')).toBe(true);
	expect(server_library_external('node:fs')).toBe(true);
	expect(server_library_external('fs')).toBe(true);
	expect(server_library_external('wrap')).toBe(false);
	expect(server_library_external(null)).toBe(false);
});

test('server_library_specs collects bare libraries once', () => {
	expect(server_library_specs()).toEqual([]);
	expect(server_library_specs(null)).toEqual([]);
	const specs = server_library_specs({
		Home: { imports: [ 'wrap', './Badge.svelte', 'wrap', 'leaf' ] },
		Plain: {}
	});
	expect(specs).toEqual([ 'wrap', 'leaf' ]);
});

test('rewrite_server_imports points svelte and alumna at file URLs', () => {
	const dir = mkdtempSync(join(tmpdir(), 'alumna-srv-rw-'));
	const code = [
		'import "alumna";',
		'import { mount } from "svelte";',
		'import server from "svelte/internal/server";',
		'import fs from "node:fs";',
		'import x from "./shared.js";',
		'export const n = 1;'
	].join('\n');
	const next = rewrite_server_imports(code, dir);
	expect(next).toMatch(/alumna\.js/);
	expect(next).toMatch(/file:/);
	expect(next).toMatch(/svelte\/src\/index-server\.js|index-server\.js/);
	expect(next).toMatch(/internal\/server\/index\.js/);
	expect(next).toMatch(/node:fs/);
	expect(next).toMatch(/\.\/shared\.js/);
	expect(() => rewrite_server_imports('import "svelte/no-such-xyz";', dir)).toThrow(/for SSG/);
});

test('bundle_server_libraries returns an empty map when nothing is imported', async () => {
	const urls = await bundle_server_libraries();
	expect(urls.size).toBe(0);
	const again = await bundle_server_libraries({});
	expect(again.size).toBe(0);
	expect(captured.length).toBe(0);
});

test('bundle_server_libraries rejects a missing package before rolldown', async () => {
	const dir = installed_app();
	await expect(bundle_server_libraries({
		project_root: dir,
		specs: [ 'missing-pkg' ],
		dir
	})).rejects.toThrow(/during SSG/);
	expect(captured.length).toBe(0);
});

test('bundle_server_libraries writes chunks and rewrites imports', async () => {
	const dir = installed_app();
	generate.mockResolvedValueOnce({
		output: [
			{ type: 'asset', fileName: 'note.txt' },
			{
				type: 'chunk',
				isEntry: false,
				name: 'shared',
				fileName: 'chunks/shared.js',
				code: 'export const n = 1;\n'
			},
			{
				type: 'chunk',
				isEntry: true,
				name: 'wrap',
				fileName: 'wrap.js',
				code: 'import "alumna";\nimport { n } from "./chunks/shared.js";\nexport const value = n;\n'
			}
		]
	});
	const urls = await bundle_server_libraries({
		project_root: dir,
		specs: [ 'wrap' ],
		dir
	});
	expect(captured[0].platform).toBe('node');
	expect(captured[0].external).toBe(server_library_external);
	expect(captured[0].input).toEqual({ wrap: 'wrap' });
	expect(urls.get('wrap')).toMatch(/^file:/);
	expect(urls.get('wrap')).toMatch(/wrap\.js$/);
	const entry = readFileSync(join(dir, 'server-vendor/wrap.js'), 'utf8');
	expect(entry).toMatch(/alumna\.js/);
	expect(entry).toMatch(/\.\/chunks\/shared\.js/);
	expect(readFileSync(join(dir, 'server-vendor/chunks/shared.js'), 'utf8')).toMatch(/export const n/);
	expect(close).toHaveBeenCalled();
});

test('bundle_server_libraries closes the bundle when the entry chunk is missing', async () => {
	const dir = installed_app();
	generate.mockResolvedValueOnce({});
	await expect(bundle_server_libraries({
		project_root: dir,
		specs: [ 'wrap' ],
		dir
	})).rejects.toThrow(/during SSG/);
	expect(close).toHaveBeenCalled();
});

test('bundle_server_libraries closes the bundle when generate throws', async () => {
	const dir = installed_app();
	generate.mockRejectedValueOnce(new Error('rolldown down'));
	await expect(bundle_server_libraries({
		project_root: dir,
		specs: [ 'wrap' ],
		dir
	})).rejects.toThrow(/rolldown down/);
	expect(close).toHaveBeenCalled();
});
