import { EOL } from 'os';

import modules_and_middlewares from './../../../src/generators/app/modules-and-middlewares';


/* Mocking directories */
modules_and_middlewares.__Rewire__( 'base_dir', __dirname );
modules_and_middlewares.__Rewire__( 'modules_dir', __dirname + '/modules/' );
modules_and_middlewares.__Rewire__( 'middlewares_dir', __dirname + '/middlewares/' );

test('Middleware Test 1 - Just one middleware', () => {

	expect.assertions( 1 );

	const options = {

		middlewares: {
			test1: 'test1/test1.js'
		}

	};

	return modules_and_middlewares( options, { middlewares: { '/': [ 'test1' ] }, used_middlewares: { test1: true } } ).then( code => {

		let expected_code  = 'The browser code.' + EOL + EOL;
			expected_code += 'Alumna.middlewares = {};' + EOL + EOL;
			expected_code += 'Alumna.middleware = Alumna.middlewares;' + EOL + EOL;
			expected_code += 'Alumna.middleware[ \'test1\' ] = \'Code of test1\';' + EOL + EOL;
			expected_code += 'Alumna.middleware_in_routes = {"/":["test1"]};';


		expect( code ).toBe( expected_code );

	});
});

test('Middleware Test 2 - Missing middleware file', () => {

	expect.assertions( 1 );

	const options = {

		middlewares: {
			test2: 'test2/test2.js'
		}

	};

	return modules_and_middlewares( options, { middlewares: { '/': [ 'test2' ] }, used_middlewares: { test2: true } } ).catch( error => {

		expect( error ).toEqual( { message: 'Error in "app.js": The file of middleware "test2" doesn\'t exist.' } );

	});
});

test('Middleware Test 3 - Missing middleware definition on alumna.hjson', () => {

	expect.assertions( 1 );

	const options = {

		middlewares: {
			test2: 'test2/test2.js'
		}

	};

	return modules_and_middlewares( options, { middlewares: { '/': [ 'test3' ] }, used_middlewares: { test3: true } } ).catch( error => {

		expect( error ).toEqual( { message: 'Error in "app.js": The middleware "test3" isn\'t defined in "alumna.hjson".' } );

	});
});

test('Middleware Test 4 - Testing the optional use of "/" on middleware path and supress of ".js" extension', () => {

	expect.assertions( 1 );

	const options = {

		middlewares: {
			test1: '/test1/test1'
		}

	};

	return modules_and_middlewares( options, { middlewares: { '/': [ 'test1' ] }, used_middlewares: { test1: true } } ).then( code => {

		let expected_code  = 'The browser code.' + EOL + EOL;
			expected_code += 'Alumna.middlewares = {};' + EOL + EOL;
			expected_code += 'Alumna.middleware = Alumna.middlewares;' + EOL + EOL;
			expected_code += 'Alumna.middleware[ \'test1\' ] = \'Code of test1\';' + EOL + EOL;
			expected_code += 'Alumna.middleware_in_routes = {"/":["test1"]};';


		expect( code ).toBe( expected_code );

	});
});