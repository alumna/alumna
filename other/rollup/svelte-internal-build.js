import { nodeResolve } 	from '@rollup/plugin-node-resolve';

export default {
	input: 'src/browser/svelte-internal-build.js',

	output: {
		file: 'dist/svelte-internal-build.js',
		format: 'es',
		name: 'svelte_internal',
	},

	plugins: [
		nodeResolve({ jsnext: true }),
	]
};