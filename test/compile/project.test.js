import { compile_project } from '../../src/compile/project.js';
import { make_dir } from '../helpers/fixture.js';

async function compile (opts) {
	return compile_project({
		bundle_vendor: async ({ base }) => ({
			files: {},
			import_map: { imports: { alumna: (base || '') + '/_alumna/runtime.js' } }
		}),
		...opts
	});
}

test('compiles a route component and its child', async () => {
	const src_dir = make_dir({
		'app.js': `
			app.areas = [ 'content' ];
			app.route['/'] = { content: 'Home' };
			app.route['/about'] = { content: 'About' };
		`,
		'components/Home.svelte': `
			<script>
				import Badge from './Badge.svelte';
			</script>
			<h1>Home</h1>
			<Badge />
		`,
		'components/Badge.svelte': `<span>ok</span>`,
		'components/About.svelte': `<p>About</p>`
	});

	const compiled = await compile({ src_dir, dev: true });
	expect(compiled.ok).toBe(true);
	expect(compiled.files['components/Home.js']).toBeTruthy();
	expect(compiled.files['components/Badge.js']).toBeTruthy();
	expect(compiled.files['components/About.js']).toBeTruthy();
	expect(compiled.config.deps['/'].sort()).toEqual([ 'Badge', 'Home' ]);
	expect(compiled.config.deps['/about']).toEqual([ 'About' ]);
	expect(compiled.files['components/Home.js']).toMatch(/\/components\/Badge\.js/);
	expect(compiled.config.base).toBe('');
	expect(compiled.config.ssg).toBe(false);
	expect(compiled.files['components/Home.js.map']).toBeTruthy();
});

test('missing component is an error', async () => {
	const src_dir = make_dir({
		'app.js': `
			app.areas = [ 'content' ];
			app.route['/'] = { content: 'Missing' };
		`
	});
	expect((await compile({ src_dir, dev: true })).ok).toBe(false);
});

test('missing app.js is an error', async () => {
	const src_dir = make_dir({});
	const compiled = await compile({ src_dir });
	expect(compiled.ok).toBe(false);
	expect(compiled.errors['app.js']).toMatch(/Missing/);
});

test('bad app.js is an error', async () => {
	const src_dir = make_dir({ 'app.js': 'app.areas = [' });
	expect((await compile({ src_dir })).ok).toBe(false);
});

test('invalid routes are an error', async () => {
	const src_dir = make_dir({
		'app.js': `app.areas = []; app.route['/'] = { content: 'Hello' };`
	});
	expect((await compile({ src_dir })).ok).toBe(false);
});

test('named layout is compiled and middleware files are copied', async () => {
	const src_dir = make_dir({
		'app.js': `
			app.areas = [ 'content' ];
			app.layout.shell = { component: 'Shell', areas: [ 'content' ] };
			app.route['/'] = { content: 'Home', layout: 'shell', middleware: [ 'auth' ] };
		`,
		'components/Home.svelte': `<p>home</p>`,
		'components/Shell.svelte': `<script>let { content } = $props();</script>{@render content?.()}`,
		'middlewares/auth.js': `export default function auth (ctx, proceed) { return proceed(); }\n`
	});
	const compiled = await compile({ src_dir, dev: false });
	expect(compiled.ok).toBe(true);
	expect(compiled.config.middleware).toEqual([]);
	expect(compiled.config.deps['/']).toContain('Shell');
	expect(compiled.config.layouts.shell.component).toBe('Shell');
	expect(compiled.config.routes['/'].middleware).toEqual([ 'auth' ]);
	expect(compiled.files['middlewares/auth.js']).toMatch(/export default/);
	expect(compiled.files['_alumna/app.js']).toMatch(/next_layout/);
	expect(compiled.files['components/Home.css']).toBeUndefined();
});

test('serialize ssg and prerender on routes', async () => {
	const src_dir = make_dir({
		'app.js': `
			app.areas = [ 'content' ];
			app.route['/'] = { content: 'Home', ssg: false };
			app.route['/blog/:slug'] = { content: 'Post', prerender: [ { slug: 'hello' } ], data: async () => ({ n: 1 }) };
		`,
		'components/Home.svelte': `<p>home</p>`,
		'components/Post.svelte': `<p>post</p>`
	});
	const compiled = await compile({ src_dir, dev: true });
	expect(compiled.ok).toBe(true);
	expect(compiled.config.routes['/'].ssg).toBe(false);
	expect(compiled.config.routes['/blog/:slug'].prerender).toEqual([ { slug: 'hello' } ]);
	expect(compiled.config.routes['/blog/:slug'].ssg).toBeUndefined();
	expect(compiled.config.routes['/blog/:slug'].has_data).toBe(true);
	expect(compiled.config.routes['/'].has_data).toBeUndefined();
});

test('global middleware file is copied', async () => {
	const src_dir = make_dir({
		'app.js': `
			app.areas = [ 'content' ];
			app.middleware = [ 'log' ];
			app.route['/'] = { content: 'Home' };
		`,
		'components/Home.svelte': `<p>home</p>`,
		'middlewares/log.js': `export default function log (ctx, proceed) { return proceed(); }\n`
	});
	const compiled = await compile({ src_dir });
	expect(compiled.ok).toBe(true);
	expect(compiled.config.middleware).toEqual([ 'log' ]);
	expect(compiled.files['middlewares/log.js']).toMatch(/export default/);
});

