import fs 			from 'fs';
import mri			from 'mri';

// Alumna Library
import alumna		from './alumna.js';

// Util to update the user's alumna.hjson, used in all modes
import update		from './utils/updateOptions.js';

// CLI to install and update modules
import * as modules	from './cli/modules.js';

// Command line help info
import help 		from './help.md';
import { version } 	from '../package.json';



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
 * saving them into dev/components.
 *
 * Rsync everthing else (assets) in parallel.
 *
 * After it, the main "dev/app.js" file is generated
 * and a live-reload session is initiated, opening
 * the browser automatically.
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
		p: 'preview',
		u: 'uncompressed',
		v: 'version'
	}
} );

const read_options_and_run = function ( run ) {

	// Check the existence of alumna.hjson config file
	fs.readFile( 'alumna.hjson', 'utf8', ( err, data ) => {

		if ( !err ) {

			// Getting config data
			update( data ).then( options => run( options, command ) );

		} else {
			
			// This directory isn't an Alumna Project
			console.log( 'Missing \'alumna.hjson\' file. It seems that this directory isn\'t an Alumna Project' );
		}
	} );

}

if ( command.help || ( process.argv.length <= 2 && process.stdin.isTTY ) ) {

	console.log( '\n' + help.replace( '__VERSION__', version ) + '\n' );

} else if ( command.version ) {

	console.log( 'alumna version ' + version );

} else {

	const task = command[ '_' ][ 0 ];

	switch ( task ) {

		/* DEV MODE */
		case "dev":
		case "build":

			read_options_and_run( alumna[ task ] );

			break;

		/* NEW MODE */
		case "new":

			command[ '_' ].length == 2 ? alumna.newProject( command[ '_' ][ 1 ] ) : console.log( 'Use: alumna new <project_name>' );
			
			break;

		/* NEW MODE */
		case "install":
		case "update":

			read_options_and_run( modules.install );
			
			break;

		default:

			console.error( 'Unrecognised command' + ( task ? ' ' + task : '' ) + '. Type alumna --help to see instructions' );

			break;
	}
}