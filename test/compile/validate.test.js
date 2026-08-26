import { read_app } from '../../src/compile/read-app.js';
import { validate_app, expand_groups, split_paths } from '../../src/compile/validate.js';

function run (code) {
	return validate_app(read_app(code));
}

test('split_paths trims and drops empty pieces', () => {
	expect(split_paths(' /, /home , ')).toEqual([ '/', '/home' ]);
});

test('single area and component', () => {
	const { errors, routes } = run(`
		app.areas = [ 'content' ];
		app.route[ '/' ] = { content: 'Hello' };
	`);
	expect(errors).toEqual([]);
	expect(routes['/'].areas).toEqual({ content: 'Hello' });
});

test('comma aliases expand', () => {
	const { errors, routes } = run(`
		app.areas = [ 'content' ];
		app.route[ '/, /home' ] = { content: 'Hello' };
	`);
	expect(errors).toEqual([]);
	expect(routes['/'].areas.content).toBe('Hello');
	expect(routes['/home'].areas.content).toBe('Hello');
});

test('shared component across routes', () => {
	const { errors, routes } = run(`
		app.areas = [ 'content', 'footer' ];
		app.route[ '/' ] = { content: 'Hello', footer: 'Footer1' };
		app.route[ '/other' ] = { content: 'Hello', footer: 'Footer2' };
	`);
	expect(errors).toEqual([]);
	expect(routes['/'].areas.content).toBe('Hello');
	expect(routes['/other'].areas.content).toBe('Hello');
	expect(routes['/other'].areas.footer).toBe('Footer2');
});

test('unknown area is an error', () => {
	const { errors } = run(`
		app.areas = [ 'content' ];
		app.route[ '/' ] = { sidebar: 'Nav' };
	`);
	expect(errors.some(message => message.includes('sidebar'))).toBe(true);
});

test('missing areas is an error', () => {
	const { errors } = run(`
		app.route[ '/' ] = { content: 'Hello' };
	`);
	expect(errors.length).toBeGreaterThan(0);
});

test('areas must be an array', () => {
	const { errors } = validate_app({ areas: 'content', route: { '/': { content: 'Hello' } } });
	expect(errors.some(message => message.includes('must be an array'))).toBe(true);
});

test('empty areas is an error', () => {
	const { errors } = validate_app({ areas: [], route: { '/': { content: 'Hello' } } });
	expect(errors.some(message => /app\.areas/.test(message))).toBe(true);
});

test('area names must be strings', () => {
	const { errors } = validate_app({ areas: [ 1 ], route: { '/': { content: 'Hello' } } });
	expect(errors.some(message => message.includes('not a string'))).toBe(true);
});

test('reserved area names are rejected', () => {
	const { errors } = run(`
		app.areas = [ 'layout' ];
		app.route[ '/' ] = { layout: 'Hello' };
	`);
	expect(errors.some(message => /reserved/.test(message))).toBe(true);
});

test('group with base path', () => {
	const { errors, routes } = run(`
		app.areas = [ 'content' ];
		app.group[ '/base' ] = {
			'/route': { content: 'Hello' }
		};
	`);
	expect(errors).toEqual([]);
	expect(routes['/base/route'].areas.content).toBe('Hello');
});

test('group base trailing slash and path without slash', () => {
	const { errors, routes } = run(`
		app.areas = [ 'content' ];
		app.group[ '/base/' ] = {
			'route': { content: 'Hello' }
		};
	`);
	expect(errors).toEqual([]);
	expect(routes['/base/route'].areas.content).toBe('Hello');
});

test('named group without prefix', () => {
	const { errors, routes } = run(`
		app.areas = [ 'content' ];
		app.group[ 'group:public' ] = {
			'/': { content: 'Hello' }
		};
	`);
	expect(errors).toEqual([]);
	expect(routes['/'].areas.content).toBe('Hello');
});

test('duplicate from group and route', () => {
	const { errors } = run(`
		app.areas = [ 'content' ];
		app.group[ '/base' ] = { '/route': { content: 'Hello' } };
		app.route[ '/base/route' ] = { content: 'Other' };
	`);
	expect(errors.some(message => /multiple times/.test(message))).toBe(true);
});

