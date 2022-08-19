/*

# Module specification:

It expects that:
 - state.app.route exists and be a populated object
 - each property must be a pre-validated and existent area
 - each property content must be the relative path to a
   component (without the .html extension) and the path
   must exists and be a valid Svelte component

Components may have subcomponents and, in such cases, all
subcomponents (and their subcomponents) will be read
recursively.

Each sub component will be listed on the state.components,
as well on the state.components[parent_component].subcomponents
object, with each property being the path to it, without the
.html extension

*/

import { compile_flow } 	from './compile_flow'

export const compile_all = async function ( state, next, end ) {
	
	// Components map
	state.components = {}
	
	// All components (and subcomponents) on each route
	state.components_per_route = {}

	const all_flows = []

	for ( const route in state.app.route ) {

		state.components_per_route[ route ] = {}

		const areas = state.app.route[ route ]

		for ( const area in areas ) {

			const component = areas[ area ];

			/*

			Reading and compiling are separated on a new flow, to provide the following positive efects:
			
			1. Read and compilation logic can be coded on isolated funcions
			2. Each read execution can recursively starts another read&compile *flow* on subcomponents, when it's the case
			3. At the end of the recursive processing, the global Alumna state will be valid and complete,
			   without extra effort

			Below, each promise is added to the "all_flows" array, allowing parallel and assynchronous execution

			*/
			all_flows.push( compile_flow( component, route, state, end ) )

		}

	}

	await Promise.all( all_flows )

	next();
	
}