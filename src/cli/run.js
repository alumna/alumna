import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Alumna as DefaultAlumna } from '../alumna.js';

const pkg_version = JSON.parse(readFileSync(new URL('../../package.json', import.meta.url), 'utf8')).version;

export function is_cli_entry (meta_url, argv1) {
	if (!meta_url || !argv1)
		return false;
	try {
		return fileURLToPath(meta_url) === resolve(argv1);
	}
	catch {
		return false;
	}
}

export function parse_argv (argv) {
	const flags = {};
	const args = [];

	for (let i = 0; i < argv.length; i++) {
		const token = argv[i];
		if (token === '--help' || token === '-h')
			flags.help = true;
		else if (token === '--version' || token === '-v')
			flags.version = true;
		else if (token === '--port' || token === '-p')
			flags.port = Number(argv[++i]);
		else if (token === '--ssg')
			flags.ssg = true;
		else if (token === '--listen')
			flags.listen = true;
		else if (token === '--route') {
			const value = argv[++i];
			if (!value)
				flags.bad = 'Missing value for --route';
			else if (value.charCodeAt(0) === 45) {
				flags.bad = 'Missing value for --route';
				i--;
			}
			else
				(flags.routes || (flags.routes = [])).push(value);
		}
		else if (token.startsWith('--route='))
			(flags.routes || (flags.routes = [])).push(token.slice(8));
		else if (token === '--id') {
			const value = argv[++i];
			if (!value)
				flags.bad = 'Missing value for --id';
			else if (value.charCodeAt(0) === 45) {
				flags.bad = 'Missing value for --id';
				i--;
			}
			else
				(flags.ids || (flags.ids = [])).push(value);
		}
		else if (token.startsWith('--id='))
			(flags.ids || (flags.ids = [])).push(token.slice(5));
		else if (token.startsWith('--port='))
			flags.port = Number(token.slice(7));
		else if (token.startsWith('-'))
			flags.unknown = token;
		else
			args.push(token);
	}

	return { flags, args };
}

export function help_text (version) {
	return `
alumna version ${version}
=====================================

# create a new project
alumna new <project_name>    In non-existing/empty directory <project_name>
alumna new .                 In current (empty) directory

# compile and start live-reload development mode
alumna dev [--port 3030]

# add a library for use in components
alumna add <package>

# production SPA build
alumna build

# production SSG + hydration
alumna build --ssg

# rebuild one or more SSG pages (needs a prior build)
alumna rebuild --route /about
alumna rebuild --id /about
alumna rebuild --listen [--port 4050]

# serve the build directory
alumna preview [--port 4040]
`.trim();
}

export async function run_cli (argv, io = {}) {
	const version = io.version || pkg_version;
	const log = io.log || console.log;
	const error = io.error || console.error;
	const exit = io.exit || (code => process.exit(code));
	const Alumna = io.Alumna || DefaultAlumna;
	const cwd = io.cwd || process.cwd();
	const tty = io.tty ?? process.stdin.isTTY;

	const { flags, args } = parse_argv(argv);

	if (flags.unknown) {
		error('Unknown flag ' + flags.unknown + '. Type alumna --help');
		exit(1);
		return;
	}

	if (flags.bad) {
		error(flags.bad + '. Type alumna --help');
		exit(1);
		return;
	}

	if (flags.help || (!args.length && !flags.version && tty)) {
		log('\n' + help_text(version) + '\n');
		exit(0);
		return;
	}

	if (flags.version) {
		log('alumna version ' + version);
		exit(0);
		return;
	}

	const command = args[0];
	const alumna = new Alumna({
		cwd,
		port: Number.isFinite(flags.port) ? flags.port : undefined,
		ssg: flags.ssg || undefined
	});

	try {
		if (command === 'new') {
			if (args.length !== 2) {
				log('Use: alumna new <project_name>');
				exit(1);
				return;
			}
			await alumna.new(args[1]);
			return;
		}

		if (command === 'add') {
			if (args.length < 2) {
				log('Use: alumna add <package> [package...]');
				exit(1);
				return;
			}
			await alumna.add(args.slice(1));
			return;
		}

		if (command === 'dev') {
			if (!await alumna.dev())
				exit(1);
			return;
		}

		if (command === 'build') {
			if (!await alumna.build())
				exit(1);
			return;
		}

		if (command === 'preview') {
			if (!await alumna.preview())
				exit(1);
			return;
		}

		if (command === 'rebuild') {
			if (flags.listen) {
				if (!await alumna.listen_rebuild())
					exit(1);
				return;
			}
			if (!await alumna.rebuild({ routes: flags.routes, ids: flags.ids }))
				exit(1);
			return;
		}

		error('Unrecognised command' + (command ? ' ' + command : '') + '. Type alumna --help to see instructions');
		exit(1);
	}
	catch (err) {
		error(err.message || err);
		exit(1);
	}
}

export async function boot_cli (meta_url, argv, io = {}) {
	if (!is_cli_entry(meta_url, argv[1]))
		return false;
	await run_cli(argv.slice(2), io);
	return true;
}
