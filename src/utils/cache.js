import { existsSync, mkdirSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

function home_dir () {
	return process.env.HOME || process.env.USERPROFILE || homedir();
}

// XDG cache, then ~/.cache, then %LOCALAPPDATA%. ALUMNA_CACHE wins.
export function cache_root () {
	if (process.env.ALUMNA_CACHE)
		return process.env.ALUMNA_CACHE;
	if (process.env.XDG_CACHE_HOME)
		return join(process.env.XDG_CACHE_HOME, 'alumna');
	if (process.env.LOCALAPPDATA)
		return join(process.env.LOCALAPPDATA, 'alumna');
	return join(home_dir(), '.cache', 'alumna');
}

export function cache_dir (version, extra) {
	const parts = [ cache_root(), version ];
	if (extra)
		parts.push(extra);
	const dir = join(...parts);
	if (!existsSync(dir))
		mkdirSync(dir, { recursive: true });
	return dir;
}
