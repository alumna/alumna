import { writeFileSync, existsSync } from 'node:fs';
import { basename, join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { find_bun } from '../utils/bin.js';

function ensure_package_json (cwd) {
	const file = join(cwd, 'package.json');
	if (existsSync(file))
		return file;
	const name = basename(cwd);
	writeFileSync(file, JSON.stringify({
		name,
		private: true,
		type: 'module'
	}, null, '\t') + '\n');
	return file;
}

function fail_spawn (result, command) {
	throw new Error((result.stderr || result.stdout || command + ' failed').trim());
}

export function add_packages (cwd, names, deps = {}) {
	const list = (names || []).filter(Boolean);
	if (!list.length)
		throw new Error('Use: alumna add <package> [package...]');

	for (let i = 0; i < list.length; i++) {
		const name = list[i];
		if (name.startsWith('-'))
			throw new Error('Invalid package name: ' + name);
	}

	const spawn = deps.spawn || spawnSync;
	ensure_package_json(cwd);

	const bun = (deps.find_bun || find_bun)(spawn);
	if (bun) {
		const result = spawn(bun, [ 'add', ...list ], { cwd, encoding: 'utf8' });
		if (result.status !== 0)
			fail_spawn(result, 'bun add');
		return { installer: 'bun', names: list };
	}

	const result = spawn('npm', [ 'install', '--save', ...list ], { cwd, encoding: 'utf8' });
	if (result.status !== 0)
		fail_spawn(result, 'npm install');
	return { installer: 'npm', names: list };
}
