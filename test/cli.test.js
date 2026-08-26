import { jest } from '@jest/globals';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import {
	parse_argv,
	help_text,
	run_cli,
	boot_cli,
	is_cli_entry
} from '../src/cli/run.js';
import '../src/cli.js';

function io () {
	const out = { logs: [], errors: [], warns: [], exit: null };
	return {
		out,
		version: '0.0.0-test',
		log: (...a) => out.logs.push(a.join(' ')),
		error: (...a) => out.errors.push(a.join(' ')),
		warn: (...a) => out.warns.push(a.join(' ')),
		exit: code => { out.exit = code; },
		tty: false,
		cwd: '/tmp',
		Alumna: class {
			constructor (config) { this.config = config; }
			async new (target) { this.target = target; }
			async add (names) { this.names = names; }
			async dev () { return true; }
			async build () { return true; }
			async preview () { return true; }
		}
	};
}

test('parse_argv', () => {
	expect(parse_argv([ '--help' ]).flags.help).toBe(true);
	expect(parse_argv([ '-h' ]).flags.help).toBe(true);
	expect(parse_argv([ '--version' ]).flags.version).toBe(true);
	expect(parse_argv([ '-v' ]).flags.version).toBe(true);
	expect(parse_argv([ '--ssg' ]).flags.ssg).toBe(true);
	expect(parse_argv([ '--port', '3030' ]).flags.port).toBe(3030);
	expect(parse_argv([ '-p', '9' ]).flags.port).toBe(9);
	expect(parse_argv([ '--port=4040' ]).flags.port).toBe(4040);
	expect(parse_argv([ '--nope' ]).flags.unknown).toBe('--nope');
	expect(parse_argv([ 'dev', 'extra' ]).args).toEqual([ 'dev', 'extra' ]);
});

test('help_text includes the version', () => {
	expect(help_text('1.2.3')).toMatch(/1\.2\.3/);
	expect(help_text('1.2.3')).toMatch(/alumna add/);
	expect(help_text('1.2.3')).toMatch(/--ssg/);
});

test('is_cli_entry', () => {
	expect(is_cli_entry('', 'x')).toBe(false);
	expect(is_cli_entry('file:///tmp/cli.js', '')).toBe(false);
	expect(is_cli_entry('not-a-url', 'x')).toBe(false);
	const href = pathToFileURL('/tmp/cli.js').href;
	expect(is_cli_entry(href, '/tmp/cli.js')).toBe(true);
	expect(is_cli_entry(href, '/tmp/other.js')).toBe(false);
});

test('help flag', async () => {
	const mock = io();
	await run_cli([ '--help' ], mock);
	expect(mock.out.logs.join('')).toMatch(/alumna new/);
	expect(mock.out.exit).toBe(0);
});

test('empty argv on a tty prints help', async () => {
	const mock = io();
	mock.tty = true;
	await run_cli([], mock);
	expect(mock.out.exit).toBe(0);
});

test('version flag', async () => {
	const mock = io();
	await run_cli([ '--version' ], mock);
	expect(mock.out.logs.join('')).toMatch(/alumna version 0\.0\.0-test/);
	expect(mock.out.exit).toBe(0);
});

test('unknown flag', async () => {
	const mock = io();
	await run_cli([ '--nope' ], mock);
	expect(mock.out.errors.join('')).toMatch(/Unknown flag/);
	expect(mock.out.exit).toBe(1);
});

test('new without a name', async () => {
	const mock = io();
	await run_cli([ 'new' ], mock);
	expect(mock.out.logs.join('')).toMatch(/Use: alumna new/);
	expect(mock.out.exit).toBe(1);
});

test('new with a name', async () => {
	const mock = io();
	await run_cli([ 'new', 'app' ], mock);
	expect(mock.out.exit).toBeNull();
});

test('add without a package', async () => {
	const mock = io();
	await run_cli([ 'add' ], mock);
	expect(mock.out.logs.join('')).toMatch(/Use: alumna add/);
	expect(mock.out.exit).toBe(1);
});

