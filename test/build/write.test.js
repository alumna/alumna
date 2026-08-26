import { mkdtempSync, writeFileSync, readFileSync, mkdirSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { write_build } from '../../src/build/write.js';

test('write_build copies static files and writes the tree', () => {
	const cwd = mkdtempSync(join(tmpdir(), 'alumna-write-'));
	const out = join(cwd, 'build');
	const static_dir = join(cwd, 'static');
	mkdirSync(static_dir);
	writeFileSync(join(static_dir, 'a.txt'), 'A');
	write_build({
		out,
		html: '<html></html>',
		files: { 'components/Home.js': '1', '_alumna/vendor/x.js': '2' },
		runtime: 'runtime',
		match: 'match',
		manifest: '{}\n',
		static_dir
	});
	expect(readFileSync(join(out, 'index.html'), 'utf8')).toBe('<html></html>');
	expect(readFileSync(join(out, 'components/Home.js'), 'utf8')).toBe('1');
	expect(readFileSync(join(out, '_alumna/vendor/x.js'), 'utf8')).toBe('2');
	expect(readFileSync(join(out, '_alumna/runtime.js'), 'utf8')).toBe('runtime');
	expect(readFileSync(join(out, '_alumna/match.js'), 'utf8')).toBe('match');
	expect(readFileSync(join(out, 'alumna-manifest.json'), 'utf8')).toBe('{}\n');
	expect(readFileSync(join(out, 'a.txt'), 'utf8')).toBe('A');
});

test('write_build without static_dir', () => {
	const out = join(mkdtempSync(join(tmpdir(), 'alumna-write2-')), 'build');
	write_build({
		out,
		html: 'h',
		files: {},
		runtime: 'r',
		match: 'm',
		manifest: '{}'
	});
	expect(existsSync(join(out, 'index.html'))).toBe(true);
	write_build({
		out,
		html: 'h',
		files: {},
		runtime: 'r',
		match: 'm',
		manifest: '{}',
		static_dir: join(out, 'missing-static')
	});
});
