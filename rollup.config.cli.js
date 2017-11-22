import commonjs from 'rollup-plugin-commonjs';
import nodeResolve from 'rollup-plugin-node-resolve';
import uglify from 'rollup-plugin-uglify';
import { minify } from 'uglify-es';

export default {
	input: 'src/cli.js',
	external: [
		'assert',
		'browser-sync',
		'c.js',
		'child_process',
		'chokidar',
		'events',
		'fs',
		'fs-extra',
		'os',
		'path',
		'url',
		'util',
		'vm'
	],
	output: {
		file: 'cli.js',
		format: 'cjs',
		banner: '#!/usr/bin/env node'
	},
	plugins: [
		commonjs(),
		nodeResolve({
			jsnext: true
		}),
		uglify( {}, minify )
	]
};