import { is_musl, rolldown_binding_pkg } from '../../src/utils/platform.js';

test('is_musl false when glibc is present', () => {
	expect(is_musl(() => ({ header: { glibcVersionRuntime: '2.39' } }))).toBe(false);
});

test('is_musl true on linux without glibc', () => {
	const prev = process.platform;
	expect(is_musl(() => ({ header: { glibcVersionRuntime: undefined } }))).toBe(process.platform === 'linux');
	void prev;
});

test('is_musl falls through when report throws', () => {
	const out = is_musl(() => { throw new Error('no'); });
	expect(typeof out).toBe('boolean');
});

test('is_musl with no report uses alpine file', () => {
	expect(typeof is_musl(null)).toBe('boolean');
	expect(typeof is_musl()).toBe('boolean');
	expect(typeof is_musl(undefined, { report: null })).toBe('boolean');
	expect(is_musl(undefined, {
		report: { getReport: () => ({ header: { glibcVersionRuntime: '2.39' } }) },
		platform: 'linux'
	})).toBe(false);
});

test('is_musl with no header uses alpine file', () => {
	expect(typeof is_musl(() => ({}))).toBe('boolean');
});

test('rolldown_binding_pkg darwin win linux freebsd', () => {
	expect(rolldown_binding_pkg({ platform: 'darwin', arch: 'arm64' })).toBe('@rolldown/binding-darwin-arm64');
	expect(rolldown_binding_pkg({ platform: 'darwin', arch: 'x64' })).toBe('@rolldown/binding-darwin-x64');
	expect(rolldown_binding_pkg({ platform: 'win32', arch: 'arm64' })).toBe('@rolldown/binding-win32-arm64-msvc');
	expect(rolldown_binding_pkg({ platform: 'win32', arch: 'x64' })).toBe('@rolldown/binding-win32-x64-msvc');
	expect(rolldown_binding_pkg({ platform: 'linux', arch: 'arm64', musl: true })).toBe('@rolldown/binding-linux-arm64-musl');
	expect(rolldown_binding_pkg({ platform: 'linux', arch: 'arm64', musl: false })).toBe('@rolldown/binding-linux-arm64-gnu');
	expect(rolldown_binding_pkg({ platform: 'linux', arch: 'arm', musl: false })).toBe('@rolldown/binding-linux-arm-gnueabihf');
	expect(rolldown_binding_pkg({ platform: 'linux', arch: 'x64', musl: true })).toBe('@rolldown/binding-linux-x64-musl');
	expect(rolldown_binding_pkg({ platform: 'linux', arch: 'x64', musl: false })).toBe('@rolldown/binding-linux-x64-gnu');
	expect(rolldown_binding_pkg({ platform: 'freebsd', arch: 'x64' })).toBe('@rolldown/binding-freebsd-x64');
});

test('rolldown_binding_pkg throws on unknown os', () => {
	expect(() => rolldown_binding_pkg({ platform: 'aix', arch: 'ppc64' })).toThrow(/No Rolldown binary/);
});

test('rolldown_binding_pkg uses process by default', () => {
	expect(rolldown_binding_pkg()).toMatch(/@rolldown\/binding-/);
});
