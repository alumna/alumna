import { gzipSync } from 'node:zlib';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { reset_rolldown, load_rolldown, ensure_rolldown } from '../../src/compile/rolldown-load.js';

function tar_header (name, size) {
	const buf = Buffer.alloc(512);
	buf.write(name);
	buf.write('0000644', 100, 7, 'ascii');
	buf.write('0000000', 108, 7, 'ascii');
	buf.write('0000000', 116, 7, 'ascii');
	buf.write(size.toString(8).padStart(11, '0') + ' ', 124, 12, 'ascii');
	buf.write('00000000000 ', 136, 12, 'ascii');
	buf[156] = 48;
	buf.write('ustar', 257);
	let sum = 0;
	for (let i = 0; i < 512; i++)
		sum += i >= 148 && i < 156 ? 32 : buf[i];
	buf.write(sum.toString(8).padStart(6, '0') + '\0 ', 148, 8, 'ascii');
	return buf;
}

function tar_file (name, body) {
	const data = Buffer.from(body);
	const padded = Buffer.alloc(Math.ceil(data.length / 512) * 512);
	data.copy(padded);
	return Buffer.concat([ tar_header(name, data.length), padded ]);
}

function tgz_pkg (files) {
	const parts = [];
	for (const [ name, body ] of Object.entries(files))
		parts.push(tar_file('package/' + name, body));
	parts.push(Buffer.alloc(1024));
	return gzipSync(Buffer.concat(parts));
}

function fetch_packs (packs) {
	return async url => {
		let body = packs.other;
		if (url.includes('/rolldown/-/rolldown-'))
			body = packs.rolldown;
		else if (url.includes('binding'))
			body = packs.binding;
		else if (url.includes('pluginutils'))
			body = packs.pluginutils;
		if (!body)
			return { ok: false, status: 404 };
		return { ok: true, arrayBuffer: async () => body };
	};
}

beforeEach(() => {
	reset_rolldown();
});

test('load_rolldown uses import when it works', async () => {
	const mod = { rolldown: () => 1 };
	const out = await load_rolldown({ import_mod: async () => mod });
	expect(out).toBe(mod);
	expect(await load_rolldown({ import_mod: async () => ({}) })).toBe(mod);
});

test('load_rolldown downloads when import fails', async () => {
	const dir = mkdtempSync(join(tmpdir(), 'alumna-rd-'));
	const packs = {
		rolldown: tgz_pkg({
			'package.json': JSON.stringify({
				name: 'rolldown',
				version: '1.2.6',
				dependencies: { '@rolldown/pluginutils': '^1.0.1' }
			}),
			'dist/index.mjs': 'export const rolldown = 1;\n',
			'dist/note.txt': 'skip',
			'dist/nested/x.mjs': 'import * as filter from "@rolldown/pluginutils";\n',
			'dist/shared/open.mjs': 'const m = import("@rolldown/pluginutils/filter");\n',
			'dist/shared/keep.mjs': 'export const n = 1;\n',
			'dist/shared/missing.mjs': 'import x from "@rolldown/pluginutils/missing";\n'
		}),
		binding: tgz_pkg({
			'package.json': JSON.stringify({
				name: 'b',
				main: 'rolldown-binding.linux-x64-gnu.node'
			}),
			'rolldown-binding.linux-x64-gnu.node': 'fake-node'
		}),
		pluginutils: tgz_pkg({
			'package.json': JSON.stringify({
				name: '@rolldown/pluginutils',
				exports: {
					'.': './dist/index.mjs',
					'./filter': './dist/filter/index.mjs'
				}
			}),
			'dist/index.mjs': 'export const n = 1;\n',
			'dist/filter/index.mjs': 'export const f = 1;\n'
		})
	};
	const out = await load_rolldown({
		dir,
		version: '1.2.6',
		binding: '@rolldown/binding-linux-x64-gnu',
		fetch: fetch_packs(packs),
		import_mod: async spec => {
			if (spec === 'rolldown')
				throw new Error('no');
			return { rolldown: 1, spec };
		}
	});
	expect(out.rolldown).toBe(1);
	expect(readFileSync(join(dir, 'node_modules/rolldown/dist/index.mjs'), 'utf8')).toMatch(/rolldown/);
	expect(readFileSync(join(dir, 'node_modules/rolldown/dist/nested/x.mjs'), 'utf8'))
		.toMatch(/@rolldown\/pluginutils\/dist\/index\.mjs/);
	expect(readFileSync(join(dir, 'node_modules/rolldown/dist/shared/open.mjs'), 'utf8'))
		.toMatch(/@rolldown\/pluginutils\/dist\/filter\/index\.mjs/);
	expect(readFileSync(join(dir, 'node_modules/rolldown/dist/shared/missing.mjs'), 'utf8'))
		.toMatch(/@rolldown\/pluginutils\/missing/);
	expect(readFileSync(join(dir, 'node_modules/rolldown/dist/rolldown-binding.linux-x64-gnu.node'), 'utf8'))
		.toBe('fake-node');
	expect(readFileSync(join(dir, 'node_modules/rolldown/dist/shared/rolldown-binding.linux-x64-gnu.node'), 'utf8'))
		.toBe('fake-node');
	expect(readFileSync(join(dir, '.ok'), 'utf8')).toMatch(/layout-2/);
	expect(await ensure_rolldown({ dir, version: '1.2.6' })).toBe(dir);
});

