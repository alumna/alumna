import fs 						from 'fs-extra';
import glob						from 'glob';
import svelte 					from 'svelte';
import Zousan 					from "zousan";
import UglifyJS 				from 'uglify-es';

// Altiva modules - generators
import subcomponents			from './../generators/subcomponents.js';

// Altiva modules - utils
import translate				from './../utils/translateSvelteShared.js';
import uglifyOptions			from './../utils/uglifyOptions.js';


/* Subcomponents map */
const componentsMap = {};

const getMap = function ( ) {

	return componentsMap;
};

/** Compile generating a Svelte component **/
const compile = function ( mode, path, options, command ) {

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
				store: options.app.useStore,

				onwarn: warning => console.log( ( warning.name ? warning.name : 'Warning' ) + ' in ' + path + ', line ' + warning.loc.line + ', column ' + warning.loc.column + ': ' + warning.message ),

				onerror: err => console.log( ( err.name ? err.name : 'Error' ) + ' in ' + path + ', line ' + err.loc.line + ', column ' + err.loc.column + ': ' + err.message )

			} );

			// If there are no erros in compiling process
			if ( result && result.code ) {

				// Runtime name
				const component = path.replace( 'src/components/', '' ).replace( '.html', '' );

				// Replace "src" with "dev"
				path = path.replace( 'src', mode );
				path = path.replace( '.html', '.js' );

				subcomponents( result.code, component ).then( ( { code, subcomponentsList } ) => {

					if ( subcomponentsList ) componentsMap[ component ] = subcomponentsList;

					if ( mode == 'dev' )
						fs.outputFile( path , code ).then( () => resolve( true ) );

					if ( mode == 'build' ) {
						translate( code, name ).then( translatedCode => {
							
							// Minify the generated code, unless disabled by the -u/--uncompressed flag
							if ( !command.uncompressed ) translatedCode = UglifyJS.minify( translatedCode, uglifyOptions ).code;

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
const compileAll = function ( mode, options, command ) {

	return new Zousan( ( resolve, reject ) => {

		/* Recompile the 'scr' to 'dev' or 'build' */
		glob( 'src/components/**/*.html', ( err, files ) => {
			err ? reject( err ) : Zousan.all( files.map( path => compile( mode, path, options, command ) ) ).then( () => resolve( componentsMap ) );
		} );

	} );

};

export { compile, compileAll, getMap };