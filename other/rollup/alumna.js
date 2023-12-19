import virtual 			from '@rollup/plugin-virtual';
import commonjs 		from '@rollup/plugin-commonjs';
import { nodeResolve } 	from '@rollup/plugin-node-resolve';
import terser 			from '@rollup/plugin-terser';
import { readFileSync } from 'fs';

export default {
	input: 'src/alumna.js',

	output: {
		file: 'alumna.js',
		format: 'esm'
	},

	plugins: [
		virtual({ 'css-tree': readFileSync('./node_modules/css-tree/dist/csstree.esm.js', 'utf8') }),
		nodeResolve({ jsnext: true }),
		commonjs(),
		terser()
	],

	onwarn ( warning, warn ) {
		if ( warning.code === 'CIRCULAR_DEPENDENCY' ) return;
		warn( warning )
	}
};