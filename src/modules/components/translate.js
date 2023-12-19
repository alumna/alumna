import { EOL } 	from 'os';
import { translate_imports } from './../utils/translate_imports'

export const translate_component = async function ( state, next, end ) {

	// Translate imports
	let code = translate_imports(state.global.components[ state.component ].compiled.js.code)

	// Translate from es module to iife
	state.global.components[ state.component ].compiled.js.code = 'Al.component[\'' + state.component + '\'] = (function () { "use strict";' + EOL + code.replace('export default Component;', 'return Component;' + EOL + '})();');

	next();

}