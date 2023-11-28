// Router library
import navaid 	from 'navaid';

// Svelte Shared Internals
import * as lib from 'svelte/internal';

// Alumna minimal bootstrap library
const Al = {
	
	// Component object
	component: {},
	
	// Svelte internal libraries, used by components
	lib,

	base: '/components/',

	// Load component
	load (url) {
		return new Promise( res => {
			if (Al.component[url])
				return res(true);

			const head = document.getElementsByTagName( 'head' )[0];
			const js = document.createElement( 'script' );

			js.src = Al.base + url + '.js';
			js.onerror = js.onload = () => { head.removeChild(js); res(true) };
			head.appendChild( js );
		})
	},

	// Internal utils
	mobile: (window.cordova || window.location.protocol == 'file:')

}