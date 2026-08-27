import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
	package_version,
	rolldown_version,
	runtime_source,
	match_source,
	read_file_map,
	write_file_map,
	scaffold_files,
	svelte_file_map,
	ensure_svelte_root
} from '../src/pack/assets.js';
import { alumna_root } from '../src/utils/paths.js';

test('disk sources', () => {
	expect(package_version()).toMatch(/^4\.0\.0/);
	expect(rolldown_version()).toMatch(/^\d+\.\d+\.\d+/);
	expect(runtime_source()).toMatch(/export async function start/);
	expect(match_source()).toMatch(/export function match_path/);
	expect(scaffold_files()['src/app.js']).toMatch(/Hello/);
	expect(Object.keys(svelte_file_map()).some(name => name.endsWith('package.json'))).toBe(true);
	expect(Object.keys(svelte_file_map()).some(name => name.endsWith('.d.ts'))).toBe(false);

	const skip_dir = mkdtempSync(join(tmpdir(), 'alumna-sv-skip-'));
	mkdirSync(join(skip_dir, 'types'));
	writeFileSync(join(skip_dir, 'ok.js'), 'ok');
	writeFileSync(join(skip_dir, 'index.d.ts'), 'types');
	writeFileSync(join(skip_dir, 'README.md'), 'md');
	writeFileSync(join(skip_dir, 'types/extra.js'), 'no');
	const skipped = svelte_file_map(skip_dir);
	expect(skipped['ok.js']).toBe('ok');
	expect(skipped['index.d.ts']).toBeUndefined();
	expect(skipped['README.md']).toBeUndefined();
	expect(skipped['types/extra.js']).toBeUndefined();
	expect(ensure_svelte_root()).toBe(alumna_root);
});

test('read_file_map missing and nested', () => {
	expect(read_file_map('/no/such/alumna-map')).toEqual({});
	const dir = mkdtempSync(join(tmpdir(), 'alumna-map-'));
	mkdirSync(join(dir, 'sub'));
	writeFileSync(join(dir, 'a.js'), 'a');
	writeFileSync(join(dir, 'sub/b.js'), 'b');
	expect(read_file_map(dir)).toEqual({ 'a.js': 'a', 'sub/b.js': 'b' });
});

test('write_file_map', () => {
	const dir = mkdtempSync(join(tmpdir(), 'alumna-wmap-'));
	write_file_map(dir, { 'src/app.js': 'ok' });
	expect(readFileSync(join(dir, 'src/app.js'), 'utf8')).toBe('ok');
});

test('rolldown_version fallbacks', () => {
	const dir = mkdtempSync(join(tmpdir(), 'alumna-rdv-'));
	expect(rolldown_version(dir)).toBe('1.2.6');
	writeFileSync(join(dir, 'package.json'), '{"devDependencies":{"rolldown":"^9.9.9"}}\n');
	expect(rolldown_version(dir)).toBe('9.9.9');
	writeFileSync(join(dir, 'package.json'), '{"devDependencies":{}}\n');
	expect(rolldown_version(dir)).toBe('1.2.6');
});

test('ensure_svelte_root extracts when svelte is not installed', () => {
	const dir = mkdtempSync(join(tmpdir(), 'alumna-nosvelte-'));
	const prev = process.env.ALUMNA_CACHE;
	process.env.ALUMNA_CACHE = mkdtempSync(join(tmpdir(), 'alumna-sv-cache-'));
	try {
		const root = ensure_svelte_root(dir);
		expect(existsSync(join(root, 'node_modules/svelte/package.json'))).toBe(true);
		expect(ensure_svelte_root(dir)).toBe(root);
	}
	finally {
		if (prev === undefined)
			delete process.env.ALUMNA_CACHE;
		else
			process.env.ALUMNA_CACHE = prev;
	}
});
