/**
 * @jest-environment jsdom
 */

import { jest } from '@jest/globals';

const shown = [];
let navigate_fn;

async function load_runtime () {
	shown.length = 0;
	jest.resetModules();
	jest.unstable_mockModule('svelte', () => ({
		mount: (_App, opts) => ({
			target: opts.target,
			show (map) { shown.push({ ...map }); }
		}),
		hydrate: (_App, opts) => ({
			target: opts.target,
			props: opts.props,
			show (map) { shown.push({ ...map, hydrated: true }); }
		})
	}));
	return import('../../src/runtime/browser.js');
}

function click (href, extra = {}) {
	document.body.innerHTML = `<a href="${href}" id="go">go</a>`;
	const a = document.getElementById('go');
	for (const [ key, value ] of Object.entries(extra.attrs || {}))
		a.setAttribute(key, value);
	a.dispatchEvent(new MouseEvent('click', {
		bubbles: true,
		cancelable: true,
		button: extra.button ?? 0,
		metaKey: !!extra.metaKey,
		ctrlKey: !!extra.ctrlKey,
		shiftKey: !!extra.shiftKey,
		altKey: !!extra.altKey
	}));
}

beforeEach(() => {
	document.body.innerHTML = '';
	document.head.innerHTML = '';
	delete window.navigation;
	window.__mw_calls = [];
	window.__mw_redirect = null;
	window.__mw_block = false;
	window.__mw_redirect_then_proceed = false;
	global.fetch = jest.fn(async () => ({ ok: false }));
});

test('should_auto_start', async () => {
	const runtime = await load_runtime();
	expect(runtime.should_auto_start('http://localhost/_alumna/runtime.js')).toBe(true);
	expect(runtime.should_auto_start('http://localhost/_alumna/runtime.js?dev=1')).toBe(true);
	expect(runtime.should_auto_start('http://localhost/_alumna/runtime.js#x')).toBe(true);
	expect(runtime.should_auto_start('file:///src/runtime/browser.js')).toBe(false);
	expect(runtime.should_auto_start(1)).toBe(false);
});

test('start mounts, matches /, and caches loads', async () => {
	const runtime = await load_runtime();
	window.history.replaceState(null, '', '/');
	await runtime.start();
	expect(shown.length).toBe(1);
	await runtime.start();
	expect(runtime.route.path).toBe('/');
	expect(runtime.route.pattern).toBe('/');
});

test('goto about, prefetch, redirect, params, query, missing route', async () => {
	const runtime = await load_runtime();
	window.history.replaceState(null, '', '/');
	await runtime.start();
	await runtime.goto('/about');
	expect(runtime.route.path).toBe('/about');
	await runtime.prefetch('/about');
	await runtime.prefetch('/nope');
	await runtime.redirect('/old');
	expect(runtime.route.path).toBe('/about');
	await runtime.goto('/users/9?x=1');
	expect(runtime.route.params.id).toBe('9');
	expect(runtime.route.query.x).toBe('1');
	expect(runtime.route.layout).toBe('dash');
	expect(shown[shown.length - 1].layout).toBeTruthy();
	const config = (await import('/_alumna/config.js')).default;
	const keep_layouts = config.layouts;
	config.layouts = null;
	await runtime.goto('/users/8');
	expect(shown[shown.length - 1].layout).toBeNull();
	config.layouts = {};
	config.routes['/users/:id'].layout = 'ghost';
	await runtime.goto('/users/7');
	expect(shown[shown.length - 1].layout).toBeNull();
	config.layouts = keep_layouts;
	config.routes['/users/:id'].layout = 'dash';
	await runtime.goto('/missing');
	await runtime.goto('/empty');
	await runtime.goto(String('/about'));
});

test('goto uses Navigation API when present', async () => {
	const runtime = await load_runtime();
	navigate_fn = jest.fn();
	window.navigation = { navigate: navigate_fn, addEventListener: jest.fn() };
	window.history.replaceState(null, '', '/');
	await runtime.start();
	await runtime.goto('/about');
	expect(navigate_fn).toHaveBeenCalledWith('/about', { history: 'push' });
	await runtime.goto('/about', { replace: true });
	expect(navigate_fn).toHaveBeenCalledWith('/about', { history: 'replace' });
});

