import { readFileSync } from 'node:fs';
import { changelog_body, tag_name, assert_tag, normalize_tag } from '../../scripts/release-notes.js';

const sample = `# Alumna changelog

## 4.0.0-alpha.8 — 2026-08-27

- first
- second

## 4.0.0-alpha.7 — 2026-08-27

- old
`;

test('changelog_body reads the matching section', () => {
	expect(changelog_body(sample, '4.0.0-alpha.8')).toBe('- first\n- second\n');
	expect(changelog_body(sample, '4.0.0-alpha.7')).toBe('- old\n');
});

test('changelog_body errors', () => {
	expect(() => changelog_body(sample, '9.9.9')).toThrow(/No CHANGELOG section/);
	expect(() => changelog_body('## 1.0.0\n\n', '1.0.0')).toThrow(/Empty CHANGELOG section/);
});

test('changelog_body does not treat 4.0.0 as 4.0.0-alpha.8', () => {
	const md = '## 4.0.0-alpha.8 — x\n\n- alpha\n\n## 4.0.0 — y\n\n- stable\n';
	expect(changelog_body(md, '4.0.0')).toBe('- stable\n');
	expect(changelog_body(md, '4.0.0-alpha.8')).toBe('- alpha\n');
});

test('tag helpers', () => {
	expect(tag_name('4.0.0-alpha.8')).toBe('v4.0.0-alpha.8');
	expect(() => assert_tag('v4.0.0-alpha.8', '4.0.0-alpha.8')).not.toThrow();
	expect(() => assert_tag('v1.0.0', '4.0.0-alpha.8')).toThrow(/must be v4\.0\.0-alpha\.8/);
	expect(normalize_tag('latest')).toBe('latest');
	expect(normalize_tag('')).toBe('latest');
	expect(normalize_tag('4.0.0-alpha.8')).toBe('v4.0.0-alpha.8');
	expect(normalize_tag('v4.0.0-alpha.8')).toBe('v4.0.0-alpha.8');
});

test('real CHANGELOG contains the package version', () => {
	const pkg = JSON.parse(readFileSync(new URL('../../package.json', import.meta.url), 'utf8'));
	const md = readFileSync(new URL('../../CHANGELOG.md', import.meta.url), 'utf8');
	expect(changelog_body(md, pkg.version)).toMatch(/./);
});
