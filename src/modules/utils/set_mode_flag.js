export const set_mode_flag = function ( mode ) {
	return function ( state, next ) {
		state.mode = mode;
		next();
	}
}