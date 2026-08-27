import { generate_shell_source } from '../../src/compile/shell.js';

test('sequential areas use ident names', () => {
	const source = generate_shell_source([ 'nav', 'content' ]);
	expect(source).toContain("use_areas['nav']");
	expect(source).toContain('<Nav data={use_data} />');
	expect(source).toContain('<Content data={use_data} />');
	expect(source).toContain('export function show(next)');
	expect(source).toContain('page_data');
	expect(source).toContain('use_data');
	expect(source).toContain('$props()');
	expect(source).toContain('{:else}');
});

test('named layouts emit snippets for layout areas', () => {
	const source = generate_shell_source([ 'nav', 'content' ], {
		dash: { component: 'layouts/Dash', areas: [ 'nav', 'content' ] }
	});
	expect(source).toContain('{#snippet nav()}');
	expect(source).toContain('{#snippet content()}');
	expect(source).toContain('{#if use_layout}');
});

test('snippet names skip invalid identifiers', () => {
	const source = generate_shell_source([ 'nav-bar' ], {
		dash: { component: 'Dash', areas: [ 'nav-bar' ] }
	});
	expect(source).not.toContain('{#snippet nav-bar()}');
});

test('null layouts skip snippets', () => {
	const source = generate_shell_source([ 'content' ], null);
	expect(source).toContain('use_areas');
	expect(source).not.toContain('{#snippet');
});

test('non-ident area names are cleaned', () => {
	const source = generate_shell_source([ 'nav-bar', '2col', "a'b", 'a\\b' ]);
	expect(source).toContain('<Nav_bar data={use_data} />');
	expect(source).toContain('<C_2col data={use_data} />');
	expect(source).toContain("use_areas['a\\'b']");
	expect(source).toContain("use_areas['a\\\\b']");
});
