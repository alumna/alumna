import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { basename, join } from 'node:path';
import { deflateRawSync, gzipSync } from 'node:zlib';

const CRC_TABLE = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
	let c = n;
	for (let k = 0; k < 8; k++)
		c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
	CRC_TABLE[n] = c >>> 0;
}

export function crc32 (buf) {
	let c = 0xFFFFFFFF;
	for (let i = 0; i < buf.length; i++)
		c = CRC_TABLE[(c ^ buf[i]) & 0xFF] ^ (c >>> 8);
	return (c ^ 0xFFFFFFFF) >>> 0;
}

export function sha256_file (path) {
	return createHash('sha256').update(readFileSync(path)).digest('hex');
}

export function checksums_text (dir, names) {
	const lines = [];
	const list = names.slice().sort();
	for (let i = 0; i < list.length; i++)
		lines.push(sha256_file(join(dir, list[i])) + '  ' + list[i]);
	return lines.join('\n') + '\n';
}

export function write_checksums (dir, names) {
	writeFileSync(join(dir, 'SHA256SUMS'), checksums_text(dir, names));
}

function list_files (folder) {
	const names = readdirSync(folder).sort();
	const files = [];
	for (let i = 0; i < names.length; i++) {
		const name = names[i];
		if (name === '.' || name === '..' || name.includes('/') || name.includes('\\'))
			throw new Error('Refusing to pack ' + name);
		const path = join(folder, name);
		const st = statSync(path);
		if (!st.isFile())
			continue;
		files.push({
			name,
			data: readFileSync(path),
			mode: st.mode & 0o7777
		});
	}
	if (!files.length)
		throw new Error('No files to pack in ' + folder);
	return files;
}

function octal (value, length) {
	const body = Number(value).toString(8).padStart(length - 1, '0');
	return body + '\0';
}

function tar_block (name, size, mode, typeflag, data) {
	const header = Buffer.alloc(512);
	header.write(name, 0, Math.min(name.length, 99), 'utf8');
	header.write(octal(mode, 8), 100, 8, 'binary');
	header.write(octal(0, 8), 108, 8, 'binary');
	header.write(octal(0, 8), 116, 8, 'binary');
	header.write(octal(size, 12), 124, 12, 'binary');
	header.write(octal(0, 12), 136, 12, 'binary');
	header.fill(0x20, 148, 156);
	header.write(typeflag, 156, 1, 'utf8');
	header.write('ustar\0', 257, 6, 'binary');
	header.write('00', 263, 2, 'utf8');
	let sum = 0;
	for (let i = 0; i < 512; i++)
		sum += header[i];
	const chk = sum.toString(8).padStart(6, '0') + '\0 ';
	header.write(chk, 148, 8, 'binary');
	if (!data || !data.length)
		return header;
	const pad = (512 - (data.length % 512)) % 512;
	return Buffer.concat([ header, data, Buffer.alloc(pad) ]);
}

export function pack_tar_gz (folder, outfile) {
	const base = basename(folder);
	const files = list_files(folder);
	const parts = [ tar_block(base + '/', 0, 0o755, '5', null) ];
	for (let i = 0; i < files.length; i++) {
		const file = files[i];
		const mode = (file.mode & 0o111) ? (file.mode | 0o755) : (file.mode || 0o644);
		parts.push(tar_block(base + '/' + file.name, file.data.length, mode, '0', file.data));
	}
	parts.push(Buffer.alloc(1024));
	writeFileSync(outfile, gzipSync(Buffer.concat(parts), { level: 9 }));
}

function u16 (n) {
	const b = Buffer.alloc(2);
	b.writeUInt16LE(n, 0);
	return b;
}

function u32 (n) {
	const b = Buffer.alloc(4);
	b.writeUInt32LE(n >>> 0, 0);
	return b;
}

export function pack_zip (folder, outfile) {
	const base = basename(folder);
	const files = list_files(folder);
	const locals = [];
	const centrals = [];
	let offset = 0;
	for (let i = 0; i < files.length; i++) {
		const file = files[i];
		const name = Buffer.from(base + '/' + file.name, 'utf8');
		const crc = crc32(file.data);
		const compressed = deflateRawSync(file.data, { level: 9 });
		const local = Buffer.concat([
			u32(0x04034b50),
			u16(20),
			u16(0),
			u16(8),
			u16(0),
			u16(0),
			u32(crc),
			u32(compressed.length),
			u32(file.data.length),
			u16(name.length),
			u16(0),
			name,
			compressed
		]);
		const unix_attr = ((file.mode & 0o111) ? 0o100755 : 0o100644) << 16;
		const central = Buffer.concat([
			u32(0x02014b50),
			u16(20),
			u16(20),
			u16(0),
			u16(8),
			u16(0),
			u16(0),
			u32(crc),
			u32(compressed.length),
			u32(file.data.length),
			u16(name.length),
			u16(0),
			u16(0),
			u16(0),
			u16(0),
			u32(unix_attr),
			u32(offset),
			name
		]);
		locals.push(local);
		centrals.push(central);
		offset += local.length;
	}
	const central_dir = Buffer.concat(centrals);
	const eocd = Buffer.concat([
		u32(0x06054b50),
		u16(0),
		u16(0),
		u16(files.length),
		u16(files.length),
		u32(central_dir.length),
		u32(offset),
		u16(0)
	]);
	writeFileSync(outfile, Buffer.concat([ ...locals, central_dir, eocd ]));
}

export function pack_folder (folder, outfile) {
	if (outfile.endsWith('.tar.gz'))
		return pack_tar_gz(folder, outfile);
	if (outfile.endsWith('.zip'))
		return pack_zip(folder, outfile);
	throw new Error('Unknown archive type for ' + outfile);
}
