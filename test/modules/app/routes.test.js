import { routes } from './../../../src/modules/app/routes.js';

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

		expect( state.errors ).toEqual({
			
			'app.js': "Cannot set properties of undefined (setting '/') in src/app.js, line: 6"
		});

	});

});