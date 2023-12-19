export const process_errors = function ( state, next ) {

	// Found errors
	let found = false

	// Clone and clean errors
	const errors = Object.assign({}, state.errors)
	state.errors = {}

	// Clear console
	// process.stdout.write( "\u001b[3J\u001b[2J\u001b[1J" )
	// console.clear()

	// Print errors
	for ( const error in errors ) {
		found = true
		console.log( error + ': ' + errors[error] )
	}

	if ( next )
		next();
	
	return found;
}