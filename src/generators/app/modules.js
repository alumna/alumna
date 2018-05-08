import { EOL } 		from 'os';
import fs 			from 'fs-extra';
import hjson		from 'hjson';

// Altiva modules - utils
import fileExists 	from './../../utils/fileExists.js';
import isObject 	from './../../utils/isObject.js';
import to			from './../../utils/to.js';

let base_dir    = __dirname;
let modules_dir = './modules/';

const modules = async function ( options ) {

	let browser_code = await fs.readFile( base_dir + '/browser.js', 'utf8' );

	// Check if the "modules" property is defined in options ( altiva.hjson )
	// and it is an object
	if ( options.modules ) {

		if ( !isObject( options.modules ) )
			return Promise.reject( { message: 'Error in "app.js": The app.modules property is not an object.' } );

		let err, mainfiles, modulesarray = Object.keys( options.modules );
		
		// If there are no modules to bundle, return the browser base code
		if ( !modulesarray.length )
			return browser_code;

		[ err, mainfiles ] = await to( Promise.all( modulesarray.map( mainfile ) ) );

		if ( err )
			return Promise.reject( err );
		else
			return merge( mainfiles, browser_code );

	} else
		// Return the browser base code if the "modules" property isn't defined
		return browser_code;

}

const mainfile = async function ( module ) {

	// Check the existence of module directory
	if ( ! await fileExists( modules_dir + module ) )
		return Promise.reject( { message: 'Missing "' + module + '" module. Please install it with: altiva install' } );

	// Check the existence of module.hjson or package.json and get its properties
	let properties 	= null;
	let is_hjson 	= false;

	if ( await fileExists( modules_dir + module + '/module.hjson' ) ) {
		
		properties = hjson.parse( await fs.readFile( modules_dir + module + '/module.hjson', 'utf8' ) );

		is_hjson = true;
	}

	else if ( await fileExists( modules_dir + module + '/package.json' ) )
		properties = JSON.parse( await fs.readFile( modules_dir + module + '/package.json', 'utf8' ) );

	else
		return Promise.reject( { message: 'Missing module.hjson or package.json in "' + module + '" module\'s directory.' } )

	let [ err, success ] = await to( valid_main( properties.main, module, is_hjson ) );

	if ( err )
		return Promise.reject( err );

	let module_and_file = {};

	module_and_file[ module ] = await fs.readFile( modules_dir + module + '/' + properties.main, 'utf8' );

	return module_and_file;
}

const valid_main = async function( mainfile, module, is_hjson ) {

	if ( mainfile && typeof mainfile === 'string' && mainfile.length ) {

		if ( await fileExists( modules_dir + module + '/' + mainfile ) )
			return true

		else
			return Promise.reject( { message: 'The main "' + mainfile + '" file defined in module "' + module + '" doesn\'t exist.' } );

	} else
		return Promise.reject( { message: 'Missing or wrong "main" property in "' + module + '/' + ( is_hjson ? 'module.hjson' : 'package.json' ) + '" file.' } );

}


const merge = function ( mainfiles, browser_code ) {

	browser_code += EOL + EOL + 'Altiva.modules = {};' + EOL;

	mainfiles.forEach( file => Object.keys( file ).map( module => browser_code += EOL + 'Altiva.modules[ \'' + module + '\' ] = ' + file[ module ] + EOL ) );

	return browser_code + EOL;

}

export default modules;