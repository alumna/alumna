import { mkdirSync, writeFileSync, existsSync, cpSync } from 'node:fs';
import { dirname, join } from 'node:path';

export function write_build ({ out, html, files, runtime, match, manifest, static_dir }) {
	mkdirSync(out, { recursive: true });

	if (static_dir && existsSync(static_dir))
		cpSync(static_dir, out, { recursive: true });

	writeFileSync(join(out, 'index.html'), html);

	for (const path of Object.keys(files)) {
		const file = join(out, path);
		mkdirSync(dirname(file), { recursive: true });
		writeFileSync(file, files[path]);
	}

	mkdirSync(join(out, '_alumna'), { recursive: true });
	writeFileSync(join(out, '_alumna', 'match.js'), match);
	writeFileSync(join(out, '_alumna', 'runtime.js'), runtime);
	writeFileSync(join(out, 'alumna-manifest.json'), manifest);
}
