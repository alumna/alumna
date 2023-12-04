import { EOL } 	from 'os';
import { readFileSync } from 'fs';

export const cache = async function ( state, next, end ) {

	state.global.server.memory( 'app.js', readFileSync(__dirname + './dist/browser.js') + EOL + state.global.components[ state.component ].compiled.js.code  )

	next();

}