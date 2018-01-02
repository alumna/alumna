import fs from 'fs-extra';

/** Create a new project using the "base" skeleton **/
const newProject = function ( project_name ) {

	// Copy the "base"
	const copyBase = function ( path ) {

		fs.copy( __dirname + '/base', path, err => {

			if ( !err )
				console.log( 'Done! Now enter your directory with "cd ' + project_name + '" and start developing with "altiva dev" !' );
			else
				console.log( 'Cannot copy the project files (20kB). Not enough space?' );

		} );
	};

	// Check if the name of directory is valid
	if ( /^[a-z0-9_-]+$/gi.test( project_name ) || project_name === '.' ) {

		const path = ( project_name === '.' ? '/' : './' ) + project_name;

		// If directory already exists, check if it's empty ( mandatory )
		fs.exists( path, ( exists ) => {

			if ( exists ) {
				fs.readdir( path, ( err, files ) => {

					// It's empty. Bring the sports cars
					if ( !err && !files.length )
						copyBase( path );
					else
						console.log( 'The directory \'' + project_name + '\' isn\'t empty.' );
				} );

			} else {

				fs.ensureDir( path, err => {

					if ( !err )
						copyBase( path );
					else
						console.log( 'Cannot create the directory. Missing permissions?' );
				} );
			}
		} );

	} else
		console.log( 'You can use just letters, numbers, \'-\' and \'_\' for your project name. Or \'.\' to use the current directory (that must be empty).' );

};

export default newProject;