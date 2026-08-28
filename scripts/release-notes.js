import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export function changelog_body (markdown, version) {
	const heading = '## ' + version;
	const lines = markdown.split('\n');
	let start = -1;
	for (let i = 0; i < lines.length; i++) {
		if (lines[i] === heading || lines[i].startsWith(heading + ' ')) {
			start = i;
			break;
		}
	}
	if (start < 0)
		throw new Error('No CHANGELOG section for ' + version);
	let end = lines.length;
	for (let i = start + 1; i < lines.length; i++) {
		if (lines[i].startsWith('## ')) {
			end = i;
			break;
		}
	}
	const raw = lines.slice(start + 1, end).join('\n').trim();
	if (!raw)
		throw new Error('Empty CHANGELOG section for ' + version);
	return raw + '\n';
}

export function tag_name (version) {
	return 'v' + version;
}

export function assert_tag (tag, version) {
	const want = tag_name(version);
	if (tag !== want)
		throw new Error('Git tag ' + tag + ' must be ' + want);
}

export function normalize_tag (value) {
	if (!value || value === 'latest')
		return 'latest';
	return value.charAt(0) === 'v' ? value : 'v' + value;
}

const is_main = process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1]);

if (is_main) {
	const root = dirname(dirname(fileURLToPath(import.meta.url)));
	const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
	const check = process.argv.indexOf('--check-tag');
	if (check >= 0) {
		const tag = process.argv[check + 1] || process.env.GITHUB_REF_NAME || '';
		assert_tag(tag, pkg.version);
	}
	else {
		const md = readFileSync(join(root, 'CHANGELOG.md'), 'utf8');
		process.stdout.write(changelog_body(md, pkg.version));
	}
}
