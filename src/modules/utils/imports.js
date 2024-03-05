const translate_imports = function ( code ) {

	const start 		= 'import {';
	const finish 		= '} from "svelte/internal";';

	// Get the shared modules used in this component and point them to Alumna global var
	code = code.replace( start, 'const {' );
	code = code.replace( finish, '} = Al.lib;' );

	// Remove "svelte/internal/disclose-version" package import
	return code.replace( 'import "svelte/internal/disclose-version";', '' );

}

const get_imports = function ( code ) {

	const start 		= code.indexOf( 'import {' );
	const finish 		= code.indexOf( '} from "svelte/internal";' );

	if ( start == -1 || finish == -1 )
		return [];

	return code.slice( start + 8, finish ).replaceAll( '\r\n', '' ).replaceAll( '\n', '' ).split( ',' ).map( el => el.trim() ).filter( el => el != '' )

}

const prepare_imports = function ( state, next ) {
	state.app.imports = new Map();
	next();
}

export { prepare_imports, translate_imports, get_imports }