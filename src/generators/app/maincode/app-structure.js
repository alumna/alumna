import { EOL } 	from 'os';
import vm 		from 'vm';

const app_structure = function ( userCode, appFileName ) {

	return new Promise( ( resolve, reject ) => {

		const sandbox = {
			app: {
				areas: [],
				route: {},
				group: {},
				store: null
			}
		};

		/* Here we expose a limited sandbox with the "app" var to ensure security with untrusted code */
		try	{
			
			vm.runInNewContext( userCode, sandbox );
			
		} catch ( e ) {
			
			const lineNumber = e.stack.split( EOL )[ 0 ].split( ':' )[ 1 ];

			reject( {
				message: e.message + ' in src/' + appFileName + ', line: ' + lineNumber
			} );
		}

		
		resolve( sandbox.app );
	} );

};

export default app_structure;