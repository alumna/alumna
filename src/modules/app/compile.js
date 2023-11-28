/*

# Module specification:

*/

import * as svelte from 'svelte/compiler';


export const compile_app = async function ( state, next, end ) {

	try {
		state.app.compile.compiled = svelte.compile( state.app.compile.source )

		next();
    }
    catch ( error ) {

    	state.errors[ 'Error while compiling the main app code. Stopping' ];

    	end();
    }

}