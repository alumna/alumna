export const cache = async function ( state, next, end ) {

	state.global.server.memory( '/components/' + state.component + '.js', state.global.components[ state.component ].compiled.js.code )

	next();

}