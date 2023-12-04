import { EOL } 	from 'os';
import { writeFileSync, readFileSync } from 'fs';

export const save = async function ( state, next, end ) {

	writeFileSync( './build/app.js', readFileSync(__dirname + './dist/browser.js') + EOL + state.global.components[ state.component ].compiled.js.code  )

	next();

}