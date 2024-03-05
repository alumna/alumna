import { EOL } 	from 'os';
import { translate_imports } from './../utils/imports'

export const app_translate = async function ( state, next, end ) {

	// Translate imports
	const code = translate_imports(state.app.compile.compiled.js.code)

	// Translate from es module to iife and initialize the application
	state.app.compile.compiled.js.code = 'const App = (function () {' + EOL + code.replace('export default Component;', 'return Component;' + EOL + '})();' + EOL + 'Al.start()');

	next();

}