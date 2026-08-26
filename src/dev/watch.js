import { watch, existsSync, statSync } from 'node:fs';
import { join } from 'node:path';

export function watch_path_to_record (filename) {
	if (!filename)
		return null;
	const path = String(filename).replace(/\\/g, '/');
	if (path.endsWith('.js') && path.startsWith('components/'))
		return null;
	return path;
}

function used_ids (compiled) {
	return compiled && compiled.graph && compiled.graph.components
		? compiled.graph.components
		: {};
}

export function changed_used_ids (files, compiled) {
	const used = used_ids(compiled);
	const ids = [];
	const seen = new Set();
	for (let i = 0; i < files.length; i++) {
		const rel = String(files[i]).replace(/\\/g, '/');
		if (!rel.startsWith('components/') || !rel.endsWith('.svelte'))
			continue;
		const id = rel.slice(11, -7);
		if (!used[id] || seen.has(id))
			continue;
		seen.add(id);
		ids.push(id);
	}
	return ids;
}

// ignore / reload / update (used .svelte only) / recompile. Matches §17.3.
export function classify_watch (files, compiled, src_dir) {
	const used = used_ids(compiled);
	let reload = false;
	let update = false;

	for (let i = 0; i < files.length; i++) {
		const rel = String(files[i]).replace(/\\/g, '/');
		const full = join(src_dir, rel);
		const exists = existsSync(full);

		if (exists && statSync(full).isDirectory())
			continue;

		if (rel === 'app.js' || rel.endsWith('/app.js') || rel.startsWith('middlewares/'))
			return 'recompile';

		if (rel === 'index.html' || rel.startsWith('static/')) {
			reload = true;
			continue;
		}

		if (rel.startsWith('components/') && rel.endsWith('.svelte')) {
			const id = rel.slice(11, -7);
			if (used[id])
				update = true;
			continue;
		}

		return 'recompile';
	}

	if (update)
		return 'update';
	return reload ? 'reload' : 'ignore';
}

export function watch_src (src_dir, on_change, { delay = 80 } = {}) {
	let timer = null;
	const pending = new Set();

	const watcher = watch(src_dir, { recursive: true }, (_event, filename) => {
		const path = watch_path_to_record(filename);
		if (!path)
			return;
		pending.add(path);
		clearTimeout(timer);
		timer = setTimeout(() => {
			const files = [ ...pending ];
			pending.clear();
			on_change(files);
		}, delay);
	});

	return () => {
		clearTimeout(timer);
		watcher.close();
	};
}
