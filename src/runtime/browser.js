import { mount, hydrate } from 'svelte';
import App from '/_alumna/app.js';
import config from '/_alumna/config.js';
import { match_path, parse_query } from '/_alumna/match.js';

const loaded = new Map();
const loaded_mw = new Map();
let app;
let started = false;
const current = { path: '', pattern: '', params: {}, query: {}, layout: null };

export const route = current;

export function should_auto_start (meta_url) {
	return typeof meta_url === 'string' && /\/_alumna\/runtime\.js(\?|#|$)/.test(meta_url);
}

function asset (path) {
	return base_prefix() + path;
}

function base_prefix () {
	let base = config.base || '';
	if (base === '/')
		return '';
	if (base.endsWith('/'))
		base = base.slice(0, -1);
	return base;
}

function app_pathname (pathname) {
	const base = base_prefix();
	if (!base)
		return pathname;
	if (pathname === base || pathname === base + '/')
		return '/';
	if (pathname.startsWith(base + '/'))
		return pathname.slice(base.length);
	return pathname;
}

function browser_pathname (pathname) {
	return asset(app_pathname(pathname));
}

function has_stylesheet (href) {
	const nodes = document.getElementsByTagName('link');
	for (let i = 0; i < nodes.length; i++) {
		if (nodes[i].rel === 'stylesheet' && nodes[i].getAttribute('href') === href)
			return true;
	}
	return false;
}

// Load a component once. Fetch CSS first so paint does not flash unstyled.
async function load (name) {
	if (loaded.has(name))
		return loaded.get(name);

	const href = asset('/components/' + name + '.css');
	if (!has_stylesheet(href)) {
		try {
			const probe = await fetch(href);
			if (probe.ok) {
				const css = typeof probe.text === 'function' ? await probe.text() : '';
				if (css) {
					const style = document.createElement('style');
					style.textContent = css;
					document.head.appendChild(style);
				}
			}
		}
		catch {
			// no external css — injected styles live in the module
		}
	}

	const mod = await import(asset('/components/' + name + '.js'));
	loaded.set(name, mod.default);
	return mod.default;
}

async function load_all (names) {
	await Promise.all((names || []).map(load));
}

function area_map (route_def) {
	const map = {};
	for (const area of config.areas) {
		const name = route_def.areas[area];
		map[area] = name ? loaded.get(name) : undefined;
	}
	return map;
}

// Layout name on the route maps to the layout component constructor.
function layout_ctor (route_def) {
	if (!route_def.layout || !config.layouts)
		return null;
	const def = config.layouts[route_def.layout];
	return def ? loaded.get(def.component) : null;
}

export async function goto (path, { replace = false } = {}) {
	const raw = typeof path === 'string' ? path : String(path);
	const url = new URL(raw, location.href);
	url.pathname = browser_pathname(url.pathname);
	const href = url.pathname + url.search + url.hash;
	if (window.navigation) {
		navigation.navigate(href, { history: replace ? 'replace' : 'push' });
		return;
	}
	if (replace)
		history.replaceState(null, '', href);
	else
		history.pushState(null, '', href);
	await show_url(url);
}

export function redirect (path) {
	return goto(path, { replace: true });
}

export async function prefetch (path) {
	const url = new URL(path, location.href);
	const hit = match_path(app_pathname(url.pathname), config.routes);
	if (!hit)
		return;
	await load_all(config.deps[hit.pattern]);
}

function clone_route (state) {
	return {
		path: state.path,
		pattern: state.pattern,
		params: { ...state.params },
		query: { ...state.query },
		layout: state.layout
	};
}

async function load_middleware (name) {
	if (loaded_mw.has(name))
		return loaded_mw.get(name);
	const mod = await import(asset('/middlewares/' + name + '.js'));
	loaded_mw.set(name, mod.default);
	return mod.default;
}

// Global names first, then the route list. Each function must call proceed()
// or redirect(). A clone of { current, next } is passed so the router stays safe.
async function run_middleware (hit, url) {
	const names = (config.middleware || []).concat(hit.route.middleware || []);
	if (!names.length)
		return { ok: true };

	const next_snap = {
		path: app_pathname(url.pathname),
		pattern: hit.pattern,
		params: { ...hit.params },
		query: parse_query(url.search),
		layout: hit.route.layout
	};
	const current_snap = clone_route(current);
	let redirect_to = null;
	let cursor = 0;
	let finished = false;

	function do_redirect (path) {
		redirect_to = String(path);
	}

	async function proceed () {
		if (redirect_to)
			return;
		if (cursor >= names.length) {
			finished = true;
			return;
		}
		const fn = await load_middleware(names[cursor++]);
		const ctx = { current: clone_route(current_snap), next: clone_route(next_snap) };
		await fn(ctx, proceed, do_redirect);
	}

	await proceed();
	if (redirect_to)
		return { ok: false, redirect: redirect_to };
	if (!finished)
		return { ok: false };
	return { ok: true };
}

async function show_url (url) {
	const path = app_pathname(url.pathname);
	const hit = match_path(path, config.routes);
	if (!hit)
		return;

	if (hit.route.redirect)
		return redirect(hit.route.redirect);

	const gate = await run_middleware(hit, url);
	if (!gate.ok) {
		if (gate.redirect)
			return redirect(gate.redirect);
		return;
	}

	await load_all(config.deps[hit.pattern]);

	apply_route(path, hit, url);

	app.show({
		layout: layout_ctor(hit.route),
		areas: area_map(hit.route)
	});
}

function same_origin_link (anchor, event) {
	if (!anchor || !anchor.href)
		return false;
	if (anchor.hasAttribute('download') || anchor.getAttribute('target'))
		return false;
	if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0)
		return false;
	const url = new URL(anchor.href, location.href);
	if (url.origin !== location.origin)
		return false;
	if (url.hash && url.pathname === location.pathname && url.search === location.search)
		return false;
	return url;
}

