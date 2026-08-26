import { parse_hjson } from '../../src/config/hjson.js';
import { empty_project_config, normalize_project_config, load_project_config } from '../../src/config/load.js';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

test('empty and comments only', () => {
	expect(parse_hjson('')).toEqual({});
	expect(parse_hjson('  \n# hi\n// x\n/* y */\n')).toEqual({});
});

test('braced object, quotes, trailing comma, nested', () => {
	const out = parse_hjson(`{
		port: 3030,
		base: "/app/",
		ssg: false,
		title: 'Hi',
		nested: { a: 1, },
		list: [ 1, "x", true, false, null, ],
	}`);
	expect(out.port).toBe(3030);
	expect(out.base).toBe('/app/');
	expect(out.ssg).toBe(false);
	expect(out.title).toBe('Hi');
	expect(out.nested.a).toBe(1);
	expect(out.list).toEqual([ 1, 'x', true, false, null ]);
});

test('brace-less root, unquoted values, hash and slash comments', () => {
	const out = parse_hjson(`
# comment
base: /app
port: 4040 // inline
flag: true
empty: null
`);
	expect(out.base).toBe('/app');
	expect(out.port).toBe(4040);
	expect(out.flag).toBe(true);
	expect(out.empty).toBeNull();
});

test('strings, escapes, unicode', () => {
	expect(parse_hjson('{ s: "a\\nb\\t" }').s).toBe('a\nb\t');
	expect(parse_hjson("{ s: 'q' }").s).toBe('q');
	expect(parse_hjson('{ s: "\\u0041" }').s).toBe('A');
	expect(parse_hjson('{ s: "\\/" }').s).toBe('/');
	expect(parse_hjson('{ s: "\\x" }').s).toBe('x');
	expect(parse_hjson('{ s: "\\r\\b\\f" }').s).toBe('\r\b\f');
});

test('numbers including exponent', () => {
	expect(parse_hjson('{ n: 1E-2 }').n).toBe(0.01);
	expect(parse_hjson('{ n: 1e2 }').n).toBe(100);
	expect(parse_hjson('{ n: -1.5e+2 }').n).toBe(-150);
	expect(parse_hjson('{ n: 1.5e-2 }').n).toBe(0.015);
	expect(parse_hjson('{ n: 10 }').n).toBe(10);
});

test('quoted keys', () => {
	expect(parse_hjson('{ "out dir": "build" }')['out dir']).toBe('build');
});

test('root array', () => {
	expect(parse_hjson('[1, 2]')).toEqual([ 1, 2 ]);
});

test('unquoted true false null and number-like', () => {
	expect(parse_hjson('a: false')).toEqual({ a: false });
	expect(parse_hjson('a: 12.0')).toEqual({ a: 12 });
	expect(parse_hjson('a: hello world')).toEqual({ a: 'hello world' });
});

test('unquoted value stops at comments', () => {
	expect(parse_hjson('a: hello #c\n')).toEqual({ a: 'hello' });
	expect(parse_hjson('a: hello //c\n')).toEqual({ a: 'hello' });
	expect(parse_hjson('a: hello /*c*/\n')).toEqual({ a: 'hello' });
});

test('extra commas in arrays and objects', () => {
	expect(parse_hjson('[1,,2,]')).toEqual([ 1, 2 ]);
	expect(parse_hjson('[,1]')).toEqual([ 1 ]);
	expect(parse_hjson('{, a: 1, , b: 2}')).toEqual({ a: 1, b: 2 });
});

test('parse errors', () => {
	expect(() => parse_hjson('{ s: "nope')).toThrow(/Unclosed string/);
	expect(() => parse_hjson('{ s: "\\')).toThrow(/Unclosed string/);
	expect(() => parse_hjson('{ s: "\\u12" }')).toThrow(/unicode/);
	expect(() => parse_hjson('/* nope')).toThrow(/Unclosed comment/);
	expect(() => parse_hjson('{ a: ')).toThrow(/Unexpected end/);
	expect(() => parse_hjson('[1')).toThrow(/Unclosed array/);
	expect(() => parse_hjson('{ a: 1')).toThrow(/Unclosed object/);
	expect(() => parse_hjson('a 1')).toThrow(/Expected :/);
	expect(() => parse_hjson('} ')).toThrow(/Unexpected }/);
	expect(() => parse_hjson('{ : 1 }')).toThrow(/Missing key/);
	expect(() => parse_hjson('{ a: , }')).toThrow(/Missing value/);
	expect(() => parse_hjson('{ n: - }')).toThrow(/Invalid number/);
});

test('normalize_project_config', () => {
	expect(normalize_project_config(null)).toEqual(empty_project_config());
	expect(normalize_project_config([])).toEqual(empty_project_config());
	const out = normalize_project_config({
		port: '3030',
		base: 'app',
		ssg: 'true',
		out: 'dist',
		title: 1,
		sourcemap: 'true'
	});
	expect(out.port).toBe(3030);
	expect(out.base).toBe('/app');
	expect(out.ssg).toBe(true);
	expect(out.build_dir).toBe('dist');
	expect(out.title).toBe('1');
	expect(out.sourcemap).toBe(true);
	expect(normalize_project_config({ port: 'nope' }).port).toBeUndefined();
	expect(normalize_project_config({ port: '' }).port).toBeUndefined();
	expect(normalize_project_config({ ssg: true }).ssg).toBe(true);
	expect(normalize_project_config({ sourcemap: false }).sourcemap).toBe(false);
	expect(normalize_project_config({ build: 'b' }).build_dir).toBe('b');
	expect(normalize_project_config({ build_dir: 'c' }).build_dir).toBe('c');
});

test('load_project_config missing, valid, invalid', () => {
	const dir = mkdtempSync(join(tmpdir(), 'alumna-hjson-'));
	expect(load_project_config(dir).build_dir).toBe('build');
	writeFileSync(join(dir, 'alumna.hjson'), 'base: /app\nport: 9');
	const loaded = load_project_config(dir);
	expect(loaded.base).toBe('/app');
	expect(loaded.port).toBe(9);
	writeFileSync(join(dir, 'alumna.hjson'), '{');
	expect(() => load_project_config(dir)).toThrow(/alumna\.hjson/);
});
