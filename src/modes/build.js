import browserSyncClass 	from 'browser-sync';
import fs 					from 'fs-extra';
import historyApiFallback 	from 'connect-history-api-fallback';

// Alumna modules - modes
import rsyncAssets from './all/rsyncAssets.js';

// Alumna modules - generators
import { compileAll } from './../generators/components.js';
import appGenerator from './../generators/app.js';



/* reserved for an instance */
let browserSync;

/* Remove components */
const removeComponents = function ( options ) {
	
	return options.build.deleteComponents ? fs.remove( 'build/components' ) : null;
};

/** Preview build **/
const previewBuild = function ( options ) {

	console.log( 'Starting to preview the build results...' );

	browserSync = browserSyncClass.create();

	browserSync.init( {
		files: [ 'build/' + options.app.filename ],
		server: {
			baseDir: "build/",
			middleware: [ historyApiFallback() ]
		},
		port: 4040,
		ui: false,
		// ui: {
		// 	port: 4041
		// },
		ghostMode: false,
		logLevel: "silent",
		logPrefix: "Alumna Build - Preview"
	} );
	
};

/** Development mode **/
const build = function ( options, command ) {

	/* 
	 * Asynchronously clean 'dev/components'
	 * directory while rsyncing everything
	 * else from "src" to "dev"
	 */

	Promise.all( [ removeComponents( options ), rsyncAssets( 'build', options ) ] ).then( () => {
		
		/*
		 * Asynchronously compile every component,
		 * that returns the map of components and
		 * its subcomponents
		 */
		 
		compileAll( 'build', options, command ).then( componentsMap => {

			appGenerator( 'build', options, componentsMap, command ).then( () => {

				console.log( 'Build completed.' );

				if ( command.preview ) previewBuild( options );
			} );
		} );

	} );

};

export default build;
