import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync, chmodSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { crc32, pack_folder, pack_tar_gz, pack_zip, checksums_text, write_checksums, sha256_file } from '../../scripts/archive.js';

function temp_dir () {
	return mkdtempSync(join(tmpdir(), 'alumna-archive-'));
}

test('crc32 of 123456789', () => {
	expect(crc32(Buffer.from('123456789')).toString(16)).toBe('cbf43926');
});

test('pack_tar_gz round-trip with tar', () => {
	const dir = temp_dir();
	try {
		const folder = join(dir, 'alumna-linux-x64');
		mkdirSync(folder);
		const bin = join(folder, 'alumna');
		writeFileSync(bin, '#!/bin/sh\necho ok\n');
		chmodSync(bin, 0o755);
		const archive = join(dir, 'alumna-linux-x64.tar.gz');
		pack_tar_gz(folder, archive);
		const listed = spawnSync('tar', [ '-tzf', archive ], { encoding: 'utf8' });
		expect(listed.status).toBe(0);
		expect(listed.stdout).toMatch(/alumna-linux-x64\/alumna/);
		const extract = join(dir, 'out');
		mkdirSync(extract);
		const unpacked = spawnSync('tar', [ '-xzf', archive, '-C', extract ], { encoding: 'utf8' });
		expect(unpacked.status).toBe(0);
		expect(readFileSync(join(extract, 'alumna-linux-x64', 'alumna'), 'utf8')).toMatch(/echo ok/);
	}
	finally {
		rmSync(dir, { recursive: true, force: true });
	}
});

test('pack_zip contains the exe path and checksums_text', () => {
	const dir = temp_dir();
	try {
		const folder = join(dir, 'alumna-windows-x64');
		mkdirSync(folder);
		writeFileSync(join(folder, 'alumna.exe'), Buffer.from('MZ-fake'));
		const archive = join(dir, 'alumna-windows-x64.zip');
		pack_zip(folder, archive);
		const bytes = readFileSync(archive);
		expect(bytes.subarray(0, 2).toString()).toBe('PK');
		expect(bytes.includes(Buffer.from('alumna-windows-x64/alumna.exe'))).toBe(true);
		const py = spawnSync('python3', [
			'-c',
			'import zipfile,sys; z=zipfile.ZipFile(sys.argv[1]); print("\\n".join(z.namelist()))',
			archive
		], { encoding: 'utf8' });
		if (py.status === 0)
			expect(py.stdout).toMatch(/alumna-windows-x64\/alumna\.exe/);
		const sums = checksums_text(dir, [ 'alumna-windows-x64.zip' ]);
		expect(sums).toMatch(/^[0-9a-f]{64}  alumna-windows-x64\.zip\n$/);
		write_checksums(dir, [ 'alumna-windows-x64.zip' ]);
		expect(readFileSync(join(dir, 'SHA256SUMS'), 'utf8')).toBe(sums);
		expect(sha256_file(archive)).toHaveLength(64);
	}
	finally {
		rmSync(dir, { recursive: true, force: true });
	}
});

test('pack_folder picks tar.gz or zip and rejects other suffixes', () => {
	const dir = temp_dir();
	try {
		const folder = join(dir, 'alumna-darwin-arm64');
		mkdirSync(folder);
		writeFileSync(join(folder, 'alumna'), 'x');
		pack_folder(folder, join(dir, 'a.tar.gz'));
		pack_folder(folder, join(dir, 'a.zip'));
		expect(() => pack_folder(folder, join(dir, 'a.rar'))).toThrow(/Unknown archive type/);
	}
	finally {
		rmSync(dir, { recursive: true, force: true });
	}
});

test('pack refuses an empty folder and a slash in a name', () => {
	const dir = temp_dir();
	try {
		const folder = join(dir, 'alumna-linux-x64');
		mkdirSync(folder);
		expect(() => pack_tar_gz(folder, join(dir, 'empty.tar.gz'))).toThrow(/No files/);
	}
	finally {
		rmSync(dir, { recursive: true, force: true });
	}
});
