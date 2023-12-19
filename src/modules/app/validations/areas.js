export const areas = function ( state, next, end ) {
	
	// app.areas must exists
	if ( state.app.areas == undefined ) {

		state.errors[ 'app.js' ] = 'No areas defined in app.areas[]'
		return end();
	}

	// app.areas must be an array
	if ( ! Array.isArray( state.app.areas ) ) {

		state.errors[ 'app.js' ] = "app.areas must be an array"
		return end();
	}

	next();
	
}