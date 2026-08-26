// Same constructor in the same area stays mounted: show() only writes changed keys.
// Tags are PascalCase so Svelte treats them as components, not HTML.
// Named layouts receive area snippets (S0: unchanged snippet constructors do not remount).

function escape (name) {
	return name.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

export function ident_from (name) {
	const cleaned = name.replace(/[^A-Za-z0-9_]/g, '_');
	const base = /^[A-Za-z_]/.test(cleaned) ? cleaned : 'C_' + cleaned;
	return base[0].toUpperCase() + base.slice(1);
}

export function is_snippet_name (name) {
	return /^[A-Za-z_][A-Za-z0-9_]*$/.test(name);
}

function area_mount (name) {
	const ident = ident_from(name);
	const key = escape(name);
	return `{#if areas['${key}']}\n\t{@const ${ident} = areas['${key}']}\n\t<${ident} />\n{/if}`;
}

function area_snippet (name) {
	return `{#snippet ${name}()}\n${area_mount(name).split('\n').map(line => '\t' + line).join('\n')}\n{/snippet}`;
}

export function generate_shell_source (area_names, layouts = {}) {
	const sequential = area_names.map(area_mount).join('\n\n');
	const snippet_areas = Object.keys(layouts).length
		? [ ...new Set(Object.values(layouts).flatMap(def => def.areas)) ]
		: [];
	const snippets = snippet_areas.filter(is_snippet_name).map(area_snippet).join('\n');

	return `<script>
	let Layout = $state(null);
	let areas = $state({});

	export function show(next) {
		const next_layout = next.layout || null;
		const next_areas = next.areas;
		if (Layout !== next_layout) Layout = next_layout;
		for (const key of Object.keys(next_areas)) {
			if (areas[key] !== next_areas[key]) areas[key] = next_areas[key];
		}
		for (const key of Object.keys(areas)) {
			if (!(key in next_areas)) areas[key] = undefined;
		}
	}
</script>

{#if Layout}
	{@const L = Layout}
	<L>
${snippets.split('\n').map(line => '\t\t' + line).join('\n')}
	</L>
{:else}
${sequential.split('\n').map(line => '\t' + line).join('\n')}
{/if}
`;
}
