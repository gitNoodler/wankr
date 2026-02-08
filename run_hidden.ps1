param(
  [Parameter(Mandatory = $true)][string]$Title,
  [Parameter(Mandatory = $true)][string]$WorkDir,
  [Parameter(Mandatory = $true)][string]$Command,
  [Parameter(Mandatory = $true)][string]$Log
)

$logDir = Split-Path -Parent $Log
if ($logDir -and -not (Test-Path $logDir)) {
  New-Item -ItemType Directory -Path $logDir -Force | Out-Null
}

$cmd = "$Command 1>`"$Log`" 2>&1"
$process = Start-Process -FilePath "cmd.exe" `
  -ArgumentList "/c", $cmd `
  -WorkingDirectory $WorkDir `
  -WindowStyle Hidden `
  -PassThru

$process.WaitForExit()

if ($process.ExitCode -ne 0) {
  $show = "type `"$Log`" & echo. & echo Exit code $($process.ExitCode). Press any key to close... & pause"
  Start-Process -FilePath "cmd.exe" -ArgumentList "/k", $show -WindowStyle Normal
}
