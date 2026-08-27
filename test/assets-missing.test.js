import { jest } from '@jest/globals';

jest.unstable_mockModule('../src/pack/data.js', () => ({
	live_data: () => ({ svelte_files: {} })
}));

const { ensure_svelte_root } = await import('../src/pack/assets.js');
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

test('ensure_svelte_root throws when no svelte files', () => {
	expect(() => ensure_svelte_root(mkdtempSync(join(tmpdir(), 'alumna-miss-sv-'))))
		.toThrow(/Svelte files are missing/);
});
