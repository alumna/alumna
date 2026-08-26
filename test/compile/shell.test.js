import { generate_shell_source } from '../../src/compile/shell.js';

test('sequential areas use ident names', () => {
	const source = generate_shell_source([ 'nav', 'content' ]);
	expect(source).toContain("areas['nav']");
	expect(source).toContain('<Nav />');
	expect(source).toContain('<Content />');
	expect(source).toContain('export function show(next)');
	expect(source).toContain('{:else}');
});

test('named layouts emit snippets for layout areas', () => {
	const source = generate_shell_source([ 'nav', 'content' ], {
		dash: { component: 'layouts/Dash', areas: [ 'nav', 'content' ] }
	});
	expect(source).toContain('{#snippet nav()}');
	expect(source).toContain('{#snippet content()}');
	expect(source).toContain('{#if Layout}');
});

test('snippet names skip invalid identifiers', () => {
	const source = generate_shell_source([ 'nav-bar' ], {
		dash: { component: 'Dash', areas: [ 'nav-bar' ] }
	});
	expect(source).not.toContain('{#snippet nav-bar()}');
});

test('non-ident area names are cleaned', () => {
	const source = generate_shell_source([ 'nav-bar', '2col', "a'b", 'a\\b' ]);
	expect(source).toContain('<Nav_bar />');
	expect(source).toContain('<C_2col />');
	expect(source).toContain("areas['a\\'b']");
	expect(source).toContain("areas['a\\\\b']");
});
