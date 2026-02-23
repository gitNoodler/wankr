# PowerShell script to move wankr repository from OneDrive to Documents
# Run this script from PowerShell: .\move-repo.ps1
# Or right-click and "Run with PowerShell"

$sourcePath = "C:\Users\legro\OneDrive\Documents\GitHub\wankr"
$targetPath = "C:\Users\legro\Documents\GitHub\wankr"

Write-Host "Moving wankr repository from OneDrive..." -ForegroundColor Yellow
Write-Host "Source: $sourcePath" -ForegroundColor Gray
Write-Host "Target: $targetPath" -ForegroundColor Gray
Write-Host ""

# Check if source exists
if (-not (Test-Path $sourcePath)) {
    Write-Host "ERROR: Source path does not exist: $sourcePath" -ForegroundColor Red
    exit 1
}

# Check if target already exists
if (Test-Path $targetPath) {
    Write-Host "WARNING: Target path already exists: $targetPath" -ForegroundColor Yellow
    $response = Read-Host "Do you want to overwrite it? (y/N)"
    if ($response -ne "y" -and $response -ne "Y") {
        Write-Host "Aborted." -ForegroundColor Red
        exit 1
    }
    Remove-Item -Path $targetPath -Recurse -Force
}

# Create target directory if it doesn't exist
$targetParent = Split-Path $targetPath -Parent
if (-not (Test-Path $targetParent)) {
    New-Item -ItemType Directory -Path $targetParent -Force | Out-Null
    Write-Host "Created directory: $targetParent" -ForegroundColor Green
}

# Move the repository
Write-Host "Moving repository..." -ForegroundColor Yellow
try {
    Move-Item -Path $sourcePath -Destination $targetPath -Force
    Write-Host "SUCCESS: Repository moved to: $targetPath" -ForegroundColor Green
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Cyan
    Write-Host "1. Open your IDE/editor and update the workspace path to: $targetPath" -ForegroundColor White
    Write-Host "2. Verify git is working: cd '$targetPath' && git status" -ForegroundColor White
} catch {
    Write-Host "ERROR: Failed to move repository: $_" -ForegroundColor Red
    exit 1
}
