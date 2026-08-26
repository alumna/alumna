function escape_html (value) {
	return String(value)
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;');
}

// Full-page overlay so a failed compile does not keep a silent last page.
export function overlay_html (errors) {
	const items = Object.keys(errors).map(key => {
		return '<li><strong>' + escape_html(key) + '</strong>: ' + escape_html(errors[key]) + '</li>';
	}).join('');

	return '<!DOCTYPE html><html><head><meta charset="utf-8"><title>Alumna compile error</title>'
		+ '<style>body{margin:0;font:16px/1.45 system-ui,sans-serif;background:#1c1c1c;color:#f2f2f2}'
		+ '#alumna-overlay{padding:24px;max-width:52rem}h1{color:#ff6b6b;font-size:1.25rem}'
		+ 'li{margin:0.5rem 0}</style></head><body><div id="alumna-overlay">'
		+ '<h1>Alumna could not compile</h1><ul>' + items + '</ul></div>'
		+ '<script>try{new EventSource("/_alumna/live").onmessage=function(){location.reload()}}catch(e){}</script>'
		+ '</body></html>';
}
