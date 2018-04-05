import browserSyncClass 				from 'browser-sync';
import chokidar 						from 'chokidar';
import fs 								from 'fs-extra';
import historyApiFallback 				from 'connect-history-api-fallback';
import rsync 							from 'rsyncwrapper';
import Zousan 							from "zousan";

// Altiva modules - utils
import rsyncAssets						from './../utils/rsyncAssets.js';
import equalComponentList				from './../utils/equalComponentList.js';

// Altiva modules - generators
import { compile, compileAll, getMap }	from './../generators/components.js';
import appGenerator						from './../generators/app.js';



/* reserved for an instance */
let browserSync;

/** Watch src files **/
const watchSrc = function ( options ) {

	/* Update or rsync */

	const update_or_rsync = function ( path ) {

		const componentsMap = getMap();

		if ( path.startsWith( 'src/components/' ) && path.endsWith( '.html' ) ) {

			/*
			 * If the component changed his subcomponents,
			 * regenerate the app file, otherwise just reload
			 * browserSync after recompiling
			 */

			const component = path.replace( 'src/components/', '' ).replace( '.html', '' );
			const current 	= Object.assign( {}, componentsMap[ component ] );

			compile( 'dev', path, options ).then( componentsMap => {

				if ( equalComponentList( current, componentsMap[ component ] ) )
					
					browserSync.reload()

				else {

					appGenerator( 'dev', options, componentsMap ).catch( error => {

						console.log( error.message );

					});
				} 
			} );

		} else {

			if ( !path.startsWith( 'src/components/' ) ) {

				const devPath = path.replace( 'src', 'dev' );

				if ( path == 'src/' + options.app.filename ) {

					appGenerator( 'dev', options, componentsMap ).catch( error => {

						console.log( error.message );

					});	

				} else {

					rsync( {
						src: path,
						dest: devPath
					},
					() => browserSync.reload() );
				}
			}
		}
	};


	/* Source files and components watching rules */

	const sourceWatcher = chokidar.watch( 'src/**', {
		
		ignored: 		/(^|[\/\\])\../,
		persistent: 	true,
		ignoreInitial: 	true,

		awaitWriteFinish: {
			stabilityThreshold: 700
		}
		
	} );

	sourceWatcher.on( 'all', ( event, path ) => {

		// For new or changed components
		if ( event == 'add' || event == 'change' ) return update_or_rsync( path );

		// For the other cases, replace the initial folder
		let devPath = path.replace( 'src', 'dev' );

		// For removed folders and files
		if ( event == 'unlink' || event == 'unlinkDir' ) {
			
			if ( event == 'unlink' )
				devPath = devPath.replace( '.html', '.js' );

			return fs.remove( devPath, err => { if ( !err ) browserSync.reload(); } );
		}

		// For added folders
		if ( event == 'addDir' ) return fs.ensureDir( devPath );

	} );

};

/** Watch dev files **/
const watchDev = function ( options ) {

	browserSync = browserSyncClass.create();

	browserSync.init( {
		files: [ 'dev/' + options.app.filename ],
		server: {
			baseDir: "dev/",
			middleware: [ historyApiFallback() ]
		},
		port: 3030,
		ui: false,
		//ui: {
		//	port: 3031
		//},
		ghostMode: false,
		logLevel: "silent",
		logPrefix: "Altiva Dev"
	} );
	
};


/** Development mode **/
const dev = function ( options ) {

	/* 
	 * Asynchronously clean 'dev/components'
	 * directory while rsyncing everything
	 * else from "src" to "dev"
	 */

	Zousan.all( [ fs.remove( 'dev/components' ), rsyncAssets( 'dev', options ) ] ).then( () => {
		
		/*
		 * Asynchronously compile every component,
		 * that returns the map of components and
		 * its subcomponents
		 */
		 
		compileAll( 'dev', options ).then( componentsMap => {

			appGenerator( 'dev', options, componentsMap )
				.then( () => {

					watchDev( options );
					watchSrc( options );
				})
				.catch( error => {

					console.log( error.message );

				});
		} );

	} );

};

export default dev;