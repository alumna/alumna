import { EOL } from 'os';

import modules_and_middlewares from './../../../src/generators/app/modules-and-middlewares';


/* Mocking directories */
modules_and_middlewares.__Rewire__( 'base_dir', __dirname );
modules_and_middlewares.__Rewire__( 'modules_dir', __dirname + '/modules/' );
modules_and_middlewares.__Rewire__( 'middlewares_dir', __dirname + '/middlewares/' );


test('Modules - Case 1 - Missing options.modules', () => {

	expect.assertions( 1 );

	const options = {  };

	return modules_and_middlewares( options, {} ).then( code => {

		expect( code ).toBe( 'The browser code.' );

	});
});


test('Modules - Case 2 - options.modules isn\'t an object', () => {

	expect.assertions( 1 );

	const options = { modules: [ 'one', 'two' ] };

	return modules_and_middlewares( options, {} ).catch( error => {

		expect( error ).toEqual( { message: 'Error in "app.js": The app.modules property is not an object.' } );

	});
});


test('Modules - Case 3 - options.modules is an empty object', () => {

	expect.assertions( 1 );

	const options = { modules: {} };

	return modules_and_middlewares( options, {} ).then( code => {

		expect( code ).toBe( 'The browser code.' );

	});
});

test('Modules - Case 4 - Module not installed', () => {

	expect.assertions( 1 );

	const options = { modules: { test4: 'test/test4' } };

	return modules_and_middlewares( options, {} ).catch( error => {

		expect( error ).toEqual( { message: 'Missing "test4" module. Please install it with: altiva install' } );

	});
});

test('Modules - Case 5 - Missing module.hjson or package.json', () => {

	expect.assertions( 1 );

	const options = { modules: { test5: 'test/test5' } };

	return modules_and_middlewares( options, {} ).catch( error => {

		expect( error ).toEqual( { message: 'Missing module.hjson or package.json in "test5" module\'s directory.' } );

	});
});

test('Modules - Case 6 - Module using module.hjson file', () => {

	expect.assertions( 1 );

	const options = { modules: { test6: 'test/test6' } };

	return modules_and_middlewares( options, {} ).then( code => {

		expect( code ).toBe( 'The browser code.' + EOL + EOL + 'Altiva.modules = {};' + EOL + EOL + 'Altiva.modules[ \'test6\' ] = ' + '{ do: \'this\' }' + EOL + EOL + 'Altiva.module = Altiva.modules;' + EOL + EOL );

	});
});

test('Modules - Case 7 - Module using package.json file', () => {

	expect.assertions( 1 );

	const options = { modules: { test7: 'test/test7' } };

	return modules_and_middlewares( options, {} ).then( code => {

		expect( code ).toBe( 'The browser code.' + EOL + EOL + 'Altiva.modules = {};' + EOL + EOL + 'Altiva.modules[ \'test7\' ] = ' + '{ do: \'that\' }' + EOL + EOL + 'Altiva.module = Altiva.modules;' + EOL + EOL );

	});
});

test('Modules - Cases 8 and 9 - Missing or wrong "main" property in module.hjson', () => {

	expect.assertions( 2 );

	const options1 = { modules: { test8: 'test/test8' } };

	const options2 = { modules: { test9: 'test/test9' } };

	let promise1 = modules_and_middlewares( options1, {} ).catch( error => {

		expect( error ).toEqual( { message: 'Missing or wrong "main" property in "test8/module.hjson" file.' } );

	});

	let promise2 = modules_and_middlewares( options2, {} ).catch( error => {

		expect( error ).toEqual( { message: 'Missing or wrong "main" property in "test9/module.hjson" file.' } );

	});

	return Promise.all( [ promise1, promise2 ] );
});

test('Modules - Cases 10 and 11 - Missing or wrong "main" property in package.json', () => {

	expect.assertions( 2 );

	const options1 = { modules: { test10: 'test/test10' } };

	const options2 = { modules: { test11: 'test/test11' } };

	let promise1 = modules_and_middlewares( options1, {} ).catch( error => {

		expect( error ).toEqual( { message: 'Missing or wrong "main" property in "test10/package.json" file.' } );

	});

	let promise2 = modules_and_middlewares( options2, {} ).catch( error => {

		expect( error ).toEqual( { message: 'Missing or wrong "main" property in "test11/package.json" file.' } );

	});

	return Promise.all( [ promise1, promise2 ] );
});

test('Modules - Case 12 - Main file not found in project\'s directory', () => {

	expect.assertions( 1 );

	const options = { modules: { test12: 'test/test12' } };

	let promise = modules_and_middlewares( options, {} ).catch( error => {

		expect( error ).toEqual( { message: 'The main "index.js" file defined in module "test12" doesn\'t exist.' } );

	});

	return promise;
});