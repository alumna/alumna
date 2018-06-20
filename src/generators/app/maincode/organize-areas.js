const organize_areas = function ( routes ) {

	const organize = function ( organizer, path, routes, area ) {

		const component = routes[ path ][ area ];

		if ( !organizer[ area ] ) organizer[ area ] = {};

		if ( !organizer[ area ][ component ] ) organizer[ area ][ component ] = [];

		organizer[ area ][ component ].push( path );
		
	}

	/*
	 * Organize conditional rules based first on areas.
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

	let organizer = {};

	for ( const path in routes ) {

	 	for ( const area in routes[ path ] ) {

	 		organize( organizer, path, routes, area );
	 	}
	}

	return organizer;

};



 

export default organize_areas;