const compiled_cache = new Map();

// Compile each route pattern once. The route list is small and stable.

export function compile_pattern (pattern) {
	const cached = compiled_cache.get(pattern);
	if (cached)
		return cached;

	const keys = [];
	const source = pattern.split('/').map(segment => {
		if (segment.startsWith(':')) {
			keys.push(segment.slice(1));
			return '([^/]+)';
		}
		if (segment === '*') {
			keys.push('_');
			return '(.*)';
		}
		return segment.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
	}).join('/');

	const compiled = {
		pattern,
		keys,
		regex: new RegExp('^' + source + '$')
	};
	compiled_cache.set(pattern, compiled);
	return compiled;
}

function decode_param (value) {
	if (!value)
		return '';
	try {
		return decodeURIComponent(value);
	}
	catch {
		return value;
	}
}

export function match_path (pathname, routes) {
	if (Object.prototype.hasOwnProperty.call(routes, pathname))
		return { route: routes[pathname], pattern: pathname, params: {} };

	const entries = Object.keys(routes);
	for (const pattern of entries) {
		if (pattern === '/*')
			continue;
		if (!pattern.includes(':') && !pattern.includes('*'))
			continue;
		const compiled = compile_pattern(pattern);
		const hit = compiled.regex.exec(pathname);
		if (!hit)
			continue;
		const params = {};
		for (let i = 0; i < compiled.keys.length; i++)
			params[compiled.keys[i]] = decode_param(hit[i + 1]);
		return { route: routes[pattern], pattern, params };
	}

	if (routes['/*'])
		return { route: routes['/*'], pattern: '/*', params: {} };

	return null;
}

export function parse_query (search) {
	const query = {};
	if (!search)
		return query;
	const params = new URLSearchParams(search.charCodeAt(0) === 63 ? search.slice(1) : search);
	for (const [ key, value ] of params)
		query[key] = value;
	return query;
}
