export const components_per_route = function ( state, next, end ) {

	const add_all_components = ( component, updated_list ) => {

		// Avoid circular references that could generate infinite recursion
		if ( updated_list[ component ] ) return;

		// Save the component to the updated_list object
		updated_list[ component ] = true;

		// When no subcomponents found, just return
		if ( Object.keys[ state.components[ component ].subcomponents ].length == 0 )
			return;

		// Iterate recursively over each subcomponent
		for ( const subcomponent in state.components[ component ].subcomponents )
			add_all_components( subcomponent, updated_list );

		return;
	}

	// Recalculate components_per_route property for all routes
	for ( const route in state.app.route ) {
		
		// Updated object of components per route
		const updated_list = {}

		// Areas used in ech route
		const areas = state.app.route[ route ]
		
		// Each singular area for the same route
		for ( const area in areas ) {

			// Get component name (used in this area)
			const component = areas[ area ];

			// Add the component and its subcomponents, recursively
			// Variable updated_list is passed by reference, since its an object
			add_all_components( component, updated_list )
		}

		// Here, updated_list is complete for this route.
		// Set it as the updated version
		state.components_per_route[ route ] = updated_list
	}

}