const equalComponentList = function ( a, b ) {

	for ( const key in a ) {

		if ( !b[ key ] ) return false;
	}

	for ( const key in b ) {

		if ( !a[ key ] ) return false;
	}

	return true;
};

export default equalComponentList;