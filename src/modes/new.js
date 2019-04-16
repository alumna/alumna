import fs from 'fs-extra';

/** Create a new project using the "base" skeleton **/
const newProject = function ( project_name ) {

	// Copy the "base"
	const copyBase = function ( path ) {

		fs.copy( __dirname + '/other/base', path, err => {

			if ( !err ) {
				
				let message = path === '.' ? 'Done! Now start developing with "alumna dev" !' : 'Done! Now enter your directory with "cd ' + project_name + '" and start developing with "alumna dev" !';

				console.log( message );
			}
			else
				console.log( 'Cannot copy the project files (11kB). Not enough space?' );

		} );
	};

	// Check if the name of directory is valid
	if ( /^[a-z0-9_.-]+$/gi.test( project_name ) || project_name === '.' ) {

		// If directory already exists, check if it's empty ( mandatory )
		fs.exists( project_name, ( exists ) => {

			if ( exists ) {
				fs.readdir( project_name, ( err, files ) => {

					// It's empty. Bring the sports cars
					if ( !err && !files.length )
						copyBase( project_name );
					else
						console.log( 'The directory \'' + project_name + '\' isn\'t empty.' );
				} );

			} else {

				fs.ensureDir( project_name, err => {

					if ( !err )
						copyBase( project_name );
					else
						console.log( 'Cannot create the directory. Missing permissions?' );
				} );
			}
		} );

	} else
		console.log( 'You can use just letters, numbers, \'-\', \'_\' and \'.\' for your project name. Or \'.\' to use the current directory (that must be empty).' );

};

export default newProject;