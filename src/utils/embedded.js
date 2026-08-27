// bun compile puts the entry under $bunfs. Authors then run that file, not src/cli.js.
export function is_compiled_url (meta_url) {
	return typeof meta_url === 'string' && meta_url.includes('$bunfs');
}

let compiled = false;

export function set_compiled (value) {
	compiled = !!value;
}

export function is_compiled () {
	if (process.env.ALUMNA_COMPILED === '1')
		return true;
	if (process.env.ALUMNA_COMPILED === '0')
		return false;
	return compiled;
}
