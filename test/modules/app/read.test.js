import { read } from './../../../src/modules/app/read.js';
import { resolve } from 'path';

/*

Contract of read.js:
It expects that state.config.dir exists and is a
valid directory. Default in its contract is '.'

Also, it validates if 'app.js' exists inside
If not, returns an error and doesn't continue,
ending the execution flow.

Thus, it expects state.erros also exists, in
order to register the error when app.js is missing

Lastly, it expects state.app exists in order to
save the app.js code in it

*/

describe( 'Reading app.js code', () => {

	test('1. Normal app.js reading', async () => {

		/* Preparing the contract to properly test the function */

		const state = { config: { dir: './test/modules/app/read/example1' }, app: {}, errors: {} },
			  next  = () => {},
			  end   = () => {};
		
		await read( state, next, end )

		expect( state ).toEqual({
			config: { dir: './test/modules/app/read/example1' },
			app: 	{ code: 'app.js code' },
			errors: {}
		});

	});

	test('2. Missing app.js file on project', async () => {

		/* Preparing the contract to properly test the function */

		const state = { config: { dir: './test/modules/app/read/example2' }, app: {}, errors: {} },
			  next  = () => {},
			  end   = () => {};
		
		await read( state, next, end )

		expect( state ).toEqual({
			config: { dir: './test/modules/app/read/example2' },
			app: 	{},
			errors: { 'app.js': 'Missing "app.js" file' }
		});

	});

});