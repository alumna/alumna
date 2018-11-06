const showError = function ( error, path, app = false ) {

	const app_message   = app ? '[Altiva generated code error] ' : ''
	const error_name    = error.name ? error.name : 'Error'
	const error_line    = ( error.start && error.start.line ) ? ', line ' + error.start.line : ''
	const error_column  = ( error.start && error.start.column ) ? ', column ' + error.start.column : ''

	let message = app_message + error_name + ' in ' + path + error_line + error_column + ': ' + error.message

	console.log( message );
};

export default showError;