test('empty group name is an error', () => {
	const errors = [];
	expand_groups({ group: { '': { '/x': { content: 'H' } } }, route: {} }, errors);
	expect(errors.some(message => /base path/.test(message))).toBe(true);
});

test('incomplete group: name is an error', () => {
	const { errors } = run(`
		app.areas = [ 'content' ];
		app.group[ 'group:' ] = { '/': { content: 'Hello' } };
		app.route[ '/ok' ] = { content: 'Hello' };
	`);
	expect(errors.some(message => /Incomplete group/.test(message))).toBe(true);
});

test('group that is not an object is ignored', () => {
	const errors = [];
	expand_groups({ group: [], route: {} }, errors);
	expect(errors).toEqual([]);
});

test('group content that is not an object is an error', () => {
	const errors = [];
	expand_groups({ group: { '/base': 'nope' }, route: {} }, errors);
	expect(errors.some(message => /valid format/.test(message))).toBe(true);
});

test('group route that is not an object is an error', () => {
	const errors = [];
	expand_groups({ group: { '/base': { '/x': 'nope' } }, route: {} }, errors);
	expect(errors.some(message => /valid format/.test(message))).toBe(true);
});

test('empty path inside a group is an error', () => {
	const errors = [];
	expand_groups({ group: { '/base': { ' , ': { content: 'H' } } }, route: {} }, errors);
	expect(errors.some(message => /Invalid route path/.test(message))).toBe(true);
});

test('array middleware form is rejected', () => {
	const { errors } = run(`
		app.areas = [ 'content' ];
		app.route[ '/' ] = [{ content: 'Hello' }, 'auth'];
	`);
	expect(errors.some(message => /middleware/.test(message))).toBe(true);
});

test('explicit middleware field is kept', () => {
	const { errors, routes } = run(`
		app.areas = [ 'content' ];
		app.route[ '/dash' ] = { content: 'Dash', middleware: [ 'auth' ] };
	`);
	expect(errors).toEqual([]);
	expect(routes['/dash'].middleware).toEqual([ 'auth' ]);
});

test('middleware must be an array', () => {
	const { errors } = run(`
		app.areas = [ 'content' ];
		app.route[ '/' ] = { content: 'Hello', middleware: 'auth' };
	`);
	expect(errors.some(message => /middleware must be an array/.test(message))).toBe(true);
});

test('app.middleware must be an array of strings', () => {
	const { errors } = run(`
		app.areas = [ 'content' ];
		app.middleware = 'auth';
		app.route['/'] = { content: 'Hello' };
	`);
	expect(errors.some(message => /app\.middleware must be an array/.test(message))).toBe(true);
});

test('middleware names must be strings', () => {
	const { errors } = run(`
		app.areas = [ 'content' ];
		app.middleware = [ '' ];
		app.route['/'] = { content: 'Hello', middleware: [ 1 ] };
	`);
	expect(errors.some(message => /names must be non-empty strings/.test(message))).toBe(true);
});

test('app.middleware names are returned', () => {
	const { errors, middleware } = run(`
		app.areas = [ 'content' ];
		app.middleware = [ 'log' ];
		app.route['/'] = { content: 'Hello' };
	`);
	expect(errors).toEqual([]);
	expect(middleware).toEqual([ 'log' ]);
});

test('redirect routes', () => {
	const { errors, routes } = run(`
		app.areas = [ 'content' ];
		app.route[ '/old' ] = { redirect: '/new' };
		app.route[ '/new' ] = { content: 'Hello' };
	`);
	expect(errors).toEqual([]);
	expect(routes['/old'].redirect).toBe('/new');
});

test('redirect must be a string', () => {
	const { errors } = run(`
		app.areas = [ 'content' ];
		app.route[ '/old' ] = { redirect: 1 };
	`);
	expect(errors.some(message => /redirect must be a string/.test(message))).toBe(true);
});

test('route values must be objects', () => {
	const { errors } = run(`
		app.areas = [ 'content' ];
		app.route[ '/' ] = 'Hello';
	`);
	expect(errors.some(message => /must be objects/.test(message))).toBe(true);
});

test('empty route path is an error', () => {
	const { errors } = validate_app({
		areas: [ 'content' ],
		route: { '': { content: 'Hello' } }
	});
	expect(errors.some(message => /non-empty/.test(message))).toBe(true);
});

