import { rewrite_imports, collect_svelte_imports, is_svelte_specifier } from '../../src/compile/rewrite.js';

test('is_svelte_specifier', () => {
	expect(is_svelte_specifier('svelte')).toBe(true);
	expect(is_svelte_specifier('svelte/foo')).toBe(true);
	expect(is_svelte_specifier('alumna')).toBe(false);
	expect(is_svelte_specifier('./x.svelte')).toBe(false);
});

test('leaves svelte specifiers unchanged', () => {
	const code = `import * as $ from 'svelte/internal/client';\n`;
	expect(rewrite_imports(code, spec => spec)).toBe(code);
});

test('rewrites relative svelte imports', () => {
	const code = `import B from "./B.svelte";\n`;
	expect(rewrite_imports(code, spec => spec === './B.svelte' ? '/components/B.js' : spec))
		.toBe(`import B from "/components/B.js";\n`);
});

test('rewrites export from and export all', () => {
	const code = `export { x } from './x.js';\nexport * from './y.js';\n`;
	const out = rewrite_imports(code, spec => spec.replace('./', '/lib/'));
	expect(out).toContain("from \"/lib/x.js\"");
	expect(out).toContain("from \"/lib/y.js\"");
});

test('rewrites dynamic import of a literal', () => {
	const code = `const m = import('./z.js');\n`;
	expect(rewrite_imports(code, spec => spec === './z.js' ? '/z.js' : spec))
		.toBe(`const m = import("/z.js");\n`);
});

test('skips dynamic import of a non-literal', () => {
	const code = `const m = import(id);\n`;
	expect(rewrite_imports(code, () => '/nope')).toBe(code);
});

test('skips dynamic import of a template literal', () => {
	const code = 'const m = import(`./z.js`);\n';
	expect(rewrite_imports(code, () => '/nope')).toBe(code);
});

test('export named without source is skipped', () => {
	const code = `const x = 1; export { x };\n`;
	expect(rewrite_imports(code, () => '/nope')).toBe(code);
});

test('collect_svelte_imports', () => {
	const code = `import 'svelte/internal/disclose-version';\nimport B from "./B.svelte";\nimport { onMount } from "svelte";\n`;
	expect(collect_svelte_imports(code).sort()).toEqual([
		'svelte',
		'svelte/internal/disclose-version'
	]);
});

test('invalid JS throws', () => {
	expect(() => rewrite_imports('const x = {', spec => spec)).toThrow();
});

test('hashbang is allowed', () => {
	const code = `#!/usr/bin/env node\nimport x from './x.js';\n`;
	expect(rewrite_imports(code, spec => spec === './x.js' ? '/x.js' : spec)).toContain('"/x.js"');
});

test('walk skips holes in array literals', () => {
	const code = 'const x = [1,,2];\nimport y from "./y.js";\n';
	expect(rewrite_imports(code, spec => spec === './y.js' ? '/y.js' : spec)).toContain('"/y.js"');
});
