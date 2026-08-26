import { inject_html, with_ssg_marker, insert_body } from '../../src/dev/html.js';

test('injects import map and boot before </head>', () => {
	const out = inject_html('<html><head></head><body></body></html>');
	expect(out).toMatch(/type="importmap"/);
	expect(out).toMatch(/src="\/_alumna\/runtime\.js"/);
	expect(out).toMatch(/<\/head>/);
});

test('injects title, css, and base', () => {
	const out = inject_html('<html><head></head><body></body></html>', {
		base: '/app',
		title: 'Hi & "x"',
		css_hrefs: [ '/app/components/Home.css' ],
		import_map: { imports: { alumna: '/app/_alumna/runtime.js' } }
	});
	expect(out).toMatch(/src="\/app\/_alumna\/runtime\.js"/);
	expect(out).toMatch(/<title>Hi &amp; &quot;x&quot;<\/title>/);
	expect(out).toMatch(/href="\/app\/components\/Home.css"/);
});

test('does not duplicate title', () => {
	const out = inject_html('<head><title>Keep</title></head>', { title: 'New' });
	expect(out).toMatch(/<title>Keep<\/title>/);
	expect(out).not.toMatch(/New/);
});

test('default import map uses base', () => {
	const out = inject_html('<head></head>', { base: '/app' });
	expect(out).toMatch(/\/app\/_alumna\/vendor\/svelte\.js/);
	expect(out).toMatch(/\/app\/_alumna\/runtime\.js/);
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

test('ssg marker, body, preload, and extra head', () => {
	const out = inject_html('<html><head></head><body></body></html>', {
		ssg: true,
		body: '<p>hi</p>',
		head: '<!--head-->',
		preload_hrefs: [ '/_alumna/app.js' ]
	});
	expect(out).toMatch(/data-alumna-ssg/);
	expect(out).toMatch(/<p>hi<\/p>/);
	expect(out).toMatch(/modulepreload/);
	expect(out).toMatch(/<!--head-->/);
	const with_class = inject_html('<head></head><body class="app"></body>', { ssg: true });
	expect(with_class).toMatch(/<body class="app" data-alumna-ssg>/);
});

test('ssg marker is not duplicated and insert_body no-ops', () => {
	expect(with_ssg_marker('<body data-alumna-ssg></body>')).toBe('<body data-alumna-ssg></body>');
	expect(with_ssg_marker('<p>x</p>')).toBe('<p>x</p>');
	expect(insert_body('<p>x</p>', '')).toBe('<p>x</p>');
	expect(insert_body('<p>x</p>', '<b>y</b>')).toMatch(/<body data-alumna-ssg><b>y<\/b><\/body>/);
});

test('ssg with an existing boot script still inserts body', () => {
	const src = '<head><script type="module" src="/_alumna/runtime.js"></script></head><body></body>';
	const out = inject_html(src, { ssg: true, body: '<p>x</p>' });
	expect(out).toMatch(/data-alumna-ssg/);
	expect(out).toMatch(/<p>x<\/p>/);
});
