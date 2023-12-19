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
import { save }					from './modules/app/save';

// Re-compiling function with rules when components change (notified by on_event signal)
import { on_event }				from './modules/app/on_event';

// Modules when creating a new Alumna project
import { valid_dir }			from './modules/new/valid_dir';
import { prepare_dir }			from './modules/new/prepare_dir';
import { copy_base_dir }		from './modules/new/copy_base_dir';

// Error processing
import { process_errors }		from './modules/errors/process_errors';

// The beginning
export class Alumna {

	constructor ( config = {} ) {

		// Install dir
		config.install_dir = import.meta.url.replace( 'file://', '' ).replace( '/src/alumna.js', '/' ).replace( '/cli.js', '/' )



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

		// # Bootstrap config
		this.library.flow[ 'bootstrap' ]			= [ 'app_config' ]

		// # Define the flows
		this.library.flow[ 'dev' ]					= [ 'app_read', 'app_routes', 'app_validations', 'server', 'components', 'app_code', 'app_compile', 'app_translate', 'dynamic_routing', 'cache', 'on_event' ]
		this.library.flow[ 'refresh_app' ]			= [ 'app_read', 'app_routes', 'app_validations', 'components', 'app_code', 'app_compile', 'app_translate', 'dynamic_routing', 'cache' ]
		this.library.flow[ 'refresh_routing' ]		= [ 'components_per_route', 'dynamic_routing', 'cache' ]

		// ### 

	}

	async dev () {
		// Bootstrap
		await this.library.run( 'bootstrap' )

		// Dev mode flow
		await this.library.run( 'dev' )

		// Check for errors one last time
		if ( process_errors(this.library.state) )
			return process.exit();

		// Dev mode working
		// Print the address
		console.log( 'Listening on http://localhost:' + this.library.state.config.port )
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

		// Process the errors
		process_errors(this.library.state)
	}

}