import { EOL } from 'os';

const merge_errors = function ( errors ) {

	let mergedErrors = '', count = 0;

	for ( const key in errors ) {

		mergedErrors +=  ( count ? EOL : '' ) + errors[ key ];

		count++;
	}

	return mergedErrors;
};

export default merge_errors;