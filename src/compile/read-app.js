import vm from 'node:vm';
import { EOL } from 'node:os';

export function format_vm_error (error, filename) {
	const stack = error.stack ? String(error.stack) : '';
	const line = stack.split(EOL)[0].split(':').at(-1);
	return error.message + ' in ' + filename + ', line: ' + line;
}

export function read_app (code, filename = 'src/app.js', { timeout = 1000 } = {}) {
	const sandbox = {
		app: {
			areas: [],
			route: {},
			group: {},
			layout: {},
			middleware: []
		}
	};

	try {
		vm.runInNewContext(code, sandbox, {
			filename,
			timeout,
			displayErrors: true
		});
	}
	catch (error) {
		const wrapped = new Error(format_vm_error(error, filename));
		wrapped.file = filename;
		throw wrapped;
	}

	return JSON.parse(JSON.stringify(sandbox.app));
}
