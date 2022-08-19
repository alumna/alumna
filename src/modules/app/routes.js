/*

# Module specification:

It expects that state.app and state.app.code exist
Also, state.app.code must have the 'app.js' code

*/

import { existsSync } 	from 'fs';
import { EOL } 			from 'os';
import vm 				from 'vm';




export const routes = async function ( state, next, end ) {

	const code = state.app.code

	const sandbox = {
		app: {
			areas: [],
			route: {},
			group: {}
		}
	};

	try	{
		
		vm.runInNewContext( code, sandbox );
		
	} catch (e) {
		
		const lineNumber = e.stack.split( EOL )[ 0 ].split( ':' )[ 1 ];

		state.errors[ 'app.js' ] = e.message + ' in src/app.js' + ', line: ' + lineNumber
		
		return end();
	}

	
	state.app = sandbox.app

	next();

};