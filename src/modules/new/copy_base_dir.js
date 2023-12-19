import reflect 				from '@alumna/reflect';

export const copy_base_dir = async function ( state, next, end ) {

	const dir = state.config.dir
	
	// Copy alumna's base template
	const { res, err } = await reflect({ src: state.config.install_dir + 'other/base', dest: dir })

	// If copy fail, stop
	if ( err ) {
		state.errors['Project directory'] = 'Error while creating new Alumna project directory: ' + dir
		return end()
	}

	next()

}