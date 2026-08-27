import { resolve_rebuild_path, ssg_targets, urls_for_route, resolve_prerender_lists } from '../../src/compile/ssg-targets.js';

const home = { redirect: null, middleware: [], ssg: null, prerender: null };
const auth = { redirect: null, middleware: [ 'auth' ], ssg: null, prerender: null };
const forced = { redirect: null, middleware: [ 'auth' ], ssg: true, prerender: null };
const off = { redirect: null, middleware: [], ssg: false, prerender: null };
const post = {
	redirect: null,
	middleware: [],
	ssg: null,
	prerender: [ { slug: 'hello' }, { slug: 'hello' }, { slug: 'world' } ]
};
const guarded_post = {
	redirect: null,
	middleware: [ 'auth' ],
	ssg: null,
	prerender: [ { slug: 'hello' } ]
};
const forced_post = {
	redirect: null,
	middleware: [ 'auth' ],
	ssg: true,
	prerender: [ { slug: 'hello' } ]
};

test('urls_for_route follows the Q44 table', () => {
	expect(urls_for_route('/x', null)).toEqual([]);
	expect(urls_for_route('/old', { redirect: '/x', middleware: [], ssg: null, prerender: null })).toEqual([]);
	expect(urls_for_route('/*', home)).toEqual([]);
	expect(urls_for_route('/', off)).toEqual([]);
	expect(urls_for_route('/blog/:slug', { ...post, ssg: false })).toEqual([]);
	expect(urls_for_route('/', home)).toEqual([ { path: '/', params: {} } ]);
	expect(urls_for_route('/dash', auth)).toEqual([]);
	expect(urls_for_route('/dash', forced)).toEqual([ { path: '/dash', params: {} } ]);
	expect(urls_for_route('/blog/:slug', { redirect: null, middleware: [], ssg: null, prerender: [] })).toEqual([]);
	expect(urls_for_route('/blog/:slug', { ...post, prerender: null })).toEqual([]);
	expect(urls_for_route('/blog/:slug', post).map(item => item.path)).toEqual([ '/blog/hello', '/blog/world' ]);
	expect(urls_for_route('/blog/:slug', guarded_post)).toEqual([]);
	expect(urls_for_route('/blog/:slug', {
		redirect: null,
		middleware: [],
		ssg: null,
		prerender: async () => [ { slug: 'x' } ]
	})).toEqual([]);
	expect(urls_for_route('/blog/:slug', forced_post).map(item => item.path)).toEqual([ '/blog/hello' ]);
});

test('ssg_targets builds lookup keys from paths and patterns', () => {
	expect(ssg_targets(null)).toEqual({ pages: [], prerender: [], lookup: {} });
	const out = ssg_targets({
		'/': home,
		'/blog/:slug': post
	});
	expect(out.prerender).toEqual([ '/', '/blog/hello', '/blog/world' ]);
	expect(out.lookup['/']).toEqual([ '/' ]);
	expect(out.lookup['/blog/:slug']).toEqual([ '/blog/hello', '/blog/world' ]);
	expect(out.lookup['/blog/hello']).toEqual([ '/blog/hello' ]);
});

test('resolve_rebuild_path errors', () => {
	const routes = {
		'/': home,
		'/dash': auth,
		'/off': off,
		'/old': { redirect: '/x', middleware: [], ssg: null, prerender: null },
		'/blog/:slug': post,
		'/*': home
	};
	expect(resolve_rebuild_path('/blog/:slug', routes).error).toMatch(/concrete path/);
	expect(resolve_rebuild_path('/missing', { '/': home }).error).toMatch(/No route matches/);
	expect(resolve_rebuild_path('/old', routes).error).toMatch(/Redirects never/);
	expect(resolve_rebuild_path('/nope', routes).error).toMatch(/Catch-all/);
	expect(resolve_rebuild_path('/off', routes).error).toMatch(/ssg: false/);
	expect(resolve_rebuild_path('/dash', routes).error).toMatch(/middleware/);
	const ok = resolve_rebuild_path('/blog/extra', routes);
	expect(ok.path).toBe('/blog/extra');
	expect(ok.pattern).toBe('/blog/:slug');
	expect(ok.params.slug).toBe('extra');
});

test('resolve_prerender_lists', async () => {
	expect(await resolve_prerender_lists(null)).toEqual([]);
	const routes = {
		'/blog/:slug': {
			prerender_fn: async () => [ { slug: 'hello' } ],
			prerender: null
		},
		'/ok': { prerender: [ { slug: 'x' } ] },
		'/bad/:slug': {
			prerender_fn: async () => { throw new Error('nope'); }
		},
		'/wrong/:slug': {
			prerender_fn: async () => 'nope'
		},
		'/str/:slug': {
			prerender_fn: async () => { throw 'raw'; }
		}
	};
	const errors = await resolve_prerender_lists(routes);
	expect(routes['/blog/:slug'].prerender).toEqual([ { slug: 'hello' } ]);
	expect(errors.some(message => /prerender failed/.test(message))).toBe(true);
	expect(errors.some(message => /prerender must be an array/.test(message))).toBe(true);
});
