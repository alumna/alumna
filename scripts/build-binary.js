import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { rolldown } from 'rolldown';
import {
	alumna_externals,
	collect_release_assets,
	generated_assets_source,
	is_pack_data_id
} from '../src/release/collect.js';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const dist = join(root, 'dist');
const generated = join(dist, 'assets-data.js');
const bundled = join(dist, 'alumna.mjs');
const outfile = join(dist, 'alumna');

mkdirSync(dist, { recursive: true });
const assets = collect_release_assets({ root });
const live_source = generated_assets_source(assets);
writeFileSync(generated, live_source);

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
				return live_source;
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

const compile = spawnSync('bun', [
	'build',
	'--compile',
	'--outfile', outfile,
	'--external', 'rolldown',
	bundled
], { cwd: root, encoding: 'utf8', stdio: 'inherit' });

if (compile.status !== 0)
	process.exit(compile.status || 1);

console.log('Wrote ' + outfile);
