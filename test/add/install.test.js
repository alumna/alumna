import { mkdtempSync, writeFileSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { add_packages } from '../../src/add/install.js';

test('add_packages requires names', () => {
	expect(() => add_packages('/tmp')).toThrow(/Use: alumna add/);
	expect(() => add_packages('/tmp', null)).toThrow(/Use: alumna add/);
	expect(() => add_packages('/tmp', [])).toThrow(/Use: alumna add/);
	expect(() => add_packages('/tmp', [ '-x' ])).toThrow(/Invalid package name/);
	expect(() => add_packages('/tmp', [ '', null ])).toThrow(/Use: alumna add/);
});

test('creates package.json and uses bun', () => {
	const cwd = mkdtempSync(join(tmpdir(), 'alumna-add-'));
	const spawn = (bin, args) => {
		if (args[0] === '--version')
			return { status: bin === 'bun' ? 0 : 1 };
		return { status: 0, stdout: 'ok', stderr: '' };
	};
	const result = add_packages(cwd, [ 'marked' ], { spawn, find_bun: () => 'bun' });
	expect(result.installer).toBe('bun');
	expect(JSON.parse(readFileSync(join(cwd, 'package.json'), 'utf8')).private).toBe(true);
});

test('keeps existing package.json', () => {
	const cwd = mkdtempSync(join(tmpdir(), 'alumna-add-pkg-'));
	writeFileSync(join(cwd, 'package.json'), '{"name":"keep"}\n');
	add_packages(cwd, [ 'x' ], {
		spawn: () => ({ status: 0 }),
		find_bun: () => 'bun'
	});
	expect(readFileSync(join(cwd, 'package.json'), 'utf8')).toMatch(/keep/);
});

test('bun add failure uses stderr then stdout', () => {
	const cwd = mkdtempSync(join(tmpdir(), 'alumna-add-fail-'));
	expect(() => add_packages(cwd, [ 'x' ], {
		find_bun: () => 'bun',
		spawn: () => ({ status: 1, stderr: 'e', stdout: '' })
	})).toThrow(/^e$/);
	expect(() => add_packages(cwd, [ 'x' ], {
		find_bun: () => 'bun',
		spawn: () => ({ status: 1, stderr: '', stdout: 'o' })
	})).toThrow(/^o$/);
	expect(() => add_packages(cwd, [ 'x' ], {
		find_bun: () => 'bun',
		spawn: () => ({ status: 1, stderr: '', stdout: '' })
	})).toThrow(/bun add failed/);
});

test('falls back to npm', () => {
	const cwd = mkdtempSync(join(tmpdir(), 'alumna-add-npm-'));
	const seen = [];
	const result = add_packages(cwd, [ 'marked', 'date-fns' ], {
		find_bun: () => null,
		spawn: (cmd, args) => {
			seen.push([ cmd, ...args ]);
			return { status: 0, stdout: '', stderr: '' };
		}
	});
	expect(result.installer).toBe('npm');
	expect(seen[0][0]).toBe('npm');
	expect(seen[0]).toContain('marked');
});

test('npm failure message', () => {
	const cwd = mkdtempSync(join(tmpdir(), 'alumna-add-npmf-'));
	expect(() => add_packages(cwd, [ 'x' ], {
		find_bun: () => null,
		spawn: () => ({ status: 1, stderr: '', stdout: '' })
	})).toThrow(/npm install failed/);
});

test('default spawnSync is used when spawn is omitted', () => {
	const cwd = mkdtempSync(join(tmpdir(), 'alumna-add-spawn-'));
	expect(() => add_packages(cwd, [ 'x' ], { find_bun: () => '/no/such/alumna-bun' })).toThrow();
});

test('default find_bun is used', () => {
	const cwd = mkdtempSync(join(tmpdir(), 'alumna-add-def-'));
	expect(() => add_packages(cwd, [ 'x' ], {
		spawn: () => ({ status: 1, stderr: 'no', stdout: '' })
	})).toThrow(/no/);
});
