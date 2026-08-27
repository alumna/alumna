import { match_path } from './match.js';
import { fill_pattern, has_star, is_concrete_path, route_param_keys } from './pattern.js';
import { read_prerender } from './validate.js';
import { with_timeout } from './data.js';

// Q44 table: which concrete URLs this route writes when --ssg is on.
export function urls_for_route (pattern, route) {
	if (!route || route.redirect)
		return [];
	if (has_star(pattern))
		return [];
	if (route.ssg === false)
		return [];

	const keys = route_param_keys(pattern);
	const skip_mw = route.middleware && route.middleware.length && route.ssg !== true;

	if (keys.length) {
		if (!Array.isArray(route.prerender) || skip_mw)
			return [];
		const urls = [];
		const seen = new Set();
		for (let i = 0; i < route.prerender.length; i++) {
			const params = route.prerender[i];
			const path = fill_pattern(pattern, params);
			if (seen.has(path))
				continue;
			seen.add(path);
			urls.push({ path, params });
		}
		return urls;
	}

	if (skip_mw)
		return [];
	return [ { path: pattern, params: {} } ];
}

export async function resolve_prerender_lists (routes, { timeout = 30000 } = {}) {
	const errors = [];
	if (!routes)
		return errors;
	for (const pattern of Object.keys(routes)) {
		const route = routes[pattern];
		if (typeof route.prerender_fn !== 'function')
			continue;
		const label = 'In the route \'' + pattern + '\'';
		try {
			const raw = await with_timeout(Promise.resolve(route.prerender_fn()), timeout, label + ' prerender');
			route.prerender = read_prerender(raw, errors, label, route_param_keys(pattern));
		}
		catch (error) {
			errors.push(label + ' prerender failed: ' + (error.message || error));
		}
	}
	return errors;
}

export function ssg_targets (routes) {
	const pages = [];
	const prerender = [];
	const lookup = {};
	if (!routes)
		return { pages, prerender, lookup };

	for (const pattern of Object.keys(routes)) {
		const urls = urls_for_route(pattern, routes[pattern]);
		if (urls.length)
			lookup[pattern] = urls.map(item => item.path);
		for (let i = 0; i < urls.length; i++) {
			const path = urls[i].path;
			pages.push({ path, pattern, params: urls[i].params });
			prerender.push(path);
			lookup[path] = [ path ];
		}
	}

	return { pages, prerender, lookup };
}

export function resolve_rebuild_path (path, routes) {
	if (!is_concrete_path(path))
		return { error: 'Use a concrete path (for example /blog/hello), not a pattern' };

	const hit = match_path(path, routes);
	if (!hit)
		return { error: 'No route matches "' + path + '"' };
	if (hit.route.redirect)
		return { error: 'Redirects never SSG: "' + path + '"' };
	if (has_star(hit.pattern))
		return { error: 'Catch-all routes never SSG: "' + path + '"' };
	if (hit.route.ssg === false)
		return { error: 'ssg: false skips "' + path + '"' };
	if (hit.route.middleware && hit.route.middleware.length && hit.route.ssg !== true)
		return { error: 'Route middleware skips SSG unless ssg: true: "' + hit.pattern + '"' };

	return { path, pattern: hit.pattern, params: hit.params, route: hit.route };
}
