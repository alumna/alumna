import { compile_project } from '../../src/compile/project.js';
import { make_dir } from '../helpers/fixture.js';

test('compiles a route component and its child', () => {
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

	const compiled = compile_project({ src_dir, dev: true });
	expect(compiled.ok).toBe(true);
	expect(compiled.files['components/Home.js']).toBeTruthy();
	expect(compiled.files['components/Badge.js']).toBeTruthy();
	expect(compiled.files['components/About.js']).toBeTruthy();
	expect(compiled.config.deps['/'].sort()).toEqual([ 'Badge', 'Home' ]);
	expect(compiled.config.deps['/about']).toEqual([ 'About' ]);
	expect(compiled.files['components/Home.js']).toMatch(/\/components\/Badge\.js/);
});

test('missing component is an error', () => {
	const src_dir = make_dir({
		'app.js': `
			app.areas = [ 'content' ];
			app.route['/'] = { content: 'Missing' };
		`
	});
	expect(compile_project({ src_dir, dev: true }).ok).toBe(false);
});

test('missing app.js is an error', () => {
	const src_dir = make_dir({});
	const compiled = compile_project({ src_dir });
	expect(compiled.ok).toBe(false);
	expect(compiled.errors['app.js']).toMatch(/Missing/);
});

test('bad app.js is an error', () => {
	const src_dir = make_dir({ 'app.js': 'app.areas = [' });
	expect(compile_project({ src_dir }).ok).toBe(false);
});

test('invalid routes are an error', () => {
	const src_dir = make_dir({
		'app.js': `app.areas = []; app.route['/'] = { content: 'Hello' };`
	});
	expect(compile_project({ src_dir }).ok).toBe(false);
});

test('named layout is compiled and middleware files are copied', () => {
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
	const compiled = compile_project({ src_dir, dev: false });
	expect(compiled.ok).toBe(true);
	expect(compiled.config.middleware).toEqual([]);
	expect(compiled.config.deps['/']).toContain('Shell');
	expect(compiled.config.layouts.shell.component).toBe('Shell');
	expect(compiled.config.routes['/'].middleware).toEqual([ 'auth' ]);
	expect(compiled.files['middlewares/auth.js']).toMatch(/export default/);
	expect(compiled.files['_alumna/app.js']).toMatch(/next_layout/);
	expect(compiled.files['components/Home.css']).toBeUndefined();
});

test('global middleware file is copied', () => {
	const src_dir = make_dir({
		'app.js': `
			app.areas = [ 'content' ];
			app.middleware = [ 'log' ];
			app.route['/'] = { content: 'Home' };
		`,
		'components/Home.svelte': `<p>home</p>`,
		'middlewares/log.js': `export default function log (ctx, proceed) { return proceed(); }\n`
	});
	const compiled = compile_project({ src_dir });
	expect(compiled.ok).toBe(true);
	expect(compiled.config.middleware).toEqual([ 'log' ]);
	expect(compiled.files['middlewares/log.js']).toMatch(/export default/);
});

test('missing middleware file is an error', () => {
	const src_dir = make_dir({
		'app.js': `
			app.areas = [ 'content' ];
			app.route['/'] = { content: 'Home', middleware: [ 'auth' ] };
		`,
		'components/Home.svelte': `<p>home</p>`
	});
	const compiled = compile_project({ src_dir });
	expect(compiled.ok).toBe(false);
	expect(compiled.errors['middlewares/auth.js']).toMatch(/Missing/);
});

test('component compile error is returned', () => {
	const src_dir = make_dir({
		'app.js': `
			app.areas = [ 'content' ];
			app.route['/'] = { content: 'Home' };
		`,
		'components/Home.svelte': `<script>import { marked } from 'marked';</script><p/>`
	});
	const compiled = compile_project({ src_dir });
	expect(compiled.ok).toBe(false);
	expect(compiled.errors['Home.svelte']).toMatch(/marked/);
});

test('svelte warnings are collected', () => {
	const src_dir = make_dir({
		'app.js': `
			app.areas = [ 'content' ];
			app.route['/'] = { content: 'Home' };
		`,
		'components/Home.svelte': `<img src="x">`
	});
	const compiled = compile_project({ src_dir });
	expect(compiled.ok).toBe(true);
	expect(compiled.warnings.some(message => /alt/.test(message))).toBe(true);
});

test('external css is emitted in build', () => {
	const src_dir = make_dir({
		'app.js': `
			app.areas = [ 'content' ];
			app.route['/'] = { content: 'Home' };
		`,
		'components/Home.svelte': `<p class="x">hi</p><style>.x{color:red}</style>`
	});
	const compiled = compile_project({ src_dir, dev: false });
	expect(compiled.ok).toBe(true);
	expect(compiled.files['components/Home.css']).toMatch(/color/);
});

test('invalid area name can fail shell compile', () => {
	const src_dir = make_dir({
		'app.js': `
			app.areas = [ '{oops}' ];
			app.route['/'] = { '{oops}': 'Home' };
		`,
		'components/Home.svelte': `<p>hi</p>`
	});
	const compiled = compile_project({ src_dir });
	expect(compiled.ok).toBe(false);
	expect(compiled.errors['App.svelte']).toBeTruthy();
});
