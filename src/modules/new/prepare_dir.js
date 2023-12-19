import { ensure_dir, empty_dir } 	from '../utils/dir';
import reflect 						from '@alumna/reflect';

export const prepare_dir = async function ( state, next, end ) {

	const dir = state.config.dir

	// When the destination dir doesn't have R/W permission, stop evrything
	if (!ensure_dir( dir )) {
		state.errors['New project'] = 'Cannot create the directory \'' + dir + '\'. Missing permissions?'
		return end()
	}

	// Ensure directory if empty
	if (!empty_dir( dir )) {
		state.errors['New project'] = 'Existing directory \'' + dir + '\' isn\'t empty'
		return end()
	}

	next()

}