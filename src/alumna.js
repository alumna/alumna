import { Unitflow } 	from '@alumna/unitflow';

// App units
import { config }		from './modules/app/config';
import { read }			from './modules/app/read';
import { routes }		from './modules/app/routes';
import { validations }	from './modules/app/validations';
import { server }		from './modules/app/server';

// Components units
import { compile_all }	from './modules/components/compile_all';

// App code
import { code }			from './modules/app/code';

// The beginning
export class Alumna {

	constructor ( config = {} ) {

		this.library = new Unitflow({ config })

		// # Prepare the initial config
		this.library.unit[ 'app_config' ] 			= config

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
		// # Each Svelte component will be transformed to the Alumna format and WILL be cached on the web server ("liven") after its compilation and transformation
		this.library.unit[ 'components' ]			= compile_all

		// # Compile the main app and save it as index.html with the js code inlined
		//this.library.unit[ 'app_code' ]				= code

		// # Serve them using @alumna/liven

		// # Also with Liven, monitor every change and proceed with the according action
		//   - For new, updated or removed components, update the component, its subcomponents, the components map and the specific in-memory cache on Liven (that will automatically trigger a refresh)
		//   - For new, updated or removed project files, Liven will automatically trigger a refresh

		// Dev mode flow
		

	}

	async dev () {



	}

}