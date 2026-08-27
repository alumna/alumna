import { mkdtempSync, mkdirSync, writeFileSync, cpSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { chromium } from 'playwright';
import { Alumna } from '../../src/alumna.js';
import { alumna_root } from '../../src/utils/paths.js';
import { INDEX_HTML } from '../helpers/fixture.js';

function project (files) {
	const cwd = mkdtempSync(join(tmpdir(), 'alumna-e2e-'));
	for (const [ path, body ] of Object.entries(files)) {
		const full = join(cwd, path);
		mkdirSync(join(full, '..'), { recursive: true });
		writeFileSync(full, body);
	}
	return cwd;
}

async function with_browser (run) {
	const browser = await chromium.launch({ headless: true });
	try {
		return await run(browser);
	}
	finally {
		await browser.close();
	}
}

test('Hello in Chromium via alumna dev', async () => {
	const cwd = mkdtempSync(join(tmpdir(), 'alumna-hello-'));
	cpSync(join(alumna_root, 'scaffold'), cwd, { recursive: true });
	const a = new Alumna({ cwd });
	expect(await a.dev()).toBe(true);
	const port = a.httpd.server.address().port;
	try {
		await with_browser(async browser => {
			const page = await browser.newPage();
			const errors = [];
			page.on('pageerror', error => errors.push(String(error)));
			page.on('console', msg => {
				if (msg.type() === 'error')
					errors.push(msg.text());
			});
			await page.goto('http://127.0.0.1:' + port + '/', { waitUntil: 'load' });
			try {
				await page.waitForSelector('.hello', { timeout: 15000 });
			}
			catch (error) {
				throw new Error(
					'Hello did not render.\npage errors: ' + errors.join('; ') +
					'\nhtml: ' + (await page.content()).slice(0, 2000)
				);
			}
			expect(await page.textContent('.hello')).toMatch(/Welcome to Alumna/);
		});
	}
	finally {
		await a.close();
	}
}, 60000);

test('SSG hydrate then SPA click in Chromium', async () => {
	const cwd = project({
		'src/app.js': `
			app.areas = [ 'content' ];
			app.route['/'] = { content: 'Home' };
			app.route['/about'] = { content: 'About' };
		`,
		'src/index.html': INDEX_HTML,
		'src/components/Home.svelte': `<p>Welcome home</p><a href="/about">About</a>`,
		'src/components/About.svelte': `<p>About page</p>`
	});
	const a = new Alumna({ cwd, ssg: true });
	expect(await a.build()).toBe(true);
	expect(await a.preview()).toBe(true);
	const port = a.httpd.server.address().port;
	try {
		await with_browser(async browser => {
			const page = await browser.newPage();
			await page.goto('http://127.0.0.1:' + port + '/', { waitUntil: 'load' });
			expect(await page.getAttribute('body', 'data-alumna-ssg')).not.toBeNull();
			expect(await page.textContent('body')).toMatch(/Welcome home/);
			await page.click('a[href="/about"]');
			await page.waitForFunction(() => document.body.textContent.includes('About page'));
			expect(await page.textContent('body')).toMatch(/About page/);
			await page.goto('http://127.0.0.1:' + port + '/about', { waitUntil: 'load' });
			expect(await page.getAttribute('body', 'data-alumna-ssg')).not.toBeNull();
			expect(await page.textContent('body')).toMatch(/About page/);
		});
	}
	finally {
		await a.close();
	}
}, 60000);

test('SSG Q44 prerender, middleware skip, and rebuild in Chromium', async () => {
	const cwd = project({
		'src/app.js': `
			app.areas = [ 'content' ];
			app.route['/'] = { content: 'Home' };
			app.route['/dash'] = { content: 'Dash', middleware: [ 'auth' ] };
			app.route['/blog/:slug'] = {
				content: 'Post',
				prerender: [ { slug: 'hello' } ]
			};
		`,
		'src/index.html': INDEX_HTML,
		'src/middlewares/auth.js': 'export default function auth (c, n) { return n(); }',
		'src/components/Home.svelte': `<p>Welcome home</p><a href="/blog/hello">Post</a>`,
		'src/components/Dash.svelte': `<p>secret dash</p>`,
		'src/components/Post.svelte': `<script>import { route } from 'alumna';</script><p>post {route.params.slug}</p>`
	});
	const a = new Alumna({ cwd, ssg: true });
	expect(await a.build()).toBe(true);
	expect(await a.rebuild({ route: '/blog/world' })).toBe(true);
	expect(await a.preview()).toBe(true);
	const port = a.httpd.server.address().port;
	try {
		await with_browser(async browser => {
			const page = await browser.newPage();
			await page.goto('http://127.0.0.1:' + port + '/', { waitUntil: 'load' });
			expect(await page.getAttribute('body', 'data-alumna-ssg')).not.toBeNull();
			await page.click('a[href="/blog/hello"]');
			await page.waitForFunction(() => document.body.textContent.includes('post hello'));
			await page.goto('http://127.0.0.1:' + port + '/blog/hello', { waitUntil: 'load' });
			expect(await page.getAttribute('body', 'data-alumna-ssg')).not.toBeNull();
			expect(await page.textContent('body')).toMatch(/post hello/);
			await page.goto('http://127.0.0.1:' + port + '/blog/world', { waitUntil: 'load' });
			expect(await page.getAttribute('body', 'data-alumna-ssg')).not.toBeNull();
			expect(await page.textContent('body')).toMatch(/post world/);
			await page.goto('http://127.0.0.1:' + port + '/dash', { waitUntil: 'load' });
			expect(await page.getAttribute('body', 'data-alumna-ssg')).toBeNull();
		});
	}
	finally {
		await a.close();
	}
}, 60000);

test('SSG data() hydrates in Chromium', async () => {
	const cwd = project({
		'src/app.js': `
			app.areas = [ 'content' ];
			app.route['/'] = {
				content: 'Home',
				data: async () => ({ title: 'Home title' })
			};
			app.route['/about'] = {
				content: 'About',
				data: async () => ({ title: 'About title' })
			};
		`,
		'src/index.html': INDEX_HTML,
		'src/components/Home.svelte': `<script>let { data } = $props();</script><p>{data.title}</p><a href="/about">About</a>`,
		'src/components/About.svelte': `<script>let { data } = $props();</script><p>{data.title}</p>`
	});
	const a = new Alumna({ cwd, ssg: true });
	expect(await a.build()).toBe(true);
	expect(await a.preview()).toBe(true);
	const port = a.httpd.server.address().port;
	try {
		await with_browser(async browser => {
			const page = await browser.newPage();
			await page.goto('http://127.0.0.1:' + port + '/', { waitUntil: 'load' });
			expect(await page.textContent('body')).toMatch(/Home title/);
			await page.click('a[href="/about"]');
			await page.waitForFunction(() => document.body.textContent.includes('About title'));
			await page.goto('http://127.0.0.1:' + port + '/about', { waitUntil: 'load' });
			expect(await page.textContent('body')).toMatch(/About title/);
		});
	}
	finally {
		await a.close();
	}
}, 60000);
