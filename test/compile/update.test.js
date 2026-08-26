import { compile_project, update_components } from '../../src/compile/project.js';
import { writeFileSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';
import { make_dir } from '../helpers/fixture.js';
import { alumna_root } from '../../src/utils/paths.js';

function mock_vendor () {
	let n = 0;
	async function bundle_vendor ({ base }) {
		n++;
		return {
			files: { ['_alumna/vendor/v' + n + '.js']: 'v' + n },
			import_map: { imports: { alumna: (base || '') + '/_alumna/runtime.js' } }
		};
	}
	bundle_vendor.count = () => n;
	return bundle_vendor;
}

function compile (src_dir, extra = {}) {
	const bundle_vendor = extra.bundle_vendor || mock_vendor();
	return compile_project({
		src_dir,
		dev: true,
		bundle_vendor,
		...extra
	});
}

test('update_components recompiles only the changed module', async () => {
	const bundle_vendor = mock_vendor();
	const src_dir = make_dir({
		'app.js': `
			app.areas = [ 'content' ];
			app.route['/'] = { content: 'Home' };
			app.route['/about'] = { content: 'About' };
		`,
		'components/Home.svelte': `<script>import Badge from './Badge.svelte';</script><h1>Home</h1><Badge />`,
		'components/Badge.svelte': `<span>ok</span>`,
		'components/About.svelte': `<p>About</p>`
	});
	const prev = await compile(src_dir, { bundle_vendor });
	expect(prev.ok).toBe(true);
	const badge_js = prev.files['components/Badge.js'];
	const about_js = prev.files['components/About.js'];
	writeFileSync(join(src_dir, 'components/Home.svelte'), `<script>import Badge from './Badge.svelte';</script><h1>Next</h1><Badge />`);
	const next = await update_components(prev, { src_dir, ids: [ 'Home' ], bundle_vendor });
	expect(next.ok).toBe(true);
	expect(next.files['components/Home.js']).toMatch(/Next/);
	expect(next.files['components/Badge.js']).toBe(badge_js);
	expect(next.files['components/About.js']).toBe(about_js);
	expect(bundle_vendor.count()).toBe(1);
	expect(next.files['_alumna/vendor/v1.js']).toBe('v1');
});

test('update_components compiles a new child and prunes a dropped one', async () => {
	const bundle_vendor = mock_vendor();
	const src_dir = make_dir({
		'app.js': `
			app.areas = [ 'content' ];
			app.route['/'] = { content: 'Home' };
		`,
		'components/Home.svelte': `<script>import Badge from './Badge.svelte';</script><Badge />`,
		'components/Badge.svelte': `<span>old</span>`,
		'components/Card.svelte': `<span>card</span>`
	});
	const prev = await compile(src_dir, { bundle_vendor });
	expect(prev.config.deps['/'].sort()).toEqual([ 'Badge', 'Home' ]);
	writeFileSync(join(src_dir, 'components/Home.svelte'), `<script>import Card from './Card.svelte';</script><Card />`);
	const next = await update_components(prev, { src_dir, ids: [ 'Home' ], bundle_vendor });
	expect(next.ok).toBe(true);
	expect(next.graph.components.Card).toBeTruthy();
	expect(next.graph.components.Badge).toBeUndefined();
	expect(next.files['components/Card.js']).toMatch(/card/);
	expect(next.files['components/Badge.js']).toBeUndefined();
	expect(next.config.deps['/'].sort()).toEqual([ 'Card', 'Home' ]);
});

test('update_components keeps a named layout and updates Home', async () => {
	const bundle_vendor = mock_vendor();
	const src_dir = make_dir({
		'app.js': `
			app.areas = [ 'content' ];
			app.layout.shell = { component: 'Shell', areas: [ 'content' ] };
			app.route['/'] = { content: 'Home', layout: 'shell' };
		`,
		'components/Home.svelte': `<p>home</p>`,
		'components/Shell.svelte': `<script>let { content } = $props();</script>{@render content?.()}`
	});
	const prev = await compile(src_dir, { bundle_vendor });
	const shell_js = prev.files['components/Shell.js'];
	writeFileSync(join(src_dir, 'components/Home.svelte'), `<p>next</p>`);
	const next = await update_components(prev, { src_dir, ids: [ 'Home' ], bundle_vendor });
	expect(next.ok).toBe(true);
	expect(next.files['components/Shell.js']).toBe(shell_js);
	expect(next.config.deps['/']).toContain('Shell');
	expect(next.files['components/Home.js']).toMatch(/next/);
});

test('update_components reports a missing used file', async () => {
	const src_dir = make_dir({
		'app.js': `
			app.areas = [ 'content' ];
			app.route['/'] = { content: 'Home' };
		`,
		'components/Home.svelte': `<p>home</p>`
	});
	const prev = await compile(src_dir);
	unlinkSync(join(src_dir, 'components/Home.svelte'));
	const next = await update_components(prev, { src_dir, ids: [ 'Home' ] });
	expect(next.ok).toBe(false);
	expect(next.errors['components#1']).toMatch(/Non-existent/);
});

test('update_components reports a parse error', async () => {
	const src_dir = make_dir({
		'app.js': `
			app.areas = [ 'content' ];
			app.route['/'] = { content: 'Home' };
		`,
		'components/Home.svelte': `<p>home</p>`
	});
	const prev = await compile(src_dir);
	writeFileSync(join(src_dir, 'components/Home.svelte'), `<script>const x = {</script>`);
	const next = await update_components(prev, { src_dir, ids: [ 'Home' ] });
	expect(next.ok).toBe(false);
	expect(next.errors['components#1']).toMatch(/Failed to parse/);
});

test('update_components reports an escaping import', async () => {
	const src_dir = make_dir({
		'app.js': `
			app.areas = [ 'content' ];
			app.route['/'] = { content: 'Home' };
		`,
		'components/Home.svelte': `<p>home</p>`
	});
	const prev = await compile(src_dir);
	writeFileSync(join(src_dir, 'components/Home.svelte'), `<script>import X from '../../Secret.svelte';</script><p/>`);
	const next = await update_components(prev, { src_dir, ids: [ 'Home' ] });
	expect(next.ok).toBe(false);
	expect(next.errors['components#1']).toMatch(/escapes/);
});

test('update_components reports a compile throw', async () => {
	const src_dir = make_dir({
		'app.js': `
			app.areas = [ 'content' ];
			app.route['/'] = { content: 'Home' };
		`,
		'components/Home.svelte': `<p>home</p>`
	});
	const prev = await compile(src_dir);
	writeFileSync(join(src_dir, 'components/Home.svelte'), `<script>import fs from 'node:fs';</script><p>x</p>`);
	const next = await update_components(prev, { src_dir, ids: [ 'Home' ] });
	expect(next.ok).toBe(false);
	expect(next.errors['Home.svelte']).toMatch(/Cannot import/);
});

test('update_components reports a missing library', async () => {
	const bundle_vendor = mock_vendor();
	const src_dir = make_dir({
		'app.js': `
			app.areas = [ 'content' ];
			app.route['/'] = { content: 'Home' };
		`,
		'components/Home.svelte': `<p>home</p>`
	});
	const prev = await compile(src_dir, { bundle_vendor });
	writeFileSync(join(src_dir, 'components/Home.svelte'), `<script>import { marked } from 'marked';</script><p/>`);
	const next = await update_components(prev, { src_dir, ids: [ 'Home' ], bundle_vendor });
	expect(next.ok).toBe(false);
	expect(next.errors.marked).toMatch(/alumna add marked/);
	expect(bundle_vendor.count()).toBe(1);
});

test('update_components keeps an installed library', async () => {
	const bundle_vendor = mock_vendor();
	const src_dir = make_dir({
		'app.js': `
			app.areas = [ 'content' ];
			app.route['/'] = { content: 'Home' };
		`,
		'components/Home.svelte': `<p>home</p>`
	});
	const prev = await compile(src_dir, { bundle_vendor, project_root: alumna_root });
	writeFileSync(join(src_dir, 'components/Home.svelte'), `<script>import * as acorn from 'acorn';</script><p>lib</p>`);
	const next = await update_components(prev, {
		src_dir,
		ids: [ 'Home' ],
		bundle_vendor,
		project_root: alumna_root
	});
	expect(next.ok).toBe(true);
	expect(next.files['components/Home.js']).toMatch(/acorn/);
	expect(bundle_vendor.count()).toBe(2);
});

test('update_components rebundles when svelte imports change', async () => {
	const bundle_vendor = mock_vendor();
	const src_dir = make_dir({
		'app.js': `
			app.areas = [ 'content' ];
			app.route['/'] = { content: 'Home' };
		`,
		'components/Home.svelte': `<p>home</p>`
	});
	const prev = await compile(src_dir, { bundle_vendor });
	writeFileSync(join(src_dir, 'components/Home.svelte'), `
		<script>import { fade } from 'svelte/transition';</script>
		<p transition:fade>home</p>
	`);
	const next = await update_components(prev, { src_dir, ids: [ 'Home' ] });
	expect(next.ok).toBe(true);
	expect(next.files['_alumna/vendor/v1.js']).toBeUndefined();
	expect(Object.keys(next.files).some(name => name.startsWith('_alumna/vendor/'))).toBe(true);
}, 30000);

test('update_components returns a vendor failure', async () => {
	let boom = false;
	const bundle_vendor = async () => {
		if (boom)
			throw new Error('vendor-boom');
		return { files: { '_alumna/vendor/v1.js': 'v1' }, import_map: { imports: {} } };
	};
	const src_dir = make_dir({
		'app.js': `
			app.areas = [ 'content' ];
			app.route['/'] = { content: 'Home' };
		`,
		'components/Home.svelte': `<p>home</p>`
	});
	const prev = await compile(src_dir, { bundle_vendor });
	boom = true;
	writeFileSync(join(src_dir, 'components/Home.svelte'), `
		<script>import { fade } from 'svelte/transition';</script>
		<p transition:fade>home</p>
	`);
	const next = await update_components(prev, { src_dir, ids: [ 'Home' ], bundle_vendor });
	expect(next.ok).toBe(false);
	expect(next.errors.vendor).toMatch(/vendor-boom/);
});

test('update_components collects warnings', async () => {
	const src_dir = make_dir({
		'app.js': `
			app.areas = [ 'content' ];
			app.route['/'] = { content: 'Home' };
		`,
		'components/Home.svelte': `<p>home</p>`
	});
	const prev = await compile(src_dir);
	writeFileSync(join(src_dir, 'components/Home.svelte'), `<img src="x">`);
	const next = await update_components(prev, { src_dir, ids: [ 'Home' ] });
	expect(next.ok).toBe(true);
	expect(next.warnings.some(message => /alt/.test(message))).toBe(true);
});

test('update_components drops css when the component has none', async () => {
	const src_dir = make_dir({
		'app.js': `
			app.areas = [ 'content' ];
			app.route['/'] = { content: 'Home' };
		`,
		'components/Home.svelte': `<p class="x">hi</p><style>.x{color:red}</style>`
	});
	const prev = await compile(src_dir, { dev: false });
	expect(prev.files['components/Home.css']).toBeTruthy();
	writeFileSync(join(src_dir, 'components/Home.svelte'), `<p>plain</p>`);
	const next = await update_components(prev, { src_dir, ids: [ 'Home' ], dev: false });
	expect(next.ok).toBe(true);
	expect(next.files['components/Home.css']).toBeUndefined();
});

test('update_components falls back to a full compile', async () => {
	const src_dir = make_dir({
		'app.js': `
			app.areas = [ 'content' ];
			app.route['/'] = { content: 'Home' };
		`,
		'components/Home.svelte': `<p>home</p>`
	});
	expect((await update_components()).ok).toBe(false);
	const from_null = await update_components(null, { src_dir, bundle_vendor: mock_vendor() });
	expect(from_null.ok).toBe(true);
	const from_bad = await update_components({ ok: false }, { src_dir, bundle_vendor: mock_vendor() });
	expect(from_bad.ok).toBe(true);
	const prev = await compile(src_dir);
	const from_empty = await update_components(prev, { src_dir, ids: [], bundle_vendor: mock_vendor() });
	expect(from_empty.ok).toBe(true);
	const from_missing = await update_components(prev, { src_dir, bundle_vendor: mock_vendor() });
	expect(from_missing.ok).toBe(true);
});

test('update_components compiles two changed ids', async () => {
	const src_dir = make_dir({
		'app.js': `
			app.areas = [ 'content' ];
			app.route['/'] = { content: 'Home' };
			app.route['/about'] = { content: 'About' };
		`,
		'components/Home.svelte': `<p>home</p>`,
		'components/About.svelte': `<p>about</p>`
	});
	const prev = await compile(src_dir);
	writeFileSync(join(src_dir, 'components/Home.svelte'), `<p>h2</p>`);
	writeFileSync(join(src_dir, 'components/About.svelte'), `<p>a2</p>`);
	const next = await update_components(prev, { src_dir, ids: [ 'Home', 'About' ] });
	expect(next.ok).toBe(true);
	expect(next.files['components/Home.js']).toMatch(/h2/);
	expect(next.files['components/About.js']).toMatch(/a2/);
});
