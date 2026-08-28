#!/usr/bin/env bash
set -euo pipefail

# Alumna author install. Detect OS / CPU / libc, download the matching
# GitHub Release archive, check SHA256, extract, install to ~/.alumna/bin.

Color_Off=''
Red=''
Green=''
Dim=''
Bold_White=''
Bold_Green=''

if [[ -t 1 ]]; then
	Color_Off='\033[0m'
	Red='\033[0;31m'
	Green='\033[0;32m'
	Dim='\033[0;2m'
	Bold_White='\033[1m'
	Bold_Green='\033[1;32m'
fi

error() {
	echo -e "${Red}error${Color_Off}: $*" >&2
	exit 1
}

info() {
	echo -e "${Dim}$*${Color_Off}"
}

info_bold() {
	echo -e "${Bold_White}$*${Color_Off}"
}

success() {
	echo -e "${Green}$*${Color_Off}"
}

if [[ ${OS:-} = Windows_NT && -z ${ALUMNA_INTERNAL_PRINT_TARGET:-} ]]; then
	powershell -c "irm alumna.dev/install.ps1|iex"
	exit $?
fi

if [[ $# -gt 1 ]]; then
	error 'Too many arguments. Only an optional version is allowed (for example v4.0.0-alpha.8).'
fi

platform=${ALUMNA_INTERNAL_UNAME:-$(uname -ms)}

case $platform in
'Darwin x86_64')
	target=darwin-x64
	;;
'Darwin arm64')
	target=darwin-arm64
	;;
'Linux aarch64' | 'Linux arm64')
	target=linux-arm64
	;;
'Linux x86_64')
	target=linux-x64
	;;
*)
	error "Alumna has no binary for \"$platform\""
	;;
esac

is_musl() {
	if [[ -n ${ALUMNA_INTERNAL_MUSL:-} ]]; then
		[[ $ALUMNA_INTERNAL_MUSL = 1 ]]
		return
	fi
	if [[ -f /etc/alpine-release ]]; then
		return 0
	fi
	if [[ -e /lib/ld-musl-x86_64.so.1 || -e /lib/ld-musl-aarch64.so.1 ]]; then
		return 0
	fi
	if command -v ldd >/dev/null 2>&1; then
		if ldd --version 2>&1 | grep -qi musl; then
			return 0
		fi
	fi
	return 1
}

case $target in
linux*)
	if is_musl; then
		target="$target-musl"
	fi
	;;
esac

if [[ $target = darwin-x64 ]]; then
	rosetta=${ALUMNA_INTERNAL_ROSETTA:-}
	if [[ -z $rosetta ]]; then
		rosetta=$(sysctl -n sysctl.proc_translated 2>/dev/null || true)
	fi
	if [[ $rosetta = 1 ]]; then
		target=darwin-arm64
		if [[ -z ${ALUMNA_INTERNAL_PRINT_TARGET:-} ]]; then
			info "This shell is running in Rosetta 2. Installing Alumna for $target"
		fi
	fi
fi

if [[ -n ${ALUMNA_INTERNAL_PRINT_TARGET:-} ]]; then
	echo "$target"
	exit 0
fi

command -v curl >/dev/null || error 'curl is required to install Alumna'
command -v tar >/dev/null || error 'tar is required to install Alumna'

