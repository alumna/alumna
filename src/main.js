import Ractive from 'ractive';
import * as rcu from 'rcu';
import qwest from 'qwest';
import page from 'page';
import store from 'store';
import localforage from 'localforage';
import Zousan from 'zousan';

import tap from 'ractive-events-tap';
import doubletap from './doubletap';
import hover from 'ractive-events-hover';
import { escape } from 'ractive-events-keys';
import { space } from 'ractive-events-keys';
import { enter } from 'ractive-events-keys';
import { tab } from 'ractive-events-keys';

/*
	Altiva.js v1.0.0-rc1
	Sun Dec 13 2015 14:27:00 GMT-0300 (UTC)

	http://altiva.in

	Released under the MIT License.
*/

Ractive.DEBUG = false;

var Altiva = Ractive.extend({

	el: 'body',

	data: function () {
		return {
			_page: '',
			_menu: '',
			_sessions: {},
			_params: {}
		}
	},

	events: {
		tap: tap,
		doubletap: doubletap,
		hover: hover,
		escape: escape,
		space: space,
		enter: enter,
		tab: tab
	},

	altiva: {
		routes: [],
		routeComponents: {},
		template: '',
		sessions: [],
		subComponents: {},
		routeFunctions: {},
		blank: {},
		load: {
			loading: false,
			rendering: false,
			sessions: {},
			session_components: {}
		},

		util: {
			isEmpty: function ( obj ) {
				for ( var prop in obj ) {
					if ( obj.hasOwnProperty( prop ) )
						return false;
				}
				return true;
			}
		}
	},

	auth: {
		attempt: function ( url, data ) {
			return this.server.post( url, data )
		},

		check: function ( response ) {
			if ( response.error === false && response.data.token !== undefined && response.data.user !== undefined )
			{
				this.local.set( 'token', response.data.token )
				this.local.set( 'me', response.data.user )
				this.setToken()

				return true
			}
			else
				return false
		},

		options: {}
	},

	error: {
		check: function ( code ) {
			if ( code && typeof this.error[code] === 'function' )
				this.error[code]()
		},

		token_expired: function () {
			this.middleware.logout()
			this.route( this.config.login || '/' )
		},

		token_invalid: function () {
			this.middleware.logout()
			this.route( this.config.login || '/' )
		}
	},

	config: {},

	checkRoute: function ( route ) {
		return this.get( '_page' ) == route;
	},

	local: store,

	middleware: {
		auth: function () {
			return ( this.local.get('token') !== undefined )
		},

		guest: function () {
			return ( this.local.get('token') === undefined )
		},

		logout: function () {
			this.local.remove('token')
			this.auth.options.headers = {}
			return false
		}
	},

	Promise: Zousan,

	server: qwest,

	storage: localforage,

	comp: {},

	/* Be happy with short function names!  */
	fun: {
		register: function ( context, name, obj ) {
			if ( this[context] === undefined )
				this[context]  = {}

			this[context][name] = obj[name].bind(obj)
		},

		unregister: function ( context ) {
			delete this[context]
		}
	},

	renderRoute: function ( route ) {
		var sessions           = this.altiva.load.sessions
		var session_components = this.altiva.routeComponents[ route ]
		var render             = true

		for ( var prop in session_components )
		{
			var component = session_components[ prop ].replace( '/', '_' )

			if ( Altiva.components[ component ] === undefined )
				render = false
		}

		if ( render )
		{
			this.altiva.load.loading = false
			this.altiva.load.rendering = true
			this.set( '_sessions', sessions ).then ( function ()
			{
				this.altiva.load.rendering = false
			}.bind( this ))
		}
	},

	loadComponent: function ( route, component, prop ) {
		var sessions           = this.altiva.load.sessions
		var session_components = this.altiva.routeComponents[ route ]

		Altiva.load( session_components[ prop ] + '.html', component, this, route ).then( function ( Component )
		{
			Altiva.components[ component ] = Component

			this.renderRoute( route )
		}.bind( this ));
	},

	loadRoute: function ( route ) {
		var render             = false
		var sessions           = JSON.parse( JSON.stringify( this.altiva.blank ) )
		var session_components = this.altiva.routeComponents[ route ]

		this.altiva.load.loading   = true
		this.altiva.load.rendering = false
		this.altiva.load.sessions  = sessions

		for ( var prop in session_components )
		{
			var component    = session_components[ prop ].replace( '/', '_' )
			sessions[ prop ] = component

			if ( this.get( '_sessions.' + prop ) != component )
			{
				render = true

				if ( Altiva.components[ component ] === undefined )
					this.loadComponent( route, component, prop )
				else
				{
					/* Pending: If this component has a refresh function,  refresh it */
				}
			}
		}

		if ( render )
			this.renderRoute( route )
	},

	sessions: function ( new_sessions ) {
		var sessions_data = {}

		this.altiva.sessions = new_sessions

		for ( var i = 0; i < new_sessions.length; i++ )
		{
			sessions_data[ new_sessions[i] ] = 'blank'

			this.altiva.template += '<dynamic component="{{_sessions.' + new_sessions[i] + '}}"/>'
		}

		this.altiva.blank = sessions_data

		this.set( '_sessions', sessions_data )
	},

	route: function ( route, session_components, middlewares  ) {

		/* If session_components is undefined, this is a page call. Else, register new route properly */
		if ( session_components === undefined && middlewares === undefined )
			page( route );
		else
		{
			if ( typeof session_components === 'string' && middlewares === undefined )
			{
				page( route, session_components );
			}
			else
			{
				this.altiva.routeComponents[ route ] = session_components

				var route_function = 'load' + (( route == '/' ) ? '__index' : route.replace( '/', '_' ))

				var route_object = {}
				route_object[ route_function ] = route

				this.altiva.routes.push( route_object )

				if ( typeof middlewares === 'object' )
				{
					this[ route_function ] = function ( ctx, next ) {

						this.set({ _page: ctx.pathname, _params: ctx.params })

						for ( var key in middlewares)
						{
							if ( !this.middleware[ key ]() )
								return page( middlewares[ key ] )	
						}

						this.loadRoute( route )
					}.bind( this );
				}
				else
				{
					this[ route_function ] = function ( ctx, next) {
						this.set({ _page: ctx.pathname, _params: ctx.params })
						this.loadRoute( route )
					}.bind( this );
				}
			}
		}
	},

	setRoutes: function () {
		for ( var i = 0; i < this.altiva.routes.length; i++ )
		{	
			for ( var prop in this.altiva.routes[ i ] )
				page( this.altiva.routes[ i ][ prop ], this[ prop ] );
		}
	},

	checkToken: function () {
		if ( this.local.get('token') !== undefined )
			this.setToken()
	},

	setToken: function () {
		this.auth.options.headers = { Authorization: 'Bearer ' + this.local.get('token') }

		this.set( 'users.' + this.local.get( 'me' )._id, this.local.get( 'me' ) )
		this.set( 'users.me', this.get( 'users.' + this.local.get( 'me' )._id ) )
	},

	prepareContext: function ( properties ) {
		for (var i = properties.length - 1; i >= 0; i--) {

			var property = properties[i]

			for ( var prop in this[property] )
			{
				if ( typeof this[property][prop] === 'function' )
					this[property][prop] = this[property][prop].bind(this)
			}
		};
	},

	start: function ( )
	{

		// Prepare helper functions to root object context
		this.prepareContext( [ 'middleware', 'error', 'auth' ] )

		// Register API and CDN, if available
		if ( this.config.api !== undefined )
		{
			qwest.base = this.config.api
			this.set( '_api', this.config.api )
		}

		if ( this.config.cdn !== undefined )
			this.set( '_cdn', this.config.cdn )

		// Debug mode
		if ( this.config.debug )
			Ractive.DEBUG = true;

		// Now we have all information to the definitive template
		this.resetTemplate( this.altiva.template )
		this.setRoutes()
		
		// Automatic addition of JWT token header to ajax
		this.checkToken()

		// Update components URL's to absolute and protocol agnostic
		if ( window.location.protocol !== 'file:' )
			this.config.path = window.location.origin
		else
			this.config.path = window.location.pathname.replace( '/index.html', '' )

		Altiva.load.baseUrl = this.config.path + '/components/';
		
		// Staring routing system with automatic environment discovery, mobile or desktop
		if( window && ( window.cordova || window.location.protocol == 'file:' ) )
		{
			page( { dispatch: false } )
			page( this.config.mobile || '/' )
		}
		else
		{
			page()
		}
	}

});


