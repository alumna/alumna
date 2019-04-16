import { EOL } 		from 'os';
import subcomponents 	from './../../src/generators/all/subcomponents';

const code 	= 'var Test = Alumna.component[ \'Test\' ];' + EOL
			+ 'var test = new Test({ root: component.root });'

const code2 = 'var Test = SomethingElse;' + EOL
			+ 'var test = new Test({ root: component.root });'

test('Correctly translate subcomponent instantiation', () => {

	expect.assertions(1);

	return subcomponents( code ).then( ( { code, subcomponentsList } ) => {

		expect( code ).toEqual( 'var test = new Alumna.component[ \'Test\' ]({ root: component.root });' );

	});
});

test('Correctly return subcomponents list', () => {

	expect.assertions(1);

	return subcomponents( code ).then( ( { code, subcomponentsList } ) => {

		expect( subcomponentsList ).toEqual( { "Test": true } );

	});
});

test('Doesn\'t translate non-alumna components ', () => {

	expect.assertions(1);

	return subcomponents( code2 ).then( ( { code, subcomponentsList } ) => {

		expect( code ).toEqual( code2 );

	});
});

test('Void subcomponents list for non-alumna components', () => {

	expect.assertions(1);

	return subcomponents( code2 ).then( ( { code, subcomponentsList } ) => {

		expect( subcomponentsList ).toEqual( false );

	});
});