export const code = async function ( state, next, end ) {

	let areas = ''

	state.app.areas.forEach( area => areas += `<svelte:component this={areas['${area}']}/>` )

	const source = `
	<script>
		let areas = {}

		export const show = function (area, component) {
			areas[area] = component
		}
	</script>

	${areas}
	`

	state.app.compile = { source }
}