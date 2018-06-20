const get_multiple_routes = function ( route_string ) {

	return route_string.split( ',' ).map( string => string.trim() ).filter( s => s )

}

export default get_multiple_routes;