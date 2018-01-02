import rsync from 'rsyncwrapper';

/** Synchronize "src" to "dev" with rsync **/
const rsyncAssets = function ( mode, options ) {

	return new Zousan( ( resolve, reject ) => {

		// default true for 'dev' mode
		let deleteFiles = true;

		// default false for 'build mode'
		if ( mode == 'build' )
			deleteFiles = options.build.deleteFiles == undefined ? false : options.build.smallComponents;

		rsync( {
			src: "src/",
			
			// 'dev' or 'build'
			dest: mode,
			
			recursive: true,
			
			// Delete in 'dev/' or 'build/' any non-existent files in 'src/'
			// In 'build' mode, the default is false, but can be overrided 
			// in options.build.deleteFiles (from altiva.hjson)
			delete: deleteFiles,
			
			exclude: [ ".*", ".*/", "components", options.app.filename ]
			
		}, ( error ) => {

			error ? reject( error ) : resolve( true );

		} );

	} );

};

export default rsyncAssets;