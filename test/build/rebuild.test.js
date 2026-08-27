import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { run_rebuild, read_build_runtime } from '../../src/build/rebuild.js';

test('run_rebuild default opts and a missing build', async () => {
	const out = join(mkdtempSync(join(tmpdir(), 'alumna-reb-')), 'build');
	const result = await run_rebuild({ out });
	expect(result.ok).toBe(false);
	expect(result.errors.rebuild).toMatch(/Missing build/);
});

test('read_build_runtime', () => {
	const out = mkdtempSync(join(tmpdir(), 'alumna-rt-'));
	expect(read_build_runtime(out)).toBeUndefined();
	mkdirSync(join(out, '_alumna'));
	writeFileSync(join(out, '_alumna/runtime.js'), 'export const x = 1;\n');
	expect(String(read_build_runtime(out))).toMatch(/export const x/);
});
