import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { alumna_root } from '../utils/paths.js';
import { cache_dir } from '../utils/cache.js';
import { live_data } from './data.js';

function read_pkg (root = alumna_root) {
	return JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
}

export function package_version () {
	const live = live_data();
	if (live && live.version)
		return live.version;
	return read_pkg().version;
}

export function rolldown_version (root = alumna_root) {
	const live = live_data();
	if (live && live.rolldown_version)
		return live.rolldown_version;
	try {
		return JSON.parse(readFileSync(join(root, 'node_modules/rolldown/package.json'), 'utf8')).version;
	}
	catch {
		try {
			const spec = read_pkg(root).devDependencies && read_pkg(root).devDependencies.rolldown;
			const v = String(spec || '').replace(/^[~^]/, '');
			if (v)
				return v;
		}
		catch {
			// no package.json in this root
		}
		return '1.2.6';
	}
}

export function runtime_source () {
	const live = live_data();
	if (live && live.runtime != null)
		return live.runtime;
	return readFileSync(join(alumna_root, 'src/runtime/browser.js'), 'utf8');
}

export function match_source () {
	const live = live_data();
	if (live && live.match != null)
		return live.match;
	return readFileSync(join(alumna_root, 'src/compile/match.js'), 'utf8');
}

export function read_file_map (dir, prefix = '') {
	const out = {};
	if (!existsSync(dir))
		return out;
	const names = readdirSync(dir);
	for (let i = 0; i < names.length; i++) {
		const name = names[i];
		const full = join(dir, name);
		const rel = prefix ? prefix + '/' + name : name;
		if (statSync(full).isDirectory())
			Object.assign(out, read_file_map(full, rel));
		else
			out[rel] = readFileSync(full, 'utf8');
	}
	return out;
}

export function write_file_map (dir, files) {
	const keys = Object.keys(files);
	for (let i = 0; i < keys.length; i++) {
		const rel = keys[i];
		const full = join(dir, rel);
		mkdirSync(dirname(full), { recursive: true });
		writeFileSync(full, files[rel]);
	}
}

export function scaffold_files () {
	const live = live_data();
	if (live && live.scaffold)
		return live.scaffold;
	return read_file_map(join(alumna_root, 'scaffold'));
}

function skip_svelte_file (rel) {
	return rel.endsWith('.d.ts') || rel.endsWith('.md') || rel.startsWith('types/');
}

export function svelte_file_map (dir) {
	const live = live_data();
	if (live && live.svelte_files)
		return live.svelte_files;
	const files = read_file_map(dir || join(alumna_root, 'node_modules/svelte'));
	const out = {};
	const keys = Object.keys(files);
	for (let i = 0; i < keys.length; i++) {
		if (!skip_svelte_file(keys[i]))
			out[keys[i]] = files[keys[i]];
	}
	return out;
}

const SVELTE_VENDOR_DEPS = [ 'esm-env', 'clsx' ];

export function svelte_dep_maps (root = alumna_root) {
	const live = live_data();
	if (live && live.svelte_deps)
		return live.svelte_deps;
	const out = {};
	for (let i = 0; i < SVELTE_VENDOR_DEPS.length; i++) {
		const name = SVELTE_VENDOR_DEPS[i];
		out[name] = read_file_map(join(root, 'node_modules', name));
	}
	return out;
}

function write_svelte_deps (dest) {
	const deps = svelte_dep_maps();
	const names = Object.keys(deps);
	for (let i = 0; i < names.length; i++) {
		const name = names[i];
		const dir = join(dest, 'node_modules', name);
		if (!existsSync(join(dir, 'package.json')))
			write_file_map(dir, deps[name]);
	}
}

function svelte_ssg_ok (root) {
	return existsSync(join(root, 'node_modules/svelte/src/internal/server/index.js'));
}

// Contributor: Alumna's own node_modules. Author binary: files from the bundle, written once.
// The compiled binary may see svelte/package.json (compiler) without the server files SSG needs.
export function ensure_svelte_root (root = alumna_root) {
	if (svelte_ssg_ok(root))
		return root;

	const files = svelte_file_map();
	if (!Object.keys(files).length)
		throw new Error('Svelte files are missing. This Alumna build cannot compile.');

	const dest = cache_dir(package_version(), 'svelte-root');
	const pkg = join(dest, 'node_modules/svelte/package.json');
	if (!existsSync(pkg) || !svelte_ssg_ok(dest)) {
		write_file_map(join(dest, 'node_modules/svelte'), files);
		writeFileSync(join(dest, 'package.json'), '{"type":"module"}\n');
	}
	write_svelte_deps(dest);
	return dest;
}
