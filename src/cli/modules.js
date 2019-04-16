import degit 	from 'degit';
import fs 		from 'fs-extra';
import hjson	from 'hjson';
import request	from 'request';
import cmp		from 'semver-compare'

import to			from './../utils/to.js';
import fileExists	from './../utils/fileExists.js';
import isObject		from './../utils/isObject.js';
import update		from './../utils/updateOptions.js';


const modules_dir = './modules/';

let modules = {};

const install = async function ( options, command ) {

	// Save current list of modules
	let current = current_modules( options )

	// alumna install
	if ( command[ '_' ].length == 1 ) {
		
		current ? await install_all() : console.log( 'No modules found in "alumna.hjson".' );

	}

	// alumna install <something>
	else {

		const repo = command[ '_' ][ 1 ];

		await install_one( repo );
	}

	// Update modules in project's alumna.hjson file
	options.modules = {};
	Object.keys( modules ).sort().map( key => options.modules[ key ] = modules[ key ] );
	await update( options, true );

	return true;

}

const current_modules = function ( options ) {

	// Check if there are modules defined in options (alumna.hjson)
	if ( isObject( options.modules ) && Object.keys( options.modules ).length ) {

		modules = options.modules

		return true;

	}

	return false;

}

const install_all = async function () {

	let results = await Promise.all( Object.keys( modules ).map( module_name => install_one( modules[ module_name ], module_name, false ) ) );

	if ( results.every( result => result === true ) )
		console.log( 'All modules are updated.' );

	return true;

}

// Return true when the module is already installed and updated
// Return an object with the name and repo when local version is not updated or not installed
// Return false when an error occurs
const install_one = async function ( repo, module_name = '', console_when_updated = true ) {

	let copy_with_degit = async function () {

		// Remove the currently installed module
		await fs.remove( modules_dir + module_name );

		// Create a new empty directory for it
		await fs.ensureDir( modules_dir + module_name );

		// And copy the updated content from remote repo
		await degit( repo, { cache: false, force: false, verbose: false } ).clone( modules_dir + module_name );

		return true;

	}

	let err, remote_data

	if ( valid( repo ) ) {

		[ err, remote_data ] = await to( remote( repo ) )

		if ( err ) {
			
			console.log( err.message );

			return false;
		}

		if ( !module_name )
			module_name = name( repo, remote_data );

		// Update the module on the list
		// in case it doesn't already exist
		modules[ module_name ] = repo;

		// Check if repo is already installed
		let installed_version = await installed( module_name );
		let remote_version    = remote_data.version;

		// If the module has a valid version
		if ( valid_version( installed_version ) && valid_version( remote_version ) ) {

			// and the remote version is greater than local one, update it
			if ( cmp( remote_version, installed_version ) ) {

				console.log( 'Updating "' + module_name + '" module, from ' + installed_version + ' to ' + remote_version + ' ...' );

				await copy_with_degit();

				console.log( 'Done!' );

				return { name: module_name, repo: repo };

			} else {
				
				if ( console_when_updated )
					console.log( 'The module "' + module_name + '" is already updated to the latest version (' + remote_version + ').' );

				return true;
			}

		// When module isn't installed, has missing or invalid "semver" versions, copy it from remote
		} else {

			if ( installed_version )
				console.log( 'Updating "' + module_name + '" module anyway, since it doesn\'t provide a valid "semver" version...' );
			
			else if ( valid_version( remote_version ) )
				console.log( 'Installing "' + module_name + '" module, version ' + remote_version + ' ...' );

			else
				console.log( 'Installing "' + module_name + '" module, that doesn\'t provide a valid "semver" version...' );

			await copy_with_degit();

			console.log( 'Done!' );

			return { name: module_name, repo: repo };

		}

	} else {
		
		let repository = ( typeof repo == 'string' ) ? repo : '';

		console.log( 'Invalid repository "' + repository + '"' )

		return false;

	}

}

const valid = function ( repo ) {

	if ( !( repo && typeof repo == 'string' && repo.length ) )
		return false;

	const parts = repo.split( '/' )

	if ( parts.length > 1 && typeof parts[ parts.length - 1 ] == 'string' && parts[ parts.length - 1 ].length )
		return true;

	return false;

}

// For the moment, it's missing support for gitlab and bitbucket
const remote = async function ( repo, branch = 'master' ) {

	let err, hjson_file, package_file

	const base = 'https://raw.githubusercontent.com/'
	const url  = base + repo + '/' + branch + '/';

	// Check for module.hjson first
	[ err, hjson_file ] = await to( get( url + 'module.hjson' ) );

	if ( !err )
		return hjson.parse( hjson_file );

	// Check for package.json as an alternative
	[ err, package_file ] = await to( get( url + 'package.json' ) );

	if ( !err )
		return JSON.parse( package_file );

	// If both files don't exist, reject
	return Promise.reject( { message: 'The repository "' + repo + '" doesn\'t exist or doesn\'t have a module definition file.' } )

}

const get = function( url ) {

	return new Promise( ( resolve, reject ) => {

		request.get( url, function ( error, response, body ) {

			if ( !error && response.statusCode == 200 )
				resolve( body );

			else
				reject( true );

		});

	});

}

const name = function ( repo, remote_data ) {

	const parts = repo.split( '/' );

	return remote_data.name ? remote_data.name : parts[ parts.length - 1 ];

}

// If installed, return the module version or "true"
// Otherwise, if not installed, return false
const installed = async function ( module_name ) {

	if ( await fileExists( modules_dir + module_name ) ) {

		if ( await fileExists( modules_dir + module_name + '/module.hjson' ) ) {

			let version = hjson.parse( await fs.readFile( modules_dir + module_name + '/module.hjson', 'utf8' ) ).version;

			return version ? version : true;
		}

		if ( await fileExists( modules_dir + module_name + '/package.json' ) ) {

			let version = JSON.parse( await fs.readFile( modules_dir + module_name + '/package.json', 'utf8' ) ).version;

			return version ? version : true;
		}

		return false;
	}

	return false;

}

const valid_version = function ( version ) {

	function isNumeric( num ) {
		return !isNaN( num )
	}

	return ( version && typeof version == 'string' && version.length && version.split( '.' ).every( isNumeric ) )

}



export { install };