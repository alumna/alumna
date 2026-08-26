export function has_star (pattern) {
	return typeof pattern === 'string' && pattern.includes('*');
}

// Concrete URL we can write as HTML: starts with /, no :param, no *.
export function is_concrete_path (path) {
	return typeof path === 'string'
		&& path.charCodeAt(0) === 47
		&& !path.includes(':')
		&& !path.includes('*');
}

export function route_param_keys (pattern) {
	const keys = [];
	if (typeof pattern !== 'string')
		return keys;
	const parts = pattern.split('/');
	for (let i = 0; i < parts.length; i++) {
		const seg = parts[i];
		if (seg.charCodeAt(0) === 58 && seg.length > 1)
			keys.push(seg.slice(1));
	}
	return keys;
}

export function fill_pattern (pattern, params) {
	const parts = pattern.split('/');
	for (let i = 0; i < parts.length; i++) {
		if (parts[i].charCodeAt(0) === 58)
			parts[i] = params[parts[i].slice(1)];
	}
	return parts.join('/');
}
