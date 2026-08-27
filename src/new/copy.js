import { mkdirSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join, basename } from 'node:path';
import { scaffold_files, write_file_map } from '../pack/assets.js';

const NAME_RE = /^[a-z0-9_.-]+$/i;

export function create_project (target, opts = {}) {
	if (!target)
		throw new Error('Use: alumna new <project_name>');

	if (target !== '.' && !NAME_RE.test(target))
		throw new Error('You can use just letters, numbers, \'-\', \'_\' and \'.\' for your project name. Or \'.\' to use the current directory (that must be empty).');

	const dest = target === '.' ? process.cwd() : join(process.cwd(), target);

	if (existsSync(dest)) {
		if (!statSync(dest).isDirectory())
			throw new Error('Cannot create the project: a file named \'' + basename(dest) + '\' already exists.');
		const files = readdirSync(dest);
		if (files.length)
			throw new Error('The directory \'' + (target === '.' ? '.' : basename(dest)) + '\' isn\'t empty.');
	}
	else {
		mkdirSync(dest, { recursive: true });
	}

	write_file_map(dest, opts.files || scaffold_files());
	return dest;
}
