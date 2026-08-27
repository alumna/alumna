import {
	is_compiled_url,
	is_compiled,
	set_compiled
} from '../../src/utils/embedded.js';

test('is_compiled_url', () => {
	expect(is_compiled_url('file:///$bunfs/root/cli.js')).toBe(true);
	expect(is_compiled_url('file:///home/src/cli.js')).toBe(false);
	expect(is_compiled_url(1)).toBe(false);
});

test('set_compiled and env override', () => {
	set_compiled(true);
	const prev = process.env.ALUMNA_COMPILED;
	delete process.env.ALUMNA_COMPILED;
	expect(is_compiled()).toBe(true);
	set_compiled(false);
	expect(is_compiled()).toBe(false);
	process.env.ALUMNA_COMPILED = '1';
	expect(is_compiled()).toBe(true);
	process.env.ALUMNA_COMPILED = '0';
	expect(is_compiled()).toBe(false);
	if (prev === undefined)
		delete process.env.ALUMNA_COMPILED;
	else
		process.env.ALUMNA_COMPILED = prev;
});
