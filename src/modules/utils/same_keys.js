export const same_keys = function ( o1, o2 ) {
	return Object.keys( o1 ).sort().toString() == Object.keys( o2 ).sort().toString()
}