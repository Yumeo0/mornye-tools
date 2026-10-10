# Refresh the pinned Wuthering Waves protocol artifacts used by the vendored
# `spectrum` crate.
#
# The actual proto extraction/decryption workflow lives in the wuwa-protos
# repository (extractor/). This script only *pins* the resulting artifacts into
# this repository so app builds are offline and reproducible:
#
#   1. read  <WuwaProtos>/out/spectrum/protos.proto   and packetIds.json
#   2. read the wuwa-data checkout for the current game/resource version
#   3. write data/wuwa-protos/{protos.proto,packetIds.json,VERSION.json}
#
# Usage:
#   pwsh scripts/update-wuwa-protos.ps1 [-WuwaProtos <path>] [-WuwaData <path>]
#
# Prerequisite: the wuwa-protos tools have already regenerated
# out/spectrum/protos.proto and out/spectrum/packetIds.json.

param(
    [string]$WuwaProtos = (Join-Path (Split-Path $PSScriptRoot -Parent) "..\wuwa-protos"),
    [string]$WuwaData = (Join-Path (Split-Path $PSScriptRoot -Parent) "data\wuwa-data")
)

$ErrorActionPreference = "Stop"

$repoRoot = Split-Path $PSScriptRoot -Parent
$outDir = Join-Path $repoRoot "data\wuwa-protos"
$sourceDir = Join-Path $WuwaProtos "out\spectrum"

if (-not (Test-Path (Join-Path $sourceDir "protos.proto"))) {
    throw "protos.proto not found under $sourceDir. Run the wuwa-protos extraction tools first, or pass -WuwaProtos."
}
if (-not (Test-Path (Join-Path $sourceDir "packetIds.json"))) {
    throw "packetIds.json not found under $sourceDir."
}

New-Item -ItemType Directory -Force -Path $outDir | Out-Null
Copy-Item (Join-Path $sourceDir "protos.proto") (Join-Path $outDir "protos.proto") -Force
Copy-Item (Join-Path $sourceDir "packetIds.json") (Join-Path $outDir "packetIds.json") -Force

# Best-effort version stamp from the wuwa-data checkout.
$gameVersion = "unknown"
$resourceVersion = "unknown"
$versionFile = Join-Path $WuwaData "version.json"
if (Test-Path $versionFile) {
    $version = Get-Content $versionFile -Raw | ConvertFrom-Json
    if ($version.gameVersion) { $gameVersion = $version.gameVersion }
    if ($version.resourceVersion) { $resourceVersion = $version.resourceVersion }
}

$stamp = [ordered]@{
    game_version     = $gameVersion
    resource_version = $resourceVersion
    source           = "wuwa-protos"
    generated_by     = "scripts/update-wuwa-protos.ps1"
    note             = "Pinned protocol artifacts (protos.proto, packetIds.json) used by the vendored spectrum crate at src-tauri/crates/spectrum."
}
$stamp | ConvertTo-Json | Set-Content (Join-Path $outDir "VERSION.json") -Encoding UTF8

$protoHash = (Get-FileHash (Join-Path $outDir "protos.proto") -Algorithm SHA256).Hash
Write-Host "Updated data/wuwa-protos (game $gameVersion / res $resourceVersion)"
Write-Host "  protos.proto  sha256=$protoHash"
