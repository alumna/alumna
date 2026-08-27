import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { compile_project } from '../../src/compile/project.js';
import {
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

test('html and preload helpers', () => {
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

test('render_ssg skips route middleware and expands prerender', async () => {
	const src_dir = make_dir({
		'index.html': INDEX_HTML,
		'app.js': `
			app.areas = [ 'content' ];
			app.middleware = [ 'log' ];
			app.route['/'] = { content: 'Home' };
			app.route['/dash'] = { content: 'Dash', middleware: [ 'auth' ] };
			app.route['/about'] = { content: 'About', middleware: [ 'log' ], ssg: true };
			app.route['/hidden'] = { content: 'Home', ssg: false };
			app.route['/blog/:slug'] = {
				content: 'Post',
				prerender: [ { slug: 'hello' }, { slug: 'hello' }, { slug: 'world' } ]
			};
			app.route['/empty/:slug'] = { content: 'Post', prerender: [] };
			app.route['/users/:id'] = { content: 'Post' };
			app.route['/old'] = { redirect: '/about' };
			app.route['/*'] = { content: 'Home' };
		`,
		'middlewares/log.js': 'export default function log (c, n) { return n(); }',
		'middlewares/auth.js': 'export default function auth (c, n) { return n(); }',
		'components/Home.svelte': `<p>Welcome home</p>`,
		'components/Dash.svelte': `<p>dash</p>`,
		'components/About.svelte': `<p>About page</p>`,
		'components/Post.svelte': `<script>import { route } from 'alumna';</script><p>post {route.params.slug}</p>`
	});
	const compiled = await compile(src_dir);
	expect(compiled.ok).toBe(true);
	const ssg = await render_ssg({
		compiled,
		src_html: INDEX_HTML,
		project_root: alumna_root
	});
	expect(ssg.ok).toBe(true);
	expect(ssg.prerender).toEqual([ '/', '/about', '/blog/hello', '/blog/world' ]);
	expect(ssg.pages['index.html']).toMatch(/Welcome home/);
	expect(ssg.pages['about/index.html']).toMatch(/About page/);
	expect(ssg.pages['blog/hello/index.html']).toMatch(/post hello/);
	expect(ssg.pages['blog/world/index.html']).toMatch(/post world/);
	expect(ssg.pages['dash/index.html']).toBeUndefined();
	expect(ssg.pages['hidden/index.html']).toBeUndefined();
	expect(ssg.lookup['/blog/:slug']).toEqual([ '/blog/hello', '/blog/world' ]);
	expect(ssg.lookup['/blog/hello']).toEqual([ '/blog/hello' ]);
});

test('render_ssg paths rebuilds one concrete URL', async () => {
	const src_dir = make_dir({
		'index.html': INDEX_HTML,
		'app.js': `
			app.areas = [ 'content' ];
			app.route['/'] = { content: 'Home' };
			app.route['/blog/:slug'] = { content: 'Post', prerender: [ { slug: 'hello' } ] };
		`,
		'components/Home.svelte': `<p>home</p>`,
		'components/Post.svelte': `<script>import { route } from 'alumna';</script><p>{route.params.slug}</p>`
	});
	const compiled = await compile(src_dir);
	const ssg = await render_ssg({
		compiled,
		src_html: INDEX_HTML,
		project_root: alumna_root,
		paths: [ '/blog/world' ]
	});
	expect(ssg.ok).toBe(true);
	expect(ssg.prerender).toEqual([ '/blog/world' ]);
	expect(ssg.pages['blog/world/index.html']).toMatch(/world/);
	expect(ssg.pages['index.html']).toBeUndefined();
});

test('render_ssg paths empty list writes no pages', async () => {
	const src_dir = make_dir({
		'index.html': INDEX_HTML,
		'app.js': `app.areas = [ 'content' ]; app.route['/'] = { content: 'Home' };`,
		'components/Home.svelte': `<p>home</p>`
	});
	const compiled = await compile(src_dir);
	const ssg = await render_ssg({
		compiled,
		src_html: INDEX_HTML,
		project_root: alumna_root,
		paths: []
	});
	expect(ssg.ok).toBe(true);
	expect(ssg.prerender).toEqual([]);
	expect(ssg.pages).toEqual({});
});

test('render_ssg paths rejects a bad path', async () => {
	const src_dir = make_dir({
		'index.html': INDEX_HTML,
		'app.js': `app.areas = [ 'content' ]; app.route['/'] = { content: 'Home' };`,
		'components/Home.svelte': `<p>home</p>`
	});
	const compiled = await compile(src_dir);
	const ssg = await render_ssg({
		compiled,
		src_html: INDEX_HTML,
		project_root: alumna_root,
		paths: [ '/missing' ]
	});
	expect(ssg.ok).toBe(false);
	expect(ssg.errors['ssg /missing']).toMatch(/No route matches/);
});

test('render_ssg calls data and async prerender', async () => {
	const src_dir = make_dir({
		'index.html': INDEX_HTML,
		'app.js': `
			app.areas = [ 'content' ];
			app.route['/'] = {
				content: 'Home',
				data: async () => ({ title: 'Home title' })
			};
			app.route['/blog/:slug'] = {
				content: 'Post',
				prerender: async () => [ { slug: 'hello' } ],
				data: async (ctx) => ({ slug: ctx.params.slug })
			};
		`,
		'components/Home.svelte': `<script>let { data } = $props();</script><p>{data.title}</p>`,
		'components/Post.svelte': `<script>let { data } = $props();</script><p>post {data.slug}</p>`
	});
	const compiled = await compile(src_dir);
	expect(compiled.ok).toBe(true);
	expect(compiled.config.routes['/'].has_data).toBe(true);
	const ssg = await render_ssg({
		compiled,
		src_html: INDEX_HTML,
		project_root: alumna_root
	});
	expect(ssg.ok).toBe(true);
	expect(ssg.pages['index.html']).toMatch(/Home title/);
	expect(ssg.pages['index.html']).toMatch(/alumna-data/);
	expect(ssg.pages['blog/hello/index.html']).toMatch(/post hello/);
	expect(ssg.data_map['/'].title).toBe('Home title');
	expect(ssg.data_map['/blog/hello'].slug).toBe('hello');
});

test('render_ssg fails when async prerender throws', async () => {
	const src_dir = make_dir({
		'index.html': INDEX_HTML,
		'app.js': `
			app.areas = [ 'content' ];
			app.route['/blog/:slug'] = {
				content: 'Post',
				prerender: async () => { throw new Error('list fail'); }
			};
			app.route['/'] = { content: 'Home' };
		`,
		'components/Home.svelte': `<p>home</p>`,
		'components/Post.svelte': `<p>post</p>`
	});
	const compiled = await compile(src_dir);
	const ssg = await render_ssg({ compiled, src_html: INDEX_HTML, project_root: alumna_root });
	expect(ssg.ok).toBe(false);
});
