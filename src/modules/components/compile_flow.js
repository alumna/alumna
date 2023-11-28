/*

# Module specification:

Internal flow to read and compile one component
and its subcomponents, when they exist.

On each subcomponent (or sub-sub), this flow will
be recursively re-created and executed.

*/

import { Unitflow } 			from '@alumna/unitflow';

import { read } 				from './read'
import { subcomponents } 		from './subcomponents'
import { compile_single } 		from './compile_single'
import { translate_component } 	from './translate'
import { cache } 				from './cache'



const compile_flow = async function ( component, route, state, parent_end ) {

	/*

	Since a component may be used on more than one route, we must check if it
	is already compiled and saved at state.components[ component ] *on the
	last compilation flow*, to avoid unnecessary recompilation.

	BUT we *must* register the component (and its subcomponents) on
	"components_per_route" object, regardless of it being re-compiled or not.

	On the development process, when a component is changed in regards to its
	subcomponents (addition or removal), we can properly update the
	"components_per_route" object and ensure the load of only the necessary
	content.

	--

	# IMPORTANT - PERFORMANCE NOTE

	To provide a performant live-reload experience even on big projects,
	avoiding comparing all the components map every time a component gets
	changed, we must save and compare the "subcomponents" property of the
	changed component, to decide if the main app code must also be rebuilt.

	If the "subcomponents" property doesn't change, only the component
	itself must be recompiled and replaced on (http server) memory, with a
	guarantee of a valid app rendering after the reload (or HMR).

	Thus, the main app must be recompiled only when the subcomponents of a
	component change, to ensure a correct render using updated route loading
	rules.

	*/

	state.components_per_route[ route ][ component ] = true;

	/*

	!! IMPORTANT MISSING FEATURE HERE !!

	We must create a way to inform which compilation flow this is being called
	For example, as stated on the first comment inside this function, when a
	component changes, we must re-compile it EVEN if it's already defined on
	state.components.

	When a subcomponent is removed, we may also check 

	*/
	if ( state.components[ component ] != undefined )
		return true;

	state.components[ component ] = {
		source: 		null,
		code: 			null,
		subcomponents: 	{}
	}

	/*

	Flow definition and execution

	*/
	const flow_instance = new Unitflow({ route, component, global: state, parent_end })

	flow_instance.unit[ 'read' ] 			= read;
	flow_instance.unit[ 'compile_single' ] 	= compile_single;
	flow_instance.unit[ 'subcomponents' ] 	= subcomponents;
	flow_instance.unit[ 'translate' ] 		= translate_component;
	flow_instance.unit[ 'cache' ] 			= cache;

	flow_instance.flow[ 'execution' ] 		= [ 'read', 'compile_single', 'subcomponents', 'translate', 'cache' ];

	return flow_instance.run( 'execution' );
	
}


export { compile_flow }