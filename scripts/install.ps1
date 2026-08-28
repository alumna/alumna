#!/usr/bin/env pwsh
param(
	[String]$Version = "latest",
	[Switch]$NoPathUpdate = $false,
	[Switch]$PrintTarget = $false
)

$ErrorActionPreference = "Stop"

function Fail {
	param([String]$Message)
	Write-Error $Message
	exit 1
}

$Arch = $env:ALUMNA_INTERNAL_ARCH
if (-not $Arch) {
	$Arch = (Get-ItemProperty "HKLM:\SYSTEM\CurrentControlSet\Control\Session Manager\Environment").PROCESSOR_ARCHITECTURE
}

if ($Arch -eq "AMD64") {
	$Target = "windows-x64"
}
elseif ($Arch -eq "ARM64") {
	$Target = "windows-arm64"
}
else {
	Fail "Alumna for Windows is only available for x64 and ARM64. This machine reports $Arch."
}

if ($PrintTarget -or $env:ALUMNA_INTERNAL_PRINT_TARGET -eq "1") {
	Write-Output $Target
	exit 0
}

if ($Version -eq "latest" -and $env:ALUMNA_VERSION) {
	$Version = $env:ALUMNA_VERSION
}

if ($Version -eq "latest") {
	$TagPart = "latest/download"
}
else {
	if ($Version -notlike "v*") {
		$Version = "v$Version"
	}
	$TagPart = "download/$Version"
}

$GitHub = if ($env:GITHUB) { $env:GITHUB.TrimEnd("/") } else { "https://github.com" }
$Repo = "$GitHub/alumna/alumna"
$Asset = "alumna-$Target.zip"
$BaseUrl = "$Repo/releases/$TagPart"
$ZipUrl = "$BaseUrl/$Asset"
$SumsUrl = "$BaseUrl/SHA256SUMS"

$InstallRoot = if ($env:ALUMNA_INSTALL) { $env:ALUMNA_INSTALL } else { Join-Path $HOME ".alumna" }
$BinDir = Join-Path $InstallRoot "bin"
$Exe = Join-Path $BinDir "alumna.exe"

$null = New-Item -ItemType Directory -Force -Path $BinDir
$Tmp = Join-Path ([System.IO.Path]::GetTempPath()) ("alumna-install-" + [Guid]::NewGuid().ToString("n"))
$null = New-Item -ItemType Directory -Force -Path $Tmp

try {
	$ZipPath = Join-Path $Tmp $Asset
	$SumsPath = Join-Path $Tmp "SHA256SUMS"

	Write-Output "Downloading $Asset"
	$downloaded = $false
	if (Get-Command curl.exe -ErrorAction SilentlyContinue) {
		& curl.exe -fsSL -o $ZipPath $ZipUrl
		if ($LASTEXITCODE -eq 0) {
			& curl.exe -fsSL -o $SumsPath $SumsUrl
			$downloaded = ($LASTEXITCODE -eq 0)
		}
	}
	if (-not $downloaded) {
		Invoke-RestMethod -Uri $ZipUrl -OutFile $ZipPath
		Invoke-RestMethod -Uri $SumsUrl -OutFile $SumsPath
	}

	if (-not (Test-Path $ZipPath) -or -not (Test-Path $SumsPath)) {
		Fail "Failed to download Alumna from $ZipUrl"
	}

	$WantLine = Get-Content $SumsPath | Where-Object { $_ -match [Regex]::Escape($Asset) + "$" } | Select-Object -First 1
	if (-not $WantLine) {
		Fail "No checksum for $Asset"
	}
	$Want = ($WantLine -split "\s+")[0].ToLowerInvariant()
	$Got = (Get-FileHash -Path $ZipPath -Algorithm SHA256).Hash.ToLowerInvariant()
	if ($Got -ne $Want) {
		Fail "Checksum mismatch for $Asset"
	}

	$ExtractDir = Join-Path $Tmp "extract"
	$ProgressPreference = "SilentlyContinue"
	Expand-Archive -Path $ZipPath -DestinationPath $ExtractDir -Force
	$Src = Join-Path $ExtractDir "alumna-$Target\alumna.exe"
	if (-not (Test-Path $Src)) {
		Fail "The archive did not contain alumna-$Target\alumna.exe"
	}

	if (Test-Path $Exe) {
		Remove-Item $Exe -Force
	}
	Move-Item $Src $Exe -Force
}
finally {
	if (Test-Path $Tmp) {
		Remove-Item $Tmp -Recurse -Force -ErrorAction SilentlyContinue
	}
}

$C_RESET = [char]27 + "[0m"
$C_GREEN = [char]27 + "[1;32m"
Write-Output "${C_GREEN}Alumna was installed to $Exe${C_RESET}"

if (-not $NoPathUpdate) {
	$UserPath = [Environment]::GetEnvironmentVariable("Path", "User")
	if (-not $UserPath) { $UserPath = "" }
	$Parts = @($UserPath.Split(";") | Where-Object { $_ -ne "" })
	if ($Parts -notcontains $BinDir) {
		$Parts += $BinDir
		[Environment]::SetEnvironmentVariable("Path", ($Parts -join ";"), "User")
		$env:Path = $BinDir + ";" + $env:Path
		Write-Output "Added $BinDir to the user PATH. Open a new terminal, then run alumna --help"
	}
	else {
		Write-Output "Run alumna --help to get started"
	}
}
else {
	Write-Output "Run alumna --help to get started"
}
