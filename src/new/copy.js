import { cpSync, existsSync, mkdirSync, readdirSync, statSync } from 'node:fs';
import { join, basename } from 'node:path';
import { alumna_root } from '../utils/paths.js';

const NAME_RE = /^[a-z0-9_.-]+$/i;

export function create_project (target) {
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

	const scaffold = join(alumna_root, 'scaffold');
	cpSync(scaffold, dest, { recursive: true });

	return dest;
}
