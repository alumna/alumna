import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { run_rebuild } from '../../src/build/rebuild.js';

test('run_rebuild default opts and a missing build', async () => {
	const out = join(mkdtempSync(join(tmpdir(), 'alumna-reb-')), 'build');
	const result = await run_rebuild({ out });
	expect(result.ok).toBe(false);
	expect(result.errors.rebuild).toMatch(/Missing build/);
});
