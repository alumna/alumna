import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { parse_hjson } from './hjson.js';
import { normalize_base } from '../utils/base.js';

export function empty_project_config () {
	return {
		port: undefined,
		base: '',
		ssg: false,
		build_dir: 'build',
		title: '',
		sourcemap: false
	};
}

export function normalize_project_config (raw) {
	const src = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
	const out = empty_project_config();
	if (src.port != null && src.port !== '') {
		const port = Number(src.port);
		if (Number.isFinite(port))
			out.port = port;
	}
	if (src.base != null)
		out.base = normalize_base(src.base);
	if (src.ssg != null)
		out.ssg = src.ssg === true || src.ssg === 'true';
	const out_dir = src.out || src.build || src.build_dir;
	if (out_dir)
		out.build_dir = String(out_dir);
	if (src.title != null)
		out.title = String(src.title);
	if (src.sourcemap != null)
		out.sourcemap = src.sourcemap === true || src.sourcemap === 'true';
	return out;
}

export function load_project_config (cwd) {
	const file = join(cwd, 'alumna.hjson');
	if (!existsSync(file))
		return empty_project_config();
	try {
		return normalize_project_config(parse_hjson(readFileSync(file, 'utf8')));
	}
	catch (error) {
		throw new Error('alumna.hjson: ' + error);
	}
}
