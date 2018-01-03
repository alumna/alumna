import commonjs from 'rollup-plugin-commonjs';
import nodeResolve from 'rollup-plugin-node-resolve';
import uglify from 'rollup-plugin-uglify';
import { minify } from 'uglify-es';

export default {
	input: 'src/browser/shared.js',
	output: {
		file: 'shared.js',
		format: 'iife',
		name: 'Altiva',
	},
	plugins: [
		nodeResolve( {
			jsnext: true
		} ),
		commonjs(),
		uglify( {}, minify )
	]
};