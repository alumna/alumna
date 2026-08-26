import { jest } from '@jest/globals';
import { mkdtempSync, mkdirSync, writeFileSync, existsSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { INDEX_HTML } from './helpers/fixture.js';

const fake_vendor = mkdtempSync(join(tmpdir(), 'alumna-fake-vendor-'));
writeFileSync(join(fake_vendor, 'ok.js'), '1');

jest.unstable_mockModule('../src/dev/vendor-svelte.js', () => ({
	ensure_svelte_vendor: () => fake_vendor,
	import_map: () => ({
		imports: {
			svelte: '/_alumna/svelte/index-client.js',
			alumna: '/_alumna/runtime.js'
		}
	}),
	vendor_dir: () => fake_vendor,
	vendor_ready: () => true,
	svelte_version: () => '0',
	find_bun: () => 'bun',
	build_svelte_vendor: () => fake_vendor
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

test('constructor defaults', () => {
	const a = new Alumna();
	expect(a.config.src).toBe('src');
	expect(a.config.build_dir).toBe('build');
});

test('compile missing src', () => {
	const a = new Alumna({ cwd: mkdtempSync(join(tmpdir(), 'alumna-empty-')) });
	const compiled = a.compile({ dev: true });
	expect(compiled.ok).toBe(false);
	expect(compiled.errors.src).toMatch(/Missing src/);
});

test('compile missing index.html', () => {
	const cwd = project({
		'src/app.js': `app.areas = ['content']; app.route['/'] = { content: 'Home' };`
	});
	const a = new Alumna({ cwd });
	expect(a.compile({ dev: true }).errors['index.html']).toMatch(/index.html/);
});

test('compile success, print helpers, memory_from, close', async () => {
	const cwd = project(hello);
	const a = new Alumna({ cwd });
	const compiled = a.compile({ dev: true });
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
		files: { 'a.js': '1', '/b.js': '2', ...compiled.files }
	});
	expect(memory.has('/a.js')).toBe(true);
	expect(memory.has('/b.js')).toBe(true);
	expect(memory.has('/_alumna/match.js')).toBe(true);
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
