import { EOL } 				from 'os';

// Altiva modules - utils
import isObject 			from './../../utils/isObject.js';
import to					from './../../utils/to.js';

// Maincode compiler submodules
import app_structure 		from './maincode/app-structure.js';
import merge_errors 		from './maincode/merge-errors.js';
import get_multiple_routes 	from './maincode/multiple-routes.js';
import repeated_routes 		from './maincode/repeated-routes.js';
import organize_areas 		from './maincode/organize-areas.js';

const MainCode = function ( userCode, componentsMap, appFileName ) {

	this.errors 				= [];
	this.areas 					= [];
	this.routes 				= {};
	this.middlewares 			= {};
	this.used_middlewares 		= {};
	this.html 					= '';
	this.script 				= '';

	this.appFileName			= appFileName;
	this.route_functions 		= '';
	this.componentsMap			= componentsMap;
	this.firstLevelComponents 	= {};

	this.userCode 				= userCode;

	this.appStructure 			= {};

	this.add_error = function ( message, type = 'Error' ) {

		this.errors.push( type + ' in src/' + this.appFileName + ': ' + message );

		return true;

	};

	this.validate_areas = function () {

		const areas_array = this.appStructure.areas;

		if ( !Array.isArray( areas_array ) )
			return !this.add_error( 'You need to define an array to "app.areas" with one or more strings as the areas\' names.' );

		let local_errors = false;

		// Iterate ovre the areas_array, but stop when an area is invalid
		areas_array.every( area => {

			if ( typeof area != 'string' || !area.length ) {
				
				local_errors = this.add_error( 'The area ' + area + ' is not a string, and only strings can be used as names of areas.' );
				
				return false;
			}

			return true;

		});

		if ( !local_errors )
			this.areas = areas_array;

	};

	this.validate_groups_and_routes = function () {

		// Check if there are route groups
		if ( isObject( this.appStructure.group, true ) ) {

			// Validate each group separately
			let validations = [];

			for ( const group in this.appStructure.group ) validations.push( this.validate_group( group, this.appStructure.group[ group ] ) );

			// If everything is fine, validate the remaining routes
			// that were not declated in groups
			if ( validations.every( passed => passed ) ) this.validate_routes();

		} else this.validate_routes();

	};

	this.validate_group = function ( group, content ) {

		// Validate the group name or string
		if ( typeof group != 'string' || !group.length ) return !this.add_error( 'Route groups must be defined with a base path or with names like "group:name".' );

		let base = '', error = false;

		// Base path or name?
		if ( group == 'group:' ) return !this.add_error( 'Incomplete group name "group:"' );


		if ( !group.startsWith( 'group:' ) ) base = group.endsWith( '/' ) ? group.slice( 0, -1 ) : group

		// Validade each path in group
		for ( const original_path in content ) {
			
			if ( !isObject( content[ original_path ], true ) ) error = this.add_error( 'The route group "' + group + '" isn\'t in a valid format.' );

			else {

				let path = original_path;

				// Check for multiple paths in a single string
				if ( path.includes( ',' ) ) {

					const multiple_routes = get_multiple_routes( path );

					if ( multiple_routes.length == 0 ) error = this.add_error( 'Invalid route path "' + path + '" from group "' + group + '"' );

					// The group's paths receive the base even when
					// there are multiple paths on the same string
					else  path = multiple_routes.map( local_path => base + ( local_path.startsWith( '/' ) ? '' : '/' ) + local_path ).join( ', ' );

				} else {
					
					if ( path.length == 0 ) error = this.add_error( 'Path with empty string inside group "' + group + '"' );

					// Receive the base
					else path = base + ( path.startsWith( '/' ) ? '' : '/' ) + path;

				}

				if ( !error ) {

					// Check if the final path already exists
					if ( this.appStructure.route[ path ] ) error = this.add_error( 'The path "' + path + '" from group "' + group + '" is defined multiple times' );

					// Add the path separately with its base
					else this.appStructure.route[ path ] = content[ original_path ];

				}

			}

			if ( error ) return false;

		}

		return true;

	};

	this.validate_routes = function () {

		// Check if there are areas
		if ( !this.areas.length  )
			return this.errors.length ? false : !this.add_error( 'Before defining routes you need to define areas in app.areas variable.', 'Warning' );

		// Check if there are routes
		if ( !isObject( this.appStructure.route, true ) )
			return !this.add_error( 'You need at least one route defined in your app. Check documentation for more details.' );

		// Check if there are repeated routes
		let repeated = repeated_routes( this.appStructure.route );

		if ( repeated.length )
			return !this.add_error( 'The following routes are defined multiple times: ' + repeated.map( a => '"' + a + '"' ).join( ', ' ).replace( /,(?!.*,)/gmi, ' and' ) );

		// Validate each route separately
		for ( const path in this.appStructure.route )
			this.validate_route( path, this.appStructure.route[ path ] );

	};

	this.validate_route = function ( path, route_data ) {

		// Check if the toute's path is a non-empty string
		if ( typeof path !== 'string' || !path.length  ) this.add_error( 'Route paths must be non-empty strings.' );

		else {

			let multiple_routes = [];

			// Check if it has multiple paths in a single route
			if ( path.includes( ',' ) ) {

				multiple_routes = get_multiple_routes( path );

				if ( multiple_routes.length == 0 ) this.add_error( 'Invalid route path: "' + path + '"' );
			}

			// Separate the area map from the array of filters, if it is the case
			let [ area_map, middlewares ] = this.separate_middlewares( route_data );

			if ( Object.keys( area_map ).length === 0 ) this.add_error( 'In the route \'' + path + '\' you need to define at least one area to use.' );

			else {

				for ( const area in area_map ) {
					
					if ( !this.areas.includes( area ) )
						this.add_error( 'In the route \'' + path + '\' you are refering to the area \'' + area + '\' that was not defined in app.areas array.' );
				}

				if ( !this.errors.length ) {

					// For each validated route, validate its middlewares as well

					if ( multiple_routes.length ) {

						multiple_routes.forEach( function ( individual_path ) {

							if ( !this.errors.length ) {

								this.routes[ individual_path ] = area_map;

								this.validate_middlewares( individual_path, middlewares );

							}

						}.bind( this ));
					}

					else {
						
						this.routes[ path ] = area_map;

						this.validate_middlewares( path, middlewares );
					}

				}

			}

		}

	};

	this.separate_middlewares = function ( route_data ) {

		// Check if the passed route is in array format, where middlewares can be informed
		// At this point we do not validate the route, since this was previously done
		if ( Array.isArray( route_data ) ) {

			let area_map = route_data.shift();

			return [ area_map, route_data ];

		}

		return [ route_data, null ];

	};

	this.validate_middlewares = function ( route, middlewares ) {

		// The usage of Array.prototype.every here is to avoid unnecessary validations
		// after a middleware is considerated invalid
		if ( Array.isArray( middlewares ) && middlewares.length )
			return middlewares.every( middleware => { return this.validate_middleware( route, middleware ) } );

		return false;

	};

	this.validate_middleware = function ( route, middleware ) {

		if ( typeof middleware == 'string' && middleware.length ) {

			// Prepare the middlewares array for this route
			if ( !this.middlewares[ route ] ) this.middlewares[ route ] = [];

			// Register the middleware to this route
			this.middlewares[ route ].push( middleware );

			// Register the middleware to the list of unique middlewares used
			this.used_middlewares[ middleware ] = true;

			return true;

		} else {

			this.add_error( 'Invalid middlewares defined on route \'' + route + '\'.' );

			return false;

		}

	};

	this.generate_html = async function ( ) {

		/*
		 * Here we have the information well organized that
		 * allows us to create the conditionals based on areas.
		 */

		let organizer = organize_areas( this.routes ), iteration = 0;

		/* 
		 * Then, we will follow the sequence of areas defined
		 * by the user in "this.areas"
		 */

		// For each area defined in this.areas
		for ( const area_key in this.areas ) {

		 	let area = this.areas[ area_key ], same_area = 0;

		 	// Get each component that may be used in this area
		 	// according to the "organizer"
		 	for ( const component in organizer[ area ] ) {

		 		// If the component resides inside a directory, convert its name,
		 		// for example, from "Login/Modal" to "Login_Modal"
		 		let component_tag = component.replace( /\//g, '_' ), if_statement = '', additional_paths = 0

		 		// And register this component on the first level components
		 		// (the ones used by the main app, generated automatically by Altiva)
		 		this.firstLevelComponents[ component_tag ] = component;

		 		// Finally, get the paths that each component may apper when navigated
		 		// and created the "if statement" to the template of the main app
		 		for ( const path_key in organizer[ area ][ component ] ) {

		 			const path = organizer[ area ][ component ][ path_key ];

		 			if_statement += ( additional_paths ? '|| ' : ' ' ) + '_route == \'' + path + '\' ';

		 			additional_paths++;
		 		}

		 		// In the cases where the same area is used on different route paths
		 		// for every subsequent route path, define an "elseif", instead of an "if"
		 		if ( same_area ) this.html += '{:elseif' + if_statement + '}' + EOL + '\t' + '<' + component_tag + '/>' + EOL;

		 		// Here we are defining the first "if" clause for this area
		 		else {

		 			// This "interaction" part is used to close previous opened "if's" and their optional "elseif's"
		 			// when we are switching to create the code of a new area
		 			this.html += iteration ? '{/if}' + EOL + EOL : EOL;

		 			// As stated before, here we are defining the first "if" clause for this area
		 			this.html += '<!-- Area: \"' + area + '\" -->' + EOL;
		 			this.html += '{#if' + if_statement + '}' + EOL + '\t' + '<' + component_tag + '/>' + EOL;
		 		}

		 		same_area++;
		 		iteration++;
		 	}

		}

		// this.html += iteration ? '{/if}' + EOL : EOL;
		this.html += '{/if}' + EOL;

		return true;

	};

	this.get_dependencies = function ( component_name ) {

		const dependencies = {};

		for ( const subcomponent in this.componentsMap[ component_name ] ) {

			dependencies[ subcomponent ] = true;

			if ( this.componentsMap[ subcomponent ] ) {

				const deep_dependencies = this.get_dependencies( subcomponent );

				for ( const deep_subcomponent in deep_dependencies ) dependencies[ deep_subcomponent ] = true;
			}
		}

		return dependencies;
	};

	this.generate_route_functions = async function ( ) {

		// An iverted map with the lines that load the components
		// and their correpondent routes
		let map = {}

		for ( const route in this.routes ) {

			let load_functions = '', components_passed = 0;

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

		return true;
	};

	this.generate_javascript = async function ( ) {

		this.script = ''

		+ '<script>'

		+ 	'export default {'
		+ 		'components: {';

		for ( const component in this.firstLevelComponents ) {

			this.script += 		component +': Altiva.component[ \'' + this.firstLevelComponents[ component ] + '\' ],';

		}

		this.script += ''
		+		'},'

		+ 		'methods: {'
		+ 			'route: Altiva.route,'
		+ 			'redirect: Altiva.redirect'
		+		'}'

		+	'}'

		+ '</script>';

		return true;

	};

	this.compile = async function ( ) {

		let error;

		/* Get app structure securely */
		[ error, this.appStructure ] = await to( app_structure( this.userCode, this.appFileName ) );

		/* Stop if there are errors */
		if ( error ) return Promise.reject( error );

		/* Validate areas  */
		this.validate_areas();

		/* Validate groups  */
		this.validate_groups_and_routes();

		/* Check for errors again */
		if ( !this.errors.length ) {

			/* Generate everything */
			await Promise.all( [ this.generate_html(), this.generate_javascript(), this.generate_route_functions() ] );

			return true;

		}

		else return Promise.reject( { message: merge_errors( this.errors ) } );
		
	};

};

export default MainCode;