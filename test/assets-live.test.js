import { jest } from '@jest/globals';

jest.unstable_mockModule('../src/pack/data.js', () => ({
	live_data: () => ({
		version: '9.9.9-live',
		rolldown_version: '0.0.1',
		runtime: 'LIVE_RUNTIME',
		match: 'LIVE_MATCH',
		scaffold: { 'src/app.js': 'LIVE_APP' },
		svelte_files: { 'package.json': '{"name":"svelte"}', 'index.js': 'export default 1' },
		svelte_deps: {
			clsx: { 'package.json': '{"name":"clsx"}' },
			'esm-env': { 'package.json': '{"name":"esm-env"}' }
		}
	})
}));

const {
	package_version,
	rolldown_version,
	runtime_source,
	match_source,
	scaffold_files,
	svelte_file_map,
	svelte_dep_maps,
	ensure_svelte_root
} = await import('../src/pack/assets.js');
import { mkdtempSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

test('live_data overrides disk', () => {
	expect(package_version()).toBe('9.9.9-live');
	expect(rolldown_version()).toBe('0.0.1');
	expect(runtime_source()).toBe('LIVE_RUNTIME');
	expect(match_source()).toBe('LIVE_MATCH');
	expect(scaffold_files()['src/app.js']).toBe('LIVE_APP');
	expect(svelte_file_map()['index.js']).toBe('export default 1');
	expect(svelte_dep_maps().clsx['package.json']).toMatch(/clsx/);
});

test('ensure_svelte_root with live files and empty root', () => {
	const prev = process.env.ALUMNA_CACHE;
	process.env.ALUMNA_CACHE = mkdtempSync(join(tmpdir(), 'alumna-live-cache-'));
	try {
		const dest = ensure_svelte_root(mkdtempSync(join(tmpdir(), 'alumna-empty-')));
		expect(existsSync(join(dest, 'node_modules/svelte/package.json'))).toBe(true);
		expect(existsSync(join(dest, 'node_modules/clsx/package.json'))).toBe(true);
	}
	finally {
		if (prev === undefined)
			delete process.env.ALUMNA_CACHE;
		else
			process.env.ALUMNA_CACHE = prev;
	}
});
