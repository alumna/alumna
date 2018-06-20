import { EOL } 			from 'os';
import fs 				from 'fs-extra';
import hjson			from 'hjson';

// Altiva modules - utils
import fileExists 	from './../../utils/fileExists.js';
import isObject 	from './../../utils/isObject.js';
import to			from './../../utils/to.js';

let base_dir    = __dirname;
let modules_dir = './modules/';
let middlewares_dir = './middlewares/';

const modules_and_middlewares = async function ( options, app ) {

	let err, modules_codes = '', middleware_codes = '', browser_code = await fs.readFile( base_dir + '/browser.js', 'utf8' );

	/* MODULES */
	[ err, modules_codes ] = await to( modules( options ) )

	if ( err ) return Promise.reject( err );
	

	/* MIDDLEWARES */
	[ err, middleware_codes ] = await to( middlewares( options, app ) )

	if ( err ) return Promise.reject( err );


	return browser_code + modules_codes + middleware_codes;

};

const modules = async function ( options ) {

	let err, modules_codes = [];

	/* MODULES */

	// Check if the "modules" property is defined in options ( altiva.hjson )
	// and it is an object
	if ( options.modules ) {

		if ( !isObject( options.modules ) )
			return Promise.reject( { message: 'Error in "app.js": The app.modules property is not an object.' } );

		let modules_sarray = Object.keys( options.modules );
		
		// If there are modules, bundle the codes
		if ( modules_sarray.length ) {

			[ err, modules_codes ] = await to( Promise.all( modules_sarray.map( module ) ) );

			if ( err ) return Promise.reject( err );

		}

	}

	return modules_codes.length ? merge_modules( modules_codes ) : '';

};

const module = async function ( module_name ) {

	// Check the existence of module directory
	if ( ! await fileExists( modules_dir + module_name ) )
		return Promise.reject( { message: 'Missing "' + module_name + '" module. Please install it with: altiva install' } );

	// Check the existence of module.hjson or package.json and get its properties
	let properties 	= null;
	let is_hjson 	= false;

	if ( await fileExists( modules_dir + module_name + '/module.hjson' ) ) {
		
		properties = hjson.parse( await fs.readFile( modules_dir + module_name + '/module.hjson', 'utf8' ) );

		is_hjson = true;
	}

	else if ( await fileExists( modules_dir + module_name + '/package.json' ) )
		properties = JSON.parse( await fs.readFile( modules_dir + module_name + '/package.json', 'utf8' ) );

	else
		return Promise.reject( { message: 'Missing module.hjson or package.json in "' + module_name + '" module\'s directory.' } )

	let [ err ] = await to( validate_module( properties.main, module_name, is_hjson ) );

	if ( err )
		return Promise.reject( err );

	let module_and_file = {};

	module_and_file[ module_name ] = await fs.readFile( modules_dir + module_name + '/' + properties.main, 'utf8' );

	return module_and_file;
};

const validate_module = async function( mainfile, module_name, is_hjson ) {

	if ( mainfile && typeof mainfile === 'string' && mainfile.length ) {

		if ( await fileExists( modules_dir + module_name + '/' + mainfile ) )
			return true

		else
			return Promise.reject( { message: 'The main "' + mainfile + '" file defined in module "' + module_name + '" doesn\'t exist.' } );

	} else
		return Promise.reject( { message: 'Missing or wrong "main" property in "' + module_name + '/' + ( is_hjson ? 'module.hjson' : 'package.json' ) + '" file.' } );

};


const merge_modules = function ( module_codes ) {

	let code = EOL + EOL + 'Altiva.modules = {};' + EOL;

	module_codes.forEach( single => Object.keys( single ).map( single_name => code += EOL + 'Altiva.modules[ \'' + single_name + '\' ] = ' + single[ single_name ] + EOL ) );

	code += EOL + 'Altiva.module = Altiva.modules;' + EOL;

	return code + EOL;

};

const middlewares = async function ( options, app ) {

	// Check if there are used middlewares
	if ( isObject( app.used_middlewares, true ) ) {

		let middleware_codes  = EOL + EOL + 'Altiva.middlewares = {};' +
								EOL + EOL + 'Altiva.middleware = Altiva.middlewares;' + EOL + EOL;

		for ( const middleware in app.used_middlewares ) {

			// Check if the used middleware is properly defined in "altiva.hjson"
			if ( options.middlewares[ middleware ] ) {
				
				// Get and adjust the path properly
				let file_path = options.middlewares[ middleware ]

				if ( file_path.startsWith( '/' ) ) file_path = file_path.substring( 1 );

				if ( !file_path.endsWith( '.js' ) ) file_path += '.js';

				// And check if the informed file exists
				if ( await fs.pathExists( middlewares_dir + file_path ) )
					middleware_codes += await fs.readFile( middlewares_dir + file_path, 'utf8' ) + EOL + EOL;

				else
					return Promise.reject( { message: 'Error in "app.js": The file of middleware "' + middleware + '" doesn\'t exist.' } );

			} else
				return Promise.reject( { message: 'Error in "app.js": The middleware "' + middleware + '" isn\'t defined in "altiva.hjson".' } );

		}

		// Here, all middlewares were successfully imported
		// We will, then, add to the browser code the relation of routes and its middlewares,
		// so the runtime code will have all the information to correctly apply those middlewares.

		middleware_codes += 'Altiva.middleware_in_routes = ' + JSON.stringify( app.middlewares ) + ';'

		return middleware_codes;

	} else return '';

};

export default modules_and_middlewares;