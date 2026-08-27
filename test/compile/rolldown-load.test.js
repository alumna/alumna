import { gzipSync } from 'node:zlib';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { reset_rolldown, load_rolldown, ensure_rolldown } from '../../src/compile/rolldown-load.js';

function tar_header (name, size) {
	const buf = Buffer.alloc(512);
	buf.write(name);
	buf.write('0000644', 100, 7, 'ascii');
	buf.write('0000000', 108, 7, 'ascii');
	buf.write('0000000', 116, 7, 'ascii');
	buf.write(size.toString(8).padStart(11, '0') + ' ', 124, 12, 'ascii');
	buf.write('00000000000 ', 136, 12, 'ascii');
	buf[156] = 48;
	buf.write('ustar', 257);
	let sum = 0;
	for (let i = 0; i < 512; i++)
		sum += i >= 148 && i < 156 ? 32 : buf[i];
	buf.write(sum.toString(8).padStart(6, '0') + '\0 ', 148, 8, 'ascii');
	return buf;
}

function tar_file (name, body) {
	const data = Buffer.from(body);
	const padded = Buffer.alloc(Math.ceil(data.length / 512) * 512);
	data.copy(padded);
	return Buffer.concat([ tar_header(name, data.length), padded ]);
}

function tgz_pkg (files) {
	const parts = [];
	for (const [ name, body ] of Object.entries(files))
		parts.push(tar_file('package/' + name, body));
	parts.push(Buffer.alloc(1024));
	return gzipSync(Buffer.concat(parts));
}

function fetch_packs (packs) {
	return async url => {
		let body = packs.other;
		if (url.includes('/rolldown/-/rolldown-'))
			body = packs.rolldown;
		else if (url.includes('binding'))
			body = packs.binding;
		else if (url.includes('pluginutils'))
			body = packs.pluginutils;
		if (!body)
			return { ok: false, status: 404 };
		return { ok: true, arrayBuffer: async () => body };
	};
}

beforeEach(() => {
	reset_rolldown();
});

test('load_rolldown uses import when it works', async () => {
	const mod = { rolldown: () => 1 };
	const out = await load_rolldown({ import_mod: async () => mod });
	expect(out).toBe(mod);
	expect(await load_rolldown({ import_mod: async () => ({}) })).toBe(mod);
});

test('load_rolldown downloads when import fails', async () => {
	const dir = mkdtempSync(join(tmpdir(), 'alumna-rd-'));
	const packs = {
		rolldown: tgz_pkg({
			'package.json': JSON.stringify({
				name: 'rolldown',
				version: '1.2.6',
				dependencies: { '@rolldown/pluginutils': '^1.0.1' }
			}),
			'dist/index.mjs': 'export const rolldown = 1;\n'
		}),
		binding: tgz_pkg({ 'package.json': '{"name":"b"}' }),
		pluginutils: tgz_pkg({ 'package.json': '{"name":"p"}' })
	};
	const out = await load_rolldown({
		dir,
		version: '1.2.6',
		binding: '@rolldown/binding-linux-x64-gnu',
		fetch: fetch_packs(packs),
		import_mod: async spec => {
			if (spec === 'rolldown')
				throw new Error('no');
			return { rolldown: 1, spec };
		}
	});
	expect(out.rolldown).toBe(1);
	expect(readFileSync(join(dir, 'node_modules/rolldown/dist/index.mjs'), 'utf8')).toMatch(/rolldown/);
	expect(await ensure_rolldown({ dir, version: '1.2.6' })).toBe(dir);
});

test('load_rolldown no_download rethrows; cache_only skips import', async () => {
	const dir = mkdtempSync(join(tmpdir(), 'alumna-rd2-'));
	const packs = {
		rolldown: tgz_pkg({
			'package.json': '{"name":"rolldown","dependencies":{}}',
			'dist/index.mjs': 'export const rolldown = 1;\n'
		}),
		binding: tgz_pkg({ 'package.json': '{}' })
	};
	await expect(load_rolldown({
		import_mod: async () => { throw new Error('no'); },
		no_download: true
	})).rejects.toThrow(/^no$/);

	const out = await load_rolldown({
		dir,
		version: '1.2.6',
		binding: '@rolldown/binding-linux-x64-gnu',
		fetch: fetch_packs(packs),
		cache_only: true,
		import_mod: async spec => ({ spec })
	});
	expect(out.spec).toMatch(/index\.mjs/);
});

test('ensure_rolldown skips pluginutils without a version', async () => {
	const dir = mkdtempSync(join(tmpdir(), 'alumna-rd-nver-'));
	const packs = {
		rolldown: tgz_pkg({
			'package.json': '{"name":"rolldown","dependencies":{"@rolldown/pluginutils":"latest"}}',
			'dist/index.mjs': 'export const rolldown = 1;\n'
		}),
		binding: tgz_pkg({ 'package.json': '{}' })
	};
	expect(await ensure_rolldown({
		dir,
		version: '1.2.6',
		binding: '@rolldown/binding-linux-x64-gnu',
		fetch: fetch_packs(packs)
	})).toBe(dir);
});

test('load_rolldown uses the real rolldown package', async () => {
	const mod = await load_rolldown();
	expect(typeof mod.rolldown).toBe('function');
});

test('ensure_rolldown uses cache, global fetch, and default binding', async () => {
	const packs = {
		rolldown: tgz_pkg({
			'package.json': '{"name":"rolldown"}',
			'dist/index.mjs': 'export const rolldown = 1;\n'
		}),
		binding: tgz_pkg({ 'package.json': '{}' })
	};
	const prev = process.env.ALUMNA_CACHE;
	process.env.ALUMNA_CACHE = mkdtempSync(join(tmpdir(), 'alumna-rd-def-'));
	const orig = globalThis.fetch;
	globalThis.fetch = fetch_packs(packs);
	try {
		const dir = await ensure_rolldown();
		expect(dir).toMatch(/rolldown-/);
		expect(await ensure_rolldown()).toBe(dir);
	}
	finally {
		globalThis.fetch = orig;
		if (prev === undefined)
			delete process.env.ALUMNA_CACHE;
		else
			process.env.ALUMNA_CACHE = prev;
	}
});

test('ensure_rolldown force rebuilds', async () => {
	const dir = mkdtempSync(join(tmpdir(), 'alumna-rd3-'));
	const packs = {
		rolldown: tgz_pkg({
			'package.json': '{"name":"rolldown","dependencies":{}}',
			'dist/index.mjs': 'export const rolldown = 1;\n'
		}),
		binding: tgz_pkg({ 'package.json': '{}' })
	};
	await ensure_rolldown({
		dir,
		version: '1.2.6',
		binding: '@rolldown/binding-linux-x64-gnu',
		fetch: fetch_packs(packs)
	});
	await ensure_rolldown({
		dir,
		version: '1.2.6',
		binding: '@rolldown/binding-linux-x64-gnu',
		fetch: fetch_packs(packs),
		force: true
	});
	expect(readFileSync(join(dir, 'node_modules/rolldown/dist/index.mjs'), 'utf8')).toMatch(/rolldown/);
});

test('load_rolldown force reloads', async () => {
	let n = 0;
	await load_rolldown({ import_mod: async () => ({ n: ++n }) });
	const again = await load_rolldown({ import_mod: async () => ({ n: ++n }), force: true });
	expect(again.n).toBe(2);
});
