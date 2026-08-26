import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { compile_project } from '../../src/compile/project.js';
import {
	is_static_route_path,
	static_route_paths,
	html_file_for,
	preload_hrefs_for,
	render_ssg
} from '../../src/compile/ssg.js';
import { make_dir, INDEX_HTML } from '../helpers/fixture.js';
import { alumna_root } from '../../src/utils/paths.js';

async function compile (src_dir, extra = {}) {
	return compile_project({
		src_dir,
		dev: false,
		project_root: extra.project_root || alumna_root,
		bundle_vendor: async ({ base }) => ({
			files: {},
			import_map: { imports: { alumna: (base || '') + '/_alumna/runtime.js' } }
		}),
		...extra
	});
}

test('static path helpers', () => {
	expect(is_static_route_path('/')).toBe(true);
	expect(is_static_route_path('/about')).toBe(true);
	expect(is_static_route_path('/users/:id')).toBe(false);
	expect(is_static_route_path('/*')).toBe(false);
	expect(is_static_route_path('about')).toBe(false);
	expect(is_static_route_path(1)).toBe(false);
	expect(static_route_paths({
		'/': { redirect: null },
		'/about': {},
		'/old': { redirect: '/about' },
		'/users/:id': {},
		'/*': {}
	})).toEqual([ '/', '/about' ]);
	expect(html_file_for('/')).toBe('index.html');
	expect(html_file_for('/about')).toBe('about/index.html');
	expect(html_file_for('/about/')).toBe('about/index.html');
	expect(html_file_for('/foo/bar')).toBe('foo/bar/index.html');
	expect(preload_hrefs_for({ '/': [ 'Home' ] }, '/', '')).toEqual([
		'/_alumna/app.js',
		'/components/Home.js'
	]);
	expect(preload_hrefs_for({}, '/missing', '/app')).toEqual([ '/app/_alumna/app.js' ]);
});

test('render_ssg writes html for static paths only', async () => {
	const src_dir = make_dir({
		'index.html': INDEX_HTML,
		'app.js': `
			app.areas = [ 'content' ];
			app.route['/'] = { content: 'Home' };
			app.route['/about'] = { content: 'About' };
			app.route['/users/:id'] = { content: 'User' };
			app.route['/old'] = { redirect: '/about' };
		`,
		'components/Home.svelte': `<script>import Badge from './Badge.svelte'; import { goto } from 'alumna';</script><p>Welcome home</p><Badge />`,
		'components/Badge.svelte': `<span>ok</span>`,
		'components/About.svelte': `<svelte:head><meta name="ssg" content="about"></svelte:head><p class="x">About page</p><style>.x{color:navy}</style>`,
		'components/User.svelte': `<p>User</p>`
	});
	const compiled = await compile(src_dir);
	expect(compiled.ok).toBe(true);
	const ssg = await render_ssg({
		compiled,
		src_html: INDEX_HTML,
		title: 'Demo',
		project_root: alumna_root
	});
	expect(ssg.ok).toBe(true);
	expect(ssg.prerender).toEqual([ '/', '/about' ]);
	expect(ssg.pages['index.html']).toMatch(/Welcome home/);
	expect(ssg.pages['index.html']).toMatch(/data-alumna-ssg/);
	expect(ssg.pages['index.html']).toMatch(/modulepreload/);
	expect(ssg.pages['about/index.html']).toMatch(/About page/);
	expect(ssg.pages['about/index.html']).toMatch(/name="ssg"/);
	expect(ssg.pages['users/9/index.html']).toBeUndefined();
});

test('render_ssg named layout and omitted area', async () => {
	const src_dir = make_dir({
		'index.html': INDEX_HTML,
		'app.js': `
			app.areas = [ 'nav', 'content' ];
			app.layout.dash = { component: 'layouts/Dash', areas: [ 'nav', 'content' ] };
			app.route['/'] = { layout: 'dash', nav: 'Nav', content: 'Home' };
			app.route['/empty'] = { content: 'Home' };
		`,
		'components/layouts/Dash.svelte': `<script>let { nav, content } = $props();</script><div>{@render nav?.()}{@render content?.()}</div>`,
		'components/Nav.svelte': `<aside>nav</aside>`,
		'components/Home.svelte': `<p>home</p>`
	});
	const compiled = await compile(src_dir);
	expect(compiled.ok).toBe(true);
	const ssg = await render_ssg({
		compiled,
		src_html: INDEX_HTML,
		project_root: alumna_root
	});
	expect(ssg.ok).toBe(true);
	expect(ssg.pages['index.html']).toMatch(/nav/);
	expect(ssg.pages['index.html']).toMatch(/home/);
	expect(ssg.pages['empty/index.html']).toMatch(/home/);
});

test('render_ssg fails when compile failed', async () => {
	expect((await render_ssg()).ok).toBe(false);
	expect((await render_ssg({ compiled: { ok: false } })).errors.ssg).toMatch(/Compile failed/);
});

