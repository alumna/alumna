import { with_base } from '../utils/base.js';

export function default_import_map (base) {
	return {
		imports: {
			svelte: with_base(base, '/_alumna/vendor/svelte.js'),
			'svelte/internal/client': with_base(base, '/_alumna/vendor/svelte.js'),
			alumna: with_base(base, '/_alumna/runtime.js')
		}
	};
}
