import { get_imports } 			from '../utils/imports'

export const app_imports = async function ( state, next, end ) {

	// Get imports
	const imports_array = get_imports( state.app.compile.compiled.js.code )

	// Merge all imported libraries with the ones used on components
	for ( const lib of imports_array )
		state.app.imports.set( lib, true )

	// svelte internal imports
	const imports = Array.from( state.app.imports.keys() ).join( ', ' )

	// code to be use as entry input for esbuild
	state.app.svelte_internal_imports	= `import { ${imports} } from '${ state.config.install_dir + 'dist/svelte-internal-build.js' }';`
	state.app.svelte_internal_lib 		= `Al.lib = { ${imports} }`

	next();

}