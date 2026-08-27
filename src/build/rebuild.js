import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { render_ssg } from '../compile/ssg.js';
import { ssg_targets } from '../compile/ssg-targets.js';
import { match_path } from '../compile/match.js';
import { write_if_changed } from './write.js';
import {
	read_manifest,
	lookup_content,
	merge_manifest,
	stringify_manifest,
	alumna_version,
	add_lookup
} from './manifest.js';
import { merge_ssg_data, parse_ssg_data_module, ssg_data_module } from '../compile/data.js';

function fail (errors) {
	return { ok: false, errors, warnings: [], paths: [] };
}

function push_unique (list, value) {
	if (value && !list.includes(value))
		list.push(value);
}

function collect_keys (opts) {
	const routes = [].concat(opts.route || [], opts.routes || []);
	const ids = [].concat(opts.contentId || [], opts.id || [], opts.ids || []);
	return { routes, ids };
}

function resolve_wanted (opts, manifest) {
	const { routes, ids } = collect_keys(opts);
	const paths = [];

	for (let i = 0; i < routes.length; i++)
		push_unique(paths, routes[i]);

	for (let i = 0; i < ids.length; i++) {
		const id = ids[i];
		const found = lookup_content(manifest, id);
		if (!found.length)
			return { error: 'Unknown content id "' + id + '"' };
		for (let j = 0; j < found.length; j++)
			push_unique(paths, found[j]);
	}

	return { paths };
}

function write_changed_files (out, files) {
	for (const path of Object.keys(files))
		write_if_changed(join(out, path), files[path]);
}

export async function run_rebuild (ctx, opts = {}) {
	const out = ctx.out;
	if (!existsSync(join(out, 'alumna-manifest.json')))
		return fail({ rebuild: 'Missing build/. Run alumna build --ssg first.' });

	const manifest = read_manifest(out);
	if (!manifest)
		return fail({ rebuild: 'Cannot read alumna-manifest.json' });

	const wanted = resolve_wanted(opts, manifest);
	if (wanted.error)
		return fail({ rebuild: wanted.error });
	if (!wanted.paths.length)
		return fail({ rebuild: 'Use alumna rebuild --route <path> or --id <contentId>' });

	const compiled = await ctx.compile();
	if (!compiled.ok)
		return fail(compiled.errors);

	const ssg = await render_ssg({
		compiled,
		src_html: ctx.src_html,
		title: ctx.title,
		base: ctx.base,
		project_root: ctx.project_root,
		paths: wanted.paths
	});
	if (!ssg.ok)
		return { ok: false, errors: ssg.errors, warnings: ssg.warnings, paths: [] };

	write_changed_files(out, compiled.files);

	for (const file of Object.keys(ssg.pages))
		write_if_changed(join(out, file), ssg.pages[file]);

	const data_file = join(out, '_alumna/ssg-data.js');
	const prev_data = existsSync(data_file) ? parse_ssg_data_module(readFileSync(data_file, 'utf8')) : {};
	write_if_changed(data_file, ssg_data_module(merge_ssg_data(prev_data, ssg.data_map)));

	const targets = ssg_targets(compiled.routes);
	const next = merge_manifest(manifest, {
		version: alumna_version(),
		base: ctx.base,
		ssg: true,
		prerender: ssg.prerender,
		lookup: targets.lookup,
		areas: compiled.config.areas,
		routes: compiled.config.routes,
		deps: compiled.config.deps
	});
	for (let i = 0; i < ssg.prerender.length; i++) {
		const path = ssg.prerender[i];
		const hit = match_path(path, compiled.routes);
		add_lookup(next.lookup, hit.pattern, path);
	}
	write_if_changed(join(out, 'alumna-manifest.json'), stringify_manifest(next));

	return {
		ok: true,
		errors: {},
		warnings: ssg.warnings,
		paths: ssg.prerender
	};
}
