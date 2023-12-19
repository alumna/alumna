import { EOL } 				from 'os';
import { readFileSync } 	from 'fs';

export const cache = async function ( state, next, end ) {

	// cache 'dist/browser.js' first, to be easily reused
	if ( !state.app.browser ) state.app.browser = readFileSync( state.config.install_dir + 'dist/browser.js', 'utf8' )

	state.server.memory( 'dev.js', state.app.browser + state.app.routing + EOL + state.app.compile.compiled.js.code )

	next();

}