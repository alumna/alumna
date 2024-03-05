import { nodeResolve } 	from '@rollup/plugin-node-resolve';
import terser 			from '@rollup/plugin-terser';

export default {
	external: [ 'Al' ],

	input: 'src/browser/svelte-internal.js',

	output: {
		file: 'dist/svelte-internal.js',
		format: 'iife',
		name: 'lib',
	},

	plugins: [
		nodeResolve({ jsnext: true }),
		terser()
	]
};