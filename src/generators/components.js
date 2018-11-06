import fs 						from 'fs-extra';
import glob						from 'glob';
import svelte 					from 'svelte';
import terser 					from 'terser';

// Altiva modules - generators
import subcomponents			from './../generators/all/subcomponents.js';
import translate				from './../generators/all/translate.js';
import exists					from './../generators/all/exists.js';

// Altiva modules - utils
import terserOptions			from './../utils/terser/options.js';
import showError				from './../utils/showError.js';


/* Subcomponents map */
const componentsMap = {};

const getMap = function ( ) {

	return componentsMap;
};

/** Compile generating a Svelte component **/
const compile = function ( mode, path, options, command ) {

	return new Promise( ( resolve ) => {

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
			let result;

			try {

				result = svelte.compile( data, {

					format,
					name,
					shared,
					store: options.app.useStore,

					onwarn: warning => showError( warning, path )

				});

			}
			catch( err ) {
				showError( err, path )
			}

			if ( !( result && result.js && result.js.code ) ) {
				resolve( componentsMap );
				return;
			}

			// If there are no erros in compiling process
			// Runtime name
			const component = path.replace( 'src/components/', '' ).replace( '.html', '' );

			// Replace "src" with "dev"
			path = path.replace( 'src', mode );
			path = path.replace( '.html', '.js' );

			subcomponents( result.js.code, component ).then( ( { code, subcomponentsList } ) => {

				const conclude = function ( ) {

					componentsMap[ component ] = subcomponentsList;

					if ( mode == 'dev' )
						fs.outputFile( path , code ).then( () => resolve( componentsMap ) );

					if ( mode == 'build' ) {
						
						translate( code, name ).then( translatedCode => {
							
							// Minify the generated code, unless disabled by the -u/--uncompressed flag
							if ( !command.uncompressed ) translatedCode = terser.minify( translatedCode, terserOptions ).code;

							fs.outputFile( path , translatedCode ).then( () => resolve( componentsMap ) );
						
						} );
					
					}
					
				}

				if ( subcomponentsList ) {

					exists( 'components/' + component + '.html', subcomponentsList )
					
					.then( () => conclude() )

					.catch( error => {

						console.log( error.message );

						resolve( componentsMap );

					});

				} else
					conclude();

			} );

		} );

	} );

};

/** Compile all components returning a promise **/
const compileAll = function ( mode, options, command ) {

	return new Promise( ( resolve, reject ) => {

		/* Recompile the 'scr' to 'dev' or 'build' */
		glob( 'src/components/**/*.html', ( err, files ) => {
			err ? reject( err ) : Promise.all( files.map( path => compile( mode, path, options, command ) ) ).then( () => resolve( componentsMap ) );
		} );

	} );

};

export { compile, compileAll, getMap };