import { EOL } 					from 'os';
import fs 						from 'fs-extra';
import svelte 					from 'svelte';
import terser 					from 'terser';

// Altiva modules - generators
import MainCode					from './app/maincode.js';
import modules_and_middlewares	from './app/modules-and-middlewares.js';
import subcomponents			from './all/subcomponents.js';
import translate				from './all/translate.js';

// Altiva modules - utils
import terserOptions			from './../utils/terser/options.js';
import showError				from './../utils/showError.js';
import to						from './../utils/to.js';


/** Generate the main app, saving the code to the file defined in options.app.filename ('app.js' by default) **/
const appGenerator = async function ( mode, options, componentsMap, command ) {


	let err, userCode;

	[ err, userCode ] = await to( fs.readFile( './src/' + options.app.filename, 'utf8' ) );

	if ( err )
		return Promise.reject( { message: 'The file "src/' + options.app.filename + '" doesn\'t exists.' } );
		
	const app = new MainCode( userCode, componentsMap, options.app.filename );

	[ err ] = await to( app.compile() );

	if ( err )
		return Promise.reject( err );

	// Generate the browser code with modules and middlewares
	// In this process, we validate specially the middlewares, to check if
	// there is a required middleware in "app.js" that doesn't exists
	// in middleware directory
	let browser_code;

	[ err, browser_code ] = await to( modules_and_middlewares( options, app ) );

	if ( err )
		return Promise.reject( err );

	// 'eval' for 'dev' mode, 'es' for 'build' mode
	const format = ( mode == 'dev' ) ? 'iife' : 'es';

	// default false for 'dev' mode
	let shared = false;

	// default true for 'build mode'
	if ( mode == 'build' )
		shared = options.build.smallComponents == undefined ? true : options.build.smallComponents;

	const main_code = app.html + EOL + app.script;

	// compiling
	let result;

	try {

		result = svelte.compile( main_code, {

			format,
			name: 'App',
			shared,
			store: options.app.useStore,
		
			onwarn: warning => showError( warning, path, true )

		});

	}
	catch( err ) {
		showError( err, path, true )
	}

	

	// If there are erros in compiling process, stop
	if ( !( result && result.js && result.js.code ) )
		return true;

	// Do the subcomponents replacement
	let { code } = await subcomponents( result.js.code );

	// Everything is fine, lets finalize the browser app complete code
	let appDefaults = 'Altiva.defaults.globalVar = \'' + options.app.globalVar + '\';' + EOL;
	    appDefaults += 'Altiva.defaults.useStore = ' + options.app.useStore  + ';' + EOL + EOL;

	// Create the code that runs Altiva.configBaseUrl()
	// to ensure that the base URL for component loading
	// works in every scenario, including mobile
	const baseUrlForComponents = 'Altiva.configBaseUrl();' + EOL + EOL;

	const autoStart  = options.app.autoStart ? EOL + 'Altiva.start();' : '';

	// Dev mode code
	if ( mode == 'dev' ) {
		
		const final_code = browser_code + EOL + appDefaults + baseUrlForComponents + app.route_functions + EOL + code + EOL + autoStart;

		await fs.outputFile( 'dev/' + options.app.filename, final_code );

	}

	// Build mode code
	if ( mode == 'build' ) {
		
		let translatedCode = await translate( code, 'App' );
			
		let final_code = browser_code + EOL + appDefaults + baseUrlForComponents + app.route_functions + EOL + 'var App = ' + translatedCode + EOL + autoStart;

		// Minify the generated code, unless disabled by the -u/--uncompressed flag
		if ( !command.uncompressed ) final_code = terser.minify( final_code, terserOptions ).code;

		await fs.outputFile( 'build/' + options.app.filename , final_code );

	}

	return true;

};

export default appGenerator;