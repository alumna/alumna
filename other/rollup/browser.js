import commonjs 	from 'rollup-plugin-commonjs';
import resolve 		from 'rollup-plugin-node-resolve';
import uglify 		from 'rollup-plugin-uglify';
import { minify } 	from 'uglify-es';

export default {
	input: 'src/browser/browser.js',

	output: {
		file: 'browser.js',
		format: 'iife',
		name: 'Altiva',
	},

	plugins: [
		resolve( {
			jsnext: true
		} ),
		commonjs(),
		uglify( {}, minify )
	]
};