test('missing middleware file is an error', async () => {
	const src_dir = make_dir({
		'app.js': `
			app.areas = [ 'content' ];
			app.route['/'] = { content: 'Home', middleware: [ 'auth' ] };
		`,
		'components/Home.svelte': `<p>home</p>`
	});
	const compiled = await compile({ src_dir });
	expect(compiled.ok).toBe(false);
	expect(compiled.errors['middlewares/auth.js']).toMatch(/Missing/);
});

test('missing library is an error', async () => {
	const src_dir = make_dir({
		'app.js': `
			app.areas = [ 'content' ];
			app.route['/'] = { content: 'Home' };
		`,
		'components/Home.svelte': `<script>import { marked } from 'marked';</script><p/>`
	});
	const compiled = await compile({ src_dir });
	expect(compiled.ok).toBe(false);
	expect(compiled.errors.marked).toMatch(/alumna add marked/);
});

test('svelte warnings are collected', async () => {
	const src_dir = make_dir({
		'app.js': `
			app.areas = [ 'content' ];
			app.route['/'] = { content: 'Home' };
		`,
		'components/Home.svelte': `<img src="x">`
	});
	const compiled = await compile({ src_dir });
	expect(compiled.ok).toBe(true);
	expect(compiled.warnings.some(message => /alt/.test(message))).toBe(true);
});

test('external css is emitted in build with css hrefs', async () => {
	const src_dir = make_dir({
		'app.js': `
			app.areas = [ 'content' ];
			app.route['/'] = { content: 'Home' };
		`,
		'components/Home.svelte': `<p class="x">hi</p><style>.x{color:red}</style>`
	});
	const compiled = await compile({ src_dir, dev: false });
	expect(compiled.ok).toBe(true);
	expect(compiled.files['components/Home.css']).toMatch(/color/);
	expect(compiled.css_hrefs.some(href => href.endsWith('/components/Home.css'))).toBe(true);
});

test('invalid area name can fail shell compile', async () => {
	const src_dir = make_dir({
		'app.js': `
			app.areas = [ '{oops}' ];
			app.route['/'] = { '{oops}': 'Home' };
		`,
		'components/Home.svelte': `<p>hi</p>`
	});
	const compiled = await compile({ src_dir });
	expect(compiled.ok).toBe(false);
	expect(compiled.errors['App.svelte']).toBeTruthy();
});

test('component compile throw is returned', async () => {
	const src_dir = make_dir({
		'app.js': `
			app.areas = [ 'content' ];
			app.route['/'] = { content: 'Home' };
		`,
		'components/Home.svelte': `<script>import fs from 'node:fs';</script><p>x</p>`
	});
	const compiled = await compile({ src_dir });
	expect(compiled.ok).toBe(false);
	expect(compiled.errors['Home.svelte']).toMatch(/Cannot import/);
});

test('vendor bundle failure is returned', async () => {
	const src_dir = make_dir({
		'app.js': `
			app.areas = [ 'content' ];
			app.route['/'] = { content: 'Home' };
		`,
		'components/Home.svelte': `<p>home</p>`
	});
	const compiled = await compile_project({
		src_dir,
		bundle_vendor: async () => { throw new Error('vendor-boom'); }
	});
	expect(compiled.ok).toBe(false);
	expect(compiled.errors.vendor).toMatch(/vendor-boom/);
});

test('compile_project with no options is a missing app', async () => {
	expect((await compile_project()).ok).toBe(false);
});

test('css hrefs skip a missing / route', async () => {
	const src_dir = make_dir({
		'app.js': `
			app.areas = [ 'content' ];
			app.route['/about'] = { content: 'About' };
		`,
		'components/About.svelte': `<p>About</p>`
	});
	const compiled = await compile({ src_dir, dev: false });
	expect(compiled.ok).toBe(true);
	expect(compiled.css_hrefs.some(href => href.includes('About'))).toBe(false);
});

test('compile_project bundles svelte with rolldown', async () => {
	const src_dir = make_dir({
		'app.js': `
			app.areas = [ 'content' ];
			app.route['/'] = { content: 'Home' };
		`,
		'components/Home.svelte': `<p class="x">hi</p><style>.x{color:red}</style>`
	});
	const compiled = await compile_project({ src_dir, dev: false });
	expect(compiled.ok).toBe(true);
	expect(Object.keys(compiled.files).some(name => name.startsWith('_alumna/vendor/'))).toBe(true);
	expect(compiled.import_map.imports.alumna).toMatch(/runtime\.js/);
	expect(compiled.css_hrefs.some(href => href.includes('Home.css'))).toBe(true);
}, 30000);

test('base prefixes component urls and sourcemap css in build', async () => {
	const src_dir = make_dir({
		'app.js': `
			app.areas = [ 'content' ];
			app.route['/'] = { content: 'Home' };
		`,
		'components/Home.svelte': `
			<script>import Badge from './Badge.svelte';</script>
			<p class="x">hi</p>
			<style>.x{color:red}</style>
		`,
		'components/Badge.svelte': `<span>ok</span>`
	});
	const compiled = await compile({ src_dir, dev: false, base: '/app', sourcemap: true });
	expect(compiled.ok).toBe(true);
	expect(compiled.config.base).toBe('/app');
	expect(compiled.files['components/Home.js']).toMatch(/\/app\/components\/Badge\.js/);
	expect(compiled.files['components/Home.js.map']).toBeTruthy();
	expect(compiled.files['components/Home.css.map']).toBeTruthy();
	expect(compiled.css_hrefs[0]).toMatch(/^\/app\//);
});
