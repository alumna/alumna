import json 		from 'rollup-plugin-json';
// import replace 		from 'rollup-plugin-re'
import string 		from 'rollup-plugin-string';

import commonjs 	from 'rollup-plugin-commonjs';
import resolve 		from 'rollup-plugin-node-resolve';

// import uglify 		from 'rollup-plugin-uglify';
// import { minify } 	from 'uglify-es';

export default {
	input: 'src/cli.js',

	external: [
		'assert',
		'browser-sync',
		'buffer',
		// 'c.js',
		'child_process',
		'chokidar',
		'constants',
		'events',
		'fs',
		'https',
		'os',
		'path',
		'request',
		// 'rsyncwrapper',
		'stream',
		'string_decoder',
		// 'svelte',
		'uglify-es',
		'url',
		'util',
		'vm',
		
		/* Chokidar */
		// 'buffer',
		// 'fsevents',
		// 'net',
		// 'tty',

		/* Degit */
		'degit',

		/* Request */
		// 'request',
	],

	output: {
		file: 'cli.js',
		format: 'cjs',
		banner: '#!/usr/bin/env node'
	},

	plugins: [
		
		json(),
		string( { include: '**/*.md' } ),
		// replace({

		// 	patterns: [{

		// 		// match: /browsersync/,
		// 		test:  /#[!][^\n]+/,
		// 		replace: '',

		// 	}]

		// }),
		resolve( {
			jsnext: true,
			preferBuiltins: true
		} ),
		commonjs(),
		// uglify( {}, minify )
	]
};