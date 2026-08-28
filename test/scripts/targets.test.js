import { TARGETS, target_by_id, host_target, unix_ids, windows_ids } from '../../scripts/targets.js';

test('eight Bun targets with matching asset names', () => {
	expect(TARGETS).toHaveLength(8);
	const ids = TARGETS.map(t => t.id);
	expect(new Set(ids).size).toBe(8);
	for (const target of TARGETS) {
		expect(target.bun.startsWith('bun-')).toBe(true);
		expect(target.folder).toBe('alumna-' + target.id);
		if (target.os === 'windows') {
			expect(target.archive).toBe('zip');
			expect(target.binary).toBe('alumna.exe');
			expect(target.asset).toBe(target.folder + '.zip');
		}
		else {
			expect(target.archive).toBe('tar.gz');
			expect(target.binary).toBe('alumna');
			expect(target.asset).toBe(target.folder + '.tar.gz');
		}
	}
});

test('target_by_id and host_target', () => {
	expect(target_by_id('missing')).toBe(null);
	expect(target_by_id('linux-x64').bun).toBe('bun-linux-x64');
	expect(host_target({ platform: 'darwin', arch: 'arm64' }).id).toBe('darwin-arm64');
	expect(host_target({ platform: 'darwin', arch: 'x64' }).id).toBe('darwin-x64');
	expect(host_target({ platform: 'win32', arch: 'x64' }).id).toBe('windows-x64');
	expect(host_target({ platform: 'windows', arch: 'arm64' }).id).toBe('windows-arm64');
	expect(host_target({ platform: 'linux', arch: 'x64', musl: false }).id).toBe('linux-x64');
	expect(host_target({ platform: 'linux', arch: 'x64', musl: true }).id).toBe('linux-x64-musl');
	expect(host_target({ platform: 'linux', arch: 'arm64', musl: false }).id).toBe('linux-arm64');
	expect(host_target({ platform: 'linux', arch: 'arm64', musl: true }).id).toBe('linux-arm64-musl');
	expect(host_target({ platform: 'aix', arch: 'ppc64' })).toBe(null);
	expect(host_target({ platform: 'linux', arch: 'x64' }).id).toBe('linux-x64');
	expect(host_target({ platform: 'linux', arch: 'ia32' })).toBe(null);
	expect(host_target({ platform: 'darwin', arch: 'ia32' })).toBe(null);
	expect(host_target({ platform: 'win32', arch: 'ia32' })).toBe(null);
	expect(unix_ids()).toEqual([
		'linux-x64', 'linux-arm64', 'linux-x64-musl', 'linux-arm64-musl', 'darwin-x64', 'darwin-arm64'
	]);
	expect(windows_ids()).toEqual([ 'windows-x64', 'windows-arm64' ]);
	const host = host_target();
	expect(host === null || TARGETS.some(t => t.id === host.id)).toBe(true);
});