test('render_ssg fails when a component has no source', async () => {
	const src_dir = make_dir({
		'index.html': INDEX_HTML,
		'app.js': `app.areas = [ 'content' ]; app.route['/'] = { content: 'Home' };`,
		'components/Home.svelte': `<p>home</p>`
	});
	const compiled = await compile(src_dir);
	compiled.graph.components.Home.source = null;
	const ssg = await render_ssg({ compiled, src_html: INDEX_HTML, project_root: alumna_root });
	expect(ssg.ok).toBe(false);
	expect(ssg.errors['Home.svelte']).toMatch(/Missing source/);
});

test('render_ssg fails when server compile throws', async () => {
	const src_dir = make_dir({
		'index.html': INDEX_HTML,
		'app.js': `app.areas = [ 'content' ]; app.route['/'] = { content: 'Home' };`,
		'components/Home.svelte': `<p>home</p>`
	});
	const compiled = await compile(src_dir);
	compiled.graph.components.Home.source = `<script>import fs from 'node:fs';</script><p/>`;
	const ssg = await render_ssg({ compiled, src_html: INDEX_HTML, project_root: alumna_root });
	expect(ssg.ok).toBe(false);
	expect(ssg.errors['Home.svelte']).toMatch(/Cannot import/);
});

test('render_ssg fails when the shell cannot compile', async () => {
	const src_dir = make_dir({
		'index.html': INDEX_HTML,
		'app.js': `app.areas = [ 'content' ]; app.route['/'] = { content: 'Home' };`,
		'components/Home.svelte': `<p>home</p>`
	});
	const compiled = await compile(src_dir);
	compiled.config.areas = [ '{oops}' ];
	const ssg = await render_ssg({ compiled, src_html: INDEX_HTML, project_root: alumna_root });
	expect(ssg.ok).toBe(false);
	expect(ssg.errors['App.svelte']).toBeTruthy();
});

test('render_ssg keeps tmp_dir and records warnings', async () => {
	const src_dir = make_dir({
		'index.html': INDEX_HTML,
		'app.js': `app.areas = [ 'content' ]; app.route['/'] = { content: 'Home' };`,
		'components/Home.svelte': `<img src="x">`
	});
	const compiled = await compile(src_dir);
	const tmp_dir = mkdtempSync(join(tmpdir(), 'alumna-ssg-keep-'));
	try {
		const ssg = await render_ssg({
			compiled,
			src_html: INDEX_HTML,
			project_root: alumna_root,
			tmp_dir
		});
		expect(ssg.ok).toBe(true);
		expect(existsSync(join(tmp_dir, 'App.js'))).toBe(true);
		expect(ssg.warnings.some(message => /alt/.test(message))).toBe(true);
	}
	finally {
		rmSync(tmp_dir, { recursive: true, force: true });
	}
});

test('render_ssg ghost layout and a later import of the same component', async () => {
	const src_dir = make_dir({
		'index.html': INDEX_HTML,
		'app.js': `
			app.areas = [ 'content' ];
			app.layout.dash = { component: 'Dash', areas: [ 'content' ] };
			app.route['/'] = { content: 'Home', layout: 'dash' };
			app.route['/two'] = { content: 'Home', layout: 'dash' };
		`,
		'components/Dash.svelte': `<script>let { content } = $props();</script>{@render content?.()}`,
		'components/Home.svelte': `<p>home</p>`
	});
	const compiled = await compile(src_dir);
	compiled.routes['/'].layout = 'ghost';
	compiled.config.layouts = null;
	const ssg = await render_ssg({ compiled, src_html: INDEX_HTML, project_root: alumna_root });
	expect(ssg.ok).toBe(true);
	expect(ssg.pages['index.html']).toMatch(/home/);
	expect(ssg.pages['two/index.html']).toMatch(/home/);
});

test('render_ssg fails when a page cannot import', async () => {
	const src_dir = make_dir({
		'index.html': INDEX_HTML,
		'app.js': `app.areas = [ 'content' ]; app.route['/'] = { content: 'Home' };`,
		'components/Home.svelte': `<p>x</p>`
	});
	const compiled = await compile(src_dir);
	compiled.graph.components.Home.source = `<script>import X from './Missing.svelte';</script><X />`;
	const ssg = await render_ssg({ compiled, src_html: INDEX_HTML, project_root: alumna_root });
	expect(ssg.ok).toBe(false);
});

test('render_ssg outer catch when graph is missing', async () => {
	const ssg = await render_ssg({
		compiled: { ok: true, graph: null, routes: {}, config: { areas: [], layouts: {}, deps: {} }, files: {} },
		src_html: INDEX_HTML
	});
	expect(ssg.ok).toBe(false);
	expect(ssg.errors.ssg).toBeTruthy();
});
