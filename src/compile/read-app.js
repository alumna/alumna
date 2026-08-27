import vm from 'node:vm';
import { EOL } from 'node:os';

export function format_vm_error (error, filename) {
	const stack = error.stack ? String(error.stack) : '';
	const line = stack.split(EOL)[0].split(':').at(-1);
	return error.message + ' in ' + filename + ', line: ' + line;
}

function sandbox_globals () {
	return {
		fetch: globalThis.fetch,
		URL,
		URLSearchParams,
		AbortController,
		Promise,
		JSON,
		Date,
		Map,
		Set,
		WeakMap,
		WeakSet,
		Array,
		Object,
		Number,
		String,
		Boolean,
		Math,
		RegExp,
		Error,
		TypeError,
		RangeError,
		parseInt,
		parseFloat,
		isNaN,
		isFinite,
		encodeURIComponent,
		decodeURIComponent,
		console,
		Uint8Array,
		TextEncoder,
		TextDecoder,
		queueMicrotask,
		setTimeout,
		clearTimeout,
		Infinity,
		NaN,
		undefined
	};
}

export function clone_out (value, seen) {
	const t = typeof value;
	if (value == null || t === 'string' || t === 'number' || t === 'boolean' || t === 'bigint')
		return value;
	if (t === 'function' || t === 'symbol')
		return value;

	const map = seen || new WeakMap();
	if (map.has(value))
		return map.get(value);

	if (Array.isArray(value)) {
		const out = [];
		map.set(value, out);
		for (let i = 0; i < value.length; i++)
			out[i] = clone_out(value[i], map);
		return out;
	}

	// Keep functions (data, prerender). JSON clone would drop them.
	// VM objects are still [object Object]; Date and Map are not.
	if (Object.prototype.toString.call(value) !== '[object Object]') {
		try {
			return JSON.parse(JSON.stringify(value));
		}
		catch {
			return value;
		}
	}

	const out = {};
	map.set(value, out);
	const keys = Object.keys(value);
	for (let i = 0; i < keys.length; i++)
		out[keys[i]] = clone_out(value[keys[i]], map);
	return out;
}

export function read_app (code, filename = 'src/app.js', { timeout = 1000 } = {}) {
	const sandbox = Object.assign(sandbox_globals(), {
		app: {
			areas: [],
			route: {},
			group: {},
			layout: {},
			middleware: []
		}
	});

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

	return clone_out(sandbox.app);
}
