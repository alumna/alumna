import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, renameSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { pathToFileURL } from 'node:url';
import { cache_dir } from '../utils/cache.js';
import { extract_tgz, fetch_buffer, npm_tarball_url } from '../utils/tgz.js';
import { rolldown_binding_pkg } from '../utils/platform.js';
import { package_version, rolldown_version } from '../pack/assets.js';

let cached;

// Compiled bun cannot resolve npm package names from files on disk.
// layout-2: relative pluginutils imports + .node next to Rolldown's loader.
const LAYOUT = 'layout-2';

export function reset_rolldown () {
	cached = undefined;
}

function ready_dir (dir) {
	if (!existsSync(join(dir, 'node_modules/rolldown/dist/index.mjs')))
		return false;
	const ok = join(dir, '.ok');
	if (!existsSync(ok))
		return false;
	return readFileSync(ok, 'utf8').includes(LAYOUT);
}

async function pack_into (dest, name, version, deps) {
	const fetch_fn = deps.fetch || fetch;
	const buf = await fetch_buffer(npm_tarball_url(name, version), fetch_fn);
	mkdirSync(dest, { recursive: true });
	extract_tgz(buf, dest);
}

function dep_version (pkg, name) {
	const deps = pkg.dependencies;
	if (!deps)
		return null;
	const spec = deps[name];
	if (!spec)
		return null;
	const m = String(spec).match(/\d+\.\d+\.\d+/);
	if (!m)
		return null;
	return m[0];
}

function pluginutils_file (pkg_dir, pkg, spec) {
	const name = '@rolldown/pluginutils';
	const sub = spec === name ? '.' : '.' + spec.slice(name.length);
	const exports_map = pkg.exports;
	const rel = (exports_map && typeof exports_map[sub] === 'string')
		? exports_map[sub]
		: (sub === '.' ? (pkg.main || 'dist/index.mjs') : null);
	if (!rel)
		return null;
	const file = join(pkg_dir, rel);
	return existsSync(file) ? file : null;
}

function rewrite_dir (dir, pkg_dir, pkg) {
	const names = readdirSync(dir);
	for (let i = 0; i < names.length; i++) {
		const full = join(dir, names[i]);
		if (statSync(full).isDirectory()) {
			rewrite_dir(full, pkg_dir, pkg);
			continue;
		}
		if (!names[i].endsWith('.mjs'))
			continue;
		const src = readFileSync(full, 'utf8');
		const next = src.replace(
			/(from\s+|import\s*\(\s*)(['"])(@rolldown\/pluginutils(?:\/[^'"]*)?)\2/g,
			(all, prefix, quote, spec) => {
				const dest = pluginutils_file(pkg_dir, pkg, spec);
				if (!dest)
					return all;
				return prefix + quote + relative(dirname(full), dest).split('\\').join('/') + quote;
			}
		);
		if (next !== src)
			writeFileSync(full, next);
	}
}

function rewrite_pluginutils (nm) {
	const pkg_dir = join(nm, '@rolldown/pluginutils');
	const dist = join(nm, 'rolldown/dist');
	const pkg_json = join(pkg_dir, 'package.json');
	if (!existsSync(pkg_json) || !existsSync(dist))
		return;
	const pkg = JSON.parse(readFileSync(pkg_json, 'utf8'));
	rewrite_dir(dist, pkg_dir, pkg);
}

function place_native_binding (nm, binding) {
	const pkg_file = join(nm, binding, 'package.json');
	if (!existsSync(pkg_file))
		return;
	const pkg = JSON.parse(readFileSync(pkg_file, 'utf8'));
	if (!pkg.main)
		return;
	const src = join(nm, binding, pkg.main);
	if (!existsSync(src))
		return;
	const dist = join(nm, 'rolldown/dist');
	mkdirSync(join(dist, 'shared'), { recursive: true });
	copyFileSync(src, join(dist, pkg.main));
	copyFileSync(src, join(dist, 'shared', pkg.main));
}

export async function ensure_rolldown (deps = {}) {
	const version = deps.version || rolldown_version();
	const dir = deps.dir || join(cache_dir(package_version()), 'rolldown-' + version);
	if (ready_dir(dir) && !deps.force)
		return dir;

	const tmp = dir + '.tmp-' + process.pid;
	rmSync(tmp, { recursive: true, force: true });
	const nm = join(tmp, 'node_modules');
	mkdirSync(nm, { recursive: true });

	await pack_into(join(nm, 'rolldown'), 'rolldown', version, deps);
	const pkg = JSON.parse(readFileSync(join(nm, 'rolldown/package.json'), 'utf8'));
	const binding = deps.binding || rolldown_binding_pkg();
	await pack_into(join(nm, binding), binding, version, deps);
	place_native_binding(nm, binding);

	const pluginutils = dep_version(pkg, '@rolldown/pluginutils');
	if (pluginutils)
		await pack_into(join(nm, '@rolldown/pluginutils'), '@rolldown/pluginutils', pluginutils, deps);
	rewrite_pluginutils(nm);

	rmSync(dir, { recursive: true, force: true });
	mkdirSync(join(dir, '..'), { recursive: true });
	renameSync(tmp, dir);
	writeFileSync(join(dir, '.ok'), version + '\n' + LAYOUT + '\n');
	return dir;
}

export async function load_rolldown (deps = {}) {
	if (cached && !deps.force)
		return cached;

	const try_import = deps.import_mod || (spec => import(spec));
	if (!deps.cache_only) {
		try {
			cached = await try_import('rolldown');
			return cached;
		}
		catch (error) {
			if (deps.no_download)
				throw error;
		}
	}

	const dir = await ensure_rolldown(deps);
	cached = await try_import(pathToFileURL(join(dir, 'node_modules/rolldown/dist/index.mjs')).href);
	return cached;
}
