import { posix_join, strip_slash, alumna_root } from '../../src/utils/paths.js';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

test('alumna_root is the package root', () => {
	expect(existsSync(join(alumna_root, 'package.json'))).toBe(true);
});

test('posix_join', () => {
	expect(posix_join('a', 'b', 'c')).toBe('a/b/c');
	expect(posix_join('a', '', 'b')).toBe('a/b');
	expect(posix_join('a\\b', 'c')).toBe('a/b/c');
	expect(posix_join('a/', '/b')).toBe('a/b');
});

test('strip_slash', () => {
	expect(strip_slash('/')).toBe('/');
	expect(strip_slash('/foo/')).toBe('/foo');
	expect(strip_slash('/foo')).toBe('/foo');
});
