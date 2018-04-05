import { EOL } 					from 'os';
import fs 						from 'fs-extra';
import svelte 					from 'svelte';
import vm 						from 'vm';
import Zousan 					from "zousan";
import UglifyJS 				from 'uglify-es';

// Altiva modules - generators
import subcomponents			from './../generators/subcomponents.js';

// Altiva modules - utils
import translate				from './../utils/translateSvelteShared.js';
import uglifyOptions			from './../utils/uglifyOptions.js';

// Svelte store module
import { Store } 				from 'svelte/store.js';

const MapToCode = function ( appStructure, componentsMap, appFileName ) {

	this.errors 	= [];
	this.areas 		= [];
	this.routes 	= {};
	this.html 		= '';
	this.script 	= '';

	this.appFileName			= appFileName;
	this.route_functions 		= '';
	this.appStructure 			= appStructure;
	this.componentsMap			= componentsMap;
	this.firstLevelComponents 	= {};

	this.validate_areas = function ( areas_array ) {

		if ( Array.isArray( areas_array ) ) {

			let local_errors = 0;

			for ( const area_key in areas_array ) {
				
				const area = areas_array[ area_key ];

				if ( typeof area != 'string' || !area.length ) {
					
					this.errors.push( 'Error in src/' + this.appFileName + ': The area ' + area + ' is not a string, and only strings can be used as names of areas.' );
					
					local_errors = 1;
					
					break;
				}

			}

			if ( !local_errors )
				this.areas = areas_array;

		} else {

			this.errors.push( 'Error in src/' + this.appFileName + ': You need to define an array to "app.areas" with one or more strings as the areas\' names.' );
		}

	};

	this.validate_route = function ( path, area_map ) {

		if ( !this.errors.length ) {

			if ( this.areas.length ) {

				let local_errors = 0;

				for ( const area in area_map ) {
					
					if ( !this.areas.includes( area ) ) {

						this.errors.push( 'Error in src/' + this.appFileName + ': In the route \'' + path + '\' you are refering to the area \'' + area + '\' that was not defined in app.areas array.' );

						local_errors = 1;
					}
				}

				if ( !local_errors ) this.routes[ path ] = area_map;

			} else {

				this.errors.push( 'Error in src/' + this.appFileName + ': Before defining the route \'' + path + '\' you need to define the app areas first in app.areas variable.' );
			}

		}

	};

	this.generate_html = function ( ) {

		return new Zousan( ( resolve ) => {

			/*
			 * Organize conditional rules based on area first.
			 * 
			 * We do not organize based directly on route,
			 * because different routes can use the same area,
			 * that can also use the same component.
			 * 
			 * In such cases, this approach allows that
			 * there are no unrender-and-render of the same
			 * component, when it just need to stay there,
			 * untouched.
			 */

			const organizer = {};

			for ( const path in this.routes ) {

				for ( const area in this.routes[ path ] ) {

					const component = this.routes[ path ][ area ];

					if ( !organizer[ area ] ) organizer[ area ] = {};

					if ( !organizer[ area ][ component ] ) organizer[ area ][ component ] = [];

					organizer[ area ][ component ].push( path );
				}
			}

			/*
			 * Here we have the information well organized that
			 * allows us to create the conditionals.
			 */

			/* 
			 * We will follow the sequence of areas defined by
			 * the user in the areas
			 */

			let iteration = 0;

			for ( const area_key in this.areas ) {

				const area = this.areas[ area_key ];
				let same_area = 0;

				for ( const component in organizer[ area ] ) {

					const component_tag = component.replace( /\//g, '_' );

					this.firstLevelComponents[ component_tag ] = component;

					let if_statement     	= '';
					let additional_paths 	= 0;

					for ( const path_key in organizer[ area ][ component ] ) {

						const path = organizer[ area ][ component ][ path_key ];

						if_statement += ( additional_paths ? '|| ' : ' ' ) + '_route == \'' + path + '\' ';
						
						additional_paths++;
					}

					if ( same_area ) {

						this.html += '{{elseif' + if_statement + '}}' + EOL + '\t' + '<' + component_tag + '/>' + EOL;

					} else {

						this.html += iteration ? '{{/if}}' + EOL + EOL : EOL;
						this.html += '<!-- Area: \"' + area + '\" -->' + EOL;
						this.html += '{{#if' + if_statement + '}}' + EOL + '\t' + '<' + component_tag + '/>' + EOL;
					}

					same_area++;
					iteration++;
				}

			}

			this.html += iteration ? '{{/if}}' + EOL : EOL;

			resolve( true );

		} );

	};

	this.get_dependencies = function ( component_name ) {

		const dependencies = {};

		for ( const subcomponent in this.componentsMap[ component_name ] ) {

			dependencies[ subcomponent ] = true;

			if ( this.componentsMap[ subcomponent ] ) {

				const deep_dependencies = this.get_dependencies( subcomponent );

				for ( const deep_subcomponent in deep_dependencies ) {

					dependencies[ deep_subcomponent ] = true;
				}
			}
		}

		return dependencies;
	};

	this.generate_route_functions = function ( ) {

		return new Zousan( ( resolve, reject ) => {

			for ( const route in this.routes ) {

				this.route_functions += 'Altiva.routes[ \'' + route + '\' ] = Altiva.Promise.all( [ ';

				let components_passed = 0;

				// Add a loader function to each component used in the specified route
				for ( const area in this.routes[ route ] ) {

					const area_component = this.routes[ route ][ area ];

					this.route_functions += ( components_passed ? ', ' : '' ) + 'Altiva.load( \'' + area_component + '\' )';

					components_passed++;

					// Also add a loader function to each subcomponent used by the selected components
					const dependencies = this.get_dependencies( area_component );

					for ( const subcomponent in dependencies ) {

						this.route_functions += ( components_passed ? ', ' : '' ) + 'Altiva.load( \'' + subcomponent + '\' )';

						components_passed++;
					}
				}

				this.route_functions += ' ] );' + EOL + EOL;
			}

			resolve( true );

		} );
	};

	this.generate_javascript = function ( ) {

		return new Zousan( ( resolve ) => {

			this.script 	= '<script>'
							+ 	'export default {'

							+ 		'components: {';

			for ( const component in this.firstLevelComponents ) {

				this.script += 			component +': Altiva.component[ \'' + this.firstLevelComponents[ component ] + '\' ],';

			}

			this.script 	+=		'}'

							+	'}'

							+ '</script>';

			resolve( true );

		} );

	};

	this.return_errors = function ( ) {

		let mergedErrors = '';
		let count 		 = 0;

		for ( const key in this.errors ) {

			mergedErrors +=  ( count ? EOL : '' ) + this.errors[ key ];

			count++;
		}

		return mergedErrors;
	};

	this.compile = function ( ) {

		/* Validate the areas  */
		this.validate_areas( this.appStructure.areas );

		/* Validate the paths  */
		for ( const path in this.appStructure.route )
			this.validate_route( path, this.appStructure.route[ path ] );

		/* Check for errors */
		if ( !this.errors.length )
			/* Generate everything */
			return Zousan.all( [ this.generate_html(), this.generate_javascript(), this.generate_route_functions() ] );

		else
			return false;
	};

};

/** Generate the main app, saving the code in the file defined in options.app.filename ('app.js' by default) **/
const appGenerator = function ( mode, options, componentsMap, command ) {

	return new Zousan( ( resolve, reject ) => {

		const sandbox = {
			app: {
				areas: [],
				route: {},
				store: null
			}
		};

		fs.readFile( './src/' + options.app.filename, 'utf8', ( err, user_code ) => {
			
			/* Here we expose a limited sandbox with the "app" var to ensure security with untrusted code */
			try	{
				vm.runInNewContext( user_code, sandbox );
			} catch ( e ) {
				
				let lineNumber = e.stack.split( EOL )[ 0 ].split( ':' )[ 1 ];

				reject( {
					message: e.message + 'in src/' + options.app.filename + ', line: ' + lineNumber
				} );
			}
			

			/* Then, we rigidly validate the data contained in the variable "app" exposed, and ignore everything else */
			const app = new MapToCode( sandbox.app, componentsMap, options.app.filename );

			let compiledApp = app.compile();

			if ( !app.errors.length ) {
				
				compiledApp.then( ( ) => {

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

				} );

			} else {

				reject( {
					message: app.return_errors()
				} );
			}

		} );

	} );

};

export default appGenerator;