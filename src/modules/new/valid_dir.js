export const valid_dir = async function ( state, next, end ) {

	const dir = state.config.dir

	if ( /^[a-z0-9_.-]+$/gi.test( dir ) || dir === '.' )
		return next();

	state.errors[ 'New app' ] = 'Wrong directory name. You can use just letters, numbers, \'-\', \'_\' and \'.\' for your project name. Or \'.\' to use the current directory (that must be empty).'
	end();
}