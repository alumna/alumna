import commonjs 		from '@rollup/plugin-commonjs';
import { nodeResolve } 	from '@rollup/plugin-node-resolve';
import terser 			from '@rollup/plugin-terser';

export default {
	input: 'src/browser/browser.js',

	output: {
		file: 'dist/browser.js',
		format: 'iife',
		name: 'Al',
	},

	plugins: [
		nodeResolve({ jsnext: true }),
		commonjs(),
		terser()
	]
};