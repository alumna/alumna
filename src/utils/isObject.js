const isObject = function ( item ) {

	return ( item && typeof item === 'object' && !Array.isArray( item ) );
}

export default isObject;