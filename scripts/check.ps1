# SpaceBench gate. Runs every gate and prints PASS or FAIL for each.
#
# Usage, from any directory:
#   pwsh -NoProfile -File scripts/check.ps1
#
# Gates: physics (core tests), clippy (native and wasm), determinism (the
# native and WebAssembly builds must print the same bits). Every gate runs
# even when an earlier one fails. Exit code 1 if any gate fails, else 0.

$ErrorActionPreference = 'Continue'
$root = Split-Path -Parent $PSScriptRoot
Set-Location -LiteralPath $root

function Invoke-Tool {
    # Runs one command with stderr merged into stdout and prints every line.
    # Returns the exit code and the lines. Never throws, so later steps still run.
    param(
        [Parameter(Mandatory = $true)][string]$FilePath,
        [string[]]$Arguments = @()
    )
    Write-Host ('> ' + $FilePath + ' ' + ($Arguments -join ' '))
    $exitCode = -1
    $lines = @()
    try {
        $raw = @(& $FilePath @Arguments 2>&1)
        $exitCode = $LASTEXITCODE
        $lines = @($raw | ForEach-Object { "$_" })
    }
    catch {
        $lines = @("could not run $FilePath : $($_.Exception.Message)")
    }
    foreach ($line in $lines) { Write-Host ('  ' + $line) }
    Write-Host ('  exit code: ' + $exitCode)
    return [pscustomobject]@{ ExitCode = $exitCode; Lines = $lines }
}

function Invoke-Gate {
    # Runs one gate body and returns its boolean. An exception counts as a failure.
    param([string]$Name, [scriptblock]$Body)
    Write-Host ''
    Write-Host ('== gate: ' + $Name)
    try {
        return [bool](& $Body)
    }
    catch {
        Write-Host ('  gate error: ' + $_.Exception.Message)
        return $false
    }
}

function Invoke-PhysicsGate {
    $test = Invoke-Tool -FilePath 'cargo' -Arguments @('test', '--locked', '-p', 'spacebench-core')
    $passed = 0
    foreach ($line in $test.Lines) {
        if ($line -match '^\s*test result: \S+\. (\d+) passed') { $passed += [int]$Matches[1] }
    }
    Write-Host ('  passed tests across all test result lines: ' + $passed)
    return (($test.ExitCode -eq 0) -and ($passed -gt 0))
}

function Invoke-ClippyGate {
    $native = Invoke-Tool -FilePath 'cargo' -Arguments @('clippy', '--workspace', '--all-targets', '--locked', '--', '-D', 'warnings')
    $wasm = Invoke-Tool -FilePath 'cargo' -Arguments @('clippy', '--workspace', '--lib', '--locked', '--target', 'wasm32-unknown-unknown', '--', '-D', 'warnings')
    return (($native.ExitCode -eq 0) -and ($wasm.ExitCode -eq 0))
}

function Get-TargetDirectory {
    # Asks cargo where artifacts go, so CARGO_TARGET_DIR is respected. Returns $null on failure.
    try {
        $json = @(& cargo metadata --no-deps --format-version 1 --locked 2>$null)
        if ($LASTEXITCODE -ne 0) { return $null }
        $meta = ($json -join "`n") | ConvertFrom-Json
        return [string]$meta.target_directory
    }
    catch {
        return $null
    }
}

function Test-Probe {
    # True only for exit code 0 and exactly one line: the ABI probe value.
    param($Result)
    return (($Result.ExitCode -eq 0) -and ($Result.Lines.Count -eq 1) -and ($Result.Lines[0] -ceq 'fedcba9876543210'))
}

function Get-RunHash {
    # Returns the hash only for exit code 0 and exactly one line of 16 lowercase hex digits.
    # Returns $null for any other outcome, so a failed run never matches anything.
    param([string]$FilePath, [string[]]$Arguments)
    $result = Invoke-Tool -FilePath $FilePath -Arguments $Arguments
    if (($result.ExitCode -eq 0) -and ($result.Lines.Count -eq 1) -and ($result.Lines[0] -cmatch '^[0-9a-f]{16}$')) {
        return $result.Lines[0]
    }
    return $null
}

function Get-RunPair {
    # Runs both sides for one seed and tick count. Each side is a hash, or $null when it failed or was skipped.
    param([long]$Seed, [long]$Ticks)
    $native = $null
    if ($script:Det.NativeBuilt) {
        $native = Get-RunHash -FilePath $script:Det.NativeExe -Arguments @("$Seed", "$Ticks")
    }
    $node = $null
    if ($script:Det.WasmBuilt) {
        $node = Get-RunHash -FilePath 'node' -Arguments @($script:Det.NodeScript, $script:Det.WasmFile, "$Seed", "$Ticks")
    }
    return [pscustomobject]@{ Native = $native; Node = $node }
}

function Get-PairStatus {
    # 'invalid' if either side has no valid hash. 'match' only if both are valid and equal.
    param($Pair)
    if (($null -eq $Pair.Native) -or ($null -eq $Pair.Node)) { return 'invalid' }
    if ($Pair.Native -ceq $Pair.Node) { return 'match' }
    return 'differ'
}

function Format-Side {
    param($Value, [bool]$Built)
    if (-not $Built) { return 'skipped' }
    if ($null -eq $Value) { return 'FAIL' }
    return [string]$Value
}

