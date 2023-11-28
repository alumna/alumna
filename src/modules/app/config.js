/*

# Module specification:

It expects state to be an object with, at most,
a 'config' property.

In the app.config property, every possible
configuration can be predefined and will be preserved,
with the exception of the two managed properties:

- state.app
- state.errors

*/

export const config = function ( state, next ) {
	
	state.config = Object.assign({

		dir: '.'

	}, state.config );

	state.app = {}

	state.errors = {}

	next();
}