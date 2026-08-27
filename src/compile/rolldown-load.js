import { existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { cache_dir } from '../utils/cache.js';
import { extract_tgz, fetch_buffer, npm_tarball_url } from '../utils/tgz.js';
import { rolldown_binding_pkg } from '../utils/platform.js';
import { package_version, rolldown_version } from '../pack/assets.js';

let cached;

export function reset_rolldown () {
	cached = undefined;
}

function ready_dir (dir) {
	return existsSync(join(dir, 'node_modules/rolldown/dist/index.mjs'));
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

	const pluginutils = dep_version(pkg, '@rolldown/pluginutils');
	if (pluginutils)
		await pack_into(join(nm, '@rolldown/pluginutils'), '@rolldown/pluginutils', pluginutils, deps);

	rmSync(dir, { recursive: true, force: true });
	mkdirSync(join(dir, '..'), { recursive: true });
	renameSync(tmp, dir);
	writeFileSync(join(dir, '.ok'), version + '\n');
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
