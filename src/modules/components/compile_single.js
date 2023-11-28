/*

# Module specification:

*/

import * as svelte from 'svelte/compiler';

export const compile_single = async function ( state, next, end ) {

	const component = state.component
	const route     = state.route
	const source    = state.global.components[ component ].source

	try {
		state.global.components[ component ].compiled = svelte.compile( source )

		next();
    }
    catch ( error ) {

    	state.global.errors[ 'Component ' + component +  ' on route ' + route + ':' ] = error.name + ' on line ' + error.start?.line + ' position ' + error.pos;

    	end();

    	// state.global.end();
    }

}