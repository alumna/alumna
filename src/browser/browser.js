// Router library
import navaid 	from 'navaid';

// Svelte Shared Internals
import * as lib from 'svelte/internal';

// Alumna minimal bootstrap library
const Al = {
	
	// Pre-compiled areas object, pointing each path to its correspondent "areas" object
	// Each object property has the format "area" -> "Al.components[component_name]"
	areas: {},

	// Component object
	component: {},
	
	// Svelte internal libraries, used by components
	lib,

	// Navaid instance
	nav: navaid(),

	// Load component
	load (url) {
		return new Promise( res => {
			if (Al.component[url])
				return res(true);

			const head = document.getElementsByTagName( 'head' )[0];
			const js = document.createElement( 'script' );

			js.src = Al.base + url + '.js';
			js.onerror = js.onload = () => { res(true); head.removeChild(js) };
			head.appendChild( js );
		})
	},

	// Load all components needed on a route (its dependencies)
	load_all (deps) {
		let promises = []

		for (const component of deps)
			promises.push(Al.load(component))

		return Promise.all(promises)
	},

	// Populate an area with its "areas" object for a specific route content
	// (see L10-L11 comments)
	add_area(route) {
		const content = Al.routes[route]
		const areas = {}

		for (const area in content)
			areas[area] = Al.component[content[area]]

		Al.areas[route] = areas
	},

	// register routes navaid, with automatic, selective and cached component loading
	register () {
		for ( const route in Al.deps ) {
			Al.nav.on( route, async () => {
				if (Al.areas[route]) return app.show(Al.areas[route]);

				// Ensure all components needed on a route are loaded
				await Al.load_all(Al.deps[route])

				// Populate the "areas" object for the specific route
				await Al.add_area(route)

				return app.show(Al.areas[route])
			})
		}
	},

	start () {
		// Identify the environment
		const mobile = window && (window.cordova || window.location.protocol == 'file:')

		// Adapt when mobile or file
		Al.base = (mobile ? window.location.pathname.replace('/index.html', '') : window.location.origin) + '/components/'

		// Register routes
		Al.register()

		// Start main Svelte instance
		window.app = new App()

		// Start the router library
		Al.nav( mobile ? '/' : undefined )
	}
}

export default Al;