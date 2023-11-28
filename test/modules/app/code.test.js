import { code } from './../../../src/modules/app/code.js';


describe( 'Creating app base javascript code', () => {

	test('1. Creating app base javascript code', async () => {

		const state = { app: { areas: [ 'header', 'content' ] } },
			  next  = () => {},
			  end   = () => {};
		
		await code( state, next, end )

		expect( state ).toEqual({
			app: {
				areas: [ 'header', 'content' ],
				compile: {
					source: `
	<script>
		let areas = {}

		export const show = function (area, component) {
			areas[area] = component
		}
	</script>

	<svelte:component this={areas['header']}/><svelte:component this={areas['content']}/>
	`
				}
			}
		});

	});

});