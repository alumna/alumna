import http from 'node:http';

function send_json (res, status, body) {
	const json = JSON.stringify(body);
	res.writeHead(status, {
		'content-type': 'application/json; charset=utf-8',
		'content-length': Buffer.byteLength(json)
	});
	res.end(json);
}

function read_body (req) {
	return new Promise(resolve => {
		const chunks = [];
		req.on('data', chunk => chunks.push(chunk));
		req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
	});
}

function payload_from_query (url) {
	const contentId = url.searchParams.get('contentId') || url.searchParams.get('id');
	const route = url.searchParams.get('route');
	const out = {};
	if (contentId)
		out.contentId = contentId;
	if (route)
		out.route = route;
	return out;
}

function payload_from_json (text) {
	if (!text || !text.trim())
		return {};
	return JSON.parse(text);
}

export function create_notify_server ({ port, on_notify, host = '127.0.0.1' }) {
	const server = http.createServer(async (req, res) => {
		try {
			const url = new URL(req.url, 'http://127.0.0.1');
			if (url.pathname !== '/notify') {
				send_json(res, 404, { ok: false, error: 'Not found' });
				return;
			}

			let payload;
			if (req.method === 'GET')
				payload = payload_from_query(url);
			else if (req.method === 'POST') {
				try {
					payload = payload_from_json(await read_body(req));
				}
				catch {
					send_json(res, 400, { ok: false, error: 'Invalid JSON' });
					return;
				}
			}
			else {
				send_json(res, 405, { ok: false, error: 'Use GET or POST' });
				return;
			}

			const result = await on_notify(payload);
			if (!result || !result.ok) {
				const errors = (result && result.errors) || { notify: 'Rebuild failed' };
				const first = errors[Object.keys(errors)[0]];
				send_json(res, 400, { ok: false, error: first, errors });
				return;
			}

			send_json(res, 200, { ok: true, paths: result.paths || [] });
		}
		catch (error) {
			send_json(res, 500, { ok: false, error: String(error.message || error) });
		}
	});

	return {
		server,
		listen () {
			return new Promise(done => {
				server.listen(port, host, () => done(server.address().port));
			});
		},
		close () {
			return new Promise(done => {
				server.close(() => done());
			});
		}
	};
}
