import fs from 'fs-extra';

/** Check if a file exists **/

const fileExists = function ( path ) {

	return new Promise( resolve => {

		fs.stat( path, ( err, stat ) => {

			err == null ? resolve( true ) : resolve( false );

		});

	});

}

export default fileExists;