test('load_rolldown no_download rethrows; cache_only skips import', async () => {
	const dir = mkdtempSync(join(tmpdir(), 'alumna-rd2-'));
	const packs = {
		rolldown: tgz_pkg({
			'package.json': '{"name":"rolldown","dependencies":{}}',
			'dist/index.mjs': 'export const rolldown = 1;\n'
		}),
		binding: tgz_pkg({ 'package.json': '{}' })
	};
	await expect(load_rolldown({
		import_mod: async () => { throw new Error('no'); },
		no_download: true
	})).rejects.toThrow(/^no$/);

	const out = await load_rolldown({
		dir,
		version: '1.2.6',
		binding: '@rolldown/binding-linux-x64-gnu',
		fetch: fetch_packs(packs),
		cache_only: true,
		import_mod: async spec => ({ spec })
	});
	expect(out.spec).toMatch(/index\.mjs/);
});

test('ensure_rolldown skips pluginutils without a version', async () => {
	const dir = mkdtempSync(join(tmpdir(), 'alumna-rd-nver-'));
	const packs = {
		rolldown: tgz_pkg({
			'package.json': '{"name":"rolldown","dependencies":{"@rolldown/pluginutils":"latest"}}',
			'dist/index.mjs': 'export const rolldown = 1;\n'
		}),
		binding: tgz_pkg({ 'package.json': '{}' })
	};
	expect(await ensure_rolldown({
		dir,
		version: '1.2.6',
		binding: '@rolldown/binding-linux-x64-gnu',
		fetch: fetch_packs(packs)
	})).toBe(dir);
});

test('load_rolldown uses the real rolldown package', async () => {
	const mod = await load_rolldown();
	expect(typeof mod.rolldown).toBe('function');
});

test('ensure_rolldown uses cache, global fetch, and default binding', async () => {
	const packs = {
		rolldown: tgz_pkg({
			'package.json': '{"name":"rolldown"}',
			'dist/index.mjs': 'export const rolldown = 1;\n'
		}),
		binding: tgz_pkg({ 'package.json': '{}' })
	};
	const prev = process.env.ALUMNA_CACHE;
	process.env.ALUMNA_CACHE = mkdtempSync(join(tmpdir(), 'alumna-rd-def-'));
	const orig = globalThis.fetch;
	globalThis.fetch = fetch_packs(packs);
	try {
		const dir = await ensure_rolldown();
		expect(dir).toMatch(/rolldown-/);
		expect(await ensure_rolldown()).toBe(dir);
	}
	finally {
		globalThis.fetch = orig;
		if (prev === undefined)
			delete process.env.ALUMNA_CACHE;
		else
			process.env.ALUMNA_CACHE = prev;
	}
});

test('ensure_rolldown force rebuilds', async () => {
	const dir = mkdtempSync(join(tmpdir(), 'alumna-rd3-'));
	const packs = {
		rolldown: tgz_pkg({
			'package.json': '{"name":"rolldown","dependencies":{}}',
			'dist/index.mjs': 'export const rolldown = 1;\n'
		}),
		binding: tgz_pkg({ 'package.json': '{}' })
	};
	await ensure_rolldown({
		dir,
		version: '1.2.6',
		binding: '@rolldown/binding-linux-x64-gnu',
		fetch: fetch_packs(packs)
	});
	await ensure_rolldown({
		dir,
		version: '1.2.6',
		binding: '@rolldown/binding-linux-x64-gnu',
		fetch: fetch_packs(packs),
		force: true
	});
	expect(readFileSync(join(dir, 'node_modules/rolldown/dist/index.mjs'), 'utf8')).toMatch(/rolldown/);
});

