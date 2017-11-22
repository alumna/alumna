import commonjs from 'rollup-plugin-commonjs';
import nodeResolve from 'rollup-plugin-node-resolve';
import uglify from 'rollup-plugin-uglify';
import { minify } from 'uglify-es';

export default {
	input: 'src/altiva.js',
	output: {
		file: 'altiva.js',
		format: 'iife',
		name: 'Altiva',
	},
	plugins: [
		commonjs(),
		nodeResolve({
			jsnext: true
		}),
		uglify( {}, minify )
	]
};