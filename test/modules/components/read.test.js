import { read } from './../../../src/modules/components/read.js';
import { readFileSync } from 'fs';

describe( 'Reading components', () => {

	test('1. Existing component', async () => {

		/* Arrange */

		const source  = readFileSync( './test/modules/components/read/HelloAlumna.html', 'utf8' )
		let end_calls = 0, next_calls = 0;

		const state = {
			component:  'HelloAlumna',
			route:      '/',
			global: {
				components: {
					'HelloAlumna': {}
				},
				config: { dir: './test/modules/components/read/' },
				errors: {},
				end: () => { ++end_calls }
			}
		};

		const next  = () => { ++next_calls };
		const end   = () => { ++end_calls };

		/* Action */
		
		await read( state, next, end )

		/* Assertions */

		expect( state.global.components[ 'HelloAlumna' ].source ).toEqual( source );
		expect( next_calls ).toBe( 1 );
		expect( end_calls ).toBe( 0 );

	});

	test('2. Non-existing component', async () => {

		/* Arrange */

		let end_calls = 0, next_calls = 0;
		
		const state = {
			component:  'HelloAlumnaNonExistent',
			route:      '/',
			global: {
				components: {
					'HelloAlumnaNonExistent': {}
				},
				config: { dir: './test/modules/components/read/' },
				errors: {},
				end: () => { ++end_calls }
			}
		};

		const next  = () => { ++next_calls };
		const end   = () => { ++end_calls };
		
		/* Action */
		
		await read( state, next, end )
		
		/* Assertions */

		expect( state.global.errors[ "Route: '" + state.route + "'" ] ).toEqual( 'Non-existent component file: ' + state.component + '.html' );
		expect( next_calls ).toBe( 0 );
		expect( end_calls ).toBe( 1 );

	});

});