import { rewrite_imports, collect_svelte_imports, is_svelte_specifier, is_bare_library, collect_import_uses, merge_svelte_uses } from '../../src/compile/rewrite.js';

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

test('is_bare_library', () => {
	expect(is_bare_library('')).toBe(false);
	expect(is_bare_library(null)).toBe(false);
	expect(is_bare_library('./x')).toBe(false);
	expect(is_bare_library('/x')).toBe(false);
	expect(is_bare_library('node:fs')).toBe(false);
	expect(is_bare_library('alumna')).toBe(false);
	expect(is_bare_library('svelte')).toBe(false);
	expect(is_bare_library('marked')).toBe(true);
	expect(is_bare_library('@scope/pkg')).toBe(true);
});

test('collect_import_uses', () => {
	const code = `
		import * as $ from 'svelte/internal/client';
		import Svelte, { onMount } from 'svelte';
		export { onMount as mount } from 'svelte';
		import 'svelte/internal/disclose-version';
		import { marked } from 'marked';
		export { x } from 'date-fns';
		export * from 'svelte/store';
		const m = import('other-lib');
		const s = import('svelte/easing');
		$.from_html();
		$['append']();
		$[1];
		$.not_a_call;
	`;
	const { svelte, libraries } = collect_import_uses(code);
	expect([ ...libraries ].sort()).toEqual([ 'date-fns', 'marked', 'other-lib' ]);
	expect(svelte.get('svelte/internal/client').namespace).toBe('$');
	expect(svelte.get('svelte/internal/client').names.has('from_html')).toBe(true);
	expect(svelte.get('svelte/internal/client').names.has('append')).toBe(true);
	expect(svelte.get('svelte').names.has('onMount')).toBe(true);
	expect(svelte.get('svelte').names.has('default')).toBe(true);
	expect(svelte.get('svelte').names.has('mount')).toBe(false);
	expect(svelte.get('svelte/internal/disclose-version').side_effect).toBe(true);
	expect(svelte.get('svelte/store').side_effect).toBe(true);
	expect(svelte.get('svelte/easing').side_effect).toBe(true);
});

test('collect_import_uses skips non-matching members', () => {
	const code = `import { onMount } from 'svelte';\nconst x = y.z;\nconst n = obj['k'];\nconst deep = foo.bar.baz;\n`;
	const { svelte } = collect_import_uses(code);
	expect(svelte.get('svelte').names.has('onMount')).toBe(true);
	expect(svelte.get('svelte').namespace).toBeNull();
});

test('export specifier from svelte', () => {
	const { svelte } = collect_import_uses(`export { onMount } from 'svelte';\n`);
	expect(svelte.get('svelte').names.has('onMount')).toBe(true);
});

test('merge_svelte_uses', () => {
	const a = collect_import_uses(`import { onMount } from 'svelte';`).svelte;
	const b = collect_import_uses(`import * as $ from 'svelte'; import 'svelte'; $.foo();`).svelte;
	merge_svelte_uses(a, b);
	expect(a.get('svelte').names.has('onMount')).toBe(true);
	expect(a.get('svelte').names.has('foo')).toBe(true);
	expect(a.get('svelte').side_effect).toBe(true);
	expect(a.get('svelte').namespace).toBe('$');
});
