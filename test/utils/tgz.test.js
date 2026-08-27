import { gzipSync } from 'node:zlib';
import { mkdtempSync, readFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { extract_tgz, npm_tarball_url, fetch_buffer } from '../../src/utils/tgz.js';

function tar_header (name, size, type = '0') {
	const buf = Buffer.alloc(512);
	buf.write(name);
	buf.write('0000644', 100, 7, 'ascii');
	buf.write('0000000', 108, 7, 'ascii');
	buf.write('0000000', 116, 7, 'ascii');
	buf.write(size.toString(8).padStart(11, '0') + ' ', 124, 12, 'ascii');
	buf.write('00000000000 ', 136, 12, 'ascii');
	buf[156] = type.charCodeAt(0);
	buf.write('ustar', 257);
	let sum = 0;
	for (let i = 0; i < 512; i++)
		sum += i >= 148 && i < 156 ? 32 : buf[i];
	buf.write(sum.toString(8).padStart(6, '0') + '\0 ', 148, 8, 'ascii');
	return buf;
}

function tar_file (name, body, type = '0') {
	const data = Buffer.from(body);
	const padded = Buffer.alloc(Math.ceil(data.length / 512) * 512);
	data.copy(padded);
	return Buffer.concat([ tar_header(name, data.length, type), padded ]);
}

test('npm_tarball_url', () => {
	expect(npm_tarball_url('rolldown', '1.2.6')).toBe('https://registry.npmjs.org/rolldown/-/rolldown-1.2.6.tgz');
	expect(npm_tarball_url('@rolldown/pluginutils', '1.0.0'))
		.toBe('https://registry.npmjs.org/@rolldown/pluginutils/-/pluginutils-1.0.0.tgz');
});

test('extract_tgz strips package/ and writes files', () => {
	const tar = Buffer.concat([
		tar_file('package/index.js', 'export const n = 1;\n'),
		Buffer.alloc(1024)
	]);
	const dest = mkdtempSync(join(tmpdir(), 'alumna-tgz-'));
	extract_tgz(gzipSync(tar), dest);
	expect(readFileSync(join(dest, 'index.js'), 'utf8')).toMatch(/export const n/);
});

test('extract_tgz skips .. and uses pax path', () => {
	const pax = tar_file('pax', '22 path=package/ok.js\n', 'x');
	const file = tar_file('short.js', 'ok');
	const evil = tar_file('../evil.js', 'no');
	const tar = Buffer.concat([ pax, file, evil, Buffer.alloc(1024) ]);
	const dest = mkdtempSync(join(tmpdir(), 'alumna-tgz-pax-'));
	extract_tgz(gzipSync(tar), dest);
	expect(readFileSync(join(dest, 'ok.js'), 'utf8')).toBe('ok');
	expect(existsSync(join(dest, 'evil.js'))).toBe(false);
});

test('extract_tgz uses ustar prefix and skips directories', () => {
	function tar_prefixed (prefix, name, body) {
		const data = Buffer.from(body);
		const padded = Buffer.alloc(Math.ceil(data.length / 512) * 512);
		data.copy(padded);
		const header = tar_header(name, data.length);
		header.write(prefix, 345);
		let sum = 0;
		header.write('        ', 148);
		for (let i = 0; i < 512; i++)
			sum += i >= 148 && i < 156 ? 32 : header[i];
		header.write(sum.toString(8).padStart(6, '0') + '\0 ', 148, 8, 'ascii');
		return Buffer.concat([ header, padded ]);
	}
	const dest = mkdtempSync(join(tmpdir(), 'alumna-tgz-prefix-'));
	const tar = Buffer.concat([
		tar_prefixed('package', 'pref.js', 'from-prefix'),
		tar_file('package/dir', '', '5'),
		Buffer.alloc(1024)
	]);
	extract_tgz(gzipSync(tar), dest);
	expect(readFileSync(join(dest, 'pref.js'), 'utf8')).toBe('from-prefix');
});

test('extract_tgz ignores invalid pax records', () => {
	const dest = mkdtempSync(join(tmpdir(), 'alumna-tgz-badpax-'));
	const tar = Buffer.concat([
		tar_file('pax', '0 x=y\n', 'x'),
		tar_file('pax2', 'xx path=x\n', 'x'),
		tar_file('pax3', 'nospace', 'x'),
		tar_file('pax4', '10 =noval\n', 'x'),
		tar_file('package/kept.js', 'yes'),
		Buffer.alloc(1024)
	]);
	extract_tgz(gzipSync(tar), dest);
	expect(readFileSync(join(dest, 'kept.js'), 'utf8')).toBe('yes');
});

test('extract_tgz stops on empty name', () => {
	const dest = mkdtempSync(join(tmpdir(), 'alumna-tgz-empty-'));
	extract_tgz(gzipSync(Buffer.alloc(1024)), dest);
	expect(existsSync(join(dest, 'x'))).toBe(false);
});

test('fetch_buffer ok and error', async () => {
	const ok = await fetch_buffer('https://example', async () => ({
		ok: true,
		arrayBuffer: async () => new Uint8Array([ 1, 2 ]).buffer
	}));
	expect(ok[0]).toBe(1);
	await expect(fetch_buffer('https://x', async () => ({ ok: false, status: 404 })))
		.rejects.toThrow(/Download failed/);
	const orig = globalThis.fetch;
	globalThis.fetch = async () => ({
		ok: true,
		arrayBuffer: async () => new Uint8Array([ 9 ]).buffer
	});
	try {
		expect((await fetch_buffer('https://example'))[0]).toBe(9);
	}
	finally {
		globalThis.fetch = orig;
	}
});
