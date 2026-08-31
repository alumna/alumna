import { alumna_externals, generated_assets_source, collect_release_assets, is_pack_data_id } from '../../src/release/collect.js';

test('is_pack_data_id', () => {
	expect(is_pack_data_id(1)).toBe(false);
	expect(is_pack_data_id('/x/src/pack/data.js')).toBe(true);
	expect(is_pack_data_id('C:\\x\\src\\pack\\data.js')).toBe(true);
	expect(is_pack_data_id('./data.js', '/x/src/pack/assets.js')).toBe(true);
	expect(is_pack_data_id('./data', 'C:\\x\\src\\pack\\assets.js')).toBe(true);
	expect(is_pack_data_id('./data.js')).toBe(false);
	expect(is_pack_data_id('./data.js', '/x/src/other.js')).toBe(false);
	expect(is_pack_data_id('./other.js', '/x/src/pack/assets.js')).toBe(false);
});

test('alumna_externals', () => {
	expect(alumna_externals('rolldown')).toBe(true);
	expect(alumna_externals('rolldown/foo')).toBe(true);
	expect(alumna_externals('node:fs')).toBe(true);
	expect(alumna_externals('svelte')).toBe(false);
	expect(alumna_externals(1)).toBe(false);
});

test('generated_assets_source', () => {
	const src = generated_assets_source({ version: '1.0.0' });
	expect(src).toMatch(/export function live_data/);
	expect(src).toMatch(/1\.0\.0/);
});

test('collect_release_assets', () => {
	const assets = collect_release_assets({ version: '4.0.0-test', rolldown: '1.2.6' });
	expect(assets.version).toBe('4.0.0-test');
	expect(assets.rolldown_version).toBe('1.2.6');
	expect(assets.runtime).toMatch(/start/);
	expect(assets.match).toMatch(/match_path/);
	expect(assets.scaffold['src/app.js']).toMatch(/Hello/);
	expect(assets.svelte_files['package.json']).toMatch(/svelte/);
	expect(assets.svelte_deps.clsx['package.json']).toMatch(/clsx/);
	expect(assets.svelte_deps.devalue['package.json']).toMatch(/devalue/);
	expect(assets.svelte_deps['esm-env']['package.json']).toMatch(/esm-env/);
	const defaults = collect_release_assets();
	expect(defaults.version).toMatch(/^4\.0\.0/);
});
