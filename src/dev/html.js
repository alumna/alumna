import { default_import_map } from './defaults.js';
import { normalize_base } from '../utils/base.js';

function escape_attr (value) {
	return String(value).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
}

export function inject_html (source, opts = {}) {
	const base = normalize_base(opts.base);
	const runtime = (base || '') + '/_alumna/runtime.js';
	const map_obj = opts.import_map || default_import_map(base);
	const map = '<script type="importmap">' + JSON.stringify(map_obj) + '</script>\n';
	const css = (opts.css_hrefs || []).map(href => '<link rel="stylesheet" href="' + escape_attr(href) + '">\n').join('');
	const boot = '<script type="module" src="' + runtime + '"></script>\n';
	let title = '';
	if (opts.title && !/<title[\s>]/i.test(source))
		title = '<title>' + escape_attr(opts.title) + '</title>\n';
	const inject = title + css + map + boot;

	if (source.includes('src="' + runtime + '"') || source.includes("src='" + runtime + "'"))
		return source.includes('type="importmap"') ? source : source.replace('</head>', map + '</head>');

	if (source.includes('</head>'))
		return source.replace('</head>', inject + '</head>');

	if (source.includes('</body>'))
		return source.replace('</body>', inject + '</body>');

	return source + inject;
}
