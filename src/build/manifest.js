import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { package_version } from '../pack/assets.js';

const pkg_version = package_version();

export function alumna_version () {
	return pkg_version;
}

export function read_manifest (out) {
	const file = join(out, 'alumna-manifest.json');
	if (!existsSync(file))
		return null;
	try {
		return JSON.parse(readFileSync(file, 'utf8'));
	}
	catch {
		return null;
	}
}

export function lookup_content (manifest, contentId) {
	if (!contentId)
		return [];
	const table = manifest && manifest.lookup;
	if (table && table[contentId])
		return table[contentId].slice();
	if (typeof contentId === 'string' && contentId.charCodeAt(0) === 47)
		return [ contentId ];
	return [];
}

function copy_lookup (lookup) {
	const out = {};
	if (!lookup)
		return out;
	for (const key of Object.keys(lookup))
		out[key] = lookup[key].slice();
	return out;
}

export function add_lookup (lookup, key, path) {
	const list = lookup[key];
	if (!list) {
		lookup[key] = [ path ];
		return;
	}
	if (!list.includes(path))
		list.push(path);
}

export function build_manifest ({
	version = pkg_version,
	base = '',
	ssg = false,
	prerender = [],
	lookup = {},
	areas = [],
	routes = {},
	deps = {}
} = {}) {
	return {
		version,
		base,
		ssg: !!ssg,
		prerender,
		lookup,
		areas,
		routes,
		deps
	};
}

export function merge_manifest (prev, extra = {}) {
	const prerender = extra.prerender || [];
	const lookup = extra.lookup;
	const next = build_manifest({
		version: extra.version || (prev && prev.version) || pkg_version,
		base: extra.base ?? ((prev && prev.base) || ''),
		ssg: extra.ssg ?? (prev && prev.ssg),
		prerender: prev && prev.prerender ? prev.prerender.slice() : [],
		lookup: copy_lookup(prev && prev.lookup),
		areas: extra.areas || (prev && prev.areas) || [],
		routes: extra.routes || (prev && prev.routes) || {},
		deps: extra.deps || (prev && prev.deps) || {}
	});

	if (lookup) {
		for (const key of Object.keys(lookup)) {
			const urls = lookup[key];
			for (let i = 0; i < urls.length; i++)
				add_lookup(next.lookup, key, urls[i]);
		}
	}

	for (let i = 0; i < prerender.length; i++) {
		const path = prerender[i];
		if (!next.prerender.includes(path))
			next.prerender.push(path);
		add_lookup(next.lookup, path, path);
	}

	return next;
}

export function stringify_manifest (manifest) {
	return JSON.stringify(manifest, null, '\t') + '\n';
}
