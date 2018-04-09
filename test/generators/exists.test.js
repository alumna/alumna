import exists from './../../src/generators/all/exists';

/* Mocking "correctPath" internal function */
exists.__Rewire__( 'correctPath', function ( path ) {

	return __dirname + '/exists/components/' + path + '.html';

});

const list1 = { Main: true, "Sub/Sub": true };

const list2 = { Main2: true };

const list3 = { Main2: true, "Sub/Sub2": true };

const list4 = { Main2: true, "Sub/Sub2": true, "Sub/Sub3": true };

test('All components in the lists exist', () => {

	expect.assertions( 1 );

	return exists( 'components/App.html', list1 ).then( result => {

		expect( result ).toBe( true );

	});
});

test('All components in the lists don\'t exist - cases 2, 3 and 4', () => {

	expect.assertions( 1 );

	let promise1 = exists( 'components/App.html', list2 ).catch( error => {

		const message = 'Error in components/App.html: the following components were not created in "components" folder: Main2.'

		expect( error.message ).toBe( message );

	});

	return Promise.all( [ promise1 ] );
});