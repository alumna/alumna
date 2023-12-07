export const dynamic_routing = async function ( state, next, end ) {

	const components_per_route = {}

	for ( let route in state.app.route )
		components_per_route[route] = Object.keys(state.components_per_route[route])

	state.app.routing = `
Al.deps = ${JSON.stringify(components_per_route)}

Al.routes = ${JSON.stringify(state.app.route)}
`

	next();

};