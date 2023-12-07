import { EOL } 	from 'os';
import { readFileSync } from 'fs';

export const cache = async function ( state, next, end ) {

	state.server.memory( 'app.js', readFileSync('./dist/browser.js') + state.app.routing + EOL + state.app.compile.compiled.js.code )

	next();

}