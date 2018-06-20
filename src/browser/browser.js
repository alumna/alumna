// Routing library (currently page.js, that will be replaced)
import page 				from 'page';

// API library, from github.com/typicode/fetchival
import fetchival			from './fetchival.js'

// Svelte Shared Helpers
import * as svelteShared 	from 'svelte/shared';

// Svelte Store Library
import { Store } 			from 'svelte/store.js';

const Altiva = {

	api: fetchival,

	config: {
		
		// Initial route to be rendered in environments without page.js dispatching like mobile
		initial: '/'
	},

	configBaseUrl ( ) {

		// Update components URL's to absolute and protocol agnostic

		if ( window.location.protocol !== 'file:' )
			Altiva.config.path = window.location.origin;
		else
			Altiva.config.path = window.location.pathname.replace( '/index.html', '' );

		Altiva.load.baseUrl = Altiva.config.path + Altiva.load.baseUrl;
	},

	configPageJs ( ) {

		// Link each route function with a page.js route and
		// configure the route middlewares on first access

		for ( const route in Altiva.routes ) {

			page( route, ( page_context ) => {

				Altiva.routes_context.next = { _route: route, _path: page_context.pathname, _params: page_context.params };

				// In the first time a route is called, check if it has middlewares
				// and configure them (in the correct sequence).

				// Every subsequent call to the same route is benefited from the previous
				// configuration and runs even faster

				if ( !Altiva.routes_configured[ route ] ) {

					Altiva.routes_configured[ route ] = []

					let render = () => {

						Altiva.routes[ route ].then( () => {

							Altiva.routes_context.current = JSON.parse( JSON.stringify( Altiva.routes_context.next ) );

							Altiva.root.store.set( Altiva.routes_context.current )

							Altiva.root.set( { _route: route } )

						});

					}

					if ( Altiva.middleware_in_routes && Altiva.middleware_in_routes[ route ] ) {

						let size = Altiva.middleware_in_routes[ route ].length

						for ( let i = size; i >= 0; i-- ) {
							
							// Set the last function "render", after all middlewares
							if ( i == size )
								Altiva.routes_configured[ route ][ i ] = render

							else
								Altiva.routes_configured[ route ][ i ] = () => {

									let context = JSON.parse( JSON.stringify( Altiva.routes_context ) );

									Altiva.middleware[ Altiva.middleware_in_routes[ route ][ i ] ].call( Altiva.root, context, Altiva.routes_configured[ route ][ i + 1 ] )

								}

						}

					} else
						Altiva.routes_configured[ route ][ 0 ] = render;

				}

				Altiva.routes_configured[ route ][ 0 ]();

			} );

		}

		// Starting routing system with automatic environment discovery, mobile or desktop
		
		if ( Altiva.fileOrMobile() ) {
			
			page( { dispatch: false } );
			page( Altiva.config.initial );

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

			if ( !Altiva.component[ url ] ) {

				let loaded;

				const request = new XMLHttpRequest();
				request.open( 'GET', Altiva.load.baseUrl + url + '.js' );

				const onload = function ( ) {

					if ( ( request.readyState !== 4 ) || loaded ) {

						return;
					}

					Altiva.component[ url ] = new Function ( 'return ' + request.responseText )();

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

		Altiva.root = new App( options );

		window[ this.defaults.globalVar ] = Altiva.root;
	},

	store: null,

	/*
	 * options: the svelte array passed in the instantiation of the app
	 */
	start ( options ) {

		Altiva.configBaseUrl();

		Altiva.startInstance( options );

		Altiva.configPageJs();

	}

};

Altiva.load.baseUrl = '/components/';

export default Altiva;