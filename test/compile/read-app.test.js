import { read_app, format_vm_error } from '../../src/compile/read-app.js';

test('reads areas and routes', () => {
	const app = read_app(`
		app.areas = [ 'header', 'content', 'footer' ]
		app.route['/'] = { content: 'Hello' }
	`);
	expect(app.areas).toEqual([ 'header', 'content', 'footer' ]);
	expect(app.route['/']).toEqual({ content: 'Hello' });
	expect(app.group).toEqual({});
	expect(app.layout).toEqual({});
});

test('reports VM syntax errors with a file and line', () => {
	expect(() => read_app('app.areas = [', 'src/app.js')).toThrow(/src\/app\.js/);
});

test('typo app.routes fails', () => {
	expect(() => read_app(`
		app.areas = [ 'content' ]
		app.routes['/'] = { content: 'Hello' }
	`)).toThrow();
});

test('times out runaway app.js', () => {
	expect(() => read_app('while (true) {}', 'src/app.js', { timeout: 20 })).toThrow(/src\/app\.js/);
});

test('format_vm_error uses the stack line when present', () => {
	const error = new Error('boom');
	error.stack = 'Error: boom\n    at src/app.js:3:1';
	expect(format_vm_error(error, 'src/app.js')).toMatch(/src\/app\.js/);
});

test('format_vm_error works without a stack', () => {
	expect(format_vm_error({ message: 'boom' }, 'src/app.js')).toBe('boom in src/app.js, line: ');
});
