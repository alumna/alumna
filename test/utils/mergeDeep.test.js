import mergeDeep from './../../src/utils/mergeDeep';

test('mergeDeep - two multi-level (partially equal) objects merging test', () => {

	let initial = {
		one: '1',
		two: {
			one: '1',
			two: '2',
			four: '4'
		}
	}

	let final = {
		two: {
			three: '3',
			four: '5'
		},
		three: '3'
	}

	mergeDeep( final, initial );

	expect( final ).toEqual({
		one: '1',
		two: {
			one: '1',
			two: '2',
			three: '3',
			four: '4'
		},
		three: '3'
	});
});

test('mergeDeep - two multi-level (completelly different) objects merging test', () => {

	let initial = {
		one: '1',
		two: {
			one: '1',
			two: '2'
		}
	}

	let final = {}

	mergeDeep( final, initial );

	expect( final ).toEqual({
		one: '1',
		two: {
			one: '1',
			two: '2'
		}
	});
});

test('mergeDeep - one non-object as parameter', () => {

	let initial = {
		one: '1',
		two: {
			one: '1',
			two: '2'
		}
	}

	let final = null

	mergeDeep( final, initial );

	expect( final ).toBe( null );
});