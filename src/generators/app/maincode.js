import { EOL } 		from 'os';
import vm 			from 'vm';

// Altiva modules - utils
import isObject 	from './../../utils/isObject.js';

const MainCode = function ( userCode, componentsMap, appFileName ) {

	this.errors 	= [];
	this.areas 		= [];
	this.routes 	= {};
	this.html 		= '';
	this.script 	= '';

	this.appFileName			= appFileName;
	this.route_functions 		= '';
	this.componentsMap			= componentsMap;
	this.firstLevelComponents 	= {};

	this.userCode 				= userCode;

	this.appStructure 			= {};

	this.get_structure = function ( ) {

		return new Promise( ( resolve, reject ) => {

			const sandbox = {
				app: {
					areas: [],
					route: {},
					store: null
				}
			};

			/* Here we expose a limited sandbox with the "app" var to ensure security with untrusted code */
			try	{
				
				vm.runInNewContext( this.userCode, sandbox );
				
			} catch ( e ) {
				
				const lineNumber = e.stack.split( EOL )[ 0 ].split( ':' )[ 1 ];

				reject( {
					message: e.message + ' in src/' + this.appFileName + ', line: ' + lineNumber
				} );
			}

			
			this.appStructure = sandbox.app;

			resolve( true );
		} );

	};

	this.validate_areas = function () {

		const areas_array = this.appStructure.areas;

		if ( Array.isArray( areas_array ) ) {

			let local_errors = 0;

			// Iterate ovre the areas_array, but stop when an area is invalid
			areas_array.every( area => {

				if ( typeof area != 'string' || !area.length ) {
					
					this.errors.push( 'Error in src/' + this.appFileName + ': The area ' + area + ' is not a string, and only strings can be used as names of areas.' );
					
					local_errors = 1;
					
					return false;
				}

				return true;

			});

			if ( !local_errors )
				this.areas = areas_array;

		} else {

			this.errors.push( 'Error in src/' + this.appFileName + ': You need to define an array to "app.areas" with one or more strings as the areas\' names.' );
		}

	};

	this.validate_routes = function () {

		// Check if there are areas
		if ( this.areas.length ) {

			// Check if there are routes
			if ( this.appStructure.route && isObject( this.appStructure.route ) && Object.keys( this.appStructure.route ).length ) {

				// Check if there are repeated routes
				if ( !this.repeated_routes() ) {

					// Validate each route separately
					for ( const path in this.appStructure.route )
						this.validate_route( path, this.appStructure.route[ path ] );

				}

			} else
			this.errors.push( 'Error in src/' + this.appFileName + ': You need at least one route defined in your app. Check documentation for more details.' );
			
		} else {

			if ( !this.errors.length )
				this.errors.push( 'Warning in src/' + this.appFileName + ': Before defining routes you need to define areas in app.areas variable.' );
		}

	};

	this.repeated_routes = function () {

		// Count number of occurrences
		const count = names => 
			names.reduce( ( a, b ) => Object.assign( a, { [ b ]: ( a[ b ] || 0 ) + 1 } ), {} )

		// Check if there are duplicates
		const duplicates = dict => 
			Object.keys( dict ).filter( ( a ) => dict[ a ] > 1 )

		let original = Object.keys( this.appStructure.route );
		let routes   = [];

		original.forEach( route => {

			if ( route.includes( ',' ) ) {
				
				const multiple_routes = route.split( ',' ).map( string => string.trim() ).filter( s => s )

				routes = routes.concat( multiple_routes )

			} else 
				routes.push( route )

		});

		let repeated = duplicates( count( routes ) )

		if ( repeated.length ) {
			
			// Separate each repeated element with commas, using "and" on the last element, if it is the case
			let repeated_string = repeated.map( a => '"' + a + '"' ).join( ', ' ).replace( /,(?!.*,)/gmi, ' and' );

			if ( repeated.length > 1 )
				this.errors.push( 'Error in src/' + this.appFileName + ': The routes ' + repeated_string + ' are defined multiple times.' );

			else
				this.errors.push( 'Error in src/' + this.appFileName + ': The route ' + repeated_string + ' is defined multiple times.' );				

			return true;

		}
		else
			return false;

	};

	this.validate_route = function ( path, area_map ) {

		// Check if the toute's path is a non-empty string
		if ( typeof path !== 'string' || !path.length  ) this.errors.push( 'Error in src/' + this.appFileName + ': Route paths must be non-empty strings.' );

		else {

			let multiple_routes = [], local_errors = 0;

			// Check if it has multiple paths in a single route
			if ( path.includes( ',' ) ) {

				multiple_routes = path.split( ',' ).map( string => string.trim() ).filter( s => s );

				if ( multiple_routes.length == 0 ) this.errors.push( 'Error in src/' + this.appFileName + ': Invalid route path: "' + path + '"' );
			}

			if ( Object.keys( area_map ).length === 0 ) this.errors.push( 'Error in src/' + this.appFileName + ': In the route \'' + path + '\' you need to define at least one area to use.' );

			else {

				for ( const area in area_map ) {
					
					if ( !this.areas.includes( area ) ) {

						this.errors.push( 'Error in src/' + this.appFileName + ': In the route \'' + path + '\' you are refering to the area \'' + area + '\' that was not defined in app.areas array.' );

						local_errors = 1;
					}
				}

				if ( !local_errors ) {

					if ( multiple_routes.length ) multiple_routes.forEach( function ( individual_path ) { this.routes[ individual_path ] = area_map; }.bind( this ));

					else this.routes[ path ] = area_map;
				}

			}

		}

	};

	this.generate_html = function ( ) {

		return new Promise( ( resolve ) => {

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

			 			this.html += '{:elseif' + if_statement + '}' + EOL + '\t' + '<' + component_tag + '/>' + EOL;

			 		} else {

			 			this.html += iteration ? '{/if}' + EOL + EOL : EOL;
			 			this.html += '<!-- Area: \"' + area + '\" -->' + EOL;
			 			this.html += '{#if' + if_statement + '}' + EOL + '\t' + '<' + component_tag + '/>' + EOL;
			 		}

			 		same_area++;
			 		iteration++;
			 	}

			 }

			// this.html += iteration ? '{/if}' + EOL : EOL;
			this.html += '{/if}' + EOL;

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

		return new Promise( ( resolve, reject ) => {

			// An iverted map with the lines that load the components
			// and their correpondent routes
			let map = {}

			for ( const route in this.routes ) {

				let load_functions = ''

				let components_passed = 0;

				// Add a loader function to each component used in the specified route
				for ( const area in this.routes[ route ] ) {

					const area_component = this.routes[ route ][ area ];

					load_functions += ( components_passed ? ', ' : '' ) + 'Altiva.load( \'' + area_component + '\' )';

					components_passed++;

					// Also add a loader function to each subcomponent used by the selected components
					const dependencies = this.get_dependencies( area_component );

					for ( const subcomponent in dependencies ) {

						load_functions += ', ' + 'Altiva.load( \'' + subcomponent + '\' )';

						components_passed++;
					}
				}

				// Register the functions that load components in the map,
				// pointing to their original route.
				// This allows routes with identical to use the same load functions
				if ( !map[ load_functions ] ) {

					map[ load_functions ] = route;

					this.route_functions += 'Altiva.routes[ \'' + route + '\' ] = Promise.all( [ ' + load_functions + ' ] );' + EOL + EOL;
				}

				else
					this.route_functions += 'Altiva.routes[ \'' + route + '\' ] = Altiva.routes[ \'' + map[ load_functions ] + '\' ];' + EOL + EOL;

			}

			resolve( true );

		} );
	};

	this.generate_javascript = function ( ) {

		return new Promise( ( resolve ) => {

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

		return new Promise( ( resolve, reject ) => {

			/* Get app structure securely */
			this.get_structure().then( () => {

				/* Validate areas  */
				this.validate_areas();

				/* Validate routes  */
				this.validate_routes();

				/* Check for errors */
				if ( !this.errors.length ) {

					/* Generate everything */
					Promise.all( [ this.generate_html(), this.generate_javascript(), this.generate_route_functions() ] ).then( () => resolve( true ) );

				}
				else 
					reject( { message: this.return_errors() } );

			} ).catch( ( error => reject( error ) ) );

		} );

		
	};

};

export default MainCode;