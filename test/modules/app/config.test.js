import { app_config } from './../../../src/modules/app/config.js';

/*

Contract of config.js:
It expects that state in an object with, at most,
a 'config' property.

In the app.config property, every possible
configuration can be predefined and will be preserved

*/

describe( 'Applying the initial Alumna configuration', () => {

	test('1. No additional config / Default', async () => {

		/* Preparing the contract to properly test the function */

		const state = {},
			  next  = () => {},
			  end   = () => {};
		
		await app_config( state, next, end )

		expect( state ).toEqual({
			config: { dir: '.' },
			app: 	{},
			errors: {}
		});

	});

	test('2. With additional config', async () => {

		/* Preparing the contract to properly test the function */

		const state = { config: { dir: '/home/user/project/dir', test: 'property' } },
			  next  = () => {},
			  end   = () => {};
		
		await app_config( state, next, end )

		expect( state ).toEqual({
			config: { dir: '/home/user/project/dir', test: 'property' },
			app: 	{},
			errors: {}
		});

	});

});