test('load_rolldown force reloads', async () => {
	let n = 0;
	await load_rolldown({ import_mod: async () => ({ n: ++n }) });
	const again = await load_rolldown({ import_mod: async () => ({ n: ++n }), force: true });
	expect(again.n).toBe(2);
});

function stub_packs (extra = {}) {
	return {
		rolldown: tgz_pkg({
			'package.json': JSON.stringify({
				name: 'rolldown',
				dependencies: { '@rolldown/pluginutils': '1.0.1' }
			}),
			'dist/index.mjs': extra.rolldown_index || 'export const rolldown = 1;\n',
			'dist/use.mjs': extra.use || 'import x from "@rolldown/pluginutils";\n'
		}),
		binding: extra.binding || tgz_pkg({ 'package.json': '{}' }),
		pluginutils: extra.pluginutils || tgz_pkg({
			'package.json': '{"name":"p","main":"lib.mjs"}',
			'lib.mjs': 'export const n = 1;\n'
		})
	};
}

test('ensure_rolldown rebuilds a cache without layout-2', async () => {
	const dir = mkdtempSync(join(tmpdir(), 'alumna-rd-old-'));
	mkdirSync(join(dir, 'node_modules/rolldown/dist'), { recursive: true });
	writeFileSync(join(dir, 'node_modules/rolldown/dist/index.mjs'), 'old');
	writeFileSync(join(dir, '.ok'), '1.2.6\n');
	await ensure_rolldown({
		dir,
		version: '1.2.6',
		binding: '@rolldown/binding-linux-x64-gnu',
		fetch: fetch_packs(stub_packs({ rolldown_index: 'export const rolldown = "new";\n' }))
	});
	expect(readFileSync(join(dir, 'node_modules/rolldown/dist/index.mjs'), 'utf8')).toMatch(/new/);
	expect(readFileSync(join(dir, '.ok'), 'utf8')).toMatch(/layout-2/);
});

test('ensure_rolldown rebuilds a cache without .ok', async () => {
	const dir = mkdtempSync(join(tmpdir(), 'alumna-rd-nook-'));
	mkdirSync(join(dir, 'node_modules/rolldown/dist'), { recursive: true });
	writeFileSync(join(dir, 'node_modules/rolldown/dist/index.mjs'), 'old');
	await ensure_rolldown({
		dir,
		version: '1.2.6',
		binding: '@rolldown/binding-linux-x64-gnu',
		fetch: fetch_packs(stub_packs({ rolldown_index: 'export const rolldown = "fresh";\n' }))
	});
	expect(readFileSync(join(dir, 'node_modules/rolldown/dist/index.mjs'), 'utf8')).toMatch(/fresh/);
});

