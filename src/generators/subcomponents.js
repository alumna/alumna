import { EOL } 	from 'os';
import Zousan 	from "zousan";

/** List every subcomponent of it's parent **/
const subcomponents = function ( code, component ) {

	return new Zousan( ( resolve ) => {

		const start  			= 'Altiva.component[';
		const finish 			= ']';
		const subcomponents 	= {};
		const varNames 			= {};
		let found 				= false;

		// Here we will save each line that will be removed later
		const toBeRemoved 	= [];

		// Lets work line by line
		code.split( EOL ).forEach( ( value ) => {

			const startIndex = value.lastIndexOf( start );

			if ( startIndex === -1 ) return;

			const subComponent = value.substring( startIndex + start.length, value.indexOf( finish, startIndex + start.length ) ).replace( /["']/g , '' ).trim();

			// Here, we are checking if a subComponent definition was founded
			if ( subComponent ) {

				toBeRemoved.push( value );

				subcomponents[ subComponent ] = true;
				found = true;

				/*
				 * Here, we register each var name that references a subComponent.
				 * Those variables will be replaced below[1], but... all this work will
				 * be removed after explaining this problem in a Svelte issue.
				 *
				 * [1] 'new subcomponent( {...} )' to 'new Altiva.component[ 'path/to/subcomponent' ]( {...} )'
				 *
				 * Svelte issue number here (soon):
				 */

				 const varIndex = value.lastIndexOf( 'var ' );
				 const instance = value.substring( varIndex + 4, value.indexOf( ' = ' + start, varIndex + 4 ) ).trim();

				 varNames[ subComponent ] = instance;
			}

		} );

		// Remove all unnecessary line
		for ( const key in toBeRemoved )
			code = code.replace( toBeRemoved[ key ] + EOL, '' );

		// Now, replace 'new subcomponent( {...} )' to 'new Altiva.component[ 'path/to/subcomponent' ]( {...} )'
		for ( const subComponent in varNames ) {
			
			const regex = new RegExp( 'new ' + varNames[ subComponent ] + '\\(', 'g' );

			code = code.replace( regex, 'new Altiva.component[ \'' + subComponent + '\' ](' );
		}


		const subcomponentsList = found ? subcomponents : false;

		resolve( { code, subcomponentsList } );

	} );
};

export default subcomponents;