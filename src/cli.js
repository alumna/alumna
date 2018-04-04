import fs 			from 'fs';
import mri			from 'mri';

// Altiva Library
import altiva		from './altiva.js';

// Util to update the user's altiva.hjson, used in all modes
import update		from './utils/updateOptions.js';

// Command line help info
import help 		from './help.md';
import { version } 	from '../package.json';



/*
 * [ New mode ]
 *
 * Copy the "base" skeleton of an Altiva project to
 * the directory informed in "altiva new <directory>""
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

if ( command.help || ( process.argv.length <= 2 && process.stdin.isTTY ) ) {

	console.log( '\n' + help.replace( '__VERSION__', version ) + '\n' );

} else if ( command.version ) {

	console.log( 'altiva version ' + version );

} else {

	const task = command[ '_' ][ 0 ];

	switch ( task ) {

		/* DEV MODE */
		case "dev":
		case "build":

			// Check the existence of altiva.hjson config file
			fs.readFile( 'altiva.hjson', 'utf8', ( err, data ) => {

				if ( !err ) {

					// Getting config data
					update( data ).then( options => altiva[ task ]( options, command ) );

				} else {
					
					// This directory isn't an Altiva Project
					console.log( 'Missing \'altiva.hjson\' file. It seems that this directory isn\'t an Altiva Project' );
				}
			} );

			break;

		/* NEW MODE */
		case "new":

			command[ '_' ].length == 2 ? altiva.newProject( command[ '_' ][ 1 ] ) : console.log( 'Use: altiva new <project_name>' );
			
			break;

		default:

			console.error( 'Unrecognised command' + ( task ? ' ' + task : '' ) + '. Type altiva --help to see instructions' );

			break;
	}
}

