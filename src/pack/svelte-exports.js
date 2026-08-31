import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

// Nested package "exports" / "imports" (clsx uses import.default; svelte uses default).
export function export_rel (exp) {
	if (typeof exp === 'string')
		return exp;
	if (!exp || typeof exp !== 'object')
		return null;
	if (typeof exp.import === 'string')
		return exp.import;
	if (exp.import && typeof exp.import.default === 'string')
		return exp.import.default;
	if (typeof exp.default === 'string')
		return exp.default;
	if (exp.default && typeof exp.default.default === 'string')
		return exp.default.default;
	return null;
}

function read_pkg (pkg_path) {
	if (!existsSync(pkg_path))
		return null;
	try {
		return JSON.parse(readFileSync(pkg_path, 'utf8'));
	}
	catch {
		return null;
	}
}

function existing_file (dir, rel) {
	if (typeof rel !== 'string')
		return null;
	const file = join(dir, rel);
	return existsSync(file) ? file : null;
}

// bun --compile cannot require.resolve package "exports". Read them yourself.
export function svelte_file_from_exports (root, spec) {
	const pkg_dir = join(root, 'node_modules/svelte');
	const pkg = read_pkg(join(pkg_dir, 'package.json'));
	if (!pkg)
		return null;
	const key = spec === 'svelte' ? '.' : './' + spec.slice(7);
	return existing_file(pkg_dir, export_rel(pkg.exports && pkg.exports[key]));
}

export function svelte_import_file (root, spec) {
	const pkg_dir = join(root, 'node_modules/svelte');
	const pkg = read_pkg(join(pkg_dir, 'package.json'));
	if (!pkg)
		return null;
	const file = existing_file(pkg_dir, export_rel(pkg.imports && pkg.imports[spec]));
	if (!file || !(file.endsWith('.js') || file.endsWith('.mjs')))
		return null;
	return file;
}

function package_name (spec) {
	const i = spec.indexOf('/');
	return i === -1 ? spec : spec.slice(0, i);
}

export function package_export_file (root, spec) {
	const name = package_name(spec);
	const pkg_dir = join(root, 'node_modules', name);
	const pkg = read_pkg(join(pkg_dir, 'package.json'));
	if (!pkg)
		return null;
	const sub = spec === name ? '.' : '.' + spec.slice(name.length);
	const rel = export_rel(pkg.exports && pkg.exports[sub])
		|| (sub === '.' && (typeof pkg.module === 'string' ? pkg.module : pkg.main));
	return existing_file(pkg_dir, rel);
}
