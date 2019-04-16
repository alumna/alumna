import showError from './../../src/utils/showError';

test('showError - basic error', () => {

	// mock console.log
	console.log = jest.fn();

	const error = {
		name: 'Test Error',
		message: 'Message from error'
	}

	showError( error, '/path/component.html' )

	expect( console.log.mock.calls[ 0 ][ 0 ] ).toBe( 'Test Error in /path/component.html: Message from error' );
});

test('showError - error without name', () => {

	// mock console.log
	console.log = jest.fn();

	const error = {
		message: 'Message from error'
	}

	showError( error, '/path/component.html' )

	expect( console.log.mock.calls[ 0 ][ 0 ] ).toBe( 'Error in /path/component.html: Message from error' );
});

/*
 *	Error with line
 */

test('showError - error with line', () => {

	// mock console.log
	console.log = jest.fn();

	const error = {
		name: 'Test Error',
		message: 'Message from error',
		start: {
			line: '10'
		}
	}

	showError( error, '/path/component.html' )

	expect( console.log.mock.calls[ 0 ][ 0 ] ).toBe( 'Test Error in /path/component.html, line 10: Message from error' );
});

/*
 *	Error with line and column
 */

test('showError - error with line and column', () => {

	// mock console.log
	console.log = jest.fn();

	const error = {
		name: 'Test Error',
		message: 'Message from error',
		start: {
			line: '10',
			column: '20'
		}
	}

	showError( error, '/path/component.html' )

	expect( console.log.mock.calls[ 0 ][ 0 ] ).toBe( 'Test Error in /path/component.html, line 10, column 20: Message from error' );
});

/*
 *	Error with line empty line
 */

test('showError - error with line and column', () => {

	// mock console.log
	console.log = jest.fn();

	const error = {
		name: 'Test Error',
		message: 'Message from error',
		start: {
			column: '20'
		}
	}

	showError( error, '/path/component.html' )

	expect( console.log.mock.calls[ 0 ][ 0 ] ).toBe( 'Test Error in /path/component.html, column 20: Message from error' );
});

test('showError - error on Alumna main app compilation', () => {

	// mock console.log
	console.log = jest.fn();

	const error = {
		name: 'Test Error',
		message: 'Message from error'
	}

	showError( error, '/path/component.html', true )

	expect( console.log.mock.calls[ 0 ][ 0 ] ).toBe( '[Alumna generated code error] Test Error in /path/component.html: Message from error' );
});