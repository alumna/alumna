const showError = function ( error, path, app = false ) {

	let message = ( app ? '[Altiva generated code error] ' : '' ) +
				( error.name ? error.name : 'Error' ) + ' in ' + path +
				( ( error.start && error.start.line ) ? ', line ' + error.start.line : '' ) +
				( ( error.start && error.start.column ) ? ', column ' + error.start.column : '' ) + ': ' + error.message

	console.log( message );
};

export default showError;