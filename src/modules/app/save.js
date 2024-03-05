import { EOL } 							from 'os';
import { writeFileSync, readFileSync } 	from 'fs';
import { ensure_dir }					from '../utils/dir';
import { bundle_and_minify }			from '../utils/bundle_and_minify'

export const save = async function ( state, next, end ) {

	ensure_dir( state.config.build_dir )

	// load 'dist/browser.js' first, if not already loaded
	if ( !state.app.browser ) state.app.browser = readFileSync( state.config.install_dir + 'dist/browser.js', 'utf8' )

	// When building, state.app.svelte_internal_imports isn't populated with 'dist/svelte-internal.js' full content (as it happens in dev mode),
	// but only with the selected internal modules used by the application

	// Under the hood we are using esbuild, thus minification is also done

	const app_build = await bundle_and_minify( state.app.svelte_internal_imports + state.app.browser + state.app.svelte_internal_lib + state.app.routing + EOL + state.app.compile.compiled.js.code, state.config.install_dir, state.config.install_dir )

	if ( !app_build ) {
		state.errors[ 'App imports' ] = 'Failed to tree-shake and minify the app build file'
		return end();
	}

	writeFileSync( state.config.build_dir + 'app.js', app_build )

	next();

}