/*

# Module specification:

Read and save the source code of informed component
The state variable has the following properties:

 - global: the global state
 - component: the component path
 - route: where the component is being used

*/

import { existsSync, readFileSync } from 'fs';
import { join } 					from 'path';


export const read = async function ( state, next, end ) {

	const relative_path = state.component + '.html';
	const full_path		= join( state.global.config.dir, relative_path );

	if ( !existsSync( full_path ) ) {
		state.global.errors[ "Route: '" + state.route + "'" ] = 'Non-existent component file: ' + relative_path;
		return end();
	}

	state.global.components[ state.component ].source = readFileSync( full_path, 'utf8' )
	next();

}