import { jest } from '@jest/globals';
import { mkdtempSync, mkdirSync, writeFileSync, existsSync, readFileSync } from 'node:fs';
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
