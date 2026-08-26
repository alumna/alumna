import { create_notify_server } from '../../src/build/notify.js';

async function listen (on_notify) {
	const httpd = create_notify_server({ port: 0, on_notify });
	const port = await httpd.listen();
	return { httpd, url: 'http://127.0.0.1:' + port };
}

test('notify GET and POST rebuild a route', async () => {
	const seen = [];
	const { httpd, url } = await listen(async payload => {
		seen.push(payload);
		return { ok: true, paths: [ payload.route || payload.contentId ] };
	});
	try {
		const get = await fetch(url + '/notify?route=/about');
		expect(get.status).toBe(200);
		expect(await get.json()).toEqual({ ok: true, paths: [ '/about' ] });
		const id = await fetch(url + '/notify?id=/blog/hello');
		expect((await id.json()).paths).toEqual([ '/blog/hello' ]);
		const both = await fetch(url + '/notify?contentId=post:1&route=/x');
		expect(both.status).toBe(200);
		const post = await fetch(url + '/notify', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ route: '/about' })
		});
		expect(post.status).toBe(200);
		expect(seen.some(item => item.route === '/about')).toBe(true);
		expect(seen.some(item => item.contentId === 'post:1')).toBe(true);
	}
	finally {
		await httpd.close();
	}
});

test('notify error paths', async () => {
	const { httpd, url } = await listen(async payload => {
		if (payload.route === '/throw')
			throw 'plain';
		if (payload.route === '/null')
			return null;
		if (payload.route === '/emptyfail')
			return { ok: false };
		if (!payload.route && !payload.contentId)
			return { ok: false, errors: { rebuild: 'need a path' } };
		return { ok: true };
	});
	try {
		expect((await fetch(url + '/nope')).status).toBe(404);
		expect((await fetch(url + '/notify', { method: 'PUT' })).status).toBe(405);
		const bad = await fetch(url + '/notify', { method: 'POST', body: '{no' });
		expect(bad.status).toBe(400);
		expect((await bad.json()).error).toMatch(/Invalid JSON/);
		const empty = await fetch(url + '/notify', { method: 'POST', body: '  ' });
		expect(empty.status).toBe(400);
		expect((await empty.json()).error).toMatch(/need a path/);
		const fail = await fetch(url + '/notify?route=/null');
		expect(fail.status).toBe(400);
		expect((await fail.json()).error).toMatch(/Rebuild failed/);
		const emptyfail = await fetch(url + '/notify?route=/emptyfail');
		expect(emptyfail.status).toBe(400);
		const boom = await fetch(url + '/notify?route=/throw');
		expect(boom.status).toBe(500);
		expect((await boom.json()).error).toMatch(/plain/);
		const ok = await fetch(url + '/notify?route=/ok');
		expect((await ok.json()).paths).toEqual([]);
	}
	finally {
		await httpd.close();
	}
});
