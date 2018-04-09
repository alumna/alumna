import page 				from 'page';

// Svelte Shared Helpers
import * as svelteShared 	from 'svelte/shared';

// Svelte Store Library
import { Store } 			from 'svelte/store.js';

const Altiva = {

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

		// Link each route function with a page.js route

		for ( const route in Altiva.routes )
			page( route, () => {

				Altiva.routes[ route ].then( () => Altiva.root.set( { _route: route } ) );

			} );

		// Staring routing system with automatic environment discovery, mobile or desktop
		
		if ( Altiva.fileOrMobile() ) {
			
			page( { dispatch: false } );
			page( Altiva.config.initial );

		} else {
			
			page();
		}
	},

	component: {},

	defaults: {
		storeData: {}
	},

	fileOrMobile ( ) {

		return ( window && ( window.cordova || window.location.protocol == 'file:' ) );
	},

	instances: {},

	libraries: {
		// Svelte Store Library
		Store: Store,
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

	preloadComponents ( ) {

		const path = Altiva.fileOrMobile() ? Altiva.config.initial : window.location.pathname;

		const slash = ( path.slice( -1 ) == '/' ? path.slice( 0, -1 ) : path + '/' );

		const error = { then: () => console.log( '[Altiva] 404: Can\'t load your app since the url \'' + path + '\' or \'' + slash + '\' is not defined in your app.js file' ) };
		
		return Altiva.routes[ path ] ? Altiva.routes[ path ] : ( Altiva.routes[ slash ] ? Altiva.routes[ slash ] : error );
	},

	route ( route, redirect ) {

		// If redirect is undefined, this will be treated as a page call
		if ( redirect === undefined )
			page( route );
		else
			page( route, redirect );
	},

	routes: {},

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

			this.instances.store = new this.libraries.Store( this.defaults.storeData );

			options.store = this.instances.store;
		}

		Altiva.root = new App( options );

		window[ this.defaults.globalVar ] = Altiva.root;
	},

	/*
	 * options: the svelte array passed in the instantiation of the app
	 */
	start ( options ) {

		Altiva.configBaseUrl();

		Altiva.preloadComponents().then( () => {

			Altiva.startInstance( options );

			Altiva.configPageJs();

		} );

	}

};

Altiva.load.baseUrl = '/components/';

export default Altiva;