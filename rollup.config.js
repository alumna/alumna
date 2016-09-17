import commonjs from 'rollup-plugin-commonjs';
import nodeResolve from 'rollup-plugin-node-resolve';
import uglify from 'rollup-plugin-uglify';
import { minify } from 'uglify-js';

export default {
	entry: 'src/main.js',
	plugins: [

	nodeResolve({
		jsnext: true,
		main: true,
		browser: true,
	}),

	commonjs({
		sourceMap: false,  // Default: true
	}),

	uglify( {}, minify )

	],
	format: 'iife',
	moduleName: 'Altiva',
	dest: 'altiva.min.js'
};