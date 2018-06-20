import get_multiple_routes 	from './multiple-routes.js';

const repeated_routes = function ( routes_to_validade ) {

	// Count number of occurrences
	const count = names => names.reduce( ( a, b ) => Object.assign( a, { [ b ]: ( a[ b ] || 0 ) + 1 } ), {} )

	// Check if there are duplicates
	const duplicates = dict => Object.keys( dict ).filter( ( a ) => dict[ a ] > 1 )

	let original = Object.keys( routes_to_validade ), routes = [];

	original.forEach( route => {

		if ( route.includes( ',' ) ) routes = routes.concat( get_multiple_routes( route ) )

		else routes.push( route )

	});

	return duplicates( count( routes ) );

};

export default repeated_routes;