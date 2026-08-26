import { mkdtempSync, writeFileSync, mkdirSync, existsSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { create_project } from '../../src/new/copy.js';

test('rejects an empty name', () => {
	expect(() => create_project('')).toThrow(/Use: alumna new/);
	expect(() => create_project()).toThrow(/Use: alumna new/);
});

test('rejects an invalid name', () => {
	expect(() => create_project('Bad Name')).toThrow(/letters/);
});

test('creates a named project from the scaffold', () => {
	const cwd = mkdtempSync(join(tmpdir(), 'alumna-cwd-'));
	const prev = process.cwd();
	process.chdir(cwd);
	try {
		const dest = create_project('my-app');
		expect(existsSync(join(dest, 'src/app.js'))).toBe(true);
		expect(readFileSync(join(dest, 'src/app.js'), 'utf8')).toMatch(/Hello/);
	}
	finally {
		process.chdir(prev);
	}
});

test('creates into the current empty directory', () => {
	const cwd = mkdtempSync(join(tmpdir(), 'alumna-dot-'));
	const prev = process.cwd();
	process.chdir(cwd);
	try {
		create_project('.');
		expect(existsSync(join(cwd, 'src/index.html'))).toBe(true);
	}
	finally {
		process.chdir(prev);
	}
});

test('rejects a named directory that is not empty', () => {
	const cwd = mkdtempSync(join(tmpdir(), 'alumna-named-full-'));
	mkdirSync(join(cwd, 'app'));
	writeFileSync(join(cwd, 'app', 'keep.txt'), 'x');
	const prev = process.cwd();
	process.chdir(cwd);
	try {
		expect(() => create_project('app')).toThrow(/isn't empty/);
	}
	finally {
		process.chdir(prev);
	}
});

test('rejects a non-empty directory', () => {
	const cwd = mkdtempSync(join(tmpdir(), 'alumna-full-'));
	writeFileSync(join(cwd, 'keep.txt'), 'x');
	const prev = process.cwd();
	process.chdir(cwd);
	try {
		expect(() => create_project('.')).toThrow(/isn't empty/);
	}
	finally {
		process.chdir(prev);
	}
});

test('rejects a destination that is a file', () => {
	const cwd = mkdtempSync(join(tmpdir(), 'alumna-file-'));
	writeFileSync(join(cwd, 'taken'), 'x');
	const prev = process.cwd();
	process.chdir(cwd);
	try {
		expect(() => create_project('taken')).toThrow(/already exists/);
	}
	finally {
		process.chdir(prev);
	}
});

test('creates a missing named directory', () => {
	const cwd = mkdtempSync(join(tmpdir(), 'alumna-miss-'));
	const prev = process.cwd();
	process.chdir(cwd);
	try {
		const dest = create_project('fresh');
		expect(existsSync(join(dest, 'src/components/Hello.svelte'))).toBe(true);
	}
	finally {
		process.chdir(prev);
	}
});
