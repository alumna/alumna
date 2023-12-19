import { process_errors } 	from '../errors/process_errors';
import { compile_flow } 	from '../components/compile_flow'
import { same_keys } 		from '../utils/same_keys'

import { resolve }			from 'path';

export const on_event = async function ( state, next, end ) {

	// Function to be called on each "file change" event, before the refresh signal
	// The function must return "true" to allow the refresh, of "false" to don't allow

	// Create a reference to be later used on events
	const library = this

	// signal == { path, isDir, isFile, isNew, add_or_update }
	state.on_event = async function ( { path, isDir, isFile, isNew, add_or_update } ) {

		// Do not refresh when creating a directory, but do it when deleting one
		if (isDir) return !add_or_update;

		// Recompile the app code and "first-time" components
		if (path == 'app.js') {
			await library.run( 'refresh_app' )
			return true;
		}

		// Generated js files must not cause a refresh
		if ( ( path.startsWith( 'components/' ) && path.endsWith( '.js' ) ) || path == 'dev.js' )
			return false;

		// If the change occurred outside the components directory, just refresh the page
		// Also, if the informed file inside "components" dir isn't a HTML file, just refresh
		if (!path.startsWith( 'components/' ) || !path.endsWith( '.html' ))
			return true;

		// Here, by elimination, we know that the file is a component
		const component = path.slice( 11, -5 )

		// If the component isn't used in the project at this moment, just skip this event (do not refresh)
		if ( state.components[ component ] == undefined )
			return false;

		// From this line onwards, we know that it is a component used in the project

		// When deleting, inform that this component beign is used
		if ( !add_or_update ) {
			process_errors({ errors: { 'Error:': 'Deleted component ' + component + ' is being use by the app' } })
			return false;
		}

		// When updating an existing component:
		// 1. save its list of current subcomponents
		// 2. recompile it (by setting it as undefined first)
		// 3. check if the subcomponents list changed and, if it didn't, just refresh
		// 4. if it did, recalculate the state.components_per_route and recreate the dynamic routing code,
		//    by calling the 'refresh_routing' flow

		// 1
		const subcomponents = Object.assign({}, state.components[ component ].subcomponents)

		// 2
		state.components[ component ] = undefined
		await compile_flow( component, undefined, state, end )

		// 3
		if (same_keys( subcomponents, state.components[ component ].subcomponents ))
			return true;

		// 4
		await library.run( 'refresh_routing' )
		return true;
	}

	next();

}