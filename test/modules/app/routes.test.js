import { routes } from './../../../src/modules/app/routes.js';

// Replace windows CRLF ( \r\n ) to LF ( \n )
const normalize = str => str.replaceAll( '\r\n', '\n' )

/*

Contract of routes.js:
It expects that state.app and state.app.code exist
Also, state.app.code must have the 'app.js' code

*/

describe( 'Reading routes from a fictitious app.js file', () => {

	test('1. Good code / no erros', async () => {

		/* Preparing the contract to properly test the function */

		const state = { app: {}, errors: {} },
			  next  = () => {},
			  end   = () => {};
		
		state.app.code = `

			app.areas = [ 'header', 'content', 'footer' ]

			app.route['/'] = {
				'content': 'HelloAlumna'
			}

		`
		
		await routes( state, next, end )

		expect( state.app ).toEqual({
			
			areas: [ 'header', 'content', 'footer' ],
			group: {},
			route: {
				'/': { 'content': 'HelloAlumna' }
			}
		});

	});

	test('2. Bad code / erros', async () => {

		/* Preparing the contract to properly test the function */

		const state = { app: {}, errors: {} },
			  next  = () => {},
			  end   = () => {};
		
		state.app.code = `

			app.areas = [ 'header', 'content', 'footer' ]

			// Note the error here, using 'app.routes' instead of the correct 'app.route'
			app.routes['/'] = {
				'content': 'HelloAlumna'
			}

		`
		
		await routes( state, next, end )

		let expected = "Cannot set properties of undefined (setting '/') in src/app.js, line: 6"

		if ( process.platform === "win32" )
			expected = "Cannot set properties of undefined (setting '/') in src/app.js, line: 6\r\n\t\t\tapp.routes['/'] = {\r\n\t\t\t                ^\nTypeError"

		if ( process.versions.bun )
			expected = "undefined is not an object (evaluating 'app.routes['/'] = {\n\t\t\t\t'content': 'HelloAlumna'\n\t\t\t}') in src/app.js, line:  undefined is not an object (evaluating 'app.routes['/'] = {"

		expect( normalize( state.errors[ 'app.js' ] ) ).toEqual( normalize( expected ) );

	});

});