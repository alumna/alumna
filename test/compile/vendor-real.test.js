import { mkdirSync, writeFileSync } from 'node:fs';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { bundle_vendor, minify_module } from '../../src/compile/vendor.js';

test('real rolldown bundles a tiny library', async () => {
	const dir = mkdtempSync(join(tmpdir(), 'alumna-real-vendor-'));
	mkdirSync(join(dir, 'node_modules', 'tiny-lib'), { recursive: true });
	writeFileSync(join(dir, 'package.json'), '{"type":"module"}\n');
	writeFileSync(join(dir, 'node_modules/tiny-lib/package.json'), '{"name":"tiny-lib","type":"module","main":"index.js"}\n');
	writeFileSync(join(dir, 'node_modules/tiny-lib/index.js'), 'export const n = 1;\n');

	const out = await bundle_vendor({
		svelte_uses: new Map(),
		libraries: [ 'tiny-lib' ],
		project_root: dir,
		base: '',
		minify: true,
		sourcemap: true
	});
	const files = Object.keys(out.files);
	expect(files.some(name => name.startsWith('_alumna/vendor/'))).toBe(true);
	expect(out.import_map.imports['tiny-lib']).toMatch(/\/_alumna\/vendor\//);
	expect(Object.keys(out.files).some(name => name.endsWith('.map'))).toBe(true);
}, 30000);

test('real minify_module keeps an external import', async () => {
	const out = await minify_module("import { mount } from 'svelte';\nexport const x = 1 + 1;\n", 't.js');
	expect(out.code).toMatch(/svelte/);
	expect(out.code).toMatch(/x/);
}, 30000);
