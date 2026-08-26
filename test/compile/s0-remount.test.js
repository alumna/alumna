/**
 * @jest-environment jsdom
 *
 * S0: prove that a shared area constructor does not remount in Svelte 5,
 * both in the sequential shell and inside layout snippets.
 */

import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { compile as svelte_compile } from 'svelte/compiler';
import { mount, tick } from 'svelte';
import { generate_shell_source } from '../../src/compile/shell.js';
import { alumna_root } from '../../src/utils/paths.js';

function compile_js (source, filename) {
	const result = svelte_compile(source, {
		filename,
		generate: 'client',
		css: 'injected',
		dev: true,
		discloseVersion: false
	});
	if (result.warnings.length)
		throw new Error(filename + ': ' + result.warnings.map(w => w.message).join('; '));
	return result.js.code;
}

function make_s0_dir () {
	const dir = join(alumna_root, 'test', '.tmp-s0', String(Date.now()) + '-' + Math.random().toString(16).slice(2));
	mkdirSync(dir, { recursive: true });
	return dir;
}

async function load_component (dir, name, source) {
	const file = join(dir, name + '.js');
	writeFileSync(file, compile_js(source, name + '.svelte'));
	return (await import(pathToFileURL(file).href)).default;
}

const NAV = `<script>
	import { onMount } from 'svelte';
	onMount(() => { window.__nav_mounts = (window.__nav_mounts || 0) + 1; });
</script>
<aside>nav</aside>`;

const HOME = `<script>
	import { onMount } from 'svelte';
	onMount(() => { window.__home_mounts = (window.__home_mounts || 0) + 1; });
</script>
<p>home</p>`;

const ABOUT = `<script>
	import { onMount } from 'svelte';
	onMount(() => { window.__about_mounts = (window.__about_mounts || 0) + 1; });
</script>
<p>about</p>`;

const LAYOUT = `<script>
	let { nav, content } = $props();
</script>
<div class="dash">
	{@render nav?.()}
	{@render content?.()}
</div>`;

const SNIPPET_SHELL = `<script>
	let Layout = $state(null);
	let areas = $state({});

	export function show(next_layout, next_areas) {
		if (Layout !== next_layout) Layout = next_layout;
		for (const key of Object.keys(next_areas)) {
			if (areas[key] !== next_areas[key]) areas[key] = next_areas[key];
		}
		for (const key of Object.keys(areas)) {
			if (!(key in next_areas)) areas[key] = undefined;
		}
	}
</script>

{#if Layout}
	{@const L = Layout}
	<L>
		{#snippet nav()}
			{#if areas['nav']}
				{@const Nav = areas['nav']}
				<Nav />
			{/if}
		{/snippet}
		{#snippet content()}
			{#if areas['content']}
				{@const Content = areas['content']}
				<Content />
			{/if}
		{/snippet}
	</L>
{/if}
`;

let s0_dir;

beforeEach(() => {
	document.body.innerHTML = '';
	window.__nav_mounts = 0;
	window.__home_mounts = 0;
	window.__about_mounts = 0;
	s0_dir = make_s0_dir();
});

afterEach(() => {
	rmSync(join(alumna_root, 'test', '.tmp-s0'), { recursive: true, force: true });
});

test('S0 sequential: shared nav constructor does not remount', async () => {
	const App = await load_component(s0_dir, 'App', generate_shell_source([ 'nav', 'content' ]));
	const Nav = await load_component(s0_dir, 'Nav', NAV);
	const Home = await load_component(s0_dir, 'Home', HOME);
	const About = await load_component(s0_dir, 'About', ABOUT);

	const app = mount(App, { target: document.body });
	app.show({ areas: { nav: Nav, content: Home } });
	await tick();
	expect(window.__nav_mounts).toBe(1);
	expect(window.__home_mounts).toBe(1);

	app.show({ areas: { nav: Nav, content: About } });
	await tick();
	expect(window.__nav_mounts).toBe(1);
	expect(window.__about_mounts).toBe(1);
	expect(document.body.textContent).toMatch(/nav/);
	expect(document.body.textContent).toMatch(/about/);
});

test('S0 snippets: shared nav constructor does not remount', async () => {
	const App = await load_component(s0_dir, 'SnippetApp', SNIPPET_SHELL);
	const Layout = await load_component(s0_dir, 'Dash', LAYOUT);
	const Nav = await load_component(s0_dir, 'Nav', NAV);
	const Home = await load_component(s0_dir, 'Home', HOME);
	const About = await load_component(s0_dir, 'About', ABOUT);

	const app = mount(App, { target: document.body });
	app.show(Layout, { nav: Nav, content: Home });
	await tick();
	expect(window.__nav_mounts).toBe(1);
	expect(window.__home_mounts).toBe(1);

	app.show(Layout, { nav: Nav, content: About });
	await tick();
	expect(window.__nav_mounts).toBe(1);
	expect(window.__about_mounts).toBe(1);
	expect(document.body.textContent).toMatch(/nav/);
	expect(document.body.textContent).toMatch(/about/);
});
