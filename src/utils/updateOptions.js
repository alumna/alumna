import fs 		from 'fs-extra';
import hjson	from 'hjson';

// Merge Deep util
import mergeDeep from './mergeDeep';

const update = function ( projectOptions, alreadyParsed = false ) {

	return new Promise( ( resolve ) => {

		// Get latest altiva.hjson file from project
		fs.readFile( __dirname + '/other/base/altiva.hjson', 'utf8', ( err, latestOptions ) => {

			// Parse the project's current defined options
			let parsedProjectOptions = alreadyParsed ? projectOptions : hjson.parse( projectOptions );

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