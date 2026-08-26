import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

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
