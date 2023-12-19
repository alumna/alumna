import { code } from './../../../src/modules/app/code.js';
import { app_compile } from './../../../src/modules/app/compile.js';
import { app_translate } from './../../../src/modules/app/translate.js';

import { writeFileSync, readFileSync } from 'fs';

// Replace windows CRLF ( \r\n ) to LF ( \n )
const normalize = str => str.replaceAll( '\r\n', '\n' )

describe( 'Creating app base javascript code', () => {

	const state = { app: { areas: [ 'header', 'content' ] } },
		  next  = () => {},
		  end   = () => {};

	test('1. Creating app code', async () => {
		
		await code( state, next, end )

		expect( state ).toEqual({
			app: {
				areas: [ 'header', 'content' ],
				compile: {
					source: `
	<script>
		let areas = {}

		export const show = function (updated) {
			areas = updated
		}
	</script>

	<svelte:component this={areas['header']}/><svelte:component this={areas['content']}/>
	`
				}
			}
		});

	});

	test('2. Compile app code', async () => {
		
		await app_compile( state, next, end )

		const compiled = readFileSync( './test/modules/app/code/compiled.js', 'UTF8' )

		expect( state.app.compile.compiled.js.code ).toEqual( normalize( compiled ) );

	});

	test('3. Translate app code', async () => {
		
		await app_translate( state, next, end )

		const translated = readFileSync( './test/modules/app/code/translated.js', 'UTF8' )

		expect( normalize( state.app.compile.compiled.js.code ) ).toEqual( normalize( translated ) );

	});

});