function Find-FirstDifference {
    # Given that the two sides differ at $DifferAt, returns the smallest tick count where they differ.
    # Returns $null if a run in the search fails. Relies on the chained hash: once it differs it stays different.
    param([long]$Seed, [long]$DifferAt)
    $zero = Get-PairStatus (Get-RunPair -Seed $Seed -Ticks 0)
    if ($zero -eq 'differ') { return [long]0 }
    if ($zero -eq 'invalid') { return $null }
    [long]$low = 0
    [long]$high = $DifferAt
    while (($high - $low) -gt 1) {
        [long]$mid = $low + [math]::Floor(($high - $low) / 2)
        $status = Get-PairStatus (Get-RunPair -Seed $Seed -Ticks $mid)
        Write-Host ('  bisect seed=' + $Seed + ' ticks=' + $mid + ' -> ' + $status)
        if ($status -eq 'invalid') { return $null }
        if ($status -eq 'differ') { $high = $mid } else { $low = $mid }
    }
    return [long]$high
}

function Invoke-DeterminismGate {
    $ok = $true
    $targetDir = Get-TargetDirectory
    if ([string]::IsNullOrEmpty($targetDir)) {
        Write-Host '  cargo metadata failed, so the artifact paths are unknown'
        return $false
    }
    $exeSuffix = ''
    if ($IsWindows) { $exeSuffix = '.exe' }
    $script:Det = @{
        NativeExe   = (Join-Path (Join-Path $targetDir 'release') ('native_hash' + $exeSuffix))
        WasmFile    = (Join-Path (Join-Path (Join-Path $targetDir 'wasm32-unknown-unknown') 'release') 'spacebench_wasm.wasm')
        NodeScript  = (Join-Path (Join-Path $root 'scripts') 'wasm_hash.mjs')
        NativeBuilt = $false
        WasmBuilt   = $false
    }

    Write-Host '  step a: build the wasm library'
    $buildWasm = Invoke-Tool -FilePath 'cargo' -Arguments @('build', '--locked', '-p', 'spacebench-wasm', '--lib', '--release', '--target', 'wasm32-unknown-unknown')
    $script:Det.WasmBuilt = (($buildWasm.ExitCode -eq 0) -and (Test-Path -LiteralPath $script:Det.WasmFile))
    if (-not $script:Det.WasmBuilt) { $ok = $false }

    Write-Host '  step b: build the native hash runner'
    $buildNative = Invoke-Tool -FilePath 'cargo' -Arguments @('build', '--locked', '-p', 'spacebench-wasm', '--bin', 'native_hash', '--release')
    $script:Det.NativeBuilt = (($buildNative.ExitCode -eq 0) -and (Test-Path -LiteralPath $script:Det.NativeExe))
    if (-not $script:Det.NativeBuilt) { $ok = $false }

    Write-Host '  step c: ABI probe on both sides'
    $nativeProbe = $false
    if ($script:Det.NativeBuilt) {
        $probe = Invoke-Tool -FilePath $script:Det.NativeExe -Arguments @('--probe')
        $nativeProbe = Test-Probe $probe
    }
    $nodeProbe = $false
    if ($script:Det.WasmBuilt) {
        $probe = Invoke-Tool -FilePath 'node' -Arguments @($script:Det.NodeScript, $script:Det.WasmFile, '--probe')
        $nodeProbe = Test-Probe $probe
    }
    Write-Host ('  probe native=' + $nativeProbe + ' node=' + $nodeProbe)
    if (-not ($nativeProbe -and $nodeProbe)) { $ok = $false }

    Write-Host '  step d: scripted runs on both sides'
    $seeds = @([long]1, [long]2, [long]3735928559)
    $tickCounts = @([long]0, [long]1, [long]7, [long]1000, [long]200000)
    foreach ($seed in $seeds) {
        $firstDiffer = $null
        foreach ($ticks in $tickCounts) {
            $pair = Get-RunPair -Seed $seed -Ticks $ticks
            $status = Get-PairStatus $pair
            $nativeText = Format-Side $pair.Native $script:Det.NativeBuilt
            $nodeText = Format-Side $pair.Node $script:Det.WasmBuilt
            Write-Host ('  run seed=' + $seed + ' ticks=' + $ticks + ' native=' + $nativeText + ' node=' + $nodeText + ' -> ' + $status)
            if ($status -ne 'match') { $ok = $false }
            if (($status -eq 'differ') -and ($null -eq $firstDiffer)) { $firstDiffer = $ticks }
        }
        if ($null -ne $firstDiffer) {
            Write-Host ('  step e: bisecting seed=' + $seed + ' from ticks=' + $firstDiffer)
            $first = Find-FirstDifference -Seed $seed -DifferAt $firstDiffer
            if ($null -eq $first) {
                Write-Host ('  step e: seed=' + $seed + ' bisect stopped because a run failed')
            }
            else {
                Write-Host ('  first differing tick count for seed=' + $seed + ': ' + $first)
            }
        }
    }
    return $ok
}

Write-Host '== tool versions'
foreach ($tool in @('rustc', 'cargo', 'node')) {
    $null = Invoke-Tool -FilePath $tool -Arguments @('--version')
}

$gatePhysics = Invoke-Gate -Name 'physics' -Body { Invoke-PhysicsGate }
$gateClippy = Invoke-Gate -Name 'clippy' -Body { Invoke-ClippyGate }
$gateDeterminism = Invoke-Gate -Name 'determinism' -Body { Invoke-DeterminismGate }

$results = [ordered]@{
    physics     = $gatePhysics
    clippy      = $gateClippy
    determinism = $gateDeterminism
}
Write-Host ''
$anyFailed = $false
foreach ($name in $results.Keys) {
    if ($results[$name]) {
        Write-Host ('PASS ' + $name)
    }
    else {
        Write-Host ('FAIL ' + $name)
        $anyFailed = $true
    }
}
if ($anyFailed) { exit 1 }
exit 0
