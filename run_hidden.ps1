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

$process = Start-Process -FilePath "cmd.exe" `
  -ArgumentList "/c", $Command `
  -WorkingDirectory $WorkDir `
  -WindowStyle Hidden `
  -RedirectStandardOutput $Log `
  -RedirectStandardError $Log `
  -PassThru

$process.WaitForExit()

if ($process.ExitCode -ne 0) {
  $show = "type `"$Log`" & echo. & echo Exit code $($process.ExitCode). Press any key to close... & pause"
  Start-Process -FilePath "cmd.exe" -ArgumentList "/k", $show -WindowStyle Normal
}
