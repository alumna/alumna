import { default_import_map } from './defaults.js';
import { normalize_base, with_base } from '../utils/base.js';
import { sri_hash, with_integrity } from '../utils/sri.js';

function escape_attr (value) {
	return String(value).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
}

export function with_ssg_marker (source) {
	if (/<body\b[^>]*\bdata-alumna-ssg\b/i.test(source))
		return source;
	if (/<body\b/i.test(source))
		return source.replace(/<body(\s[^>]*)?>/i, (_m, attrs) => '<body' + (attrs || '') + ' data-alumna-ssg>');
	return source;
}

export function insert_body (source, body) {
	if (!body)
		return source;
	if (source.includes('</body>'))
		return source.replace('</body>', body + '</body>');
	return source + '<body data-alumna-ssg>' + body + '</body>';
}

export function data_script_tag (data) {
	if (data === undefined)
		return '';
	const json = JSON.stringify(data).replace(/</g, '\\u003c');
	return '<script type="application/json" id="alumna-data">' + json + '</script>';
}

export function inject_html (source, opts = {}) {
	let html = source;
	if (opts.ssg)
		html = with_ssg_marker(html);
	if (opts.body)
		html = insert_body(html, opts.body);
	const data_tag = data_script_tag(opts.data);
	if (data_tag) {
		if (html.includes('</body>'))
			html = html.replace('</body>', data_tag + '</body>');
		else
			html += data_tag;
	}

	const base = normalize_base(opts.base);
	const runtime = (base || '') + '/_alumna/runtime.js';
	const map_obj = opts.import_map || default_import_map(base);
	const extra = {};
	// Hash the served runtime bytes so `import from 'alumna'` matches SRI.
	if (opts.runtime)
		extra[with_base(base, '/_alumna/runtime.js')] = sri_hash(opts.runtime);
	const map = '<script type="importmap">' + JSON.stringify(with_integrity(map_obj, extra)) + '</script>\n';
	const css = (opts.css_hrefs || []).map(href => '<link rel="stylesheet" href="' + escape_attr(href) + '">\n').join('');
	const preload = (opts.preload_hrefs || []).map(href => '<link rel="modulepreload" href="' + escape_attr(href) + '">\n').join('');
	const extra_head = opts.head || '';
	const boot = '<script type="module" src="' + runtime + '"></script>\n';
	let title = '';
	if (opts.title && !/<title[\s>]/i.test(html))
		title = '<title>' + escape_attr(opts.title) + '</title>\n';
	const inject = title + css + preload + extra_head + map + boot;

	if (html.includes('src="' + runtime + '"') || html.includes("src='" + runtime + "'"))
		return html.includes('type="importmap"') ? html : html.replace('</head>', map + '</head>');

	if (html.includes('</head>'))
		return html.replace('</head>', inject + '</head>');

	if (html.includes('</body>'))
		return html.replace('</body>', inject + '</body>');

	return html + inject;
}
