import { createHash } from 'node:crypto';
import { strip_base } from './base.js';

// Import-map SRI. Keys are the mapped URLs. sha384 is the usual SRI hash.
export function sri_hash (body) {
	return 'sha384-' + createHash('sha384').update(body).digest('base64');
}

export function url_to_file (url, base) {
	const path = strip_base(base, url || '/');
	return path.charCodeAt(0) === 47 ? path.slice(1) : path;
}

export function integrity_for (imports, files, base) {
	const integrity = {};
	if (!imports)
		return integrity;
	const names = Object.keys(imports);
	for (let i = 0; i < names.length; i++) {
		const url = imports[names[i]];
		const body = files && files[url_to_file(url, base)];
		if (body != null)
			integrity[url] = sri_hash(body);
	}
	return integrity;
}

export function with_integrity (map, extra) {
	if (!map)
		return map;
	if (!extra)
		return map;
	const keys = Object.keys(extra);
	if (!keys.length)
		return map;
	return {
		imports: map.imports,
		integrity: Object.assign({}, map.integrity, extra)
	};
}
