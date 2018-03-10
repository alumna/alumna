import fs 			from 'fs-extra';
import glob			from 'glob';
import svelte 		from 'svelte';
import Zousan 		from "zousan";

// Altiva modules - generators
import subcomponents	from './../generators/subcomponents.js';

// Altiva modules - utils
import translateModules	from './../utils/translateModules.js';


/* Subcomponents map */
const componentsMap = {};

const getMap = function ( ) {

	return componentsMap;
};

/** Compile generating a Svelte component **/
const compile = function ( mode, path, options ) {

	return new Zousan( ( resolve ) => {

		fs.readFile( path, 'utf8', ( err, data ) => {
			
			const parts  = path.split( '/' );
			const name   = parts[ parts.length - 1 ].replace( '.html', '' );

			// 'eval' for 'dev' mode, 'es' for 'build' mode
			const format = mode == 'dev' ? 'eval' : 'es';
			
			// default false for 'dev' mode
			let shared = false;

			// default true for 'build mode'
			if ( mode == 'build' )
				shared = options.build.smallComponents == undefined ? true : options.build.smallComponents;
			
			// Compiling
			const result = svelte.compile( data, {

				format,
				name,
				shared,

				onwarn: warning => console.log( warning.name + ' in ' + path + ', line ' + warning.loc.line + ', column ' + warning.loc.column + ': ' + warning.message ),

				onerror: err => console.log( err.name + ' in ' + path + ', line ' + err.loc.line + ', column ' + err.loc.column + ': ' + err.message )

			} );

			// Runtime name
			const component = path.replace( 'src/components/', '' ).replace( '.html', '' );

			// Replace "src" with "dev"
			path = path.replace( 'src', mode );
			path = path.replace( '.html', '.js' );

			// If there are no erros in compiling process
			if ( result && result.code ) {

				subcomponents( result.code, component ).then( ( { code, subcomponentsList } ) => {

					if ( subcomponentsList ) componentsMap[ component ] = subcomponentsList;

					if ( mode == 'dev' )
						fs.outputFile( path , code ).then( () => resolve( true ) );

					if ( mode == 'build' ) {
						translateModules( code, name ).then( translatedCode => {
							fs.outputFile( path , translatedCode ).then( () => resolve( true ) );
						} );
					}
				} );

			} else {

				resolve( true );
			}

			

		} );

	} );

};

/** Compile all components returning a promise **/
const compileAll = function ( mode, options ) {

	return new Zousan( ( resolve, reject ) => {

		/* Recompile the 'scr' to 'dev' or 'build' */
		glob( 'src/components/**/*.html', ( err, files ) => {
			err ? reject( err ) : Zousan.all( files.map( path => compile( mode, path, options ) ) ).then( () => resolve( componentsMap ) );
		} );

	} );

};

export { compile, compileAll, getMap };