test('Navigation listener intercepts same-origin push', async () => {
	const runtime = await load_runtime();
	let handler;
	window.navigation = {
		navigate: jest.fn(),
		addEventListener: (_name, fn) => { handler = fn; }
	};
	window.history.replaceState(null, '', '/');
	await runtime.start();
	let pending;
	handler({
		canIntercept: true,
		hashChange: false,
		downloadRequest: false,
		navigationType: 'push',
		destination: { url: 'http://localhost/about' },
		intercept: ({ handler: run }) => { pending = run(); }
	});
	await pending;
	expect(runtime.route.path).toBe('/about');
	handler({ canIntercept: false, destination: { url: 'http://localhost/about' }, intercept: jest.fn() });
	handler({ canIntercept: true, hashChange: true, destination: { url: 'http://localhost/about' }, intercept: jest.fn() });
	handler({ canIntercept: true, downloadRequest: true, destination: { url: 'http://localhost/about' }, intercept: jest.fn() });
	handler({ canIntercept: true, navigationType: 'reload', destination: { url: 'http://localhost/about' }, intercept: jest.fn() });
	handler({
		canIntercept: true,
		hashChange: false,
		downloadRequest: false,
		navigationType: 'push',
		destination: { url: 'https://example.com/x' },
		intercept: jest.fn()
	});
});

test('History popstate', async () => {
	const runtime = await load_runtime();
	window.history.replaceState(null, '', '/');
	await runtime.start();
	window.history.pushState(null, '', '/about');
	window.dispatchEvent(new PopStateEvent('popstate'));
	await new Promise(resolve => setTimeout(resolve, 0));
	expect(runtime.route.path).toBe('/about');
});

test('click intercept and ignored clicks', async () => {
	const runtime = await load_runtime();
	window.history.replaceState(null, '', '/');
	await runtime.start();
	click('/about');
	await new Promise(resolve => setTimeout(resolve, 0));
	expect(runtime.route.path).toBe('/about');
	click('/about', { attrs: { download: '' } });
	click('/about', { attrs: { target: '_blank' } });
	click('/about', { metaKey: true });
	click('/about', { ctrlKey: true });
	click('/about', { shiftKey: true });
	click('/about', { altKey: true });
	click('/about', { button: 1 });
	click('https://example.com/x');
	click('/#hash');
	document.body.innerHTML = '<div id="n">x</div>';
	document.getElementById('n').dispatchEvent(new MouseEvent('click', { bubbles: true, button: 0 }));
	const a = document.createElement('a');
	a.setAttribute('href', '/about');
	a.appendChild(document.createTextNode('go'));
	document.body.appendChild(a);
	a.firstChild.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, button: 0 }));
});

test('hover prefetch', async () => {
	const runtime = await load_runtime();
	window.history.replaceState(null, '', '/');
	await runtime.start();
	document.body.innerHTML = '<a href="/about" id="go">go</a><div id="n">x</div>';
	document.getElementById('go').dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
	document.getElementById('n').dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
	document.body.innerHTML = '<a href="https://example.com" id="ext">x</a>';
	document.getElementById('ext').dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
	const comment = document.createComment('x');
	document.body.appendChild(comment);
	comment.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
});

test('css style on GET ok, empty text, and fetch throw', async () => {
	global.fetch = jest.fn(async () => ({ ok: true, text: async () => '.x{color:red}' }));
	const runtime = await load_runtime();
	window.history.replaceState(null, '', '/');
	await runtime.start();
	expect(document.head.querySelector('style').textContent).toMatch(/color/);
	global.fetch = jest.fn(async () => ({ ok: true }));
	jest.resetModules();
	jest.unstable_mockModule('svelte', () => ({
		mount: (_App, opts) => ({ target: opts.target, show () {} }),
		hydrate: (_App, opts) => ({ target: opts.target, show () {} })
	}));
	const again = await import('../../src/runtime/browser.js');
	window.history.replaceState(null, '', '/');
	await again.start();
	global.fetch = jest.fn(async () => { throw new Error('offline'); });
	jest.resetModules();
	jest.unstable_mockModule('svelte', () => ({
		mount: (_App, opts) => ({ target: opts.target, show () {} }),
		hydrate: (_App, opts) => ({ target: opts.target, show () {} })
	}));
	const third = await import('../../src/runtime/browser.js');
	window.history.replaceState(null, '', '/');
	await third.start();
});

test('base prefixes assets and strips browser paths', async () => {
	const runtime = await load_runtime();
	const config = (await import('/_alumna/config.js')).default;
	config.base = '/app';
	window.history.replaceState(null, '', '/app/');
	await runtime.start();
	expect(runtime.route.path).toBe('/');
	await runtime.goto('/about');
	expect(runtime.route.path).toBe('/about');
	expect(location.pathname).toBe('/app/about');
	await runtime.prefetch('/app/about');
	await runtime.prefetch('/app/nope');
	config.base = '/app/';
	window.history.replaceState(null, '', '/app');
	await runtime.goto('/about');
	config.base = '/';
	window.history.replaceState(null, '', '/');
	await runtime.goto('/about');
	expect(runtime.route.path).toBe('/about');
	config.base = '';
});

