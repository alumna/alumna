import liven 	from '@alumna/liven';
import getport 	from 'get-port';



export const server = async function ( state, next, end ) {

	const server_config = {

		dir: state.config.dir,
		spa: true,

		// When this unit is executed, "state.on_event" is still not defined
		// For this reason, we don't set on_event: state.on_event directly,
		// as the latter is still to be defined on the execution sequence

		// Here we are saying to our live reload library (and http server) that, on
		// each event (new file, file changed or deleted), this specific function must
		// be called.

		// With it we can check if the referenced file is a component and if it's used
		// by the application. When true, this funciton calls a flow with units that
		// recompile and update this component in memory, refreshing the app

		// On future versions, we aim to only change the component data, without refreshing
		// the whole app, providing an "HMR - Hot Module Reloading" experience

		// --

		// "event_data" is an object with the following format:
		// { path, isDir, isFile, isNew, add_or_update }
		
		// Specifically, "add_or_update" tells if a file is being created or updated (true)
		// or if its being deleted (false)
		// Thus, if a component is deleted, it is also removed from memory, instead of
		// being recompiled. Even in this case, the app is refreshed accordingly
		
		// More info on each parameter on https://github.com/alumna/liven
		on_event ( event_data ) { return state.on_event( state, event_data ) }

	}

	// When a specific port is provided, Alumna will respect that,
	// not searching for alternative ports in case it's already in use
	if ( state.config.port ) {

		if ( await getport({ port: state.config.port }) != state.config.port ) {
			state.errors[ 'Network error' ] = 'The specified port ' + state.config.port + ' is already in use'
			return end();
		}

		server_config.port = state.config.port
	}

	// Temporary placebo for "on_event" function
	// It returns false to avoid unnecessary refresh signals from Liven
	state.on_event = () => false;
	state.server = await liven( server_config )

	// Save the port now, in case it wasn't previously specified
	state.config.port = state.server.port

	next();

};