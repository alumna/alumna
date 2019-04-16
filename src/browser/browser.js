// Routing library (currently page.js, that will be replaced)
import page 				from 'page';

// API library, from github.com/typicode/fetchival
import fetchival			from './fetchival.js'

// Svelte Shared Helpers
import * as svelteShared 	from 'svelte/shared';

// Svelte Store Library
import { Store } 			from 'svelte/store.js';

const Alumna = {

	api: fetchival,

	config: {
		
		// Initial route to be rendered in environments without page.js dispatching like mobile
		initial: '/'
	},

	/*
	 * This function is runned before any component is loaded to ensure
	 * mobile compatibility (since cordova's apps run with file:// protocol)
	 */
	configBaseUrl ( ) {

		// Update components URL's to absolute and protocol agnostic

		if ( Alumna.fileOrMobile() )
			Alumna.config.path = window.location.pathname.replace( '/index.html', '' );
		else
			Alumna.config.path = window.location.origin;

		Alumna.load.baseUrl = Alumna.config.path + Alumna.load.baseUrl;
	},

	configRoute( route ) {

		return function ( page_context ) {

			Alumna.routes_context.next = { _route: route, _path: page_context.pathname, _params: page_context.params };

			// In the first time a route is called, check if it has middlewares
			// and configure them (in the correct sequence).

			// Every subsequent call to the same route is benefited from the previous
			// configuration and runs even faster

			if ( Alumna.routes_configured[ route ] ) return Alumna.routes_configured[ route ][ 0 ]();

			Alumna.routes_configured[ route ] = []

			let render = () => {

				const conclude_rendering = () => {

					Alumna.routes_context.current = JSON.parse( JSON.stringify( Alumna.routes_context.next ) );

					Alumna.root.store.set( Alumna.routes_context.current )

					Alumna.root.set( { _route: route } )					

				}

				// If this route was already rendered on this session,
				// skip all the logic that loads the components again.
				if ( Alumna.routes_rendered[ route ] ) return conclude_rendering();

				Alumna.routes[ route ]().then( () => {
					
					conclude_rendering();
					
					Alumna.routes_rendered[ route ] = true;

				});

			}

			if ( !Alumna.middleware_in_routes || !Alumna.middleware_in_routes[ route ] ) {
				
				Alumna.routes_configured[ route ][ 0 ] = render;

				return Alumna.routes_configured[ route ][ 0 ]();
			}

			let size = Alumna.middleware_in_routes[ route ].length

			for ( let i = size; i >= 0; i-- ) {
				
				Alumna.routes_configured[ route ][ i ] = ( i == size ) ? render : () => {

					let context = JSON.parse( JSON.stringify( Alumna.routes_context ) );

					Alumna.middleware[ Alumna.middleware_in_routes[ route ][ i ] ].call( Alumna.root, context, Alumna.routes_configured[ route ][ i + 1 ] )

				}

			}

			return Alumna.routes_configured[ route ][ 0 ]();

		}

	},

	configPageJs ( ) {

		// Link each route function with a page.js route and
		// configure the route middlewares on first access

		for ( const route in Alumna.routes ) {

			page( route, Alumna.configRoute( route ) );

		}

		// Starting routing system with automatic environment discovery, mobile or desktop
		
		if ( Alumna.fileOrMobile() ) {
			
			page( { dispatch: false } );
			page( Alumna.config.initial );

		} else {
			
			page();
		}
	},

	component: {},

	defaults: {},

	fileOrMobile ( ) {

		return ( window && ( window.cordova || window.location.protocol == 'file:' ) );
	},

	load ( url ) {

		return new Promise( ( resolve, reject ) => {

			if ( !Alumna.component[ url ] ) {

				let loaded;

				const request = new XMLHttpRequest();
				request.open( 'GET', Alumna.load.baseUrl + url + '.js' );

				const onload = function ( ) {

					if ( ( request.readyState !== 4 ) || loaded ) {

						return;
					}

					Alumna.component[ url ] = new Function ( 'return ' + request.responseText )();

					resolve( true );

					loaded = true;
				};

				request.onload = request.onreadystatechange = onload;
				request.onerror = reject;
				request.send();

				if ( request.readyState === 4 ) {

					onload();
				}

			} else {

				resolve( true );
			}

		} );

	},

	redirect ( path ) {
		page.redirect( path )
	},

	route ( route, redirect ) {

		// If redirect is undefined, this will be treated as a page call
		if ( redirect === undefined )
			page( route );
		else
			page( route, redirect );
	},

	routes: {},

	routes_configured: {},

	routes_context: {

		current: null,

		next: null

	},

	routes_rendered: {},

	// Var that will point to the main app variable
	root: null,

	// Shared helpers from Svelte
	shared: svelteShared,

	startInstance ( options ) {

		if ( !options )
			options = { target: document.body };
		else {

			if ( !options.target )
				options.target = document.body;
		}

		if ( this.defaults.useStore ) {

			this.store = new Store();

			options.store = this.store;
		}

		Alumna.root = new App( options );

		window[ this.defaults.globalVar ] = Alumna.root;
	},

	store: null,

	/*
	 * options: the svelte array passed in the instantiation of the app
	 */
	start ( options ) {

		Alumna.startInstance( options );

		Alumna.configPageJs();

	}

};

Alumna.load.baseUrl = '/components/';

export default Alumna;