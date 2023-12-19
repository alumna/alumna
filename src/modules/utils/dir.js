import { existsSync, mkdirSync, accessSync, constants, readdirSync } from 'fs';

const ensure_dir = function ( dir ) {
	// If directory doesn't exist, create it
	if ( !existsSync( dir ) ) mkdirSync( dir, { mode:0o755 } );

	// It it exists, check its permissions
	try { accessSync( dir, constants.R_OK | constants.W_OK ) } catch ( err ) { return false };

	// Directory ensured
	return true;
}

const empty_dir = function ( dir ) {
	try {
		const files = readdirSync( dir )
		return !files.length
	}
	catch ( err ) { return false };
}

export { ensure_dir, empty_dir }