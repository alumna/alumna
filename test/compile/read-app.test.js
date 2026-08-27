import { read_app, format_vm_error, clone_out } from '../../src/compile/read-app.js';

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

test('keeps data functions from the sandbox', () => {
	const app = read_app(`
		app.areas = [ 'content' ]
		app.route['/'] = { content: 'Hello', data: async () => ({ n: 1 }) }
	`);
	expect(typeof app.route['/'].data).toBe('function');
});

test('clone_out covers primitives, cycles, dates, and functions', () => {
	expect(clone_out(null)).toBeNull();
	expect(clone_out(undefined)).toBeUndefined();
	expect(clone_out(true)).toBe(true);
	expect(clone_out(1n)).toBe(1n);
	expect(clone_out(Symbol.for('x'))).toBe(Symbol.for('x'));
	const fn = () => 1;
	expect(clone_out(fn)).toBe(fn);
	const date = new Date('2026-01-01');
	expect(clone_out(date)).toBe('2026-01-01T00:00:00.000Z');
	const a = [];
	a.push(a);
	const c = clone_out(a);
	expect(c[0]).toBe(c);
	const cyclic = {};
	cyclic.self = cyclic;
	const o = clone_out(cyclic);
	expect(o.self).toBe(o);
	const boom = { x: 1 };
	Object.defineProperty(boom, Symbol.toStringTag, { value: 'Boom' });
	Object.defineProperty(boom, 'toJSON', {
		value () {
			throw new Error('no');
		}
	});
	expect(clone_out(boom)).toBe(boom);
});
