import { translate_component } from './../../../src/modules/components/translate.js';
import { readFileSync } from 'fs';

describe( 'Translating Components', () => {

	test('1. Translating components with no errors', async () => {

		/* Arrange */

		const code       = readFileSync( './test/modules/components/translate_imports/HelloAlumna.js', 'utf8' )
		const translated = readFileSync( './test/modules/components/translate_imports/HelloAlumnaTranslated.js', 'utf8' )

		let end_calls = 0, next_calls = 0;

		const state = {
			component:  'HelloAlumna',
			route:      '/',
			global: {
				components: {
					'HelloAlumna': { compiled: { js: {code: code }} }
				},
				errors: {},
				end: () => { ++end_calls }
			}
		};

		const next  = () => { ++next_calls };
		const end   = () => { ++end_calls };

		/* Action */
		
		await translate_component( state, next, end )

		/* Assertions */

		expect( state.global.errors ).toEqual( {} );
		expect( state.global.components[ 'HelloAlumna' ].compiled.js.code ).toEqual( translated );
		expect( next_calls ).toBe( 1 );
		expect( end_calls ).toBe( 0 );

	});

});