version=latest
if [[ $# = 1 ]]; then
	version=$1
elif [[ -n ${ALUMNA_VERSION:-} ]]; then
	version=$ALUMNA_VERSION
fi
if [[ $version != latest && $version != v* ]]; then
	version="v$version"
fi

GITHUB=${GITHUB:-https://github.com}
github_repo="$GITHUB/alumna/alumna"
asset="alumna-$target.tar.gz"

if [[ $version = latest ]]; then
	base_uri="$github_repo/releases/latest/download"
else
	base_uri="$github_repo/releases/download/$version"
fi

archive_uri="$base_uri/$asset"
sums_uri="$base_uri/SHA256SUMS"

install_dir=${ALUMNA_INSTALL:-$HOME/.alumna}
bin_dir=$install_dir/bin
exe=$bin_dir/alumna

mkdir -p "$bin_dir" || error "Failed to create \"$bin_dir\""

tmp=$(mktemp -d)
trap 'rm -rf "$tmp"' EXIT

info "Downloading $asset"
curl --fail --location --progress-bar --output "$tmp/$asset" "$archive_uri" ||
	error "Failed to download Alumna from \"$archive_uri\""

curl --fail --location --silent --output "$tmp/SHA256SUMS" "$sums_uri" ||
	error "Failed to download checksums from \"$sums_uri\""

want=$(awk -v f="$asset" '$2 == f { print $1 }' "$tmp/SHA256SUMS")
[[ -n $want ]] || error "No checksum for $asset"

if command -v sha256sum >/dev/null; then
	got=$(sha256sum "$tmp/$asset" | awk '{ print $1 }')
elif command -v shasum >/dev/null; then
	got=$(shasum -a 256 "$tmp/$asset" | awk '{ print $1 }')
else
	error 'sha256sum or shasum is required to verify the download'
fi

if [[ $got != "$want" ]]; then
	error "Checksum mismatch for $asset"
fi

tar -xzf "$tmp/$asset" -C "$tmp" || error 'Failed to extract Alumna'

src="$tmp/alumna-$target/alumna"
if [[ ! -f $src ]]; then
	error "The archive did not contain alumna-$target/alumna"
fi

mv "$src" "$exe" || error "Failed to write \"$exe\""
chmod +x "$exe" || error "Failed to set execute permission on \"$exe\""

tildify() {
	if [[ $1 = "$HOME"/* ]]; then
		echo "~/${1#"$HOME"/}"
	else
		echo "$1"
	fi
}

success "Alumna was installed to ${Bold_Green}$(tildify "$exe")${Color_Off}"

if command -v alumna >/dev/null && [[ $(command -v alumna) = "$exe" ]]; then
	echo "Run 'alumna --help' to get started"
	exit 0
fi

quoted_install_dir=${install_dir//\"/\\\"}
bin_path_line="export PATH=\"$quoted_install_dir/bin:\$PATH\""
refresh_command=''

echo

case $(basename "${SHELL:-}") in
fish)
	fish_config=$HOME/.config/fish/config.fish
	if [[ -w $fish_config ]]; then
		{
			echo
			echo '# alumna'
			echo "set --export ALUMNA_INSTALL \"$quoted_install_dir\""
			echo "set --export PATH \"$quoted_install_dir/bin\" \$PATH"
		} >>"$fish_config"
		info "Added $(tildify "$bin_dir") to PATH in $(tildify "$fish_config")"
		refresh_command="source $(tildify "$fish_config")"
	else
		echo "Add this directory to PATH:"
		info_bold "  set --export PATH \"$quoted_install_dir/bin\" \$PATH"
	fi
	;;
zsh)
	zsh_config=$HOME/.zshrc
	if [[ -w $zsh_config ]]; then
		{
			echo
			echo '# alumna'
			echo "export ALUMNA_INSTALL=\"$quoted_install_dir\""
			echo "$bin_path_line"
		} >>"$zsh_config"
		info "Added $(tildify "$bin_dir") to PATH in $(tildify "$zsh_config")"
		refresh_command="exec $SHELL"
	else
		echo "Add this directory to PATH:"
		info_bold "  $bin_path_line"
	fi
	;;
bash)
	bash_config=''
	for candidate in "$HOME/.bashrc" "$HOME/.bash_profile"; do
		if [[ -w $candidate ]]; then
			bash_config=$candidate
			break
		fi
	done
	if [[ -n $bash_config ]]; then
		{
			echo
			echo '# alumna'
			echo "export ALUMNA_INSTALL=\"$quoted_install_dir\""
			echo "$bin_path_line"
		} >>"$bash_config"
		info "Added $(tildify "$bin_dir") to PATH in $(tildify "$bash_config")"
		refresh_command="source $(tildify "$bash_config")"
	else
		echo "Add this directory to PATH:"
		info_bold "  $bin_path_line"
	fi
	;;
*)
	echo "Add this directory to PATH:"
	info_bold "  $bin_path_line"
	;;
esac

echo
info "To get started, run:"
echo
if [[ -n $refresh_command ]]; then
	info_bold "  $refresh_command"
fi
info_bold "  alumna --help"
