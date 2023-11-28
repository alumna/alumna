import { EOL } 	from 'os';
import { translate_imports } from './../utils/translate_imports.js';

export const translate_component = async function ( state, next, end ) {

	// Translate imports
	let code 	= translate_imports(state.global.components[ state.component ].compiled.js.code)

	// Translate component from es module to an iife
	code 		= 'Al.component[\'' + state.component + '\'] = (function () { "use strict";' + EOL + code;
	code 		= code.replace( 'export default Component;', 'return Component;' + EOL + '}())' );

	state.global.components[ state.component ].compiled.js.code = code;

	next();

}