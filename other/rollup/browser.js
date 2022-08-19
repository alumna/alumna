import commonjs 	from 'rollup-plugin-commonjs';
import resolve 		from 'rollup-plugin-node-resolve';
import { terser } 	from 'rollup-plugin-terser';

export default {
	input: 'src/browser/browser.js',

	output: {
		file: 'browser.js',
		format: 'iife',
		name: 'Alumna',
	},

	plugins: [

		resolve({
			jsnext: true
		}),

		commonjs(),

		terser()
	]
};