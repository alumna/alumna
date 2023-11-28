import { EOL } 	from 'os';

export const translate_imports = function ( code ) {

	const start 		= 'import {';
	const finish 		= '} from "svelte/internal";';

	// Get the shared modules used in this component and point them to Alumna global var
	code = code.replace( start, 'const {' );
	code = code.replace( finish, '} = Al.shared;' );

	// Remove "svelte/internal/disclose-version" package import
	return code.replace( 'import "svelte/internal/disclose-version";', '' );

}