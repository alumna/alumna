import { match_path, compile_pattern, parse_query } from '../../src/compile/match.js';

test('exact path', () => {
	const routes = { '/': { areas: { content: 'Home' } } };
	const hit = match_path('/', routes);
	expect(hit.route.areas.content).toBe('Home');
	expect(hit.pattern).toBe('/');
	expect(hit.params).toEqual({});
});

test(':id params', () => {
	const routes = { '/users/:id': { areas: { content: 'User' } } };
	const hit = match_path('/users/42', routes);
	expect(hit.route.areas.content).toBe('User');
	expect(hit.params.id).toBe('42');
	expect(hit.pattern).toBe('/users/:id');
});

test('decodes params and keeps bad encodings', () => {
	const routes = { '/users/:id': { areas: { content: 'User' } } };
	expect(match_path('/users/a%20b', routes).params.id).toBe('a b');
	expect(match_path('/users/%ZZ', routes).params.id).toBe('%ZZ');
});

test('/* is a fallback and does not steal :id routes', () => {
	const routes = {
		'/*': { areas: { content: 'NotFound' } },
		'/users/:id': { areas: { content: 'User' } }
	};
	expect(match_path('/users/1', routes).route.areas.content).toBe('User');
	expect(match_path('/missing', routes).route.areas.content).toBe('NotFound');
});

test('star segments and a miss with no 404 route', () => {
	const routes = { '/files/*': { areas: { content: 'File' } } };
	expect(match_path('/files/', routes).params._).toBe('');
	expect(match_path('/files/a/b', routes).params._).toBe('a/b');
	expect(match_path('/nope', routes)).toBeNull();
});

test('static routes are skipped in the parametric pass', () => {
	const routes = {
		'/about': { areas: { content: 'About' } },
		'/users/:id': { areas: { content: 'User' } }
	};
	expect(match_path('/users/1', routes).route.areas.content).toBe('User');
	expect(match_path('/nope', routes)).toBeNull();
});

test('parametric miss then wildcard', () => {
	const routes = {
		'/users/:id': { areas: { content: 'User' } },
		'/*': { areas: { content: 'NotFound' } }
	};
	expect(match_path('/about', routes).route.areas.content).toBe('NotFound');
});

test('compile_pattern caches and escapes regex chars', () => {
	const first = compile_pattern('/foo.bar');
	const second = compile_pattern('/foo.bar');
	expect(first).toBe(second);
	expect(first.regex.test('/foo.bar')).toBe(true);
	expect(first.regex.test('/fooXbar')).toBe(false);
});

test('parse_query', () => {
	expect(parse_query('')).toEqual({});
	expect(parse_query('?a=1&b=2')).toEqual({ a: '1', b: '2' });
	expect(parse_query('a=1')).toEqual({ a: '1' });
});
