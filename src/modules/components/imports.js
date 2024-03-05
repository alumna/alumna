import { get_imports } from './../utils/imports'

export const imports = async function ( state, next, end ) {

	// Get imports
	const imports_array = get_imports(state.global.components[ state.component ].compiled.js.code)

	// Save each library imported
	for ( const lib of imports_array )
		state.global.app.imports.set( lib, true )
	
	next();

}