/*
	Altiva Load
	For dynamic and automatic component loading
	*/

// Creating a reference
Altiva.components = Ractive.components;

// getComponent - utility to get component content from file
Altiva.getComponent = function ( url )
{
	return new Ractive.Promise( function ( fulfil, reject )
	{
		var xhr, onload, loaded;

		xhr = new XMLHttpRequest();
		xhr.open( 'GET', url );

		onload = function ()
		{
			if ( ( xhr.readyState !== 4 ) || loaded )
			{
				return;
			}

			fulfil( xhr.responseText );
			loaded = true;
		};

		xhr.onload = xhr.onreadystatechange = onload;
		xhr.onerror = reject;
		xhr.send();

		if ( xhr.readyState === 4 )
		{
			onload();
		}
	});
};

// Test for XHR to see if we're in a browser...
// if ( typeof XMLHttpRequest !== 'undefined' ) {
// 	Altiva.getComponent = function ( url ) {
// 		return new Ractive.Promise( function ( fulfil, reject ) {
// 			var xhr, onload, loaded;

// 			xhr = new XMLHttpRequest();
// 			xhr.open( 'GET', url );

// 			onload = function () {
// 				if ( ( xhr.readyState !== 4 ) || loaded ) {
// 					return;
// 				}

// 				fulfil( xhr.responseText );
// 				loaded = true;
// 			};

