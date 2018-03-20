import fs 		from 'fs-extra';
import hjson	from 'hjson';
import Zousan 	from "zousan";

const isObject = function ( item ) {

	return ( item && typeof item === 'object' && !Array.isArray( item ) );
}

const mergeDeep = function ( target, ...sources ) {

	if ( !sources.length ) return target;

	const source = sources.shift();

	if ( isObject( target ) && isObject( source ) ) {

		for ( const key in source ) {

			if ( isObject( source[ key ] ) ) {

				if ( !target[ key ] ) Object.assign( target, { [ key ]: {} } );

				mergeDeep( target[ key ], source[ key ] );

			} else {

				Object.assign( target, { [ key ]: source[ key ] } );
			}

		}

	}

	return mergeDeep( target, ...sources );
}

const update = function ( projectOptions ) {

	return new Zousan( ( resolve ) => {

		// Get latest altiva.hjson file from project
		fs.readFile( __dirname + '/base/altiva.hjson', 'utf8', ( err, latestOptions ) => {

			// Parse the project's current defined options
			let parsedProjectOptions = hjson.parse( projectOptions )

			// Parse the latest Altiva hjson using "round-trip" mode
			let parsedLatestOptions  = hjson.rt.parse( latestOptions )

			// Generate an update version with all missing properties
			mergeDeep( parsedLatestOptions, parsedProjectOptions )

			const hjsonOptions = {

				keepWsc: 			true,
				bracesSameLine: 	true,
				quotes: 			'strings',
				separator: 			true,
				space: 				'\t'
			}

			fs.outputFile( 'altiva.hjson', hjson.rt.stringify( parsedLatestOptions, hjsonOptions ) );

			resolve( parsedLatestOptions );
		});

	});
	
}

export default update;