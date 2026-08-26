import { inject_html } from '../../src/dev/html.js';

test('injects import map and boot before </head>', () => {
	const out = inject_html('<html><head></head><body></body></html>');
	expect(out).toMatch(/type="importmap"/);
	expect(out).toMatch(/src="\/_alumna\/runtime\.js"/);
	expect(out).toMatch(/<\/head>/);
});

test('injects before </body> when there is no head close', () => {
	const out = inject_html('<html><body></body></html>');
	expect(out).toMatch(/<\/body>/);
	expect(out).toMatch(/runtime\.js/);
});

test('appends when there is no head or body close', () => {
	const out = inject_html('<p>hi</p>');
	expect(out.startsWith('<p>hi</p>')).toBe(true);
	expect(out).toMatch(/runtime\.js/);
});

test('keeps an existing boot script and adds the import map', () => {
	const src = '<head><script type="module" src="/_alumna/runtime.js"></script></head>';
	const out = inject_html(src);
	expect(out).toContain('src="/_alumna/runtime.js"');
	expect(out).toMatch(/type="importmap"/);
});

test('keeps an existing boot script with single quotes', () => {
	const src = `<head><script type="module" src='/_alumna/runtime.js'></script><script type="importmap">{}</script></head>`;
	expect(inject_html(src)).toBe(src);
});
