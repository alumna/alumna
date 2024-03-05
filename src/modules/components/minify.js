import { minify as terser_minify } from 'terser';

export const minify = async function ( state, next, end ) {

	// Minify component code through Terser.minify
	state.global.components[ state.component ].compiled.js.code = (await terser_minify( state.global.components[ state.component ].compiled.js.code )).code

	next();

}