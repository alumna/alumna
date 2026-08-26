import { mkdtempSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { watch_src, watch_path_to_record, classify_watch, changed_used_ids } from '../../src/dev/watch.js';

test('watch_path_to_record', () => {
	expect(watch_path_to_record(null)).toBeNull();
	expect(watch_path_to_record('')).toBeNull();
	expect(watch_path_to_record('components/Hello.js')).toBeNull();
	expect(watch_path_to_record('components\\Hello.js')).toBeNull();
	expect(watch_path_to_record('app.js')).toBe('app.js');
	expect(watch_path_to_record('components/Hello.svelte')).toBe('components/Hello.svelte');
});

test('watch_src debounce and ignore generated js', async () => {
	const dir = mkdtempSync(join(tmpdir(), 'alumna-watch-'));
	mkdirSync(join(dir, 'components'));
	const seen = [];
	const stop = watch_src(dir, files => seen.push(files), { delay: 20 });
	writeFileSync(join(dir, 'components/Hello.js'), 'generated');
	writeFileSync(join(dir, 'app.js'), 'app.areas = []');
	await new Promise(resolve => setTimeout(resolve, 80));
	stop();
	expect(seen.some(files => files.includes('app.js'))).toBe(true);
	expect(seen.some(files => files.some(file => file.endsWith('Hello.js')))).toBe(false);
});

test('classify_watch follows the 17.3 table', () => {
	const dir = mkdtempSync(join(tmpdir(), 'alumna-class-'));
	mkdirSync(join(dir, 'components'));
	mkdirSync(join(dir, 'static'));
	mkdirSync(join(dir, 'middlewares'));
	mkdirSync(join(dir, 'newdir'));
	writeFileSync(join(dir, 'app.js'), 'ok');
	writeFileSync(join(dir, 'index.html'), 'ok');
	writeFileSync(join(dir, 'static/a.txt'), 'ok');
	writeFileSync(join(dir, 'components/Home.svelte'), '<p/>');
	writeFileSync(join(dir, 'components/Unused.svelte'), '<p/>');
	writeFileSync(join(dir, 'middlewares/auth.js'), 'ok');
	writeFileSync(join(dir, 'notes.txt'), 'ok');

	const compiled = { graph: { components: { Home: {} } } };
	expect(classify_watch([ 'newdir' ], compiled, dir)).toBe('ignore');
	expect(classify_watch([ 'components/Unused.svelte' ], compiled, dir)).toBe('ignore');
	expect(classify_watch([ 'index.html' ], compiled, dir)).toBe('reload');
	expect(classify_watch([ 'static/a.txt' ], compiled, dir)).toBe('reload');
	expect(classify_watch([ 'app.js' ], compiled, dir)).toBe('recompile');
	expect(classify_watch([ 'nested/app.js' ], compiled, dir)).toBe('recompile');
	expect(classify_watch([ 'middlewares/auth.js' ], compiled, dir)).toBe('recompile');
	expect(classify_watch([ 'components/Home.svelte' ], compiled, dir)).toBe('update');
	expect(classify_watch([ 'components/Home.svelte', 'index.html' ], compiled, dir)).toBe('update');
	expect(classify_watch([ 'components/Home.svelte', 'components/Unused.svelte' ], compiled, dir)).toBe('update');
	expect(classify_watch([ 'components/Home.svelte', 'app.js' ], compiled, dir)).toBe('recompile');
	expect(classify_watch([ 'notes.txt' ], compiled, dir)).toBe('recompile');
	expect(classify_watch([ 'gone.txt' ], null, dir)).toBe('recompile');
	expect(classify_watch([ 'components/X.svelte' ], { graph: {} }, dir)).toBe('ignore');
	expect(classify_watch([], compiled, dir)).toBe('ignore');
});

test('changed_used_ids lists used svelte files once', () => {
	const compiled = { graph: { components: { Home: {}, 'dash/Page': {} } } };
	expect(changed_used_ids([
		'components/Home.svelte',
		'components/Unused.svelte',
		'components/Home.svelte',
		'index.html',
		'components\\Home.svelte',
		'components/dash/Page.svelte'
	], compiled)).toEqual([ 'Home', 'dash/Page' ]);
	expect(changed_used_ids([ 'app.js' ], compiled)).toEqual([]);
});

