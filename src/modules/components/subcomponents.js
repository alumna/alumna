/*

# Module specification:



*/


import { parse } from 'meriyah';

import { compile_flow } from './compile_flow'


const find_in_tree = function ( element, params ) {
    
    if ( element.type === 'VariableDeclaration' )
        return element.declarations.forEach( child => find_in_tree( child, params ) )

    if ( element.type === 'VariableDeclarator' ) {
        
        if ( element.init?.object?.object?.name === 'Alumna' && element.init?.object?.property?.name === 'components' )
            return params.found[ element.init.property.value ] = true;
        
        if ( element.init?.body?.body )
            return element.init?.body?.body.forEach( child => find_in_tree( child, params ) )
    }

    let item = element.consequent?.body || element.consequent?.declarations || element.body?.body

    if ( item )
        item.forEach( child => find_in_tree( child, params ) )
    
    item = element.alternate?.body || element.alternate?.declarations

    if ( item )
        return item.forEach( child => find_in_tree( child, params ) )

}

const subcomponents = async function ( state, next, end ) {

	
	const component = state.component
    const route     = state.route
    const js        = state.global.components[ component ].compiled.js.code
    const tree      = parse( js, { module: true } )
    const params    = { component, route, state, found: {}, end }

    tree.body.forEach( element => find_in_tree( element, params ) )

    /* If no subcomponent found, move forward */
    if ( Object.keys( params.found ).length == 0 )
    	return next();

    /* Otherwise, save them on subcomponents property... */
    Object.assign( state.global.components[ component ].subcomponents, params.found )

    /* ...and compile them recursively */
    const subcomponents_flows = []

    for ( let subcomponent in params.found )
    	subcomponents_flows.push( compile_flow( subcomponent, route, state.global, state.parent_end ) )

    await Promise.all( subcomponents_flows )

    next();
}

export { subcomponents }