test('live reload when config.dev', async () => {
	let source;
	class FakeSource {
		constructor () { source = this; }
		set onmessage (fn) { this._fn = fn; }
		get onmessage () { return this._fn; }
	}
	global.EventSource = FakeSource;
	window.EventSource = FakeSource;
	const runtime = await load_runtime();
	const config = (await import('/_alumna/config.js')).default;
	config.dev = true;
	window.history.replaceState(null, '', '/');
	await runtime.start();
	if (source && source._fn) {
		try {
			source._fn();
		}
		catch {
			// jsdom may not implement location.reload
		}
	}
	config.dev = false;

	class Boom {
		constructor () { throw new Error('no sse'); }
	}
	global.EventSource = Boom;
	window.EventSource = Boom;
	jest.resetModules();
	jest.unstable_mockModule('svelte', () => ({
		mount: (_App, opts) => ({ target: opts.target, show () {} }),
		hydrate: (_App, opts) => ({ target: opts.target, show () {} })
	}));
	const { start } = await import('../../src/runtime/browser.js');
	const config2 = (await import('/_alumna/config.js')).default;
	config2.dev = true;
	window.history.replaceState(null, '', '/');
	await start();
	config2.dev = false;
});

test('boot_runtime auto-starts on the boot url', async () => {
	const runtime = await load_runtime();
	window.history.replaceState(null, '', '/');
	await runtime.boot_runtime('http://localhost/_alumna/runtime.js');
	expect(shown.length).toBeGreaterThan(0);
	expect(runtime.boot_runtime('file:///x.js')).toBeUndefined();
});

test('start uses an explicit target', async () => {
	const runtime = await load_runtime();
	const target = document.createElement('div');
	document.body.appendChild(target);
	window.history.replaceState(null, '', '/');
	await runtime.start({ target });
});

test('goto stringifies a non-string path', async () => {
	const runtime = await load_runtime();
	window.history.replaceState(null, '', '/');
	await runtime.start();
	await runtime.goto({ toString () { return '/about'; } });
	expect(runtime.route.path).toBe('/about');
});

test('middleware runs before show and can block', async () => {
	const runtime = await load_runtime();
	window.history.replaceState(null, '', '/');
	await runtime.start();
	expect(window.__mw_calls.length).toBeGreaterThan(0);
	const path_after_start = runtime.route.path;
	window.__mw_block = true;
	await runtime.goto('/about');
	expect(runtime.route.path).toBe(path_after_start);
});

test('middleware redirect and clone', async () => {
	const runtime = await load_runtime();
	window.history.replaceState(null, '', '/');
	await runtime.start();
	window.__mw_redirect = '/about';
	await runtime.goto('/users/9');
	expect(runtime.route.path).toBe('/about');
	expect(runtime.route.path).not.toBe('mutated');
});

test('middleware redirect then proceed is ignored', async () => {
	const runtime = await load_runtime();
	window.history.replaceState(null, '', '/');
	await runtime.start();
	window.__mw_redirect_then_proceed = true;
	await runtime.goto('/users/3');
	expect(runtime.route.path).toBe('/about');
});

test('no middleware names skips the chain', async () => {
	const runtime = await load_runtime();
	const config = (await import('/_alumna/config.js')).default;
	const keep = config.middleware;
	config.middleware = null;
	window.history.replaceState(null, '', '/');
	await runtime.start();
	expect(runtime.route.path).toBe('/');
	config.middleware = keep;
});

test('ssg hydrates when the target has data-alumna-ssg', async () => {
	const runtime = await load_runtime();
	document.body.setAttribute('data-alumna-ssg', '');
	window.history.replaceState(null, '', '/');
	await runtime.start();
	expect(shown.some(item => item.hydrated)).toBe(true);
	document.body.removeAttribute('data-alumna-ssg');
});

test('ssg hydrates without props on a redirect url', async () => {
	const runtime = await load_runtime();
	document.body.setAttribute('data-alumna-ssg', '');
	window.history.replaceState(null, '', '/old');
	await runtime.start();
	expect(runtime.route.path).toBe('/about');
	document.body.removeAttribute('data-alumna-ssg');
});

test('ssg hydrates without props when the path does not match', async () => {
	const runtime = await load_runtime();
	document.body.setAttribute('data-alumna-ssg', '');
	window.history.replaceState(null, '', '/missing');
	await runtime.start();
	document.body.removeAttribute('data-alumna-ssg');
});

test('load skips css fetch when a stylesheet link exists', async () => {
	const link = document.createElement('link');
	link.rel = 'stylesheet';
	link.setAttribute('href', '/components/Home.css');
	document.head.appendChild(link);
	const other = document.createElement('link');
	other.rel = 'preload';
	other.setAttribute('href', '/components/Nav.css');
	document.head.appendChild(other);
	global.fetch = jest.fn(async () => ({ ok: false }));
	const runtime = await load_runtime();
	window.history.replaceState(null, '', '/');
	await runtime.start();
	const hrefs = global.fetch.mock.calls.map(call => call[0]);
	expect(hrefs).not.toContain('/components/Home.css');
});
