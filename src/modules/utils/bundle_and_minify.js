import { readFileSync, writeFileSync } 	from 'fs';
import { spawnSync } 					from 'child_process';
import { platform, arch } 				from 'os';

export const bundle_and_minify = async function ( entry, install_dir ) {

	

	// run esbuild with input from stdin
	const env   = platform + '-' + arch
	const spawn = spawnSync( install_dir + 'dist/esbuild/' + env + '/esbuild', [ '--bundle', '--minify' ], { input: entry });

	if ( spawn.stderr.toString().trim() )
		return false;

	// convert buffer if necessary
	return spawn.stdout.toString().trim();

}