import { mkdtempSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

export const INDEX_HTML = '<!DOCTYPE html><html><head></head><body></body></html>';

export function make_dir (files) {
	const dir = mkdtempSync(join(tmpdir(), 'alumna-'));
	for (const [ path, body ] of Object.entries(files)) {
		const full = join(dir, path);
		mkdirSync(join(full, '..'), { recursive: true });
		writeFileSync(full, body);
	}
	return dir;
}

export function make_src (files) {
	return make_dir({
		'index.html': INDEX_HTML,
		...files
	});
}
