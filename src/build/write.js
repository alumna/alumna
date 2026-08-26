import { mkdirSync, writeFileSync, renameSync, existsSync, cpSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

let write_seq = 0;

export function atomic_write (file, body) {
	mkdirSync(dirname(file), { recursive: true });
	const tmp = file + '.' + process.pid + '-' + (write_seq++) + '.tmp';
	writeFileSync(tmp, body);
	renameSync(tmp, file);
}

export function write_if_changed (file, body) {
	if (existsSync(file) && readFileSync(file, 'utf8') === body)
		return false;
	atomic_write(file, body);
	return true;
}

export function write_build ({ out, html, files, runtime, match, manifest, static_dir, pages }) {
	mkdirSync(out, { recursive: true });

	if (static_dir && existsSync(static_dir))
		cpSync(static_dir, out, { recursive: true });

	atomic_write(join(out, 'index.html'), html);

	for (const path of Object.keys(files))
		atomic_write(join(out, path), files[path]);

	if (pages) {
		for (const path of Object.keys(pages))
			atomic_write(join(out, path), pages[path]);
	}

	mkdirSync(join(out, '_alumna'), { recursive: true });
	atomic_write(join(out, '_alumna', 'match.js'), match);
	atomic_write(join(out, '_alumna', 'runtime.js'), runtime);
	atomic_write(join(out, 'alumna-manifest.json'), manifest);
}
