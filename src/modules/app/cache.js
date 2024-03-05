import { EOL } 				from 'os';
import { readFileSync } 	from 'fs';

export const cache = async function ( state, next, end ) {

	// cache 'dist/browser.js' first, to be easily reused
	if ( !state.app.browser ) state.app.browser = readFileSync( state.config.install_dir + 'dist/browser.js', 'utf8' )

	// cache 'dist/svelte-internal.js' first, to be easily reused
	if ( !state.app.svelte_internal ) state.app.svelte_internal = readFileSync( state.config.install_dir + 'dist/svelte-internal.js', 'utf8' )

	state.server.memory( 'dev.js', state.app.browser + state.app.svelte_internal + state.app.routing + EOL + state.app.compile.compiled.js.code )

	next();

}