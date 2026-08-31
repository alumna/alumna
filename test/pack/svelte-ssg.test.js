import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
	export_rel,
	package_export_file,
	svelte_file_from_exports,
	svelte_import_file
} from '../../src/pack/svelte-exports.js';
import {
	link_svelte_ssg,
	ssg_file_url,
	SSG_LINK_MARKER,
	SSG_RUNTIME,
	SSG_ESM_ENV
} from '../../src/pack/svelte-ssg.js';
import { write_file_map } from '../../src/pack/assets.js';
import { alumna_root } from '../../src/utils/paths.js';

function tmp (name) {
	return mkdtempSync(join(tmpdir(), name));
}

test('export_rel reads strings and nested conditions', () => {
	expect(export_rel('./a.js')).toBe('./a.js');
	expect(export_rel(null)).toBeNull();
	expect(export_rel(1)).toBeNull();
	expect(export_rel({ import: './i.js' })).toBe('./i.js');
	expect(export_rel({ import: { default: './n.js' } })).toBe('./n.js');
	expect(export_rel({ default: './d.js' })).toBe('./d.js');
	expect(export_rel({ default: { default: './c.js' } })).toBe('./c.js');
	expect(export_rel({ import: { types: './t.d.ts' }, default: './d.js' })).toBe('./d.js');
	expect(export_rel({})).toBeNull();
	expect(export_rel({ default: { types: './t.d.ts' } })).toBeNull();
});

test('package_export_file reads exports, module, and main', () => {
	const root = tmp('alumna-pkg-exp-');
	write_file_map(root, {
		'node_modules/clsx/package.json': JSON.stringify({
			exports: {
				'.': { import: { types: './clsx.d.mts', default: './dist/clsx.mjs' } },
				'./lite': { import: { default: './dist/lite.mjs' } }
			}
		}),
		'node_modules/clsx/dist/clsx.mjs': 'export const clsx = 1;\n',
		'node_modules/clsx/dist/lite.mjs': 'export const lite = 1;\n',
		'node_modules/modpkg/package.json': '{"module":"./mod.js"}\n',
		'node_modules/modpkg/mod.js': 'export default 1;\n',
		'node_modules/mainpkg/package.json': '{"module":1,"main":"./index.js"}\n',
		'node_modules/mainpkg/index.js': 'export default 1;\n',
		'node_modules/missing/package.json': '{"exports":{".":"./nope.js"}}\n',
		'node_modules/broken/package.json': '{',
		'node_modules/subonly/package.json': '{"exports":{"./x":"./x.js"}}\n'
	});
	expect(package_export_file(root, 'clsx')).toMatch(/clsx\.mjs$/);
	expect(package_export_file(root, 'clsx/lite')).toMatch(/lite\.mjs$/);
	expect(package_export_file(root, 'modpkg')).toMatch(/mod\.js$/);
	expect(package_export_file(root, 'mainpkg')).toMatch(/index\.js$/);
	expect(package_export_file(root, 'missing')).toBeNull();
	expect(package_export_file(root, 'broken')).toBeNull();
	expect(package_export_file(root, 'no-such')).toBeNull();
	expect(package_export_file(root, 'subonly/y')).toBeNull();
});

test('svelte_import_file skips types and missing files', () => {
	const root = tmp('alumna-sv-imp-');
	write_file_map(root, {
		'node_modules/svelte/package.json': JSON.stringify({
			imports: {
				'#client/constants': './src/internal/client/constants.js',
				'#client': './src/internal/client/types.d.ts',
				'#gone': './nope.js',
				'#mjs': './src/x.mjs'
			}
		}),
		'node_modules/svelte/src/internal/client/constants.js': 'export const A = 1;\n',
		'node_modules/svelte/src/internal/client/types.d.ts': 'export {};\n',
		'node_modules/svelte/src/x.mjs': 'export const x = 1;\n'
	});
	expect(svelte_import_file(root, '#client/constants')).toMatch(/constants\.js$/);
	expect(svelte_import_file(root, '#client')).toBeNull();
	expect(svelte_import_file(root, '#gone')).toBeNull();
	expect(svelte_import_file(root, '#mjs')).toMatch(/x\.mjs$/);
	expect(svelte_import_file(root, '#nope')).toBeNull();
	expect(svelte_import_file('/no/such-root', '#client/constants')).toBeNull();
});

