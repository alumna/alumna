import { mkdirSync, writeFileSync, existsSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { alumna_root } from '../utils/paths.js';

const require = createRequire(import.meta.url);

export function svelte_version () {
	return require('svelte/package.json').version;
}

export function vendor_dir () {
	return join(alumna_root, 'vendor', 'svelte');
}

export function vendor_ready () {
	const stamp = join(vendor_dir(), '.version');
	return existsSync(stamp) && readFileSync(stamp, 'utf8').trim() === svelte_version();
}

// Prefer the Bun global, then BUN, then common install paths, then PATH.
export function find_bun (spawn = spawnSync) {
	if (typeof Bun !== 'undefined')
		return process.execPath;
	const candidates = [
		process.env.BUN,
		join(process.env.HOME || '', '.bun/bin/bun'),
		'/usr/local/bin/bun',
		'bun'
	].filter(Boolean);
	for (const bin of candidates) {
		const probe = spawn(bin, [ '--version' ], { encoding: 'utf8' });
		if (probe.status === 0)
			return bin;
	}
	return null;
}

export function build_svelte_vendor (bun, dest, spawn) {
	if (!dest)
		throw new Error('build_svelte_vendor needs an output directory');
	const run = spawn || spawnSync;
	rmSync(dest, { recursive: true, force: true });
	mkdirSync(dest, { recursive: true });

	const svelte_src = join(alumna_root, 'node_modules', 'svelte', 'src');
	const result = run(bun, [
		'build',
		join(svelte_src, 'index-client.js'),
		join(svelte_src, 'internal/client/index.js'),
		join(svelte_src, 'internal/disclose-version.js'),
		join(svelte_src, 'internal/flags/legacy.js'),
		'--outdir', dest,
		'--format', 'esm',
		'--target', 'browser',
		'--splitting',
		'--root', svelte_src,
		'--entry-naming', '[dir]/[name].js',
		'--chunk-naming', 'chunk-[hash].js'
	], { encoding: 'utf8', cwd: alumna_root });

	if (result.status !== 0)
		throw new Error('Failed to bundle Svelte:\n' + (result.stderr || result.stdout || ''));

	writeFileSync(join(dest, '.version'), svelte_version() + '\n');
	return dest;
}

export function ensure_svelte_vendor (deps = {}) {
	const ready = deps.ready || vendor_ready;
	const bun_fn = deps.find_bun || find_bun;
	const build = deps.build || build_svelte_vendor;

	if (ready())
		return vendor_dir();

	const bun = bun_fn();
	if (!bun)
		throw new Error('Alumna needs Bun to bundle Svelte for the browser (bun 1.4+).');

	return build(bun, vendor_dir());
}

export function import_map () {
	return {
		imports: {
			'svelte': '/_alumna/svelte/index-client.js',
			'svelte/internal/client': '/_alumna/svelte/internal/client/index.js',
			'svelte/internal/disclose-version': '/_alumna/svelte/internal/disclose-version.js',
			'svelte/internal/flags/legacy': '/_alumna/svelte/internal/flags/legacy.js',
			'alumna': '/_alumna/runtime.js'
		}
	};
}
