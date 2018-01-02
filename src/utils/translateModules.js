import { EOL } 	from 'os';

// Translate svelte helpers import statements
const translateModules = function ( code, name ) {
	
	return new Zousan( ( resolve ) => {

		const start 		= 'import { ';
		const finish 		= ' } from "svelte/shared.js";';
		const startIndex 	= code.lastIndexOf( start );

		let replaceCode		= '';

		// Get the shared modules used in this component and point them to Altiva global var
		if ( startIndex ) {

			const modulesString = code.substring( startIndex + start.length, code.indexOf( finish, startIndex + start.length ) ).replace( /["']/g , '' ).trim();

			const modulesArray	= modulesString.split( ',' ).map( ( item ) => item.trim() );

			for ( const key in modulesArray ) {

				replaceCode += 'var ' + modulesArray[ key ] + ' = Altiva.shared.' + modulesArray[ key ] + ' ;' + EOL;
			}

			// Replace the import statement with the "replaceCode" content
			code = code.replace( start + modulesString + finish, replaceCode );
		}

		// Translate from es module to an iife
		code = '(function () { "use strict";' + EOL + code;
		code = code.replace( 'export default ' + name + ';', EOL + 'return ' + name + ';' + EOL + '}())' );


		resolve( code );
		
	} );
};

export default translateModules;