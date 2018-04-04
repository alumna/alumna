import equalComponentList from './../../src/utils/equalComponentList';

/* Original list */
const list1 = { a: true, b: true }

/* Equal lists */
const list2 = { a: true, b: true }

/* Partially different lists */
const list3 = { a: true, c: true }
const list4 = { a: true, b: true, c: true }

/* Completely different lists */
const list5 = { c: true, d: true }

/* Equal lists must return true */
test('equalComponentList must return true for equal component object\'s lists', () => {
	expect( equalComponentList( list1, list2 ) ).toBe( true );
});

/* Partially different lists must return false */
test('equalComponentList must return false for partially different component object\'s lists', () => {
	expect( equalComponentList( list1, list3 ) ).toBe( false );
});

test('equalComponentList must return false for partially different component object\'s lists - take 2', () => {
	expect( equalComponentList( list1, list4 ) ).toBe( false );
});

/* Completely different lists must return false */
test('equalComponentList must return false for completely different component object\'s lists', () => {
	expect( equalComponentList( list1, list5 ) ).toBe( false );
});