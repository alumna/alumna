import { EOL } 							from 'os';
import { writeFileSync, readFileSync } 	from 'fs';

export const save = async function ( state, next, end ) {

	writeFileSync( './build/app.js', readFileSync( state.config.install_dir + 'dist/browser.js', 'utf8' ) + state.app.routing + EOL + state.app.compile.compiled.js.code  )

	next();

}