import fs 						from 'fs-extra';
import glob						from 'glob';
import svelte 					from 'svelte';
import UglifyJS 				from 'uglify-es';

// Altiva modules - generators
import subcomponents			from './../generators/all/subcomponents.js';
import translate				from './../generators/all/translate.js';
import exists					from './../generators/all/exists.js';

// Altiva modules - utils
import uglifyOptions			from './../utils/uglify/options.js';


/* Subcomponents map */
const componentsMap = {};

const getMap = function ( ) {

	return componentsMap;
};

const showError = function ( error, path ) {

	let message = ( error.name ? error.name : 'Error' ) + ' in ' + path + ( ( error.loc && error.loc.line ) ? ', line ' + error.loc.line : '' ) + ( ( error.loc && error.loc.column ) ? ', column ' + error.loc.column : '' ) + ': ' + error.message

	console.log( message );
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
			const result = svelte.compile( data, {

				format,
				name,
				shared,
				store: options.app.useStore,

				onwarn: warning => showError( warning, path ),

				onerror: err => showError( err, path )

			} );

			// If there are no erros in compiling process
			if ( result && result.js && result.js.code ) {

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
								if ( !command.uncompressed ) translatedCode = UglifyJS.minify( translatedCode, uglifyOptions ).code;

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

			} else {

				resolve( componentsMap );
			}

			

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