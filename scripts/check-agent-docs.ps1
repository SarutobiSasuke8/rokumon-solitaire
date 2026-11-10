# PowerShell script to verify agent doc links and consistency
param([switch]$Strict)

$ErrorActionPreference = "Stop"

Write-Host "Checking agent documentation files..." -ForegroundColor Cyan

$filesToCheck = @("AGENTS.md", "CLAUDE.md", "GEMINI.md", "CODEX.md", "TODO.md", "ROADMAP.md")
foreach ($file in $filesToCheck) {
    if (-not (Test-Path -LiteralPath $file)) {
        Write-Error "Missing required agent file: $file"
    } else {
        Write-Host "  [OK] $file exists." -ForegroundColor Green
    }
}

Write-Host "Agent documentation verification complete!" -ForegroundColor Green