test('comma-only route path is invalid', () => {
	const { errors } = validate_app({
		areas: [ 'content' ],
		route: { ' , ': { content: 'Hello' } }
	});
	expect(errors.some(message => /Invalid route path/.test(message))).toBe(true);
});

test('route with no areas and no redirect is an error', () => {
	const { errors } = run(`
		app.areas = [ 'content' ];
		app.route[ '/' ] = {};
	`);
	expect(errors.some(message => /at least one area/.test(message))).toBe(true);
});

test('area component must be a string', () => {
	const { errors } = run(`
		app.areas = [ 'content' ];
		app.route[ '/' ] = { content: 1 };
	`);
	expect(errors.some(message => /component name string/.test(message))).toBe(true);
});

test('duplicate alias is an error', () => {
	const { errors } = run(`
		app.areas = [ 'content' ];
		app.route[ '/, /' ] = { content: 'Hello' };
	`);
	expect(errors.some(message => /multiple times/.test(message))).toBe(true);
});

test('layout name must exist on app.layout', () => {
	const { errors, components, layouts } = run(`
		app.areas = [ 'content' ];
		app.layout.dash = { component: 'layouts/Dash', areas: [ 'content' ] };
		app.route[ '/' ] = { content: 'Hello', layout: 'dash' };
	`);
	expect(errors).toEqual([]);
	expect(components).toContain('layouts/Dash');
	expect(components).toContain('Hello');
	expect(layouts.dash.component).toBe('layouts/Dash');
});

test('unknown layout name is an error', () => {
	const { errors } = run(`
		app.areas = [ 'content' ];
		app.route[ '/' ] = { content: 'Hello', layout: 'missing' };
	`);
	expect(errors.some(message => /not defined in app.layout/.test(message))).toBe(true);
});

test('non-string layout is an error', () => {
	const { errors, components } = run(`
		app.areas = [ 'content' ];
		app.route[ '/' ] = { content: 'Hello', layout: 1 };
	`);
	expect(errors.some(message => /layout must be a layout name/.test(message))).toBe(true);
	expect(components).toEqual([ 'Hello' ]);
});

test('no routes with no other errors', () => {
	const { errors } = validate_app({ areas: [ 'content' ], route: {} });
	expect(errors.some(message => /at least one route/.test(message))).toBe(true);
});

test('no routes when areas already failed does not add a second message', () => {
	const { errors } = validate_app({ route: {} });
	expect(errors.filter(message => /at least one route/.test(message))).toEqual([]);
});

test('route that is not a plain object', () => {
	const { errors } = validate_app({ areas: [ 'content' ], route: null });
	expect(errors.length).toBeGreaterThan(0);
});

test('app.layout must be an object', () => {
	const { errors } = validate_app({
		areas: [ 'content' ],
		layout: [],
		route: { '/': { content: 'Hello' } }
	});
	expect(errors.some(message => /app\.layout must be an object/.test(message))).toBe(true);
});

test('layout definition errors', () => {
	const { errors } = run(`
		app.areas = [ 'content' ];
		app.layout.bad = 'x';
		app.layout.empty = {};
		app.layout.blank = { component: '', areas: [ 'content' ] };
		app.layout.noareas = { component: 'Dash' };
		app.layout.zeroareas = { component: 'Dash', areas: [] };
		app.layout.badarea = { component: 'Dash', areas: [ 'nav-bar' ] };
		app.layout.unknown = { component: 'Dash', areas: [ 'sidebar' ] };
		app.route['/'] = { content: 'Hello' };
	`);
	expect(errors.some(message => /app\.layout\.bad must be an object/.test(message))).toBe(true);
	expect(errors.some(message => /app\.layout\.empty needs a component/.test(message))).toBe(true);
	expect(errors.some(message => /app\.layout\.noareas needs an areas array/.test(message))).toBe(true);
	expect(errors.some(message => /valid identifier/.test(message))).toBe(true);
	expect(errors.some(message => /not defined in app.areas/.test(message))).toBe(true);
});

test('empty layout name on a route is an error', () => {
	const { errors } = run(`
		app.areas = [ 'content' ];
		app.route['/'] = { content: 'Hello', layout: '' };
	`);
	expect(errors.some(message => /layout must be a layout name/.test(message))).toBe(true);
});

