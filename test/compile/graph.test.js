import {
	resolve_component_import,
	parse_component_imports,
	walk_component_graph,
	deps_for_entries,
	read_component_source
} from '../../src/compile/graph.js';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { make_dir } from '../helpers/fixture.js';

test('resolves sibling svelte imports', () => {
	expect(resolve_component_import('Hello', './Modal.svelte').id).toBe('Modal');
	expect(resolve_component_import('dash/Page', './Modal.svelte').id).toBe('dash/Modal');
	expect(resolve_component_import('dash/Page', '../Nav.svelte').id).toBe('Nav');
});

test('rejects escaping src/components', () => {
	expect(resolve_component_import('Hello', '../../Secret.svelte').error).toBeTruthy();
	expect(resolve_component_import('Hello', '...svelte').error).toBeTruthy();
});

test('ignores non-svelte specifiers', () => {
	expect(resolve_component_import('Hello', 'svelte')).toBeNull();
	expect(resolve_component_import('Hello', './x.js')).toBeNull();
});

test('strips .svelte.js', () => {
	expect(resolve_component_import('Hello', './store.svelte.js').id).toBe('store');
});

test('empty resolved name is an error', () => {
	expect(resolve_component_import('Hello', '.svelte').error).toBeTruthy();
});

test('parse_component_imports reads instance and module scripts', () => {
	const specs = parse_component_imports(
		`<script>const y = 1; import A from './A.svelte'; import { x } from 'svelte';</script>
		<script module>import B from './B.svelte'; export { default } from './C.svelte'; export * from './D.svelte';</script>
		<p/>`,
		'X.svelte'
	);
	expect(specs).toEqual([ './A.svelte', 'svelte', './B.svelte', './C.svelte', './D.svelte' ]);
});

test('parse_component_imports with no script', () => {
	expect(parse_component_imports('<p>hi</p>', 'X.svelte')).toEqual([]);
});

test('parse_component_imports skips export without a source', () => {
	expect(parse_component_imports('<script>export const x = 1;</script><p/>', 'X.svelte')).toEqual([]);
});

test('walk_component_graph collects children and skips other imports', () => {
	const src_dir = make_dir({
		'components/Home.svelte': `<script>
			import Badge from './Badge.svelte';
			import { onMount } from 'svelte';
		</script><p/>`,
		'components/Badge.svelte': `<span>ok</span>`
	});
	const graph = walk_component_graph(src_dir, [ 'Home' ]);
	expect(graph.errors).toEqual([]);
	expect(graph.components.Home.children).toEqual([ 'Badge' ]);
	expect(graph.components.Badge.children).toEqual([]);
});

test('walk_component_graph reports missing files', () => {
	const src_dir = make_dir({});
	const graph = walk_component_graph(src_dir, [ 'Missing' ]);
	expect(graph.errors[0]).toMatch(/Non-existent/);
	expect(graph.components.Missing.source).toBeNull();
});

test('walk_component_graph reports parse errors', () => {
	const src_dir = make_dir({
		'components/Bad.svelte': `<script>const x = {</script>`
	});
	const graph = walk_component_graph(src_dir, [ 'Bad' ]);
	expect(graph.errors[0]).toMatch(/Failed to parse/);
});

test('walk_component_graph reports escaping imports', () => {
	const src_dir = make_dir({
		'components/Home.svelte': `<script>import X from '../../Secret.svelte';</script><p/>`
	});
	const graph = walk_component_graph(src_dir, [ 'Home' ]);
	expect(graph.errors[0]).toMatch(/escapes/);
});

test('walk_component_graph skips a component already in the map', () => {
	const src_dir = make_dir({
		'components/A.svelte': `<script>import B from './B.svelte';</script><p/>`,
		'components/B.svelte': `<script>import A from './A.svelte';</script><p/>`
	});
	const graph = walk_component_graph(src_dir, [ 'A' ]);
	expect(graph.errors).toEqual([]);
	expect(deps_for_entries(graph.components, [ 'A' ]).sort()).toEqual([ 'A', 'B' ]);
});

test('deps_for_entries skips missing nodes', () => {
	expect(deps_for_entries({}, [ 'Ghost' ])).toEqual([]);
});

test('read_component_source missing file', () => {
	const src_dir = make_dir({});
	expect(read_component_source(src_dir, 'Nope').source).toBeNull();
});

test('read_component_source existing file', () => {
	const src_dir = make_dir({ 'components/Hello.svelte': '<p>hi</p>' });
	expect(read_component_source(src_dir, 'Hello').source).toBe('<p>hi</p>');
});

test('walk_component_graph re-reads entries and keeps other nodes', () => {
	const src_dir = make_dir({
		'components/Home.svelte': `<script>import Badge from './Badge.svelte';</script><p>one</p>`,
		'components/Badge.svelte': `<span>ok</span>`
	});
	const first = walk_component_graph(src_dir, [ 'Home' ]);
	writeFileSync(join(src_dir, 'components/Home.svelte'), `<script>import Badge from './Badge.svelte';</script><p>two</p>`);
	const second = walk_component_graph(src_dir, [ 'Home' ], first.components);
	expect(second.components.Badge).toBe(first.components.Badge);
	expect(second.components.Home).not.toBe(first.components.Home);
	expect(second.components.Home.source).toMatch(/two/);
});