test('ensure_rolldown skips rewrite without pluginutils package.json', async () => {
	const dir = mkdtempSync(join(tmpdir(), 'alumna-rd-nopkg-'));
	await ensure_rolldown({
		dir,
		version: '1.2.6',
		binding: '@rolldown/binding-linux-x64-gnu',
		fetch: fetch_packs(stub_packs({
			pluginutils: tgz_pkg({ 'dist/index.mjs': 'export const n = 1;\n' })
		}))
	});
	expect(readFileSync(join(dir, 'node_modules/rolldown/dist/use.mjs'), 'utf8'))
		.toMatch(/@rolldown\/pluginutils"/);
});

test('ensure_rolldown uses pluginutils main and dist fallback', async () => {
	const dir = mkdtempSync(join(tmpdir(), 'alumna-rd-main-'));
	await ensure_rolldown({
		dir,
		version: '1.2.6',
		binding: '@rolldown/binding-linux-x64-gnu',
		fetch: fetch_packs(stub_packs())
	});
	expect(readFileSync(join(dir, 'node_modules/rolldown/dist/use.mjs'), 'utf8'))
		.toMatch(/from "\.\.\/\.\.\/@rolldown\/pluginutils\/lib\.mjs"/);

	const dir2 = mkdtempSync(join(tmpdir(), 'alumna-rd-fb-'));
	await ensure_rolldown({
		dir: dir2,
		version: '1.2.6',
		binding: '@rolldown/binding-linux-x64-gnu',
		fetch: fetch_packs(stub_packs({
			pluginutils: tgz_pkg({
				'package.json': '{"name":"p"}',
				'dist/index.mjs': 'export const n = 1;\n'
			})
		}))
	});
	expect(readFileSync(join(dir2, 'node_modules/rolldown/dist/use.mjs'), 'utf8'))
		.toMatch(/from "\.\.\/\.\.\/@rolldown\/pluginutils\/dist\/index\.mjs"/);
});

test('ensure_rolldown keeps imports when the export file is missing', async () => {
	const dir = mkdtempSync(join(tmpdir(), 'alumna-rd-miss-'));
	await ensure_rolldown({
		dir,
		version: '1.2.6',
		binding: '@rolldown/binding-linux-x64-gnu',
		fetch: fetch_packs(stub_packs({
			pluginutils: tgz_pkg({
				'package.json': JSON.stringify({ exports: { '.': './nope.mjs' } })
			})
		}))
	});
	expect(readFileSync(join(dir, 'node_modules/rolldown/dist/use.mjs'), 'utf8'))
		.toMatch(/from "@rolldown\/pluginutils"/);
});

test('ensure_rolldown uses main when exports is not a string', async () => {
	const dir = mkdtempSync(join(tmpdir(), 'alumna-rd-obj-'));
	await ensure_rolldown({
		dir,
		version: '1.2.6',
		binding: '@rolldown/binding-linux-x64-gnu',
		fetch: fetch_packs(stub_packs({
			pluginutils: tgz_pkg({
				'package.json': JSON.stringify({
					exports: { '.': { default: './dist/index.mjs' } },
					main: 'lib.mjs'
				}),
				'lib.mjs': 'export const n = 1;\n'
			})
		}))
	});
	expect(readFileSync(join(dir, 'node_modules/rolldown/dist/use.mjs'), 'utf8'))
		.toMatch(/from "\.\.\/\.\.\/@rolldown\/pluginutils\/lib\.mjs"/);
});

test('ensure_rolldown skips rewrite without rolldown dist', async () => {
	const dir = mkdtempSync(join(tmpdir(), 'alumna-rd-nodist-'));
	await ensure_rolldown({
		dir,
		version: '1.2.6',
		binding: '@rolldown/binding-linux-x64-gnu',
		fetch: fetch_packs({
			rolldown: tgz_pkg({
				'package.json': JSON.stringify({
					name: 'rolldown',
					dependencies: { '@rolldown/pluginutils': '1.0.1' }
				})
			}),
			binding: tgz_pkg({ 'package.json': '{}' }),
			pluginutils: tgz_pkg({
				'package.json': '{"name":"p","main":"lib.mjs"}',
				'lib.mjs': 'export const n = 1;\n'
			})
		})
	});
	expect(existsSync(join(dir, 'node_modules/@rolldown/pluginutils/lib.mjs'))).toBe(true);
	expect(existsSync(join(dir, 'node_modules/rolldown/dist/index.mjs'))).toBe(false);
});

test('ensure_rolldown skips a binding with no package.json or missing main file', async () => {
	const dir = mkdtempSync(join(tmpdir(), 'alumna-rd-bind-'));
	await ensure_rolldown({
		dir,
		version: '1.2.6',
		binding: '@rolldown/binding-linux-x64-gnu',
		fetch: fetch_packs({
			rolldown: tgz_pkg({
				'package.json': '{"name":"rolldown"}',
				'dist/index.mjs': 'export const rolldown = 1;\n'
			}),
			binding: tgz_pkg({ 'README.md': 'x' })
		})
	});
	expect(existsSync(join(dir, 'node_modules/rolldown/dist/index.mjs'))).toBe(true);

	const dir2 = mkdtempSync(join(tmpdir(), 'alumna-rd-bind2-'));
	await ensure_rolldown({
		dir: dir2,
		version: '1.2.6',
		binding: '@rolldown/binding-linux-x64-gnu',
		fetch: fetch_packs({
			rolldown: tgz_pkg({
				'package.json': '{"name":"rolldown"}',
				'dist/index.mjs': 'export const rolldown = 1;\n'
			}),
			binding: tgz_pkg({ 'package.json': '{"main":"missing.node"}' })
		})
	});
	expect(existsSync(join(dir2, 'node_modules/rolldown/dist/missing.node'))).toBe(false);
});
