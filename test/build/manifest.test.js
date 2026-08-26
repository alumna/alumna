import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
	add_lookup,
	alumna_version,
	build_manifest,
	lookup_content,
	merge_manifest,
	read_manifest,
	stringify_manifest
} from '../../src/build/manifest.js';

test('lookup_content uses the table then a concrete path', () => {
	expect(lookup_content(null, '')).toEqual([]);
	expect(lookup_content({}, 'x')).toEqual([]);
	expect(lookup_content({}, '/x')).toEqual([ '/x' ]);
	expect(lookup_content({ lookup: { 'post:1': [ '/a' ] } }, 'post:1')).toEqual([ '/a' ]);
	expect(lookup_content({ lookup: {} }, '/blog/hello')).toEqual([ '/blog/hello' ]);
	expect(lookup_content({ lookup: {} }, 'post:missing')).toEqual([]);
});

test('add_lookup appends unique paths', () => {
	const lookup = {};
	add_lookup(lookup, '/blog/:slug', '/blog/a');
	add_lookup(lookup, '/blog/:slug', '/blog/a');
	add_lookup(lookup, '/blog/:slug', '/blog/b');
	expect(lookup['/blog/:slug']).toEqual([ '/blog/a', '/blog/b' ]);
});

test('build_manifest defaults and stringify', () => {
	const manifest = build_manifest();
	expect(manifest.version).toBe(alumna_version());
	expect(manifest.ssg).toBe(false);
	expect(manifest.lookup).toEqual({});
	expect(stringify_manifest(manifest)).toMatch(/"version"/);
});

test('merge_manifest copies arrays and adds pages', () => {
	const prev = build_manifest({
		ssg: true,
		prerender: [ '/' ],
		lookup: { '/': [ '/' ] },
		areas: [ 'content' ]
	});
	const next = merge_manifest(prev, {
		prerender: [ '/', '/about' ],
		lookup: { '/about': [ '/about' ] }
	});
	expect(next.prerender).toEqual([ '/', '/about' ]);
	expect(next.lookup['/about']).toEqual([ '/about' ]);
	prev.lookup['/'].push('/mutated');
	expect(next.lookup['/']).toEqual([ '/' ]);
	expect(merge_manifest(null).prerender).toEqual([]);
	expect(merge_manifest({ version: 'x' }).version).toBe('x');
});

test('read_manifest', () => {
	const dir = mkdtempSync(join(tmpdir(), 'alumna-man-'));
	expect(read_manifest(dir)).toBeNull();
	writeFileSync(join(dir, 'alumna-manifest.json'), '{not json');
	expect(read_manifest(dir)).toBeNull();
	const nested = join(dir, 'out');
	mkdirSync(nested);
	writeFileSync(join(nested, 'alumna-manifest.json'), '{"ok":true}');
	expect(read_manifest(nested)).toEqual({ ok: true });
});
