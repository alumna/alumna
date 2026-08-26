import { jest } from '@jest/globals';
import { find_bun } from '../../src/utils/bin.js';

test('find_bun uses the Bun global', () => {
	const prev = globalThis.Bun;
	globalThis.Bun = {};
	try {
		expect(find_bun(() => ({ status: 1 }))).toBe(process.execPath);
	}
	finally {
		if (prev === undefined)
			delete globalThis.Bun;
		else
			globalThis.Bun = prev;
	}
});

test('find_bun returns the first working candidate', () => {
	const spawn = jest.fn(bin => ({ status: bin === 'bun' ? 0 : 1, stdout: '1.4.0' }));
	const prev_bun = process.env.BUN;
	delete process.env.BUN;
	expect(find_bun(spawn)).toBe('bun');
	if (prev_bun !== undefined)
		process.env.BUN = prev_bun;
});

test('find_bun uses BUN when that probe works', () => {
	const prev = process.env.BUN;
	process.env.BUN = '/custom/bun';
	const spawn = jest.fn(bin => ({ status: bin === '/custom/bun' ? 0 : 1 }));
	expect(find_bun(spawn)).toBe('/custom/bun');
	if (prev === undefined)
		delete process.env.BUN;
	else
		process.env.BUN = prev;
});

test('find_bun returns null when none work', () => {
	const prev = process.env.BUN;
	delete process.env.BUN;
	expect(find_bun(() => ({ status: 1 }))).toBeNull();
	if (prev !== undefined)
		process.env.BUN = prev;
});

test('find_bun default spawn and missing HOME', () => {
	const prev_home = process.env.HOME;
	const prev_bun = process.env.BUN;
	delete process.env.HOME;
	delete process.env.BUN;
	expect(find_bun(() => ({ status: 1 }))).toBeNull();
	if (prev_home !== undefined)
		process.env.HOME = prev_home;
	if (prev_bun !== undefined)
		process.env.BUN = prev_bun;
	const bin = find_bun();
	expect(bin === null || typeof bin === 'string').toBe(true);
});
