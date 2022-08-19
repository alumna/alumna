export const cache = async function ( state, next, end ) {

	const component = state.component
	state.global.server.memory( '/components/' + component + '.html', state.global.components[ component ].source )

	next();

}