test('add with packages', async () => {
	const mock = io();
	let seen;
	mock.Alumna = class {
		constructor () {}
		async add (names) { seen = names; }
	};
	await run_cli([ 'add', 'marked', 'date-fns' ], mock);
	expect(seen).toEqual([ 'marked', 'date-fns' ]);
	expect(mock.out.exit).toBeNull();
});

test('dev success and failure', async () => {
	const mock = io();
	await run_cli([ 'dev' ], mock);
	expect(mock.out.exit).toBeNull();
	mock.Alumna = class { constructor () {} async dev () { return false; } };
	await run_cli([ 'dev' ], mock);
	expect(mock.out.exit).toBe(1);
});

test('build with ssg flag and failure', async () => {
	const mock = io();
	let seen;
	mock.Alumna = class {
		constructor (config) { seen = config; }
		async build () { return true; }
	};
	await run_cli([ 'build', '--ssg' ], mock);
	expect(seen.ssg).toBe(true);
	expect(mock.out.warns.join('')).toBe('');
	mock.Alumna = class { constructor () {} async build () { return false; } };
	await run_cli([ 'build' ], mock);
	expect(mock.out.exit).toBe(1);
});

test('preview success and failure', async () => {
	const mock = io();
	await run_cli([ 'preview' ], mock);
	expect(mock.out.exit).toBeNull();
	mock.Alumna = class { constructor () {} async preview () { return false; } };
	await run_cli([ 'preview' ], mock);
	expect(mock.out.exit).toBe(1);
});

test('unknown command and empty command', async () => {
	const mock = io();
	await run_cli([ 'wat' ], mock);
	expect(mock.out.errors.join('')).toMatch(/Unrecognised command wat/);
	mock.out.errors = [];
	await run_cli([], mock);
	expect(mock.out.errors.join('')).toMatch(/Unrecognised command/);
});

test('finite port is passed', async () => {
	const mock = io();
	let seen;
	mock.Alumna = class {
		constructor (config) { seen = config; }
		async dev () { return true; }
	};
	await run_cli([ 'dev', '--port', '3333' ], mock);
	expect(seen.port).toBe(3333);
});

test('NaN port is dropped', async () => {
	const mock = io();
	let seen;
	mock.Alumna = class {
		constructor (config) { seen = config; }
		async dev () { return true; }
	};
	await run_cli([ 'dev', '--port', 'nope' ], mock);
	expect(seen.port).toBeUndefined();
});

test('catch prints error.message or the value', async () => {
	const mock = io();
	mock.Alumna = class { constructor () {} async new () { throw new Error('fail-new'); } };
	await run_cli([ 'new', 'app' ], mock);
	expect(mock.out.errors.join('')).toMatch(/fail-new/);
	mock.Alumna = class { constructor () {} async new () { throw 'plain'; } };
	await run_cli([ 'new', 'app' ], mock);
	expect(mock.out.errors.join('')).toMatch(/plain/);
});

test('run_cli uses default io when omitted', async () => {
	const log = jest.spyOn(console, 'log').mockImplementation(() => {});
	const exit = jest.spyOn(process, 'exit').mockImplementation(() => {});
	await run_cli([ '--version' ]);
	expect(log).toHaveBeenCalled();
	expect(exit).toHaveBeenCalledWith(0);
	log.mockRestore();
	exit.mockRestore();
});

test('defaults: version, tty, cwd, Alumna, console', async () => {
	const log = jest.spyOn(console, 'log').mockImplementation(() => {});
	const exit = jest.spyOn(process, 'exit').mockImplementation(() => {});
	await run_cli([ '--help' ], { tty: true });
	expect(log).toHaveBeenCalled();
	expect(exit).toHaveBeenCalledWith(0);
	log.mockRestore();
	exit.mockRestore();
});

test('boot_cli skips when this file is not the entry', async () => {
	expect(await boot_cli('file:///tmp/cli.js', [ 'node', '/tmp/other.js' ])).toBe(false);
});

test('boot_cli runs when this file is the entry', async () => {
	const mock = io();
	const href = pathToFileURL('/tmp/cli.js').href;
	expect(await boot_cli(href, [ 'node', resolve('/tmp/cli.js'), '--help' ], mock)).toBe(true);
	expect(mock.out.exit).toBe(0);
});
