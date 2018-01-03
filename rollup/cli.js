import json from 'rollup-plugin-json';
import string from 'rollup-plugin-string';
import commonjs from 'rollup-plugin-commonjs';
import nodeResolve from 'rollup-plugin-node-resolve';
// import uglify from 'rollup-plugin-uglify';
// import { minify } from 'uglify-es';

export default {
	input: 'src/cli.js',
	external: [
		'assert',
		'browser-sync',
		'c.js',
		'child_process',
		'chokidar',
		'constants',
		'events',
		'fs',
		'os',
		'path',
		'stream',
		'svelte',
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
		json(),
		string( { include: '**/*.md' } ),
		nodeResolve( {
			jsnext: true
		} ),
		commonjs(),
		// uglify( {}, minify )
	]
};