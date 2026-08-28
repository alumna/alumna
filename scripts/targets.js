// Bun --compile targets and the GitHub Release asset names.

export const TARGETS = [
	{
		bun: 'bun-linux-x64',
		id: 'linux-x64',
		os: 'linux',
		arch: 'x64',
		libc: 'glibc',
		archive: 'tar.gz',
		binary: 'alumna',
		folder: 'alumna-linux-x64',
		asset: 'alumna-linux-x64.tar.gz'
	},
	{
		bun: 'bun-linux-arm64',
		id: 'linux-arm64',
		os: 'linux',
		arch: 'arm64',
		libc: 'glibc',
		archive: 'tar.gz',
		binary: 'alumna',
		folder: 'alumna-linux-arm64',
		asset: 'alumna-linux-arm64.tar.gz'
	},
	{
		bun: 'bun-linux-x64-musl',
		id: 'linux-x64-musl',
		os: 'linux',
		arch: 'x64',
		libc: 'musl',
		archive: 'tar.gz',
		binary: 'alumna',
		folder: 'alumna-linux-x64-musl',
		asset: 'alumna-linux-x64-musl.tar.gz'
	},
	{
		bun: 'bun-linux-arm64-musl',
		id: 'linux-arm64-musl',
		os: 'linux',
		arch: 'arm64',
		libc: 'musl',
		archive: 'tar.gz',
		binary: 'alumna',
		folder: 'alumna-linux-arm64-musl',
		asset: 'alumna-linux-arm64-musl.tar.gz'
	},
	{
		bun: 'bun-darwin-x64',
		id: 'darwin-x64',
		os: 'darwin',
		arch: 'x64',
		libc: null,
		archive: 'tar.gz',
		binary: 'alumna',
		folder: 'alumna-darwin-x64',
		asset: 'alumna-darwin-x64.tar.gz'
	},
	{
		bun: 'bun-darwin-arm64',
		id: 'darwin-arm64',
		os: 'darwin',
		arch: 'arm64',
		libc: null,
		archive: 'tar.gz',
		binary: 'alumna',
		folder: 'alumna-darwin-arm64',
		asset: 'alumna-darwin-arm64.tar.gz'
	},
	{
		bun: 'bun-windows-x64',
		id: 'windows-x64',
		os: 'windows',
		arch: 'x64',
		libc: null,
		archive: 'zip',
		binary: 'alumna.exe',
		folder: 'alumna-windows-x64',
		asset: 'alumna-windows-x64.zip'
	},
	{
		bun: 'bun-windows-arm64',
		id: 'windows-arm64',
		os: 'windows',
		arch: 'arm64',
		libc: null,
		archive: 'zip',
		binary: 'alumna.exe',
		folder: 'alumna-windows-arm64',
		asset: 'alumna-windows-arm64.zip'
	}
];

export function target_by_id (id) {
	for (let i = 0; i < TARGETS.length; i++) {
		if (TARGETS[i].id === id)
			return TARGETS[i];
	}
	return null;
}

// Map Node process.platform / process.arch / musl to a TARGETS id.
export function host_target ({ platform, arch, musl } = {}) {
	const plat = platform || process.platform;
	const cpu = arch || process.arch;
	const use_musl = Boolean(musl);

	if (plat === 'darwin') {
		if (cpu === 'arm64')
			return target_by_id('darwin-arm64');
		if (cpu === 'x64')
			return target_by_id('darwin-x64');
	}
	if (plat === 'win32' || plat === 'windows') {
		if (cpu === 'arm64')
			return target_by_id('windows-arm64');
		if (cpu === 'x64')
			return target_by_id('windows-x64');
	}
	if (plat === 'linux') {
		if (cpu === 'arm64')
			return target_by_id(use_musl ? 'linux-arm64-musl' : 'linux-arm64');
		if (cpu === 'x64')
			return target_by_id(use_musl ? 'linux-x64-musl' : 'linux-x64');
	}
	return null;
}

export function unix_ids () {
	const ids = [];
	for (let i = 0; i < TARGETS.length; i++) {
		if (TARGETS[i].os !== 'windows')
			ids.push(TARGETS[i].id);
	}
	return ids;
}

export function windows_ids () {
	const ids = [];
	for (let i = 0; i < TARGETS.length; i++) {
		if (TARGETS[i].os === 'windows')
			ids.push(TARGETS[i].id);
	}
	return ids;
}
