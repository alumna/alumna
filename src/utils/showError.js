const showError = function ( error, path, app = false ) {

	const app_message   = app ? '[Alumna generated code error] ' : ''
	const error_name    = error.name ? error.name : 'Error'

	let error_line = '', error_column = ''

	if ( error.start ) {

		error_line   = error.start.line   ? ', line '   + error.start.line   : ''
		error_column = error.start.column ? ', column ' + error.start.column : ''
	}

	let message = app_message + error_name + ' in ' + path + error_line + error_column + ': ' + error.message

	console.log( message );
};

export default showError;