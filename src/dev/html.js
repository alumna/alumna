import { import_map } from './vendor-svelte.js';

export function inject_html (source) {
	const map = '<script type="importmap">' + JSON.stringify(import_map()) + '</script>\n';
	const boot = '<script type="module" src="/_alumna/runtime.js"></script>\n';

	if (source.includes('src="/_alumna/runtime.js"') || source.includes("src='/_alumna/runtime.js'"))
		return source.includes('type="importmap"') ? source : source.replace('</head>', map + '</head>');

	if (source.includes('</head>'))
		return source.replace('</head>', map + boot + '</head>');

	if (source.includes('</body>'))
		return source.replace('</body>', map + boot + '</body>');

	return source + map + boot;
}
