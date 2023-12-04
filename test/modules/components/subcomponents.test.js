import { subcomponents } from './../../../src/modules/components/subcomponents.js';
import * as compile_flow from './../../../src/modules/components/compile_flow.js';
import * as svelte from 'svelte/compiler';
import { readFileSync } from 'fs';

describe( 'Valid case of subcomponents definition', () => {

	test('1. Multiple subcomponents', async () => {

		/* Mocking external functions/modukes */

		let calls = {}

		const mock = jest.spyOn( compile_flow, 'compile_flow' );
		mock.mockImplementation( ( subcomponent, route, state, parent_end ) => { calls[subcomponent] = { route }; calls.state = !!state.components['example'] });

		/* Preparing the contract to properly test the function */

		const state = {
			component: 'example',
			route: '/',
			global: {
				components: {
					'example': {
						subcomponents: {}
					}
				}
			}
		};

		state.global.components['example'].compiled = svelte.compile( readFileSync( './test/modules/components/subcomponents/example.html', 'utf8' ) )

		const next  = () => {};
		const end   = () => {};
		
		await subcomponents( state, next, end )

		expect( state.global.components[ 'example' ].subcomponents ).toEqual({
			'Component_1': true,
			'Component_2': true,
			'Component_3': true,
			'Component_4': true,
			'Component_5': true,
			'Component_6': true,
			'Component_7': true,
			'Component_8': true,
			'Component_9': true,
			'Component_10': true,
			'Component_11': true,
			'Component_12': true,
			'Component_13': true,
		});

		// expect( calls ).toEqual({
		// 	'state': true,
		// 	'Component_1': { route: '/' },
		// 	'Component_2': { route: '/' },
		// 	'Component_3': { route: '/' },
		// 	'Component_4': { route: '/' },
		// 	'Component_5': { route: '/' },
		// 	'Component_6': { route: '/' },
		// 	'Component_7': { route: '/' },
		// 	'Component_8': { route: '/' },
		// 	'Component_9': { route: '/' },
		// 	'Component_10': { route: '/' },
		// 	'Component_11': { route: '/' },
		// 	'Component_12': { route: '/' },
		// 	'Component_13': { route: '/' },
		// });

	});

	test('2. Components without JS code', async () => {

		/* Mocking external functions/modukes */

		const mock = jest.spyOn( compile_flow, 'compile_flow' );
		mock.mockImplementation(() => {});

		/* Preparing the contract to properly test the function */

		const state = {
			component: 'example',
			route: '/',
			global: {
				components: {
					'example': {
						subcomponents: {}
					}
				}
			}
		};

		state.global.components['example'].compiled = svelte.compile('')

		const next  = () => {};
		const end   = () => {};
		
		await subcomponents( state, next, end )

		expect( state.global.components[ 'example' ].subcomponents ).toEqual({});

	});

});