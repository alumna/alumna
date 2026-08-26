import { posix_join, strip_slash, alumna_root } from '../../src/utils/paths.js';
import { normalize_base, with_base, strip_base } from '../../src/utils/base.js';
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

test('normalize_base', () => {
	expect(normalize_base()).toBe('');
	expect(normalize_base(null)).toBe('');
	expect(normalize_base('')).toBe('');
	expect(normalize_base('/')).toBe('');
	expect(normalize_base('   /   ')).toBe('');
	expect(normalize_base('/app')).toBe('/app');
	expect(normalize_base('/app/')).toBe('/app');
	expect(normalize_base('app')).toBe('/app');
	expect(normalize_base('app/')).toBe('/app');
});

test('with_base and strip_base', () => {
	expect(with_base('', '/x')).toBe('/x');
	expect(with_base('/app', 'x')).toBe('/app/x');
	expect(with_base('/app', '/x')).toBe('/app/x');
	expect(with_base('/app', '')).toBe('/app/');
	expect(strip_base('', '/x')).toBe('/x');
	expect(strip_base('/app', '/app')).toBe('/');
	expect(strip_base('/app', '/app/')).toBe('/');
	expect(strip_base('/app', '/app/x')).toBe('/x');
	expect(strip_base('/app', '/other')).toBe('/other');
	expect(strip_base('/app', '')).toBe('/');
	expect(strip_base('/app', '/app/')).toBe('/');
});
