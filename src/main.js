import Ractive from 'ractive';
import qwest from 'qwest';
import page from 'page';
import store from 'store';

/*
	Altiva.js v1.0.0-rc1
	Sun Dec 13 2015 14:27:00 GMT-0300 (UTC)

	http://altiva.in

	Released under the MIT License.
*/

/* Default components folder */
Ractive.load.baseUrl = '/components/';

/* Ractive Dynamic component */
Ractive.components.blank = Ractive.extend({ template: '' });

Ractive.components.dynamic = Ractive.extend({
	template: '<component/>',
	components: {
		component: function() {
			return this.get('component');
		}
	},
	oninit: function(){
		this.observe('component', function(){
			this.reset();
		}, { init: false});
	}
});



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

	altiva: {
		routes: [],
		template: '',
		sessions: [],
		routeFunctions: {},
		blank: {},

		util: {
			isEmpty: function ( obj ) {
			    for(var prop in obj) {
			        if(obj.hasOwnProperty(prop))
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

	mobileSetup: function () {
		this.config.path = window.location.pathname.replace( 'index.html', '' )

		Ractive.load.baseUrl = this.config.path + 'components/';
	},

	server: qwest,

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

	renderRoute: function ( sessions, session_components ) {
		var render = true

		for ( var prop in session_components )
		{
			var component = session_components[ prop ].replace( '/', '_' )

			if ( Ractive.components[component] === undefined )
				render = false
		}

		if ( render )
			this.set( '_sessions', sessions )
	},

	loadComponent: function ( sessions, session_components, component, prop ) {
		Ractive.load( session_components[ prop ] + '.html' ).then( function ( Component )
		{
			Ractive.components[ component ] = Component

			this.renderRoute( sessions, session_components )
		}.bind( this ));
	},

	cacheComponent: function ( componentPath ) {
		var componentName = componentPath.replace( '/', '_' )

		if ( Ractive.components[ componentName ] === undefined )
		{
			Ractive.load( componentPath + '.html' ).then( function ( Component )
			{
				Ractive.components[ componentName ] = Component
			}.bind( this ));
		}
	},

	loadRoute: function ( session_components ) {
		var render       = false
		var sessions     = JSON.parse( JSON.stringify( this.altiva.blank ) )

		for ( var prop in session_components )
		{
			var component    = session_components[ prop ].replace( '/', '_' )
			sessions[ prop ] = component

			if ( this.get( '_sessions.' + prop ) != component )
			{
				render = true

				if ( Ractive.components[ component ] === undefined )
					this.loadComponent( sessions, session_components, component, prop )
			}
		}

		if ( render )
			this.renderRoute( sessions, session_components )
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

	route: function ( route, session_components, middlewares, cache_components  ) {
		
		if ( cache_components !== undefined )
		{
			for (var i = cache_components.length - 1; i >= 0; i--) {
				this.cacheComponent( cache_components[i] )
			};
		}

		/* If session_components is undefined, this is a page call. Else, register new route properly */
		if ( session_components === undefined && middlewares === undefined )
			page( route )
		else
		{
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

					this.loadRoute( session_components )
				}.bind( this );
			}
			else
			{
				this[ route_function ] = function ( ctx, next) {
					this.set({ _page: ctx.pathname, _params: ctx.params })
					this.loadRoute( session_components )
				}.bind( this );
			}
		}
	},

	setRoutes: function () {
		for ( var i = 0; i < this.altiva.routes.length; i++ )
		{	
			for ( var prop in this.altiva.routes[ i ] )
				page( this.altiva.routes[ i ][ prop ], this[ prop ] )
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

	start: function ( mode ) {
		
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

		this.resetTemplate( this.altiva.template )
		this.setRoutes()
		this.checkToken()
		
		if( mode === undefined )
			page()
		else
		{
			page( { dispatch: false } )
			page( this.config.mobile )
		}
	}

});

export default Altiva;