function closest_anchor (target) {
	return target && typeof target.closest === 'function'
		? target.closest('a[href]')
		: null;
}

function bind_clicks () {
	document.addEventListener('click', event => {
		const url = same_origin_link(closest_anchor(event.target), event);
		if (!url)
			return;
		event.preventDefault();
		goto(url.pathname + url.search + url.hash);
	});

	// mouseover bubbles, so jsdom tests and old browsers still prefetch.
	document.addEventListener('mouseover', event => {
		const anchor = closest_anchor(event.target);
		if (!anchor)
			return;
		const url = new URL(anchor.href, location.href);
		if (url.origin === location.origin)
			prefetch(url.pathname);
	});
}

function bind_router () {
	if (window.navigation) {
		navigation.addEventListener('navigate', event => {
			if (!event.canIntercept || event.hashChange || event.downloadRequest)
				return;
			if (event.navigationType === 'reload')
				return;
			const url = new URL(event.destination.url);
			if (url.origin !== location.origin)
				return;
			event.intercept({
				handler: () => show_url(url)
			});
		});
		return;
	}

	window.addEventListener('popstate', () => {
		show_url(new URL(location.href));
	});
}

function live_reload () {
	try {
		const source = new EventSource(asset('/_alumna/live'));
		source.onmessage = () => location.reload();
	}
	catch {
		// preview / production has no SSE
	}
}

function apply_route (path, hit, url) {
	current.path = path;
	current.pattern = hit.pattern;
	current.params = hit.params;
	current.query = parse_query(url.search);
	current.layout = hit.route.layout;
}

function ssg_target (target) {
	return !!(target && typeof target.hasAttribute === 'function' && target.hasAttribute('data-alumna-ssg'));
}

async function boot_app (target) {
	const url = new URL(location.href);
	const path = app_pathname(url.pathname);
	const hit = match_path(path, config.routes);
	// Hydrate reads `route` during the first paint. Set it before hydrate so
	// param pages match the SSG HTML.
	if (hit && !hit.route.redirect)
		apply_route(path, hit, url);

	if (ssg_target(target)) {
		if (hit && !hit.route.redirect) {
			await load_all(config.deps[hit.pattern]);
			return hydrate(App, {
				target,
				props: {
					layout: layout_ctor(hit.route),
					areas: area_map(hit.route)
				}
			});
		}
		return hydrate(App, { target });
	}
	return mount(App, { target });
}

export async function start ({ target } = {}) {
	if (!started) {
		app = await boot_app(target || document.body);
		bind_clicks();
		bind_router();
		if (config.dev)
			live_reload();
		started = true;
	}
	await show_url(new URL(location.href));
}

export function boot_runtime (meta_url) {
	if (should_auto_start(meta_url))
		return start();
}

boot_runtime(import.meta.url);
