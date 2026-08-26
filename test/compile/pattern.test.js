import { fill_pattern, has_star, is_concrete_path, route_param_keys } from '../../src/compile/pattern.js';

test('pattern helpers', () => {
	expect(has_star('/*')).toBe(true);
	expect(has_star('/blog/:slug')).toBe(false);
	expect(has_star(1)).toBe(false);
	expect(is_concrete_path('/')).toBe(true);
	expect(is_concrete_path('/blog/hello')).toBe(true);
	expect(is_concrete_path('/blog/:slug')).toBe(false);
	expect(is_concrete_path('/*')).toBe(false);
	expect(is_concrete_path('about')).toBe(false);
	expect(is_concrete_path(1)).toBe(false);
	expect(route_param_keys('/blog/:slug')).toEqual([ 'slug' ]);
	expect(route_param_keys('/shop/:cat/:id')).toEqual([ 'cat', 'id' ]);
	expect(route_param_keys('/')).toEqual([]);
	expect(route_param_keys('/:')).toEqual([]);
	expect(route_param_keys(1)).toEqual([]);
	expect(fill_pattern('/blog/:slug', { slug: 'hello' })).toBe('/blog/hello');
	expect(fill_pattern('/shop/:cat/:id', { cat: 'a', id: '1' })).toBe('/shop/a/1');
});
