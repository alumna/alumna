/*

# Module specification:

*/

import * as svelte from 'svelte/compiler';


export const app_compile = async function ( state, next, end ) {

	state.app.compile.compiled = svelte.compile( state.app.compile.source )

	next();

}