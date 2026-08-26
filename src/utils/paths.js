import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

export const alumna_root = dirname(dirname(dirname(fileURLToPath(import.meta.url))));

export function posix_join (...parts) {
	return parts
		.filter(Boolean)
		.join('/')
		.replace(/\\/g, '/')
		.replace(/\/+/g, '/');
}

export function strip_slash (path) {
	if (path.length > 1 && path.endsWith('/'))
		return path.slice(0, -1);
	return path;
}
