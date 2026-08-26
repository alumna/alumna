import {
	compile_component,
	compile_shell,
	resolve_browser_specifier,
	resolve_server_specifier,
	file_url_from,
	file_url_from_alumna,
	server_relative_import
} from '../../src/compile/svelte.js';
import { alumna_root } from '../../src/utils/paths.js';

test('compile_component rewrites child imports and injects css in dev', () => {
	const compiled = compile_component(
		`<script>import Badge from './Badge.svelte';</script><p class="x">hi</p><style>.x{color:red}</style>`,
		{ filename: 'Home.svelte', id: 'Home', dev: true }
	);
	expect(compiled.js).toMatch(/\/components\/Badge\.js/);
	expect(compiled.css).toBe('');
	expect(Array.isArray(compiled.warnings)).toBe(true);
});

test('compile_component emits external css in build', () => {
	const compiled = compile_component(
		`<p class="x">hi</p><style>.x{color:red}</style>`,
		{ filename: 'Home.svelte', id: 'Home', dev: false }
	);
	expect(compiled.css).toMatch(/color/);
});

test('compile_component uses an explicit css mode', () => {
	const compiled = compile_component(
		`<p class="x">hi</p><style>.x{color:red}</style>`,
		{ filename: 'Home.svelte', id: 'Home', dev: true, css: 'external' }
	);
	expect(compiled.css).toMatch(/color/);
});

test('compile_component records a11y warnings', () => {
	const compiled = compile_component('<img src="x">', {
		filename: 'A.svelte',
		id: 'A',
		dev: true
	});
	expect(compiled.warnings.length).toBeGreaterThan(0);
});

test('compile_shell compiles the generated app', () => {
	const compiled = compile_shell(
		`<script>let areas = $state({}); export function show(next) { areas = next; }</script><p class="x">ok</p><style>.x{color:red}</style>`,
		{ filename: 'App.svelte', dev: false }
	);
	expect(compiled.js).toMatch(/function show/);
	expect(compiled.css).toMatch(/color/);
});

test('resolve_browser_specifier maps known kinds', () => {
	expect(resolve_browser_specifier('svelte/internal/client', 'Home')).toBe('svelte/internal/client');
	expect(resolve_browser_specifier('alumna', 'Home')).toBe('/_alumna/runtime.js');
	expect(resolve_browser_specifier('./Badge.svelte', 'Home')).toBe('/components/Badge.js');
	expect(resolve_browser_specifier('../../Evil.svelte', 'Home')).toBe('../../Evil.svelte');
	expect(resolve_browser_specifier('./x.js', 'Home')).toBe('./x.js');
	expect(resolve_browser_specifier('/abs.js', 'Home')).toBe('/abs.js');
	expect(resolve_browser_specifier('alumna', 'Home', '/app')).toBe('/app/_alumna/runtime.js');
	expect(resolve_browser_specifier('./Badge.svelte', 'Home', '/app')).toBe('/app/components/Badge.js');
	expect(resolve_browser_specifier('marked', 'Home')).toBe('marked');
});

test('resolve_browser_specifier rejects unknown protocol specifiers', () => {
	expect(() => resolve_browser_specifier('node:fs', 'Home')).toThrow(/Cannot import/);
});

test('compile_component keeps a bare npm specifier', () => {
	const compiled = compile_component(
		`<script>import { marked } from 'marked';</script><p/>`,
		{ filename: 'A.svelte', id: 'A', dev: true }
	);
	expect(compiled.js).toMatch(/from ['"]marked['"]/);
});

test('compile_component writes a sourcemap', () => {
	const compiled = compile_component(
		`<p class="x">hi</p><style>.x{color:red}</style>`,
		{ filename: 'Home.svelte', id: 'Home', dev: false, sourcemap: true }
	);
	expect(compiled.map).toBeTruthy();
	expect(compiled.js).toMatch(/sourceMappingURL=Home\.js\.map/);
	expect(compiled.css_map).toBeTruthy();
});

test('compile_component without sourcemap leaves maps empty', () => {
	const compiled = compile_component(
		`<p>hi</p>`,
		{ filename: 'Home.svelte', id: 'Home', dev: true, sourcemap: false }
	);
	expect(compiled.map).toBeNull();
});

test('compile_shell writes a sourcemap and css map', () => {
	const compiled = compile_shell(
		`<script>let areas = $state({}); export function show(next) { areas = next; }</script><p class="x">ok</p><style>.x{color:red}</style>`,
		{ filename: 'App.svelte', dev: false, sourcemap: true }
	);
	expect(compiled.map).toBeTruthy();
	expect(compiled.js).toMatch(/sourceMappingURL=app\.js\.map/);
	expect(compiled.css_map).toBeTruthy();
});

test('compile_component generate server rewrites svelte to a file url', () => {
	const compiled = compile_component(
		`<p>hi</p>`,
		{
			filename: 'Home.svelte',
			id: 'Home',
			dev: false,
			generate: 'server',
			resolve: spec => resolve_server_specifier(spec, 'Home', { project_root: alumna_root })
		}
	);
	expect(compiled.js).toMatch(/internal\/server/);
	expect(compiled.map).toBeNull();
});

test('compile_shell generate server uses resolve', () => {
	const compiled = compile_shell(
		`<script>let areas = $state({}); export function show(next) { areas = next; }</script><p>ok</p>`,
		{
			filename: 'App.svelte',
			dev: false,
			generate: 'server',
			resolve: spec => resolve_server_specifier(spec, '', { project_root: alumna_root })
		}
	);
	expect(compiled.js).toMatch(/file:/);
});

test('resolve_server_specifier maps known kinds', () => {
	expect(resolve_server_specifier('svelte/internal/server', 'Home')).toMatch(/^file:/);
	expect(resolve_server_specifier('alumna', 'Home')).toBe('../alumna.js');
	expect(resolve_server_specifier('alumna', '')).toBe('./alumna.js');
	expect(resolve_server_specifier('./Badge.svelte', 'Home')).toBe('./Badge.js');
	expect(resolve_server_specifier('./Nav.svelte', 'layouts/Dash')).toBe('./Nav.js');
	expect(resolve_server_specifier('../Home.svelte', 'layouts/Dash')).toBe('../Home.js');
	expect(resolve_server_specifier('../../Evil.svelte', 'Home')).toBe('../../Evil.svelte');
	expect(resolve_server_specifier('./x.js', 'Home')).toBe('./x.js');
	expect(resolve_server_specifier('/abs.js', 'Home')).toBe('/abs.js');
	expect(resolve_server_specifier('acorn', 'Home', { project_root: alumna_root })).toMatch(/^file:/);
});

test('resolve_server_specifier rejects unknown and missing libraries', () => {
	expect(() => resolve_server_specifier('node:fs', 'Home')).toThrow(/Cannot import/);
	expect(() => resolve_server_specifier('node:fs', '')).toThrow(/from App/);
	expect(() => resolve_server_specifier('marked', 'Home')).toThrow(/during SSG/);
	expect(() => resolve_server_specifier('no-such-pkg', 'Home', { project_root: alumna_root })).toThrow(/during SSG/);
	expect(() => file_url_from_alumna('svelte/does-not-exist-xyz')).toThrow(/for SSG/);
	expect(() => file_url_from(alumna_root, 'no-such-pkg')).toThrow(/during SSG/);
});

test('server_relative_import prefixes a bare relative path', () => {
	expect(server_relative_import('Home', 'components')).toBe('./');
});
