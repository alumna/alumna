import { existsSync } from 'node:fs';

export function is_musl (report, proc = process) {
	const get_report = report || (proc.report && proc.report.getReport
		? () => proc.report.getReport()
		: null);
	if (get_report) {
		try {
			const header = get_report().header;
			if (header && header.glibcVersionRuntime)
				return false;
			if (header && header.glibcVersionRuntime === undefined && process.platform === 'linux')
				return true;
		}
		catch {
			// fall through
		}
	}
	return existsSync('/etc/alpine-release');
}

// npm optionalDependency name for this OS / CPU.
export function rolldown_binding_pkg ({ platform, arch, musl } = {}) {
	const plat = platform || process.platform;
	const cpu = arch || process.arch;
	const use_musl = musl == null ? is_musl() : musl;

	if (plat === 'darwin')
		return cpu === 'arm64' ? '@rolldown/binding-darwin-arm64' : '@rolldown/binding-darwin-x64';
	if (plat === 'win32')
		return cpu === 'arm64' ? '@rolldown/binding-win32-arm64-msvc' : '@rolldown/binding-win32-x64-msvc';
	if (plat === 'linux') {
		if (cpu === 'arm64')
			return use_musl ? '@rolldown/binding-linux-arm64-musl' : '@rolldown/binding-linux-arm64-gnu';
		if (cpu === 'arm')
			return '@rolldown/binding-linux-arm-gnueabihf';
		return use_musl ? '@rolldown/binding-linux-x64-musl' : '@rolldown/binding-linux-x64-gnu';
	}
	if (plat === 'freebsd')
		return '@rolldown/binding-freebsd-x64';
	throw new Error('No Rolldown binary for ' + plat + '-' + cpu);
}