// 			xhr.onload = xhr.onreadystatechange = onload;
// 			xhr.onerror = reject;
// 			xhr.send();

// 			if ( xhr.readyState === 4 ) {
// 				onload();
// 			}
// 		});
// 	};
// }
// // ...or in node.js
// else {
// 	Altiva.getComponent = function ( url ) {
// 		return new Ractive.Promise( function ( fulfil, reject ) {
// 			require( 'fs' ).readFile( url, function ( err, result ) {
// 				if ( err ) {
// 					return reject( err );
// 				}

// 				fulfil( result.toString() );
// 			});
// 		});
// 	};
// }

// cacheComponent - utility to cache components
Altiva.cacheComponent = function ( componentPath, callback )
{
	var componentName = componentPath.replace( '/', '_' )

	if ( Altiva.components[ componentName ] === undefined )
	{
		Altiva.load( componentPath + '.html' ).then( function ( Component )
		{
			Altiva.components[ componentName ] = Component
			callback();

		});
	}
	else
		callback();
};

/* Load Single - Simplified */

// Load a single component:
//
//     Altiva.load( 'path/to/foo' ).then( function ( Foo ) {
//       var foo = new Foo(...);
//     });

/* Let the game begins */
rcu.init ( Ractive );

Altiva.load = function ( url )
{
	var promise, url = Altiva.load.baseUrl + url;

	// if this component has already been requested, don't
	// request it again
	if ( !Altiva.load.promises[ url ] )
	{
		promise = Altiva.getComponent( url ).then( function ( template )
		{
			return new Ractive.Promise( function ( fulfil, reject )
			{
				rcu.make( template,
				{
					url: url,
					loadImport: function ( name, path, parentUrl, callback )
					{
						/*
							This component has a sub-component that must be cached before rendering
							*/
							Altiva.cacheComponent( path, callback )
						},
						require: ''

					}, fulfil, reject )
			});
		});

		Altiva.load.promises[ url ] = promise;
	}

	return Altiva.load.promises[ url ];
}

/* Default components folder */
Altiva.load.baseUrl = '/components/';

/* Components already loaded by url */
Altiva.load.promises = {};

/* Altiva Dynamic component */
Altiva.components.blank = Ractive.extend( { template: '' } );

Altiva.components.dynamic = Ractive.extend({
	template: '<component/>',
	components:
	{
		component: function ()
		{
			return this.get( 'component' );
		}
	},
	oninit: function ()
	{
		this.observe( 'component', function ()
		{
			this.reset();
		},
		{
			init: false
		});
	}
});

export default Altiva;