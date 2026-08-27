export async function with_timeout (promise, ms, label) {
	let timer;
	try {
		return await Promise.race([
			promise,
			new Promise((_, reject) => {
				timer = setTimeout(() => reject(new Error(label + ' timed out')), ms);
			})
		]);
	}
	finally {
		clearTimeout(timer);
	}
}

export function data_ctx (job, route) {
	return {
		path: job.path,
		pattern: job.pattern,
		params: job.params || {},
		query: {},
		layout: route && route.layout
	};
}

export async function call_route_data (route, job, { timeout = 30000 } = {}) {
	if (!route || typeof route.data !== 'function')
		return undefined;
	const value = await with_timeout(Promise.resolve(route.data(data_ctx(job, route))), timeout, 'data()');
	if (value === undefined)
		return undefined;
	try {
		return JSON.parse(JSON.stringify(value));
	}
	catch {
		throw new Error('data() must return JSON data');
	}
}

export function ssg_data_module (map) {
	return 'export default ' + JSON.stringify(map || {}) + ';\n';
}

export function parse_ssg_data_module (source) {
	if (!source)
		return {};
	const start = source.indexOf('{');
	const end = source.lastIndexOf('}');
	if (start < 0 || end < start)
		return {};
	try {
		return JSON.parse(source.slice(start, end + 1));
	}
	catch {
		return {};
	}
}

export function merge_ssg_data (prev, updates) {
	const out = prev && typeof prev === 'object' ? { ...prev } : {};
	const keys = Object.keys(updates || {});
	for (let i = 0; i < keys.length; i++) {
		const key = keys[i];
		if (updates[key] === undefined)
			delete out[key];
		else
			out[key] = updates[key];
	}
	return out;
}
