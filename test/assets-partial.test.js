import { jest } from '@jest/globals';

jest.unstable_mockModule('../src/pack/data.js', () => ({
	live_data: () => ({})
}));

const {
	package_version,
	rolldown_version,
	runtime_source,
	match_source,
	scaffold_files,
	svelte_file_map
} = await import('../src/pack/assets.js');

test('empty live_data falls through to disk', () => {
	expect(package_version()).toMatch(/^4\.0\.0/);
	expect(rolldown_version()).toMatch(/^\d+\.\d+\.\d+/);
	expect(runtime_source()).toMatch(/export async function start/);
	expect(match_source()).toMatch(/export function match_path/);
	expect(scaffold_files()['src/app.js']).toMatch(/Hello/);
	expect(Object.keys(svelte_file_map()).length).toBeGreaterThan(0);
});