function write_ssg_fixture (root) {
	write_file_map(root, {
		'node_modules/svelte/package.json': JSON.stringify({
			exports: {
				'.': { default: './src/index-server.js' },
				'./internal/server': { default: './src/internal/server/index.js' },
				'./reactivity': { default: './src/reactivity/index-server.js' },
				'./nope': { default: './nope.js' }
			},
			imports: {
				'#client/constants': './src/internal/client/constants.js',
				'#client': './src/internal/client/types.d.ts',
				'#missing': './nope.js'
			}
		}),
		'node_modules/svelte/src/index-server.js': 'export function tick () {}\n',
		'node_modules/svelte/src/internal/server/index.js':
			"import { clsx } from '../shared/attributes.js';\n"
			+ "import { STALE_REACTION } from '#client/constants';\n"
			+ "import { DEV } from 'esm-env';\n"
			+ "import * as devalue from 'devalue';\n"
			+ 'export { clsx, DEV, devalue, STALE_REACTION };\n',
		'node_modules/svelte/src/internal/shared/attributes.js':
			"import { clsx as _clsx } from 'clsx';\nexport const clsx = _clsx;\n",
		'node_modules/svelte/src/internal/client/constants.js': 'export const STALE_REACTION = 1;\n',
		'node_modules/svelte/src/internal/client/types.d.ts': 'export {};\n',
		'node_modules/svelte/src/reactivity/index-server.js':
			"import './edges.js';\nexport class MediaQuery { constructor () { this.current = false; } }\n",
		'node_modules/svelte/src/reactivity/edges.js':
			"import * as lib from 'svelte';\n"
			+ "import { tick } from 'svelte/internal/server';\n"
			+ "import nope from 'svelte/nope';\n"
			+ "import miss from '#missing';\n"
			+ "import types from '#client';\n"
			+ "import gone from './gone.js';\n"
			+ "import plain from './plain';\n"
			+ "import dir from './dir';\n"
			+ "import mod from './mod';\n"
			+ "import emptyDir from './empty';\n"
			+ "import json from '../package.json';\n"
			+ "import outside from '../../../outside.js';\n"
			+ "import extra from './extra.mjs';\n"
			+ "import bad from './bad.js';\n"
			+ "import empty from '';\n"
			+ "import fs from 'node:fs';\n"
			+ "import missing from 'no-such-pkg';\n"
			+ "import broken from 'broken-pkg';\n"
			+ "import lite from 'clsx/lite';\n"
			+ "import env from 'esm-env/browser';\n"
			+ 'export { lib, tick, env, lite };\n',
		'node_modules/svelte/src/reactivity/plain': 'export default 1;\n',
		'node_modules/svelte/src/reactivity/dir/index.js': 'export default 1;\n',
		'node_modules/svelte/src/reactivity/mod.js': 'export default 1;\n',
		'node_modules/svelte/src/reactivity/extra.mjs': 'export default 1;\n',
		'node_modules/svelte/src/reactivity/bad.js': '{{{\n',
		'node_modules/clsx/package.json': JSON.stringify({
			exports: {
				'.': { import: { default: './dist/clsx.mjs' } },
				'./lite': { import: { default: './dist/lite.mjs' } }
			}
		}),
		'node_modules/clsx/dist/clsx.mjs': 'export function clsx () { return "ok"; }\nexport default clsx;\n',
		'node_modules/clsx/dist/lite.mjs': 'export function lite () { return "lite"; }\nexport default lite;\n',
		'node_modules/devalue/package.json': JSON.stringify({
			exports: { '.': { import: './index.js', default: './index.js' } }
		}),
		'node_modules/devalue/index.js': 'export function stringify () { return "x"; }\n',
		'node_modules/broken-pkg/package.json': '{',
		'outside.js': 'export default 1;\n'
	});
	mkdirSync(join(root, 'node_modules/svelte/src/reactivity/empty'));
}

