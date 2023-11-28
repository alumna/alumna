import { translate_imports } from './../utils/translate_imports'

export const app_translate = async function ( state, next, end ) {

	// Translate imports
	state.app.compile.compiled = translate_imports(state.app.compile.compiled)

	next();

}