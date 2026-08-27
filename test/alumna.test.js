import { jest } from '@jest/globals';
import { mkdtempSync, mkdirSync, writeFileSync, existsSync, readFileSync, unlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { INDEX_HTML } from './helpers/fixture.js';

jest.unstable_mockModule('../src/compile/vendor.js', () => ({
	bundle_vendor: async ({ base }) => ({
		files: { '_alumna/vendor/svelte.js': 'export const mount = () => {};' },
		import_map: {
			imports: {
				svelte: (base || '') + '/_alumna/vendor/svelte.js',
				alumna: (base || '') + '/_alumna/runtime.js'
			}
		}
	}),
	is_package_installed: () => false,
	minify_module: async (code, filename, opts = {}) => ({
		code: 'min:' + code.slice(0, 8),
		map: opts.sourcemap ? '{}' : null
	})
}));

jest.unstable_mockModule('../src/add/install.js', () => ({
	add_packages: (cwd, names) => ({ installer: 'test', names, cwd })
}));

jest.unstable_mockModule('../src/compile/rolldown-load.js', () => ({
	ensure_rolldown: async () => '/tmp/alumna-rolldown-cache',
	load_rolldown: async () => ({ rolldown: async () => ({}) }),
	reset_rolldown: () => {}
}));

const { Alumna } = await import('../src/alumna.js');

function project (files) {
	const cwd = mkdtempSync(join(tmpdir(), 'alumna-app-'));
	for (const [ path, body ] of Object.entries(files)) {
		const full = join(cwd, path);
		mkdirSync(join(full, '..'), { recursive: true });
		writeFileSync(full, body);
	}
	return cwd;
}

const hello = {
	'src/app.js': `
		app.areas = [ 'content' ];
		app.route['/'] = { content: 'Home' };
	`,
	'src/index.html': INDEX_HTML,
	'src/components/Home.svelte': `<p class="x">hi</p><style>.x{color:red}</style>`
};

test('cli src, base, and sourcemap override the file', () => {
	const defaults = new Alumna();
	expect(defaults.config.src).toBe('src');
	expect(defaults.config.build_dir).toBe('build');
	const cwd = project(hello);
	const a = new Alumna({ cwd, src: 'src', base: '/app', sourcemap: true });
	expect(a.config.src).toBe('src');
	expect(a.config.base).toBe('/app');
	expect(a.config.sourcemap).toBe(true);
	const b = new Alumna({ cwd: '' });
	expect(b.cli.cwd).toBe(process.cwd());
});

test('compile missing src', async () => {
	const a = new Alumna({ cwd: mkdtempSync(join(tmpdir(), 'alumna-empty-')) });
	const compiled = await a.compile({ dev: true });
	expect(compiled.ok).toBe(false);
	expect(compiled.errors.src).toMatch(/Missing src/);
});

test('compile missing index.html', async () => {
	const cwd = project({
		'src/app.js': `app.areas = ['content']; app.route['/'] = { content: 'Home' };`
	});
	const a = new Alumna({ cwd });
	expect((await a.compile({ dev: true })).errors['index.html']).toMatch(/index.html/);
});

test('compile success, print helpers, memory_from, close', async () => {
	const cwd = project(hello);
	const a = new Alumna({ cwd });
	const compiled = await a.compile({ dev: true });
	expect(compiled.ok).toBe(true);
	const err = jest.spyOn(console, 'error').mockImplementation(() => {});
	const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
	expect(a.print_errors({})).toBe(false);
	expect(a.print_errors({ x: 'y' })).toBe(true);
	a.print_warnings([ 'w' ]);
	a.print_warnings([]);
	err.mockRestore();
	warn.mockRestore();
	const memory = a.memory_from({
		files: { 'a.js': '1', '/b.js': '2', ...compiled.files },
		import_map: compiled.import_map,
		css_hrefs: compiled.css_hrefs
	});
	expect(memory.has('/a.js')).toBe(true);
	expect(memory.has('/b.js')).toBe(true);
	expect(memory.has('/_alumna/match.js')).toBe(true);
	expect(memory.get('/_alumna/runtime.js').body).toMatch(/mount/);
	await a.close();
});

test('new prints for a named dir and for dot', async () => {
	const cwd = mkdtempSync(join(tmpdir(), 'alumna-new-'));
	const prev = process.cwd();
	process.chdir(cwd);
	const log = jest.spyOn(console, 'log').mockImplementation(() => {});
	try {
		const a = new Alumna({ cwd });
		await a.new('demo');
		expect(log.mock.calls.join(' ')).toMatch(/cd demo/);
		mkdirSync(join(cwd, 'empty'));
		process.chdir(join(cwd, 'empty'));
		await a.new('.');
		expect(log.mock.calls.join(' ')).toMatch(/alumna dev/);
	}
	finally {
		log.mockRestore();
		process.chdir(prev);
	}
});

test('add logs packages', async () => {
	const cwd = mkdtempSync(join(tmpdir(), 'alumna-add-'));
	const a = new Alumna({ cwd });
	const log = jest.spyOn(console, 'log').mockImplementation(() => {});
	const result = await a.add([ 'marked' ]);
	expect(result.names).toEqual([ 'marked' ]);
	expect(log.mock.calls.join(' ')).toMatch(/Added marked/);
	log.mockRestore();
});

test('dev fails on compile error', async () => {
	const a = new Alumna({ cwd: mkdtempSync(join(tmpdir(), 'alumna-bad-')) });
	const err = jest.spyOn(console, 'error').mockImplementation(() => {});
	expect(await a.dev()).toBe(false);
	err.mockRestore();
});

test('dev serves, recompiles, and close', async () => {
	const cwd = project({
		...hello,
		'src/static/hi.txt': 'hi'
	});
	const a = new Alumna({ cwd });
	const log = jest.spyOn(console, 'log').mockImplementation(() => {});
	const err = jest.spyOn(console, 'error').mockImplementation(() => {});
	const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
	expect(await a.dev()).toBe(true);
	const port = a.httpd.server.address().port;
	const html = await (await fetch('http://127.0.0.1:' + port + '/')).text();
	expect(html).toMatch(/importmap/);
	writeFileSync(join(cwd, 'src/components/Home.svelte'), '<p>next</p>');
	await new Promise(resolve => setTimeout(resolve, 200));
	const home_js = await (await fetch('http://127.0.0.1:' + port + '/components/Home.js')).text();
	expect(home_js).toMatch(/next/);
	writeFileSync(join(cwd, 'src/static/hi.txt'), 'hi2');
	await new Promise(resolve => setTimeout(resolve, 200));
	writeFileSync(join(cwd, 'src/components/Unused.svelte'), '<p>no</p>');
	await new Promise(resolve => setTimeout(resolve, 200));
	writeFileSync(join(cwd, 'src/app.js'), 'app.areas = [');
	await new Promise(resolve => setTimeout(resolve, 250));
	const broken = await (await fetch('http://127.0.0.1:' + port + '/')).text();
	expect(broken).toMatch(/could not compile/);
	await a.close();
	log.mockRestore();
	err.mockRestore();
	warn.mockRestore();
});

test('build writes the tree and copies static files', async () => {
	const cwd = project({
		...hello,
		'src/static/hi.txt': 'static'
	});
	const a = new Alumna({ cwd, build_dir: 'out' });
	const log = jest.spyOn(console, 'log').mockImplementation(() => {});
	const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
	expect(await a.build()).toBe(true);
	expect(existsSync(join(cwd, 'out/index.html'))).toBe(true);
	expect(existsSync(join(cwd, 'out/_alumna/runtime.js'))).toBe(true);
	expect(existsSync(join(cwd, 'out/_alumna/match.js'))).toBe(true);
	expect(readFileSync(join(cwd, 'out/hi.txt'), 'utf8')).toBe('static');
	expect(readFileSync(join(cwd, 'out/alumna-manifest.json'), 'utf8')).toMatch(/Home/);
	expect(readFileSync(join(cwd, 'out/_alumna/runtime.js'), 'utf8')).toMatch(/^min:/);
	log.mockRestore();
	warn.mockRestore();
});

test('build without static still works', async () => {
	const cwd = project(hello);
	const a = new Alumna({ cwd });
	const log = jest.spyOn(console, 'log').mockImplementation(() => {});
	expect(await a.build()).toBe(true);
	log.mockRestore();
});

test('build fails on compile error', async () => {
	const a = new Alumna({ cwd: mkdtempSync(join(tmpdir(), 'alumna-bbad-')) });
	const err = jest.spyOn(console, 'error').mockImplementation(() => {});
	expect(await a.build()).toBe(false);
	err.mockRestore();
});

test('preview refuses a missing build', async () => {
	const a = new Alumna({ cwd: mkdtempSync(join(tmpdir(), 'alumna-prev-')) });
	const err = jest.spyOn(console, 'error').mockImplementation(() => {});
	expect(await a.preview()).toBe(false);
	err.mockRestore();
});

test('preview serves build/', async () => {
	const cwd = project(hello);
	const a = new Alumna({ cwd });
	const log = jest.spyOn(console, 'log').mockImplementation(() => {});
	await a.build();
	expect(await a.preview()).toBe(true);
	const port = a.httpd.server.address().port;
	const html = await (await fetch('http://127.0.0.1:' + port + '/')).text();
	expect(html).toMatch(/html/);
	await a.close();
	log.mockRestore();
});

test('hjson base, title, port, and runtime rewrite', async () => {
	const cwd = project({
		...hello,
		'alumna.hjson': 'base: /app\ntitle: Demo\nbuild_dir: dist\nsourcemap: true'
	});
	const a = new Alumna({ cwd });
	expect(a.config.base).toBe('/app');
	expect(a.config.title).toBe('Demo');
	expect(a.config.build_dir).toBe('dist');
	expect(a.config.sourcemap).toBe(true);
	const compiled = await a.compile({ dev: true });
	expect(compiled.ok).toBe(true);
	expect(compiled.config.base).toBe('/app');
	const memory = a.memory_from(compiled);
	expect(memory.get('/_alumna/runtime.js').body).toMatch(/from '\/app\/_alumna\//);
	expect(a.html(compiled)).toMatch(/Demo/);
	expect(a.html(compiled)).toMatch(/\/app\/_alumna\/runtime\.js/);
});

test('cli port is required and overrides hjson', async () => {
	const cwd = project({
		...hello,
		'alumna.hjson': 'port: 39990'
	});
	const a = new Alumna({ cwd, port: 39991 });
	expect(a.config.port).toBe(39991);
	expect(a.port_required()).toBe(true);
	const b = new Alumna({ cwd });
	expect(b.config.port).toBe(39990);
	expect(b.port_required()).toBe(false);
	const c = new Alumna({ cwd, port: Number('nope') });
	expect(c.port_required()).toBe(false);
});

test('html() uses last_compiled when no argument', async () => {
	const cwd = project(hello);
	const a = new Alumna({ cwd });
	expect(a.html()).toMatch(/importmap/);
	a.last_compiled = await a.compile({ dev: true });
	expect(a.html()).toMatch(/importmap/);
});

test('compile with no args and html extra opts', async () => {
	const cwd = project(hello);
	const a = new Alumna({ cwd });
	const compiled = await a.compile();
	expect(compiled.ok).toBe(true);
	expect(a.html(compiled, { css_hrefs: [ '/x.css' ], ssg: true, import_map: { imports: {} } })).toMatch(/x\.css/);
});

test('build ssg writes per-route html and spa shell', async () => {
	const cwd = project({
		'src/app.js': `
			app.areas = [ 'content' ];
			app.route['/'] = { content: 'Home' };
			app.route['/about'] = { content: 'About' };
			app.route['/users/:id'] = { content: 'User' };
			app.route['/old'] = { redirect: '/about' };
		`,
		'src/index.html': INDEX_HTML,
		'src/components/Home.svelte': `<p>Welcome home</p>`,
		'src/components/About.svelte': `<p>About page</p>`,
		'src/components/User.svelte': `<p>User</p>`
	});
	const a = new Alumna({ cwd, ssg: true });
	const log = jest.spyOn(console, 'log').mockImplementation(() => {});
	const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
	expect(await a.build()).toBe(true);
	expect(readFileSync(join(cwd, 'build/index.html'), 'utf8')).toMatch(/Welcome home/);
	expect(readFileSync(join(cwd, 'build/index.html'), 'utf8')).toMatch(/data-alumna-ssg/);
	expect(readFileSync(join(cwd, 'build/about/index.html'), 'utf8')).toMatch(/About page/);
	expect(existsSync(join(cwd, 'build/users'))).toBe(false);
	expect(readFileSync(join(cwd, 'build/_alumna/spa.html'), 'utf8')).not.toMatch(/data-alumna-ssg/);
	expect(readFileSync(join(cwd, 'build/alumna-manifest.json'), 'utf8')).toMatch(/"ssg": true/);
	expect(readFileSync(join(cwd, 'build/_alumna/ssg-data.js'), 'utf8')).toMatch(/export default/);
	expect(log.mock.calls.join(' ')).toMatch(/SSG wrote/);
	log.mockRestore();
	warn.mockRestore();
});

test('hjson ssg true and only param routes keep a spa index', async () => {
	const cwd = project({
		...hello,
		'src/app.js': `
			app.areas = [ 'content' ];
			app.route['/users/:id'] = { content: 'Home' };
		`,
		'alumna.hjson': 'ssg: true'
	});
	const a = new Alumna({ cwd });
	expect(a.config.ssg).toBe(true);
	const log = jest.spyOn(console, 'log').mockImplementation(() => {});
	expect(await a.build()).toBe(true);
	expect(readFileSync(join(cwd, 'build/index.html'), 'utf8')).not.toMatch(/data-alumna-ssg/);
	expect(existsSync(join(cwd, 'build/_alumna/spa.html'))).toBe(true);
	log.mockRestore();
});

test('build ssg fails when render throws', async () => {
	const cwd = project({
		...hello,
		'src/components/Home.svelte': `<script>if (typeof window === 'undefined') throw new Error('ssg-boom');</script><p>x</p>`
	});
	const a = new Alumna({ cwd, ssg: true });
	const log = jest.spyOn(console, 'log').mockImplementation(() => {});
	const err = jest.spyOn(console, 'error').mockImplementation(() => {});
	const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
	expect(await a.build()).toBe(false);
	expect(err.mock.calls.join(' ')).toMatch(/ssg/);
	log.mockRestore();
	err.mockRestore();
	warn.mockRestore();
});

test('build ssg skips middleware routes and writes prerender pages', async () => {
	const cwd = project({
		'src/app.js': `
			app.areas = [ 'content' ];
			app.route['/'] = { content: 'Home' };
			app.route['/dash'] = { content: 'Dash', middleware: [ 'auth' ] };
			app.route['/blog/:slug'] = { content: 'Post', prerender: [ { slug: 'hello' } ] };
		`,
		'src/index.html': INDEX_HTML,
		'src/middlewares/auth.js': 'export default function auth (c, n) { return n(); }',
		'src/components/Home.svelte': `<p>Welcome home</p>`,
		'src/components/Dash.svelte': `<p>dash</p>`,
		'src/components/Post.svelte': `<p>hello post</p>`
	});
	const a = new Alumna({ cwd, ssg: true });
	const log = jest.spyOn(console, 'log').mockImplementation(() => {});
	const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
	expect(await a.build()).toBe(true);
	expect(readFileSync(join(cwd, 'build/index.html'), 'utf8')).toMatch(/Welcome home/);
	expect(existsSync(join(cwd, 'build/dash'))).toBe(false);
	expect(readFileSync(join(cwd, 'build/blog/hello/index.html'), 'utf8')).toMatch(/hello post/);
	const manifest = JSON.parse(readFileSync(join(cwd, 'build/alumna-manifest.json'), 'utf8'));
	expect(manifest.lookup['/blog/hello']).toEqual([ '/blog/hello' ]);
	expect(manifest.lookup['/blog/:slug']).toEqual([ '/blog/hello' ]);
	log.mockRestore();
	warn.mockRestore();
});

test('rebuild writes one page and listen_rebuild accepts notify', async () => {
	const cwd = project({
		'src/app.js': `
			app.areas = [ 'content' ];
			app.route['/'] = { content: 'Home' };
			app.route['/blog/:slug'] = { content: 'Post', prerender: [ { slug: 'hello' } ] };
		`,
		'src/index.html': INDEX_HTML,
		'src/components/Home.svelte': `<p>Welcome home</p>`,
		'src/components/Post.svelte': `<script>import { route } from 'alumna';</script><p>post {route.params.slug}</p>`
	});
	const a = new Alumna({ cwd, ssg: true });
	const log = jest.spyOn(console, 'log').mockImplementation(() => {});
	const err = jest.spyOn(console, 'error').mockImplementation(() => {});
	const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
	expect(await a.build()).toBe(true);
	unlinkSync(join(cwd, 'build/_alumna/ssg-data.js'));
	expect(await a.rebuild({ route: '/blog/world' })).toBe(true);
	expect(readFileSync(join(cwd, 'build/blog/world/index.html'), 'utf8')).toMatch(/post world/);
	expect(readFileSync(join(cwd, 'build/_alumna/ssg-data.js'), 'utf8')).toMatch(/export default/);
	const manifest = JSON.parse(readFileSync(join(cwd, 'build/alumna-manifest.json'), 'utf8'));
	expect(manifest.prerender).toContain('/blog/world');
	expect(manifest.lookup['/blog/world']).toEqual([ '/blog/world' ]);
	expect(await a.rebuild({ id: '/blog/hello' })).toBe(true);
	expect(await a.rebuild({ routes: [ '/blog/hello', '/blog/hello' ] })).toBe(true);
	expect(await a.rebuild({ routes: [ '' ] })).toBe(false);
	expect(await a.rebuild({ contentId: 'missing' })).toBe(false);
	expect(await a.rebuild({})).toBe(false);
	expect(await a.rebuild({ ids: [ '/no-such' ] })).toBe(false);
	expect(await a.listen_rebuild()).toBe(true);
	const port = a.httpd.server.address().port;
	const res = await fetch('http://127.0.0.1:' + port + '/notify', {
		method: 'POST',
		headers: { 'content-type': 'application/json' },
		body: JSON.stringify({ route: '/blog/hello' })
	});
	expect(res.status).toBe(200);
	await a.close();
	writeFileSync(join(cwd, 'src/app.js'), 'app.areas = [');
	expect(await a.rebuild({ route: '/' })).toBe(false);
	const junk = project(hello);
	mkdirSync(join(junk, 'build'));
	writeFileSync(join(junk, 'build/alumna-manifest.json'), '{bad');
	const broken = new Alumna({ cwd: junk });
	expect(await broken.rebuild({ route: '/' })).toBe(false);
	const missing = new Alumna({ cwd: mkdtempSync(join(tmpdir(), 'alumna-noreb-')) });
	expect(await missing.rebuild({ route: '/' })).toBe(false);
	expect(await missing.rebuild()).toBe(false);
	expect(await missing.listen_rebuild()).toBe(false);
	log.mockRestore();
	err.mockRestore();
	warn.mockRestore();
});

test('setup and route_data', async () => {
	const log = jest.spyOn(console, 'log').mockImplementation(() => {});
	const a = new Alumna({ cwd: mkdtempSync(join(tmpdir(), 'alumna-setup-')) });
	expect(await a.setup()).toBe('/tmp/alumna-rolldown-cache');
	expect(await a.route_data('/')).toBeUndefined();
	a.last_compiled = {
		routes: {
			'/': { data: async () => ({ n: 1 }) },
			'/about': { areas: {} }
		}
	};
	expect(await a.route_data('/')).toEqual({ n: 1 });
	expect(await a.route_data('/missing')).toBeUndefined();
	expect(await a.route_data('/about')).toBeUndefined();
	log.mockRestore();
});

test('dev data endpoint calls route_data', async () => {
	const cwd = project({
		'src/app.js': `
			app.areas = [ 'content' ];
			app.route['/'] = { content: 'Home', data: async () => ({ n: 7 }) };
		`,
		'src/index.html': INDEX_HTML,
		'src/components/Home.svelte': `<script>let { data } = $props();</script><p>{data.n}</p>`
	});
	const a = new Alumna({ cwd });
	const log = jest.spyOn(console, 'log').mockImplementation(() => {});
	const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
	expect(await a.dev()).toBe(true);
	const port = a.httpd.server.address().port;
	const res = await fetch('http://127.0.0.1:' + port + '/_alumna/data?path=/');
	expect(res.status).toBe(200);
	expect(await res.json()).toEqual({ n: 7 });
	await a.close();
	log.mockRestore();
	warn.mockRestore();
});
