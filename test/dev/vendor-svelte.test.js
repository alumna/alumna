import { jest } from '@jest/globals';
import { mkdtempSync, writeFileSync, mkdirSync, readFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
	svelte_version,
	vendor_dir,
	vendor_ready,
	find_bun,
	build_svelte_vendor,
	ensure_svelte_vendor,
	import_map
} from '../../src/dev/vendor-svelte.js';

test('svelte_version and import_map', () => {
	expect(svelte_version()).toMatch(/^\d+\.\d+/);
	const map = import_map();
	expect(map.imports.svelte).toBe('/_alumna/svelte/index-client.js');
	expect(map.imports.alumna).toBe('/_alumna/runtime.js');
});

test('vendor_dir sits under the package', () => {
	expect(vendor_dir()).toMatch(/vendor[/\\]svelte$/);
});

test('find_bun uses the Bun global', () => {
	const prev = globalThis.Bun;
	globalThis.Bun = {};
	try {
		expect(find_bun(() => ({ status: 1 }))).toBe(process.execPath);
	}
	finally {
		if (prev === undefined)
			delete globalThis.Bun;
		else
			globalThis.Bun = prev;
	}
});

test('find_bun returns the first working candidate', () => {
	const spawn = jest.fn(bin => ({ status: bin === 'bun' ? 0 : 1, stdout: '1.4.0' }));
	const prev_bun = process.env.BUN;
	delete process.env.BUN;
	expect(find_bun(spawn)).toBe('bun');
	if (prev_bun !== undefined)
		process.env.BUN = prev_bun;
});

test('find_bun uses BUN when that probe works', () => {
	const prev = process.env.BUN;
	process.env.BUN = '/custom/bun';
	const spawn = jest.fn(bin => ({ status: bin === '/custom/bun' ? 0 : 1 }));
	expect(find_bun(spawn)).toBe('/custom/bun');
	if (prev === undefined)
		delete process.env.BUN;
	else
		process.env.BUN = prev;
});

test('find_bun returns null when none work', () => {
	const prev = process.env.BUN;
	delete process.env.BUN;
	expect(find_bun(() => ({ status: 1 }))).toBeNull();
	if (prev !== undefined)
		process.env.BUN = prev;
});

test('build_svelte_vendor writes a stamp on success', () => {
	const out = mkdtempSync(join(tmpdir(), 'alumna-vendor-'));
	build_svelte_vendor('/fake/bun', out, () => ({ status: 0, stdout: '', stderr: '' }));
	expect(readFileSync(join(out, '.version'), 'utf8').trim()).toBe(svelte_version());
});

test('build_svelte_vendor throws with stderr, then stdout, then empty', () => {
	const out = mkdtempSync(join(tmpdir(), 'alumna-vendor-fail-'));
	expect(() => build_svelte_vendor('bun', out, () => ({ status: 1, stderr: 'e', stdout: '' }))).toThrow(/e/);
	expect(() => build_svelte_vendor('bun', out, () => ({ status: 1, stderr: '', stdout: 'o' }))).toThrow(/o/);
	expect(() => build_svelte_vendor('bun', out, () => ({ status: 1, stderr: '', stdout: '' }))).toThrow(/Failed to bundle Svelte/);
});

test('ensure_svelte_vendor skips when ready', () => {
	expect(ensure_svelte_vendor({
		ready: () => true,
		find_bun: () => { throw new Error('should not look for bun'); }
	})).toBe(vendor_dir());
});

test('ensure_svelte_vendor throws when bun is missing', () => {
	expect(() => ensure_svelte_vendor({
		ready: () => false,
		find_bun: () => null
	})).toThrow(/needs Bun/);
});

test('ensure_svelte_vendor builds when needed', () => {
	const built = [];
	expect(ensure_svelte_vendor({
		ready: () => false,
		find_bun: () => '/bun',
		build: bun => { built.push(bun); return 'out'; }
	})).toBe('out');
	expect(built).toEqual([ '/bun' ]);
});

test('ensure_svelte_vendor uses real ready check with a mock bun lookup', () => {
	let result;
	try {
		result = ensure_svelte_vendor({ find_bun: () => null });
	}
	catch (error) {
		result = error.message;
	}
	expect(result === vendor_dir() || /needs Bun/.test(String(result))).toBe(true);
});

test('find_bun default spawn and missing HOME', () => {
	const prev_home = process.env.HOME;
	const prev_bun = process.env.BUN;
	delete process.env.HOME;
	delete process.env.BUN;
	expect(find_bun(() => ({ status: 1 }))).toBeNull();
	if (prev_home !== undefined)
		process.env.HOME = prev_home;
	if (prev_bun !== undefined)
		process.env.BUN = prev_bun;
	const bin = find_bun();
	expect(bin === null || typeof bin === 'string').toBe(true);
});

test('build_svelte_vendor default spawn on a missing binary', () => {
	const out = mkdtempSync(join(tmpdir(), 'alumna-vendor-default-'));
	expect(() => build_svelte_vendor('/no/such/alumna-bun', out)).toThrow();
});

test('build_svelte_vendor needs dest', () => {
	expect(() => build_svelte_vendor('/bun')).toThrow(/output directory/);
});

test('ensure_svelte_vendor with default deps', () => {
	let result;
	try {
		result = ensure_svelte_vendor();
	}
	catch (error) {
		result = error.message;
	}
	expect(result === vendor_dir() || /needs Bun|Failed to bundle/.test(String(result))).toBe(true);
}, 30000);
