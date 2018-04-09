import { EOL } 					from 'os';
import fs 						from 'fs-extra';
import svelte 					from 'svelte';
import UglifyJS 				from 'uglify-es';

// Altiva modules - generators
import MapToCode				from './app/maptocode.js';
import subcomponents			from './all/subcomponents.js';
import translate				from './all/translate.js';

// Altiva modules - utils
import uglifyOptions			from './../utils/uglify/options.js';


/** Generate the main app, saving the code in the file defined in options.app.filename ('app.js' by default) **/
const appGenerator = function ( mode, options, componentsMap, command ) {

	return new Promise( ( resolve, reject ) => {

		fs.readFile( './src/' + options.app.filename, 'utf8', ( err, userCode ) => {
			
			const app = new MapToCode( userCode, componentsMap, options.app.filename );

			app.compile().then( ( ) => {

				// 'eval' for 'dev' mode, 'es' for 'build' mode
				const format = ( mode == 'dev' ) ? 'iife' : 'es';

				// default false for 'dev' mode
				let shared = false;

				// default true for 'build mode'
				if ( mode == 'build' )
					shared = options.build.smallComponents == undefined ? true : options.build.smallComponents;

				const main_code = app.html + EOL + app.script;

				const result = svelte.compile( main_code, {

					format,
					name: 'App',
					shared,
					store: options.app.useStore,
				
					onwarn: warning => console.log( '[Altiva generated code error] ' + warning.name + ' in ' + path + ', line ' + warning.loc.line + ', column ' + warning.loc.column + ': ' + warning.message ),

					onerror: err => console.log( '[Altiva generated code error] ' + err.name + ' in ' + path + ', line ' + err.loc.line + ', column ' + err.loc.column + ': ' + err.message )

				});

				// If there are no erros in compiling process
				if ( result && result.code ) {

					// Do the subcomponents replacement
					subcomponents( result.code ).then( ( { code, subcomponentsList } ) => {

						fs.readFile( __dirname + '/shared.js', 'utf8', ( err, shared_functions ) => {

							let appDefaults = 'Altiva.defaults.globalVar = \'' + options.app.globalVar + '\';' + EOL;
							    appDefaults += 'Altiva.defaults.useStore = ' + options.app.useStore  + ';' + EOL;

							const autoStart  = options.app.autoStart ? EOL + 'Altiva.start();' : '';

							// Dev mode code
							if ( mode == 'dev' ) {
								
								const final_code = shared_functions + EOL + appDefaults + EOL + app.route_functions + EOL + code + EOL + autoStart;

								fs.outputFile( 'dev/' + options.app.filename, final_code ).then( () => resolve( true ) );
							}

							// Build mode code
							if ( mode == 'build' ) {
								
								translate( code, 'App' ).then( translatedCode => {
									
									let final_code = shared_functions + EOL + appDefaults + EOL + app.route_functions + EOL + 'var App = ' + translatedCode + EOL + autoStart;

									// Minify the generated code, unless disabled by the -u/--uncompressed flag
									if ( !command.uncompressed ) final_code = UglifyJS.minify( final_code, uglifyOptions ).code;

									fs.outputFile( 'build/' + options.app.filename , final_code ).then( () => resolve( true ) );
								});
							}

						} );
					} );

				} else {

					resolve( true );
				}

			} ).catch( error => reject( error ) );

		} );

	} );

};

export default appGenerator;