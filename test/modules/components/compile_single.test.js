import { compile_single } from './../../../src/modules/components/compile_single.js';
import { readFileSync } from 'fs';
// import { readFileSync, writeFileSync } from 'fs';

// Replace windows CRLF ( \r\n ) to LF ( \n )
const normalize = str => str.replaceAll( '\r\n', '\n' )

describe( 'Compiling the components', () => {

	test('1. Component with no errors', async () => {

        /* Arrange */
        
        const source    = readFileSync( './test/modules/components/compile_single/HelloAlumna.html', 'utf8' )
        const compiled  = readFileSync( './test/modules/components/compile_single/HelloAlumna.js', 'utf8' )

        let end_calls = 0, next_calls = 0;

		const state = {
            component:  'HelloAlumna',
            route:      '/',
            global: {
                components: {
                    'HelloAlumna': { source }
                },
                errors: {},
                end: () => { ++end_calls }
            }
		};

		const next  = () => { ++next_calls };
        const end   = () => { ++end_calls };
        
        /* Action */
		
        await compile_single( state, next, end )
        
        /* Assertions */

        expect( state.global.errors ).toEqual( {} );
        expect( state.global.components[ 'HelloAlumna' ].compiled.js.code ).toEqual( normalize( compiled ) );
        expect( next_calls ).toBe( 1 );
        expect( end_calls ).toBe( 0 );

    });
    
    test('2. Component with errors', async () => {

        /* Arrange */
        
        const source = normalize( readFileSync( './test/modules/components/compile_single/HelloAlumnaWrong.html', 'utf8' ) )

        let end_calls = 0, next_calls = 0;

		const state = {
            component:  'HelloAlumnaWrong',
            route:      '/',
            global: {
                components: {
                    'HelloAlumnaWrong': { source }
                },
                errors: {},
                end: () => { ++end_calls }
            }
		};

		const next  = () => { ++next_calls };
        const end   = () => { ++end_calls };
        
        /* Action */
		
        await compile_single( state, next, end )

        /* Assertions */
        
        expect( state.global.errors ).toEqual( { 'Component HelloAlumnaWrong on route /:': 'ParseError on line 6 position 71' } );
        expect( end_calls ).toBe( 1 );
        expect( next_calls ).toBe( 0 );

	});

});