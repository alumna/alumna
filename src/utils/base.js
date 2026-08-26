// App paths have no prefix. Browser URLs add `base` (Q35). Empty base is "/".

export function normalize_base (base) {
	if (base == null || base === '' || base === '/')
		return '';
	let value = String(base).trim();
	if (!value || value === '/')
		return '';
	if (value.charCodeAt(0) !== 47)
		value = '/' + value;
	if (value.length > 1 && value.endsWith('/'))
		value = value.slice(0, -1);
	return value;
}

export function with_base (base, path) {
	const prefix = normalize_base(base);
	const url = path && path.charCodeAt(0) === 47 ? path : '/' + (path || '');
	return prefix + url;
}

export function strip_base (base, pathname) {
	const prefix = normalize_base(base);
	const path = pathname || '/';
	if (!prefix)
		return path;
	if (path === prefix || path === prefix + '/')
		return '/';
		if (path.startsWith(prefix + '/'))
			return path.slice(prefix.length);
		return path;
}
