export const on_event = async function ( state, next, end ) {

	// Function to be called on each "file change" event, before the refresh signal
	// The function must return "true" to allow the refresh, of "false" to don't allow

	// signal == { path, isDir, isFile, isNew, add_or_update }
	state.on_event = function ( { path, isDir, isFile, isNew, add_or_update } ) {
		console.log({ path, isDir, isFile, isNew, add_or_update })

		// Do not refresh when creating a directory, but do it when deleting one
		if (isDir) {
			console.log('isDir')
			return !add_or_update;
		}

		if (path == 'src/app.js') {
			console.log('src/app.js');
			return true;
		}

		// If the change occurred outside the components directory, just refresh the page
		// If the informed file inside "components" dir isn't a HTML file, just refresh
		if (!path.startsWith( 'src/components/' ) || !path.endsWith( '.html' )) {
			console.log('outside src/components OR not a .html file');
			return true;
		}
	}

	next();

}