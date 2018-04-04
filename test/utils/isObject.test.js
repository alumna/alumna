import isObject from './../../src/utils/isObject';

test('isObject - must return true when passing an object', () => {

	const item = {}

	expect( isObject( item ) ).toBe( true );
});

test('isObject - must return false when passing an array', () => {

	const item = []

	expect( isObject( item ) ).toBe( false );
});