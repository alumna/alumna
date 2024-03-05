import { readFileSync } 	from 'fs';
import mri					from 'mri';

// Alumna Library
import { Alumna }			from './alumna.js';

// Command line help info
import help 				from './help.md';
import { version } 			from '../package.json';

// Error processing
import { process_errors }	from './modules/errors/process_errors';



/*
 * [ New mode ]
 *
 * Copy the "base" skeleton of an Alumna project to
 * the directory informed in "alumna new <directory>""
 * 
 * Create this directory if it doesn't exists, or use
 * the current one if a dot "." is passed.
 *
 * On "." or existing <directory>, it must be empty.
 *
 *
 *
 *
 * [ Dev mode ]
 *
 * Compile all components in src/components folder,
 * saving them in memory.
 * 
 * Everything is done without minification and
 * without tree-shaking, for speed in development.
 *
 *
 *
 *
 * [ Build mode ]
 *
 * Compile all components in src/components folder,
 * saving them into build/components.
 *
 * Rsync everthing else in parallel
 *
 * After it, the main "build/index.html" file is generated
 * with minification, tree-shaking and inlining app.js and
 * all the CSS's informed in src/index.html.
 * 
 */


/* Getting command line arguments */
const command = mri( process.argv.slice( 2 ), {
	alias: {
		h: 'help',
		v: 'version'
	}
});

const read_options = function () {
	try {
		return readFileSync( 'alumna.hjson', 'utf8' )
	} catch ( e ) {
		return false
	}
}

if ( command.help || ( process.argv.length <= 2 && process.stdin.isTTY ) ) {

	console.log( '\n' + help.replace( '__VERSION__', version ) + '\n' );

} else if ( command.version ) {

	console.log( 'alumna version ' + version );

} else {

	const mode = command[ '_' ][ 0 ];
	
	switch ( mode ) {

		/* BUILD AND DEV MODE */
		case "dev":
		case "build": {
			const options = read_options();

			if ( !options ) {
				console.log( 'Missing \'alumna.hjson\' file. It seems that this directory isn\'t an Alumna Project' );
				break;
			}

			const alumna = new Alumna({ dir: './src/', build_dir: './build/' })
			await alumna[ mode ]()

			// If there are errors, simply stop
			// "process_errors" will automatically print the errors it founds inside the state object
			if ( process_errors( alumna.library.state ) )
				break;

			if ( mode == "dev" )
				console.log( 'Listening on http://localhost:' + alumna.library.state.config.port )

			if ( mode == "build" )
				console.log( 'Build completed successfully at the directory "build".' )

			break;
		}
		/* NEW MODE */
		case "new": {
			if ( command[ '_' ].length != 2 ) {
				console.log( 'Use: alumna new <project_name>' );
				break;
			}
			
			const alumna = new Alumna({ dir: command[ '_' ][ 1 ] })
			alumna.new()
			break;
		}
		/* UNRECOGNIZED COMMAND */
		default:
			console.error( 'Unrecognised command' + ( mode ? ' ' + mode : '' ) + '. Type alumna --help to see instructions' );
			break;
	}
}