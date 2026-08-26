const config = {
	base: '',
	areas: [ 'nav', 'content' ],
	routes: {
		'/': { areas: { nav: 'Nav', content: 'Home' }, redirect: null, layout: null },
		'/about': { areas: { nav: 'Nav', content: 'About' }, redirect: null, layout: null },
		'/old': { areas: {}, redirect: '/about', layout: null },
		'/users/:id': { areas: { content: 'User' }, redirect: null, layout: 'dash', middleware: [ 'auth' ] },
		'/empty': { areas: {}, redirect: null, layout: null }
	},
	middleware: [ 'analytics' ],
	layouts: {
		dash: { component: 'Dash', areas: [ 'content' ] }
	},
	deps: {
		'/': [ 'Home', 'Nav' ],
		'/about': [ 'About', 'Nav' ],
		'/old': [],
		'/users/:id': [ 'Dash', 'User' ]
	}
};

export default config;
