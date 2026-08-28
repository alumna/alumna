import { chmodSync, existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { rolldown } from 'rolldown';
import {
	alumna_externals,
	collect_release_assets,
	generated_assets_source,
	is_pack_data_id
} from '../src/release/collect.js';
import { TARGETS } from './targets.js';
import { pack_folder, write_checksums } from './archive.js';

export function parse_build_args (argv) {
	return { all: argv.includes('--all') };
}

export async function bundle_alumna (root, dist) {
	const generated = join(dist, 'assets-data.js');
	const bundled = join(dist, 'alumna.mjs');
	mkdirSync(dist, { recursive: true });
	const assets = collect_release_assets({ root });
	writeFileSync(generated, generated_assets_source(assets));

	const bundle = await rolldown({
		input: join(root, 'src/cli.js'),
		cwd: root,
		platform: 'node',
		treeshake: true,
		external: alumna_externals,
		plugins: [ {
			name: 'alumna-release-assets',
			resolveId (id, importer) {
				if (is_pack_data_id(id, importer))
					return '\0alumna-live-data';
			},
			load (id) {
				if (id === '\0alumna-live-data')
					return generated_assets_source(assets);
			}
		} ]
	});

	try {
		await bundle.write({
			file: bundled,
			format: 'esm',
			minify: true,
			codeSplitting: false,
			sourcemap: false
		});
	}
	finally {
		await bundle.close();
	}

	return bundled;
}

export function compile_binary (root, bundled, outfile, bun_target) {
	const args = [ 'build', '--compile' ];
	if (bun_target)
		args.push('--target', bun_target);
	args.push('--outfile', outfile, '--external', 'rolldown', bundled);
	const compile = spawnSync('bun', args, { cwd: root, encoding: 'utf8', stdio: 'inherit' });
	if (compile.status !== 0)
		process.exit(compile.status || 1);
}

export function pack_release_target (folder, release_dir, target) {
	mkdirSync(release_dir, { recursive: true });
	const outfile = join(release_dir, target.asset);
	pack_folder(folder, outfile);
	return outfile;
}

export async function build_binary ({ root, all } = {}) {
	const dist = join(root, 'dist');
	const bundled = await bundle_alumna(root, dist);

	if (!all) {
		const outfile = join(dist, 'alumna');
		compile_binary(root, bundled, outfile, null);
		console.log('Wrote ' + outfile);
		return { bundled, files: [ outfile ] };
	}

	const release_dir = join(dist, 'release');
	const stage = join(dist, 'stage');
	rmSync(release_dir, { recursive: true, force: true });
	rmSync(stage, { recursive: true, force: true });
	mkdirSync(release_dir, { recursive: true });
	const assets = [];

	for (let i = 0; i < TARGETS.length; i++) {
		const target = TARGETS[i];
		const folder = join(stage, target.folder);
		mkdirSync(folder, { recursive: true });
		const outfile = join(folder, target.binary);
		compile_binary(root, bundled, outfile, target.bun);
		if (!existsSync(outfile)) {
			console.error('bun compile did not write ' + outfile);
			process.exit(1);
		}
		if (target.os !== 'windows')
			chmodSync(outfile, 0o755);
		pack_release_target(folder, release_dir, target);
		assets.push(target.asset);
		console.log('Wrote ' + join(release_dir, target.asset));
	}

	write_checksums(release_dir, assets);
	rmSync(stage, { recursive: true, force: true });
	console.log('Wrote ' + join(release_dir, 'SHA256SUMS'));
	return { bundled, files: assets.map(name => join(release_dir, name)) };
}

const is_main = process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1]);

if (is_main) {
	const root = dirname(dirname(fileURLToPath(import.meta.url)));
	const { all } = parse_build_args(process.argv.slice(2));
	await build_binary({ root, all });
}
