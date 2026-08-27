import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { read_file_map, svelte_file_map, svelte_dep_maps, package_version, rolldown_version } from '../pack/assets.js';
import { alumna_root } from '../utils/paths.js';

export function alumna_externals (id) {
	if (id === 'rolldown' || (typeof id === 'string' && id.startsWith('rolldown/')))
		return true;
	if (typeof id === 'string' && id.startsWith('node:'))
		return true;
	return false;
}

export function is_pack_data_id (id, importer) {
	if (typeof id !== 'string')
		return false;
	if (id.endsWith('/pack/data.js') || id.endsWith('\\pack\\data.js'))
		return true;
	if (importer && /[/\\]pack[/\\]assets\.js$/.test(importer) && (id === './data.js' || id === './data'))
		return true;
	return false;
}

export function generated_assets_source (assets) {
	return 'export function live_data () {\n\treturn ' + JSON.stringify(assets) + ';\n}\n';
}

export function collect_release_assets ({
	root = alumna_root,
	version,
	rolldown
} = {}) {
	return {
		version: version || package_version(),
		rolldown_version: rolldown || rolldown_version(),
		runtime: readFileSync(join(root, 'src/runtime/browser.js'), 'utf8'),
		match: readFileSync(join(root, 'src/compile/match.js'), 'utf8'),
		scaffold: read_file_map(join(root, 'scaffold')),
		svelte_files: svelte_file_map(),
		svelte_deps: svelte_dep_maps()
	};
}
