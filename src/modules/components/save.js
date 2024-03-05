import { EOL } 							from 'os';
import { writeFileSync, readFileSync } 	from 'fs';
import { ensure_dir }					from '../utils/dir';

export const save = async function ( state, next, end ) {

	// get component dir, when present
	const last_slash    = state.component.lastIndexOf( '/' )
	const component_dir = last_slash == -1 ? '' : state.component.slice( 0, last_slash - 1 )

	// ensure the complete directory path recursively (if part of its directories don't exist yet)
	ensure_dir( state.global.config.build_dir + 'components/' + component_dir )

	// save the component
	writeFileSync( state.global.config.build_dir + 'components/' + state.component + '.js', state.global.components[ state.component ].compiled.js.code, { encoding: 'utf8', mode: 0o644 } )

	next();

}