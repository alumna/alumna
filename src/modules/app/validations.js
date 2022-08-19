import { areas } from './validations/areas'
// import { routes } from './validations/routes'
// import { components } from './validations/components'


export const validations = async function ( state, next, end ) {
	
	const validations_flow = new Unitflow( state )

	validations_flow.unit[ 'areas' ] = areas

	// Missing routes validation
	// validations_flow.unit[ 'routes' ] = routes

	// Missing component existence validation
	// validations_flow.unit[ 'components' ] = components

	validations_flow.flow[ 'validations' ] = [ 'areas' ]

	await validations_flow.run( 'validations' );

	next();
	
}

