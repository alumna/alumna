/*
 * START READING HERE FIRST
 *
 * Alumna uses Unitflow (github.com/alumna/unitflow) to organize its logic.
 * Its README provides everything you need to learn it in 2 minutes.
 * 
 * If you want to understand how the code below works and how it's organized,
 * or if you plan to contribute to Alumna, it's strongly recommended that you
 * read Unitflow's README first.
 */

import { Unitflow } 			from '@alumna/unitflow';

// App units (functions)
import { app_config }			from './modules/app/config';
import { read }					from './modules/app/read';
import { routes }				from './modules/app/routes';
import { validations }			from './modules/app/validations';
import { server }				from './modules/app/server';

// Components units
import { compile_all }			from './modules/components/compile_all';
import { components_per_route }	from './modules/components/components_per_route';

// App code generation
import { code }					from './modules/app/code';
import { app_compile }			from './modules/app/compile';
import { app_translate }		from './modules/app/translate';
import { dynamic_routing }		from './modules/app/dynamic_routing';
import { cache }				from './modules/app/cache';
import { app_imports }			from './modules/app/imports';
import { save }					from './modules/app/save';

// Re-compiling function with rules when components change (notified by on_event signal)
import { on_event }				from './modules/app/on_event';

// Modules when creating a new Alumna project
import { valid_dir }			from './modules/new/valid_dir';
import { prepare_dir }			from './modules/new/prepare_dir';
import { copy_base_dir }		from './modules/new/copy_base_dir';

// Error processing
import { process_errors }		from './modules/errors/process_errors';

// Set mode function (define "mode" as "dev" or "build" on state.config)
import { set_mode_flag }		from './modules/utils/set_mode_flag';

// Utils for building and optimizing the final app
import { prepare_imports }		from './modules/utils/imports';

// The beginning
export class Alumna {

	constructor ( config = {} ) {

		// Install dir
		config.install_dir = import.meta.url.replace( 'file://', '' ).replace( '/src/alumna.js', '/' ).replace( '/cli.js', '/' )

		// Alumna library is organized through Unitflow
		this.library = new Unitflow({ config })

		// # Prepare the initial config
		this.library.unit[ 'app_config' ] 			= app_config

		// # Read and interpret the app.js from the current project
		//   - In it we must find and obtain the areas, *routes* (and/or route groups), the components on each route and, optionally, route middlewares
		this.library.unit[ 'app_read' ] 			= read
		this.library.unit[ 'app_routes' ] 			= routes

		// ### ALPHA NOTE - MANY VALIDATIONS ARE STILL MISSING ###
		// # Validate the app.js and inform the errors, when they occur
		this.library.unit[ 'app_validations' ] 		= validations

		// # Start the local server before reading components, to be able to receve and store the compiled components *in memory* on the server (based on "github.com/alumna/liven")
		this.library.unit[ 'server' ] 				= server

		// # Read all informed components, and search for their subcomponents, creating an indexed map of components
		// # Each Svelte component will be transformed to the Alumna format and will be cached on the web server ("liven") *after* its compilation and transformation
		this.library.unit[ 'components' ]			= compile_all

		// # Compile the main app code
		this.library.unit[ 'app_code' ]				= code
		this.library.unit[ 'app_compile' ]			= app_compile
		this.library.unit[ 'app_translate' ]		= app_translate
		this.library.unit[ 'app_imports' ]			= app_imports
		this.library.unit[ 'dynamic_routing' ]		= dynamic_routing

		// # Recalculate components per route when required, when running in dev mode
		this.library.unit[ 'components_per_route' ]	= components_per_route

		// # Cache the main app code, when running in dev mode
		this.library.unit[ 'cache' ]				= cache

		// # Register the valid on_event function, when running in dev mode
		// # Using Liven, monitor every change and proceed with the according action
		//   - For new, updated or removed components, update the component, its subcomponents, the components map and the specific in-memory cache on Liven (that will automatically trigger a refresh)
		//   - For new, updated or removed project files, Liven will automatically trigger a refresh
		this.library.unit[ 'on_event' ]				= on_event

		// # Save the main app code, when running in build mode
		this.library.unit[ 'save' ]					= save

		// # Prepare the "imports" map, when running in build mode
		this.library.unit[ 'prepare_imports' ]		= prepare_imports

		// # FLOW - Bootstrap config
		this.library.flow[ 'bootstrap' ]			= [ 'app_config' ]

		// # Add "mode" property to config
		this.library.unit[ 'dev_mode_flag' ]		= set_mode_flag( 'dev' )
		this.library.unit[ 'build_mode_flag' ]		= set_mode_flag( 'build' )

		// # Define the flows

		// # FLOW - dev mode sequence logic
		this.library.flow[ 'dev' ] = [
			'dev_mode_flag',
			'app_read',
			'app_routes',
			'app_validations',
			'server',
			'components',
			'app_code',
			'app_compile',
			'app_translate',
			'dynamic_routing',
			'cache',
			'on_event'
		]

		// # FLOW - refresh_app when in dev mode
		this.library.flow[ 'refresh_app' ] = [
			'app_read',
			'app_routes',
			'app_validations',
			'components',
			'app_code',
			'app_compile',
			'app_translate',
			'dynamic_routing',
			'cache'
		]

		// # FLOW - refresh_routing code when in dev mode
		this.library.flow[ 'refresh_routing' ] = [
			'components_per_route',
			'dynamic_routing',
			'cache'
		]

		// # FLOW - build mode sequence logic
		this.library.flow[ 'build' ] = [
			'build_mode_flag',
			'app_read',
			'app_routes',
			'app_validations',
			'prepare_imports',
			'components',
			'app_code',
			'app_compile',
			'app_imports',
			'app_translate',
			'dynamic_routing',
			'save'
		]

		// ### 

	}

	async new () {
		// Prepare units for this flow
		this.library.unit[ 'valid_dir' ]			= valid_dir
		this.library.unit[ 'prepare_dir' ]			= prepare_dir
		this.library.unit[ 'copy_base_dir' ]		= copy_base_dir

		// Define the flow
		this.library.flow[ 'new' ]					= [ 'valid_dir', 'prepare_dir', 'copy_base_dir' ]

		// Run the flow
		await this.library.run( 'new' )
	}

	async dev () {
		// Bootstrap
		await this.library.run( 'bootstrap' )

		// Dev mode flow
		await this.library.run( 'dev' )
	}

	async build () {
		// Bootstrap
		await this.library.run( 'bootstrap' )

		// Dev mode flow
		await this.library.run( 'build' )
	}

}