test('ssg and prerender are kept on the route', () => {
	const { errors, routes } = run(`
		app.areas = [ 'content' ];
		app.route['/'] = { content: 'Home' };
		app.route['/dash'] = { content: 'Dash', middleware: [ 'auth' ] };
		app.route['/about'] = { content: 'About', ssg: true, middleware: [ 'log' ] };
		app.route['/off'] = { content: 'Home', ssg: false };
		app.route['/blog/:slug'] = {
			content: 'Post',
			prerender: [ { slug: 'hello' }, { slug: 'world' } ]
		};
		app.route['/none/:slug'] = { content: 'Post', prerender: [] };
	`);
	expect(errors).toEqual([]);
	expect(routes['/'].ssg).toBeNull();
	expect(routes['/about'].ssg).toBe(true);
	expect(routes['/off'].ssg).toBe(false);
	expect(routes['/blog/:slug'].prerender).toEqual([ { slug: 'hello' }, { slug: 'world' } ]);
	expect(routes['/none/:slug'].prerender).toEqual([]);
});

test('ssg must be a boolean', () => {
	const { errors } = run(`
		app.areas = [ 'content' ];
		app.route['/'] = { content: 'Home', ssg: 1 };
	`);
	expect(errors.some(message => /ssg must be a boolean/.test(message))).toBe(true);
});

test('ssg true on a param route needs prerender', () => {
	const { errors } = run(`
		app.areas = [ 'content' ];
		app.route['/blog/:slug'] = { content: 'Post', ssg: true };
		app.route['/'] = { content: 'Home' };
	`);
	expect(errors.some(message => /needs prerender/.test(message))).toBe(true);
});

test('prerender type and key errors', () => {
	const { errors } = run(`
		app.areas = [ 'content' ];
		app.route['/'] = { content: 'Home', prerender: [ { slug: 'x' } ] };
		app.route['/a/:slug'] = { content: 'Post', prerender: 'hello' };
		app.route['/b/:slug'] = { content: 'Post', prerender: [ 'hello' ] };
		app.route['/c/:slug'] = { content: 'Post', prerender: [ { id: 'x' } ] };
		app.route['/d/:slug'] = { content: 'Post', prerender: [ { slug: 'ok', extra: 'no' } ] };
		app.route['/e/:slug'] = { content: 'Post', prerender: [ { slug: '' } ] };
		app.route['/f/:slug'] = { content: 'Post', prerender: [ { slug: 1 } ] };
		app.route['/shop/:cat/:id'] = { content: 'Post', prerender: [ { cat: 'a', id: '1' } ] };
	`);
	expect(errors.some(message => /prerender is for routes with :params/.test(message))).toBe(true);
	expect(errors.some(message => /prerender must be an array/.test(message))).toBe(true);
	expect(errors.some(message => /must be a param object/.test(message))).toBe(true);
	expect(errors.some(message => /keys must match the route params/.test(message))).toBe(true);
	expect(errors.some(message => /must be a non-empty string/.test(message))).toBe(true);
	const ok = run(`
		app.areas = [ 'content' ];
		app.route['/shop/:cat/:id'] = { content: 'Post', prerender: [ { cat: 'a', id: '1' } ] };
	`);
	expect(ok.errors).toEqual([]);
	expect(ok.routes['/shop/:cat/:id'].prerender[0]).toEqual({ cat: 'a', id: '1' });
});

test('catch-all and redirect never SSG', () => {
	const { errors } = run(`
		app.areas = [ 'content' ];
		app.route['/'] = { content: 'Home' };
		app.route['/*'] = { content: 'Home', ssg: true };
		app.route['/files/*'] = { content: 'Home', prerender: [ { _: 'a' } ] };
		app.route['/old'] = { redirect: '/new', ssg: true };
		app.route['/gone'] = { redirect: '/new', prerender: [ { slug: 'x' } ] };
		app.route['/new'] = { content: 'Home' };
	`);
	expect(errors.filter(message => /catch-all routes never SSG/.test(message)).length).toBeGreaterThan(0);
	expect(errors.filter(message => /redirects never SSG/.test(message)).length).toBeGreaterThan(0);
});
