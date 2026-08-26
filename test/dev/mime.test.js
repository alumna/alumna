import { mime } from '../../src/dev/mime.js';

test('known extensions', () => {
	expect(mime('a.html')).toMatch(/text\/html/);
	expect(mime('a.JS')).toMatch(/javascript/);
	expect(mime('a.mjs')).toMatch(/javascript/);
	expect(mime('a.css')).toMatch(/css/);
	expect(mime('a.json')).toMatch(/json/);
	expect(mime('a.svg')).toMatch(/svg/);
	expect(mime('a.png')).toBe('image/png');
	expect(mime('a.jpg')).toBe('image/jpeg');
	expect(mime('a.jpeg')).toBe('image/jpeg');
	expect(mime('a.gif')).toBe('image/gif');
	expect(mime('a.webp')).toBe('image/webp');
	expect(mime('a.ico')).toBe('image/x-icon');
	expect(mime('a.woff')).toBe('font/woff');
	expect(mime('a.woff2')).toBe('font/woff2');
	expect(mime('a.txt')).toMatch(/text\/plain/);
	expect(mime('a.map')).toMatch(/json/);
});

test('unknown extension', () => {
	expect(mime('a.bin')).toBe('application/octet-stream');
	expect(mime('noext')).toBe('application/octet-stream');
});
