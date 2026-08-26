import {
	compile_component,
	compile_shell,
	resolve_browser_specifier
} from '../../src/compile/svelte.js';

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
});

test('resolve_browser_specifier rejects bare npm specifiers', () => {
	expect(() => resolve_browser_specifier('marked', 'Home')).toThrow(/alumna add marked/);
});

test('compile_component throws on bare npm import', () => {
	expect(() => compile_component(
		`<script>import { marked } from 'marked';</script><p/>`,
		{ filename: 'A.svelte', id: 'A', dev: true }
	)).toThrow(/alumna add marked/);
});
