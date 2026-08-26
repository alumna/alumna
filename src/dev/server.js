import http from 'node:http';
import net from 'node:net';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { join, extname, relative, resolve, sep } from 'node:path';
import { mime } from './mime.js';
import { normalize_base, strip_base } from '../utils/base.js';

export async function pick_port (preferred, { required = false, tries = 100, probe } = {}) {
	const is_open = probe || is_free;

	if (preferred) {
		if (await is_open(preferred))
			return preferred;
		if (required)
			throw new Error('The specified port ' + preferred + ' is already in use');
	}

	const start = preferred ? preferred + 1 : 3030;
	const end = start + tries;
	for (let port = start; port < end; port++) {
		if (await is_open(port))
			return port;
	}
	throw new Error('No free port found');
}

function is_free (port) {
	return new Promise(done => {
		const server = net.createServer();
		server.unref();
		server.once('error', () => done(false));
		server.listen(port, '0.0.0.0', () => {
			server.close(() => done(true));
		});
	});
}

export function safe_join (root, url_path) {
	const cleaned = url_path.replace(/^\/+/, '');
	if (!cleaned || cleaned.includes('\0'))
		return null;
	const full = resolve(root, cleaned);
	const rel = relative(resolve(root), full);
	if (rel.startsWith('..'))
		return null;
	/* istanbul ignore next -- windows path prefix */
	if (rel.startsWith(sep + '..'))
		return null;
	return full;
}

function send_bytes (res, body, type, method) {
	const buffer = Buffer.isBuffer(body) ? body : Buffer.from(body);
	res.writeHead(200, {
		'content-type': type,
		'cache-control': 'no-cache',
		'content-length': buffer.length
	});
	if (method === 'HEAD')
		return res.end();
	res.end(buffer);
}

function send_file (res, file, method) {
	send_bytes(res, readFileSync(file), mime(file), method);
}

function sse (req, res, clients) {
	res.writeHead(200, {
		'content-type': 'text/event-stream',
		'cache-control': 'no-cache',
		connection: 'keep-alive'
	});
	clients.add(res);
	res.write('\n');
	req.on('close', () => clients.delete(res));
}

// Drop SSE clients whose sockets are already dead.
export function notify_live (clients) {
	for (const client of clients) {
		try {
			client.write('data: reload\n\n');
		}
		catch {
			clients.delete(client);
		}
	}
}

export function end_live (clients) {
	for (const client of clients) {
		try {
			client.end();
		}
		catch {
			// already closed
		}
	}
	clients.clear();
}

export function disk_file (disk_root, pathname) {
	if (!disk_root)
		return null;
	if (pathname === '/' || pathname === '/index.html') {
		const file = join(disk_root, 'index.html');
		return existsSync(file) && statSync(file).isFile() ? file : null;
	}
	const direct = safe_join(disk_root, pathname);
	if (direct && existsSync(direct) && statSync(direct).isFile())
		return direct;
	if (extname(pathname))
		return null;
	const rel = pathname.replace(/\/+$/, '') + '/index.html';
	const index = safe_join(disk_root, rel);
	if (index && existsSync(index) && statSync(index).isFile())
		return index;
	return null;
}

export function spa_file (disk_root) {
	if (!disk_root)
		return null;
	const spa = join(disk_root, '_alumna', 'spa.html');
	if (existsSync(spa) && statSync(spa).isFile())
		return spa;
	const index = join(disk_root, 'index.html');
	if (existsSync(index) && statSync(index).isFile())
		return index;
	return null;
}

function request_path (pathname, base) {
	const prefix = normalize_base(base);
	if (!prefix)
		return pathname;
	if (pathname === prefix || pathname === prefix + '/' || pathname.startsWith(prefix + '/'))
		return strip_base(prefix, pathname);
	return null;
}

// Memory first, then vendor, then disk/static, then SPA fallback to index.html.
export function create_server ({ src_dir, disk_root, port, memory, vendor_dir, base }) {
	const live_clients = new Set();

	const server = http.createServer(async (req, res) => {
		try {
			const url = new URL(req.url, 'http://' + (req.headers.host || 'localhost'));
			const raw_path = decodeURIComponent(url.pathname);
			const pathname = request_path(raw_path, base);
			if (pathname === null) {
				res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
				return res.end('Not found');
			}

			if (pathname === '/_alumna/live')
				return sse(req, res, live_clients);

			if (memory.has(pathname)) {
				const entry = memory.get(pathname);
				return send_bytes(res, entry.body, entry.type || mime(pathname), req.method);
			}

			if (pathname.startsWith('/_alumna/svelte/') && vendor_dir) {
				const file = safe_join(vendor_dir, pathname.slice('/_alumna/svelte/'.length));
				if (file && existsSync(file) && statSync(file).isFile())
					return send_file(res, file, req.method);
			}

			if (disk_root) {
				const file = disk_file(disk_root, pathname);
				if (file)
					return send_file(res, file, req.method);
			}

			if (src_dir) {
				const from_static = safe_join(join(src_dir, 'static'), pathname);
				if (from_static && existsSync(from_static) && statSync(from_static).isFile())
					return send_file(res, from_static, req.method);
			}

			if (pathname === '/' || pathname === '/index.html') {
				const html = memory.get('/index.html');
				if (html)
					return send_bytes(res, html.body, html.type, req.method);
			}

			const wants_html = (req.headers.accept || '').includes('text/html');
			if (wants_html && !extname(pathname)) {
				const spa_mem = memory.get('/_alumna/spa.html') || memory.get('/index.html');
				if (spa_mem)
					return send_bytes(res, spa_mem.body, spa_mem.type, req.method);
				const file = spa_file(disk_root);
				if (file)
					return send_file(res, file, req.method);
			}

			res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
			res.end('Not found');
		}
		catch (error) {
			res.writeHead(500, { 'content-type': 'text/plain; charset=utf-8' });
			res.end(String(error.stack || error));
		}
	});

	function reload () {
		notify_live(live_clients);
	}

	return {
		server,
		reload,
		listen () {
			return new Promise(done => {
				server.listen(port, '0.0.0.0', () => done(server.address().port));
			});
		},
		close () {
			end_live(live_clients);
			return new Promise((done, fail) => {
				server.close(err => err ? fail(err) : done());
			});
		}
	};
}
