import { spawnSync } from 'node:child_process';
import { chmodSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { parse_build_args } from '../../scripts/build-binary.js';
import { TARGETS } from '../../scripts/targets.js';

const root = dirname(dirname(dirname(fileURLToPath(import.meta.url))));
const install_sh = join(root, 'scripts/install.sh');
const install_ps1 = join(root, 'scripts/install.ps1');

function print_target (extra = {}) {
	return spawnSync('bash', [ install_sh ], {
		encoding: 'utf8',
		env: {
			...process.env,
			ALUMNA_INTERNAL_PRINT_TARGET: '1',
			ALUMNA_INTERNAL_MUSL: '0',
			ALUMNA_INTERNAL_ROSETTA: '0',
			...extra
		}
	});
}

function fake_bin (dir, name, script) {
	writeFileSync(join(dir, name), '#!/bin/sh\n' + script);
	chmodSync(join(dir, name), 0o755);
}

function detect_linux_target (uname, bin_dir) {
	const env = {
		...process.env,
		ALUMNA_INTERNAL_PRINT_TARGET: '1',
		ALUMNA_INTERNAL_UNAME: uname,
		ALUMNA_INTERNAL_ROSETTA: '0',
		PATH: bin_dir + ':' + process.env.PATH
	};
	delete env.ALUMNA_INTERNAL_MUSL;
	return spawnSync('bash', [ install_sh ], { encoding: 'utf8', env });
}

test('parse_build_args', () => {
	expect(parse_build_args([])).toEqual({ all: false });
	expect(parse_build_args([ '--all' ]).all).toBe(true);
	expect(parse_build_args([ '--all', 'x' ]).all).toBe(true);
});

test('install.sh prints unix targets', () => {
	const cases = [
		[ 'Darwin arm64', '0', '0', 'darwin-arm64' ],
		[ 'Darwin x86_64', '0', '0', 'darwin-x64' ],
		[ 'Darwin x86_64', '0', '1', 'darwin-arm64' ],
		[ 'Linux x86_64', '0', '0', 'linux-x64' ],
		[ 'Linux x86_64', '1', '0', 'linux-x64-musl' ],
		[ 'Linux aarch64', '0', '0', 'linux-arm64' ],
		[ 'Linux arm64', '1', '0', 'linux-arm64-musl' ]
	];
	for (const [ uname, musl, rosetta, want ] of cases) {
		const out = print_target({
			ALUMNA_INTERNAL_UNAME: uname,
			ALUMNA_INTERNAL_MUSL: musl,
			ALUMNA_INTERNAL_ROSETTA: rosetta
		});
		expect(out.status).toBe(0);
		expect(out.stdout.trim()).toBe(want);
	}
});

test('install.sh uses system glibc even when musl tools are on PATH', () => {
	const dir = mkdtempSync(join(tmpdir(), 'alumna-libc-gnu-'));
	try {
		fake_bin(dir, 'getconf', 'if [ "$1" = GNU_LIBC_VERSION ]; then echo \'glibc 2.35\'; exit 0; fi\nexit 1\n');
		fake_bin(dir, 'ldd', 'echo \'musl libc (x86_64)\'\nexit 0\n');
		const x64 = detect_linux_target('Linux x86_64', dir);
		expect(x64.status).toBe(0);
		expect(x64.stdout.trim()).toBe('linux-x64');
		const arm = detect_linux_target('Linux aarch64', dir);
		expect(arm.status).toBe(0);
		expect(arm.stdout.trim()).toBe('linux-arm64');
	}
	finally {
		rmSync(dir, { recursive: true, force: true });
	}
});

test('install.sh selects musl when the system libc is musl', () => {
	const dir = mkdtempSync(join(tmpdir(), 'alumna-libc-musl-'));
	try {
		fake_bin(dir, 'getconf', 'exit 1\n');
		fake_bin(dir, 'ldd', 'if [ "$1" = --version ]; then echo \'musl libc (x86_64)\'; exit 0; fi\necho \'libc.musl-x86_64.so.1\'\nexit 0\n');
		const out = detect_linux_target('Linux x86_64', dir);
		expect(out.status).toBe(0);
		expect(out.stdout.trim()).toBe('linux-x64-musl');
	}
	finally {
		rmSync(dir, { recursive: true, force: true });
	}
});

test('install.sh rejects unknown platforms and extra args', () => {
	const bad = print_target({ ALUMNA_INTERNAL_UNAME: 'Linux riscv64' });
	expect(bad.status).not.toBe(0);
	expect(bad.stderr).toMatch(/no binary/i);
	const extra = spawnSync('bash', [ install_sh, 'v1', 'v2' ], {
		encoding: 'utf8',
		env: { ...process.env, ALUMNA_INTERNAL_PRINT_TARGET: '1', ALUMNA_INTERNAL_UNAME: 'Linux x86_64', ALUMNA_INTERNAL_MUSL: '0' }
	});
	expect(extra.status).not.toBe(0);
	expect(extra.stderr).toMatch(/Too many arguments/);
});

test('install scripts name every release asset', () => {
	const sh = readFileSync(install_sh, 'utf8');
	const ps1 = readFileSync(install_ps1, 'utf8');
	const nginx = readFileSync(join(root, 'scripts/nginx-install.example.conf'), 'utf8');
	expect(sh).toMatch(/alumna-\$target\.tar\.gz/);
	expect(ps1).toMatch(/alumna-\$Target\.zip/);
	expect(sh).toMatch('target=linux-x64');
	expect(sh).toMatch('target=linux-arm64');
	expect(sh).toMatch('target=darwin-x64');
	expect(sh).toMatch('target=darwin-arm64');
	expect(sh).toMatch('target="$target-musl"');
	expect(sh).toMatch('GNU_LIBC_VERSION');
	expect(sh).toMatch('/etc/alpine-release');
	expect(sh).not.toMatch('ld-musl-x86_64.so.1');
	expect(ps1).toMatch('windows-x64');
	expect(ps1).toMatch('windows-arm64');
	expect(nginx).toMatch('location = /install');
	expect(nginx).toMatch('location = /install.ps1');
	expect(TARGETS).toHaveLength(8);
});

test('release workflow is tag-only and drafts', () => {
	const yml = readFileSync(join(root, '.github/workflows/release.yml'), 'utf8');
	expect(yml).toMatch(/tags:/);
	expect(yml).toMatch(/'v\*'/);
	expect(yml).toMatch(/draft: true/);
	expect(yml).toMatch(/build:release/);
	expect(yml).toMatch(/uses: \.\/\.github\/workflows\/ci\.yml/);
	const ci = readFileSync(join(root, '.github/workflows/ci.yml'), 'utf8');
	expect(ci).toMatch(/workflow_call:/);
});
