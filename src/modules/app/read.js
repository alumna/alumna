/*

# Module specification:

It expects that state.config.dir exists and is a
valid directory. Default is is '.'

Also, it validates if 'app.js' exists inside this
directory.

If not, it returns an error and doesn't continue,
ending the execution flow.

Thus, it expects state.erros also exists, in
order to register the error when app.js is missing

Lastly, it expects state.app exists in order to
save the app.js code in it

*/

import { existsSync, readFileSync } from 'fs';



export const read = async function ( state, next, end ) {

	if ( !existsSync( state.config.dir + '/app.js' ) ) {
		
		state.errors[ 'app.js' ] = 'Missing "app.js" file';
		
		return end();
	}

	state.app.code = readFileSync( state.config.dir + '/app.js', 'utf8' )

	next();

};