test('link_svelte_ssg copies the server graph with file URLs', async () => {
	const root = tmp('alumna-ssg-link-');
	write_ssg_fixture(root);
	link_svelte_ssg(root);

	expect(readFileSync(join(root, 'ssg-esm-env.js'), 'utf8')).toBe(SSG_ESM_ENV);
	expect(existsSync(join(root, SSG_LINK_MARKER))).toBe(true);

	const orig = readFileSync(join(root, 'node_modules/svelte/src/internal/shared/attributes.js'), 'utf8');
	expect(orig).toContain("from 'clsx'");

	const linked_attr = readFileSync(
		join(root, SSG_RUNTIME, 'src/internal/shared/attributes.js'),
		'utf8'
	);
	expect(linked_attr).toContain('file:');
	expect(linked_attr).toContain('clsx.mjs');

	const linked_server = readFileSync(
		join(root, SSG_RUNTIME, 'src/internal/server/index.js'),
		'utf8'
	);
	expect(linked_server).toContain('ssg-esm-env.js');
	expect(linked_server).toContain('devalue');

	const linked_edges = readFileSync(join(root, SSG_RUNTIME, 'src/reactivity/edges.js'), 'utf8');
	expect(linked_edges).toContain('ssg-esm-env.js');
	expect(linked_edges).toContain('lite.mjs');
	expect(linked_edges).toContain("from 'svelte/nope'");
	expect(linked_edges).toContain("from '#missing'");
	expect(linked_edges).toContain("from '#client'");
	expect(linked_edges).toContain("from 'no-such-pkg'");
	expect(linked_edges).toContain("from 'broken-pkg'");
	expect(linked_edges).toContain("from 'node:fs'");
	expect(linked_edges).toContain("from ''");

	expect(existsSync(join(root, SSG_RUNTIME, 'src/reactivity/bad.js'))).toBe(true);
	expect(readFileSync(join(root, SSG_RUNTIME, 'src/reactivity/bad.js'), 'utf8')).toBe('{{{\n');

	const href = ssg_file_url(root, 'svelte/internal/server');
	expect(href).toContain(SSG_RUNTIME);
	const mod = await import(href);
	expect(mod.clsx()).toBe('ok');
	expect(mod.DEV).toBe(false);
	expect(mod.STALE_REACTION).toBe(1);

	expect(ssg_file_url(root, 'svelte/missing')).toBeNull();
	expect(ssg_file_url(alumna_root, 'svelte/internal/server')).toMatch(/internal\/server\/index\.js$/);
	expect(ssg_file_url(alumna_root, 'svelte/internal/server')).not.toContain(SSG_RUNTIME);

	writeFileSync(join(root, 'ssg-esm-env.js'), 'changed\n');
	link_svelte_ssg(root);
	expect(readFileSync(join(root, 'ssg-esm-env.js'), 'utf8')).toBe('changed\n');

	link_svelte_ssg(root, true);
	expect(readFileSync(join(root, 'ssg-esm-env.js'), 'utf8')).toBe(SSG_ESM_ENV);
});

test('link_svelte_ssg with no svelte tree still writes the stub', () => {
	const root = tmp('alumna-ssg-empty-');
	link_svelte_ssg(root);
	expect(readFileSync(join(root, 'ssg-esm-env.js'), 'utf8')).toBe(SSG_ESM_ENV);
	expect(existsSync(join(root, SSG_LINK_MARKER))).toBe(true);
});

test('svelte_file_from_exports nested import default', () => {
	const dir = tmp('alumna-sv-nested-');
	mkdirSync(join(dir, 'node_modules/svelte/src'), { recursive: true });
	writeFileSync(join(dir, 'node_modules/svelte/package.json'), JSON.stringify({
		exports: {
			'./nested': { import: { default: './src/nested.js' } }
		}
	}));
	writeFileSync(join(dir, 'node_modules/svelte/src/nested.js'), 'ok');
	expect(svelte_file_from_exports(dir, 'svelte/nested')).toMatch(/nested\.js$/);
});
