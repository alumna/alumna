import { mkdtempSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import http from 'node:http';
import net from 'node:net';
import { create_server, pick_port, safe_join, notify_live, end_live } from '../../src/dev/server.js';

async function listen (opts = {}) {
	const httpd = create_server({
		memory: new Map(),
		...opts,
		port: opts.port ?? 0
	});
	const port = await httpd.listen();
	return { httpd, port, url: 'http://127.0.0.1:' + port };
}

async function request (url, headers = {}, method = 'GET') {
	const res = await fetch(url, { method, headers });
	const body = method === 'HEAD' ? '' : await res.text();
	return { status: res.status, body, type: res.headers.get('content-type') };
}

test('notify_live drops a client that throws', () => {
	const dead = { write () { throw new Error('dead'); } };
	const live = { write () {} };
	const clients = new Set([ dead, live ]);
	notify_live(clients);
	expect(clients.has(dead)).toBe(false);
	expect(clients.has(live)).toBe(true);
});

test('end_live ignores a client that throws', () => {
	const dead = { end () { throw new Error('dead'); } };
	const clients = new Set([ dead ]);
	end_live(clients);
	expect(clients.size).toBe(0);
});

test('pick_port returns a free preferred port', async () => {
	const port = await pick_port(39991, { probe: async () => true });
	expect(port).toBe(39991);
});

test('pick_port required throws when busy', async () => {
	await expect(pick_port(80, { required: true, probe: async () => false }))
		.rejects.toThrow(/already in use/);
});

test('pick_port searches after a busy preferred port', async () => {
	let n = 0;
	const port = await pick_port(40000, {
		tries: 5,
		probe: async p => { n++; return p === 40002; }
	});
	expect(port).toBe(40002);
	expect(n).toBeGreaterThan(1);
});

test('pick_port throws when none are free', async () => {
	await expect(pick_port(undefined, { tries: 2, probe: async () => false }))
		.rejects.toThrow(/No free port/);
});

test('pick_port uses is_free for a real ephemeral port', async () => {
	const port = await pick_port();
	expect(port).toBeGreaterThanOrEqual(3030);
});

test('pick_port is_free false path via a held port', async () => {
	const held = await pick_port(0, {
		probe: async () => true
	}).catch(() => null);
	const port = await pick_port();
	const httpd = create_server({ port, memory: new Map() });
	await httpd.listen();
	try {
		await expect(pick_port(port, { required: true })).rejects.toThrow(/already in use/);
	}
	finally {
		await httpd.close();
	}
	void held;
});

test('safe_join', () => {
	const root = mkdtempSync(join(tmpdir(), 'alumna-safe-'));
	expect(safe_join(root, '/ok.txt')).toBe(join(root, 'ok.txt'));
	expect(safe_join(root, '')).toBeNull();
	expect(safe_join(root, '/')).toBeNull();
	expect(safe_join(root, '/a\0b')).toBeNull();
	expect(safe_join(root, '/../secret')).toBeNull();
});

test('memory hit, HEAD, missing type, SPA fallback, 404, 500', async () => {
	const memory = new Map([
		[ '/hi.js', { body: 'ok', type: 'text/javascript' } ],
		[ '/raw', { body: Buffer.from('raw') } ],
		[ '/index.html', { body: '<html>app</html>', type: 'text/html' } ]
	]);
	const { httpd, url } = await listen({ memory });
	try {
		expect((await request(url + '/hi.js')).body).toBe('ok');
		expect((await request(url + '/hi.js', {}, 'HEAD')).status).toBe(200);
		expect((await request(url + '/raw')).body).toBe('raw');
		expect((await request(url + '/missing')).status).toBe(404);
		expect((await request(url + '/page', { accept: 'text/html' })).body).toMatch(/app/);
		expect((await request(url + '/%')).status).toBe(500);
		expect((await request(url + '/', {}, 'GET')).body).toMatch(/app/);
	}
	finally {
		await httpd.close();
	}
});

test('static, vendor, disk_root, and live reload', async () => {
	const src = mkdtempSync(join(tmpdir(), 'alumna-src-'));
	mkdirSync(join(src, 'static'));
	writeFileSync(join(src, 'static', 'logo.txt'), 'logo');

	const vendor = mkdtempSync(join(tmpdir(), 'alumna-ven-'));
	writeFileSync(join(vendor, 'chunk.js'), 'vendor');

	const disk = mkdtempSync(join(tmpdir(), 'alumna-disk-'));
	writeFileSync(join(disk, 'index.html'), '<html>disk</html>');
	writeFileSync(join(disk, 'app.js'), 'disk-js');

	const { httpd, url } = await listen({
		src_dir: src,
		vendor_dir: vendor,
		disk_root: disk,
		memory: new Map()
	});
	try {
		expect((await request(url + '/logo.txt')).body).toBe('logo');
		expect((await request(url + '/_alumna/svelte/chunk.js')).body).toBe('vendor');
		expect((await request(url + '/app.js')).body).toBe('disk-js');
		expect((await request(url + '/')).body).toMatch(/disk/);
		expect((await request(url + '/spa-page', { accept: 'text/html' })).body).toMatch(/disk/);
		expect((await request(url + '/_alumna/svelte/nope.js')).status).toBe(404);

		const ac = new AbortController();
		const live = fetch(url + '/_alumna/live', { signal: ac.signal });
		await new Promise(resolve => setTimeout(resolve, 40));
		httpd.reload();
		ac.abort();
		await live.catch(() => {});
	}
	finally {
		await httpd.close();
	}
});

test('index from memory when pathname is /index.html', async () => {
	const { httpd, url } = await listen({
		memory: new Map([ [ '/index.html', { body: 'idx', type: 'text/html' } ] ])
	});
	try {
		expect((await request(url + '/index.html')).body).toBe('idx');
	}
	finally {
		await httpd.close();
	}
});

test('reload drops a client that throws', async () => {
	const { httpd, port } = await listen({ memory: new Map() });
	try {
		await new Promise(resolve => {
			const req = http.get({ hostname: '127.0.0.1', port, path: '/_alumna/live' }, res => {
				res.write = () => { throw new Error('dead'); };
				res.end = () => { throw new Error('dead'); };
				httpd.reload();
				req.destroy();
				resolve();
			});
			req.on('error', () => resolve());
		});
	}
	finally {
		await httpd.close();
	}
});

test('close fails when the server is already closed', async () => {
	const { httpd } = await listen({ memory: new Map() });
	await httpd.close();
	await expect(httpd.close()).rejects.toThrow();
});

test('host header fallback', async () => {
	const { httpd, port } = await listen({
		memory: new Map([ [ '/x', { body: 'y', type: 'text/plain' } ] ])
	});
	try {
		const body = await new Promise((resolve, reject) => {
			const sock = net.connect(port, '127.0.0.1', () => {
				sock.write('GET /x HTTP/1.0\r\n\r\n');
			});
			const chunks = [];
			sock.on('data', chunk => chunks.push(chunk));
			sock.on('end', () => resolve(Buffer.concat(chunks).toString()));
			sock.on('error', reject);
		});
		expect(body).toMatch(/y/);
	}
	finally {
		await httpd.close();
	}
});

test('html accept without disk_root and without index is 404', async () => {
	const { httpd, url } = await listen({ memory: new Map() });
	try {
		expect((await request(url + '/spa', { accept: 'text/html' })).status).toBe(404);
		expect((await request(url + '/x.html', { accept: 'text/html' })).status).toBe(404);
	}
	finally {
		await httpd.close();
	}
});

test('missing accept header and a throw without stack', async () => {
	const memory = {
		has (path) {
			if (path === '/boom')
				throw 'bad';
			return false;
		},
		get () { return null; }
	};
	const { httpd, port } = await listen({ memory });
	try {
		const no_accept = await new Promise((resolve, reject) => {
			const sock = net.connect(port, '127.0.0.1', () => {
				sock.write('GET /no-accept HTTP/1.0\r\n\r\n');
			});
			const chunks = [];
			sock.on('data', chunk => chunks.push(chunk));
			sock.on('end', () => resolve(Buffer.concat(chunks).toString()));
			sock.on('error', reject);
		});
		expect(no_accept).toMatch(/Not found/);

		const boom = await new Promise((resolve, reject) => {
			const sock = net.connect(port, '127.0.0.1', () => {
				sock.write('GET /boom HTTP/1.0\r\n\r\n');
			});
			const chunks = [];
			sock.on('data', chunk => chunks.push(chunk));
			sock.on('end', () => resolve(Buffer.concat(chunks).toString()));
			sock.on('error', reject);
		});
		expect(boom).toMatch(/bad/);
	}
	finally {
		await httpd.close();
	}
});

test('html fallback without an index is 404', async () => {
	const disk = mkdtempSync(join(tmpdir(), 'alumna-empty-disk-'));
	mkdirSync(join(disk, 'empty-dir'));
	const { httpd, url } = await listen({
		memory: new Map(),
		disk_root: disk
	});
	try {
		expect((await request(url + '/nope', { accept: 'text/html' })).status).toBe(404);
		expect((await request(url + '/')).status).toBe(404);
		expect((await request(url + '/index.html')).status).toBe(404);
	}
	finally {
		await httpd.close();
	}
});
