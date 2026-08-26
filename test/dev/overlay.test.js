import { overlay_html } from '../../src/dev/overlay.js';

test('overlay_html lists errors and escapes html', () => {
	const html = overlay_html({
		'app.js': 'bad <tag> & "x"',
		'Home.svelte': 'missing'
	});
	expect(html).toMatch(/Alumna could not compile/);
	expect(html).toMatch(/app\.js/);
	expect(html).toMatch(/&lt;tag&gt;/);
	expect(html).toMatch(/&amp;/);
	expect(html).toMatch(/&quot;x&quot;/);
	expect(html).toMatch(/EventSource/);
});

test('overlay_html with no keys', () => {
	expect(overlay_html({})).toMatch(/<ul><\/ul>/);
});

test('overlay_html uses base for live reload', () => {
	expect(overlay_html({ x: 'y' }, '/app')).toMatch(/EventSource\("\/app\/_alumna\/live"\)/);
});
