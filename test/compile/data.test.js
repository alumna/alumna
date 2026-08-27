import {
	with_timeout,
	data_ctx,
	call_route_data,
	ssg_data_module,
	parse_ssg_data_module,
	merge_ssg_data
} from '../../src/compile/data.js';

test('with_timeout resolves and rejects', async () => {
	expect(await with_timeout(Promise.resolve(1), 100, 'x')).toBe(1);
	await expect(with_timeout(new Promise(() => {}), 20, 'slow')).rejects.toThrow(/timed out/);
});

test('data_ctx and call_route_data', async () => {
	expect(data_ctx({ path: '/', pattern: '/', params: { a: '1' } }, { layout: 'dash' })).toEqual({
		path: '/',
		pattern: '/',
		params: { a: '1' },
		query: {},
		layout: 'dash'
	});
	expect(data_ctx({ path: '/', pattern: '/' }, null)).toEqual({
		path: '/',
		pattern: '/',
		params: {},
		query: {},
		layout: null
	});
	expect(await call_route_data(null, { path: '/' })).toBeUndefined();
	expect(await call_route_data({}, { path: '/' })).toBeUndefined();
	expect(await call_route_data({ data: async () => undefined }, { path: '/', pattern: '/', params: {} })).toBeUndefined();
	expect(await call_route_data({ data: async () => ({ title: 'Hi' }) }, { path: '/', pattern: '/', params: {} }))
		.toEqual({ title: 'Hi' });
	await expect(call_route_data({
		data: () => {
			const x = {};
			x.self = x;
			return x;
		}
	}, { path: '/', pattern: '/', params: {} })).rejects.toThrow(/JSON data/);
	await expect(call_route_data({
		data: () => new Promise(() => {})
	}, { path: '/', pattern: '/', params: {} }, { timeout: 20 })).rejects.toThrow(/timed out/);
});

test('ssg_data_module parse and merge', () => {
	expect(ssg_data_module()).toBe('export default {};\n');
	expect(parse_ssg_data_module('')).toEqual({});
	expect(parse_ssg_data_module('nope')).toEqual({});
	expect(parse_ssg_data_module('export default {')).toEqual({});
	expect(parse_ssg_data_module('export default {"/":{"n":1}};\n')).toEqual({ '/': { n: 1 } });
	expect(parse_ssg_data_module('export default { bad };')).toEqual({});
	expect(merge_ssg_data(null, { '/a': 1 })).toEqual({ '/a': 1 });
	expect(merge_ssg_data(5, { '/a': 1 })).toEqual({ '/a': 1 });
	expect(merge_ssg_data({ '/a': 1, '/b': 2 }, { '/b': undefined, '/c': 3 })).toEqual({ '/a': 1, '/c': 3 });
	expect(merge_ssg_data({ '/a': 1 }, null)).toEqual({ '/a': 1 });
});
