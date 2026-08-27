import { cache_root, cache_dir } from '../../src/utils/cache.js';
import { existsSync, rmSync } from 'node:fs';
import { join } from 'node:path';

test('cache_root prefers ALUMNA_CACHE', () => {
	const prev = process.env.ALUMNA_CACHE;
	process.env.ALUMNA_CACHE = '/tmp/alumna-cache-test';
	expect(cache_root()).toBe('/tmp/alumna-cache-test');
	if (prev === undefined)
		delete process.env.ALUMNA_CACHE;
	else
		process.env.ALUMNA_CACHE = prev;
});

test('cache_root uses XDG_CACHE_HOME', () => {
	const prev_a = process.env.ALUMNA_CACHE;
	const prev_x = process.env.XDG_CACHE_HOME;
	delete process.env.ALUMNA_CACHE;
	process.env.XDG_CACHE_HOME = '/tmp/xdg-cache';
	expect(cache_root()).toBe(join('/tmp/xdg-cache', 'alumna'));
	if (prev_a === undefined)
		delete process.env.ALUMNA_CACHE;
	else
		process.env.ALUMNA_CACHE = prev_a;
	if (prev_x === undefined)
		delete process.env.XDG_CACHE_HOME;
	else
		process.env.XDG_CACHE_HOME = prev_x;
});

test('cache_root uses LOCALAPPDATA', () => {
	const prev_a = process.env.ALUMNA_CACHE;
	const prev_x = process.env.XDG_CACHE_HOME;
	const prev_l = process.env.LOCALAPPDATA;
	delete process.env.ALUMNA_CACHE;
	delete process.env.XDG_CACHE_HOME;
	process.env.LOCALAPPDATA = '/tmp/localapp';
	expect(cache_root()).toBe(join('/tmp/localapp', 'alumna'));
	if (prev_a !== undefined)
		process.env.ALUMNA_CACHE = prev_a;
	if (prev_x !== undefined)
		process.env.XDG_CACHE_HOME = prev_x;
	if (prev_l === undefined)
		delete process.env.LOCALAPPDATA;
	else
		process.env.LOCALAPPDATA = prev_l;
});

test('cache_root falls back to home .cache', () => {
	const prev_a = process.env.ALUMNA_CACHE;
	const prev_x = process.env.XDG_CACHE_HOME;
	const prev_l = process.env.LOCALAPPDATA;
	const prev_h = process.env.HOME;
	const prev_u = process.env.USERPROFILE;
	delete process.env.ALUMNA_CACHE;
	delete process.env.XDG_CACHE_HOME;
	delete process.env.LOCALAPPDATA;
	expect(cache_root()).toMatch(/\.cache[/\\]alumna$/);
	delete process.env.HOME;
	delete process.env.USERPROFILE;
	expect(cache_root()).toMatch(/\.cache[/\\]alumna$/);
	if (prev_a !== undefined)
		process.env.ALUMNA_CACHE = prev_a;
	if (prev_x !== undefined)
		process.env.XDG_CACHE_HOME = prev_x;
	if (prev_l !== undefined)
		process.env.LOCALAPPDATA = prev_l;
	if (prev_h === undefined)
		delete process.env.HOME;
	else
		process.env.HOME = prev_h;
	if (prev_u === undefined)
		delete process.env.USERPROFILE;
	else
		process.env.USERPROFILE = prev_u;
});

test('cache_dir creates the folder', () => {
	const prev = process.env.ALUMNA_CACHE;
	process.env.ALUMNA_CACHE = join('/tmp', 'alumna-cache-mkdir-' + process.pid);
	const dir = cache_dir('0.0.0-test', 'extra');
	expect(existsSync(dir)).toBe(true);
	expect(existsSync(cache_dir('0.0.0-test'))).toBe(true);
	rmSync(process.env.ALUMNA_CACHE, { recursive: true, force: true });
	if (prev === undefined)
		delete process.env.ALUMNA_CACHE;
	else
		process.env.ALUMNA_CACHE = prev;
});
