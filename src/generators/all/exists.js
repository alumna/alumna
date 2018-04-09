import fileExists from './../../utils/fileExists'

/** Add the "components" directory prefix **/
/* istanbul ignore next */
const correctPath = function ( path ) {
	/* istanbul ignore next */
	return 'src/components/' + path + '.html';
}

/** Check if each component in the list exists **/
const exists = function ( parent, list ) {

	return new Promise( ( resolve, reject ) => {

		list = Object.keys( list )

		const correctedList = list.map( correctPath );

		Promise.all( correctedList.map( fileExists ) ).then( results => {

			const length  = results.length;

			let non_existent = [];

			for (let i = length - 1; i >= 0; i--) {
				
				if ( !results[ i ] )
					non_existent.push( list[ i ] )
			}

			if ( non_existent.length == 0 )
				resolve( true )
			
			else {

				let message = 'Error in ' + parent + ': the following components were not created in "components" folder: '

				message += non_existent.join( ', ' ).replace(/,(?!.*,)/gmi, ' and') + '.';

				reject({
					message
				})

			}

		});

	})

};

export default exists;