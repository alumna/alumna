import { sri_hash, url_to_file, integrity_for, with_integrity } from '../../src/utils/sri.js';

test('sri_hash is sha384 base64', () => {
	expect(sri_hash('abc')).toMatch(/^sha384-/);
	expect(sri_hash('abc')).toBe(sri_hash(Buffer.from('abc')));
	expect(sri_hash('abc')).not.toBe(sri_hash('abd'));
});

test('url_to_file strips base and the leading slash', () => {
	expect(url_to_file('/_alumna/vendor/a.js', '')).toBe('_alumna/vendor/a.js');
	expect(url_to_file('/app/_alumna/vendor/a.js', '/app')).toBe('_alumna/vendor/a.js');
	expect(url_to_file('', '')).toBe('');
	expect(url_to_file('vendor/a.js', '')).toBe('vendor/a.js');
});

test('integrity_for hashes mapped files that exist', () => {
	expect(integrity_for(null, {}, '')).toEqual({});
	expect(integrity_for({ alumna: '/_alumna/runtime.js' }, null, '')).toEqual({});
	expect(integrity_for({ alumna: '/_alumna/runtime.js' }, {}, '')).toEqual({});
	const files = { '_alumna/vendor/a.js': 'export const n = 1;\n' };
	const imports = { lib: '/_alumna/vendor/a.js', alumna: '/_alumna/runtime.js' };
	const out = integrity_for(imports, files, '');
	expect(out['/_alumna/vendor/a.js']).toBe(sri_hash(files['_alumna/vendor/a.js']));
	expect(out['/_alumna/runtime.js']).toBeUndefined();
	expect(integrity_for({ lib: '/app/_alumna/vendor/a.js' }, files, '/app')['/app/_alumna/vendor/a.js'])
		.toBe(sri_hash(files['_alumna/vendor/a.js']));
});

test('with_integrity merges hashes and skips empty input', () => {
	expect(with_integrity(null, { x: 'y' })).toBeNull();
	const map = { imports: { a: '/a.js' } };
	expect(with_integrity(map, null)).toBe(map);
	expect(with_integrity(map, {})).toBe(map);
	expect(with_integrity(map, { '/a.js': 'sha384-x' })).toEqual({
		imports: { a: '/a.js' },
		integrity: { '/a.js': 'sha384-x' }
	});
	expect(with_integrity({
		imports: { a: '/a.js' },
		integrity: { '/a.js': 'old' }
	}, { '/b.js': 'new' }).integrity).toEqual({
		'/a.js': 'old',
		'/b.js': 'new'
	});
});
