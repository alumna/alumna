import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { gunzipSync } from 'node:zlib';

function read_cstr (buf, start, len) {
	let end = start;
	const max = start + len;
	while (end < max && buf[end] !== 0)
		end++;
	return buf.toString('utf8', start, end);
}

function strip_prefix (path, count) {
	const parts = path.replace(/\\/g, '/').split('/').filter(Boolean);
	for (let i = 0; i < parts.length; i++) {
		if (parts[i] === '..')
			return '';
	}
	return parts.slice(count).join('/');
}

function parse_pax (block) {
	const text = block.toString('utf8');
	const out = {};
	let i = 0;
	while (i < text.length) {
		const space = text.indexOf(' ', i);
		if (space < 0)
			break;
		const len = Number(text.slice(i, space));
		if (!Number.isFinite(len) || len <= 0)
			break;
		const line = text.slice(space + 1, i + len - 1);
		const eq = line.indexOf('=');
		if (eq > 0)
			out[line.slice(0, eq)] = line.slice(eq + 1);
		i += len;
	}
	return out;
}

// npm pack files: gzip + ustar, usually with a leading "package/" folder.
export function extract_tgz (buffer, dest, { strip = 1 } = {}) {
	const tar = gunzipSync(buffer);
	let offset = 0;
	let pending_path = '';

	while (offset + 512 <= tar.length) {
		if (tar[offset] === 0)
			break;
		const name = read_cstr(tar, offset, 100);
		const size = parseInt(read_cstr(tar, offset + 124, 12).trim(), 8) || 0;
		const type = tar[offset + 156];
		const prefix = read_cstr(tar, offset + 345, 155);
		let full = pending_path || (prefix ? prefix + '/' + name : name);
		pending_path = '';
		offset += 512;
		const data_end = offset + size;
		const padded = Math.ceil(size / 512) * 512;

		if (type === 120) {
			const pax = parse_pax(tar.subarray(offset, data_end));
			if (pax.path)
				pending_path = pax.path;
			offset += padded;
			continue;
		}

		const rel = strip_prefix(full, strip);
		if (rel && (type === 0 || type === 48)) {
			const file = join(dest, rel);
			mkdirSync(dirname(file), { recursive: true });
			writeFileSync(file, tar.subarray(offset, data_end));
		}

		offset += padded;
	}
}

export function npm_tarball_url (name, version) {
	const file = (name[0] === '@' ? name.slice(name.lastIndexOf('/') + 1) : name) + '-' + version + '.tgz';
	return 'https://registry.npmjs.org/' + name + '/-/' + file;
}

export async function fetch_buffer (url, fetch_fn = fetch) {
	const res = await fetch_fn(url);
	if (!res.ok)
		throw new Error('Download failed: ' + url + ' (' + res.status + ')');
	return Buffer.from(await res.arrayBuffer());
}
