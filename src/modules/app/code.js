export const code = async function ( state, next, end ) {

	let areas = ''

	state.app.areas.forEach( area => areas += `<svelte:component this={areas['${area}']}/>` )

	const source = `
	<script>
		let areas = {}

		export const show = function (updated) {
			areas = updated
		}
	</script>

	${areas}
	`

	state.app.compile = { source }

	next();
}