Set-Location -Path "C:\Users\New\.gemini\antigravity\scratch\block-breaker"

Write-Host "=========================================="
Write-Host " Downloading GitHub CLI..."
Write-Host "=========================================="
Invoke-WebRequest -Uri "https://github.com/cli/cli/releases/download/v2.46.0/gh_2.46.0_windows_amd64.zip" -OutFile "gh.zip"
Expand-Archive "gh.zip" -DestinationPath ".\gh" -Force
$env:Path += ";$PWD\gh\gh_2.46.0_windows_amd64\bin"
$env:Path += ";C:\Program Files\Git\cmd"

& "C:\Program Files\Git\cmd\git.exe" branch -M main

Write-Host "`n=========================================="
Write-Host " Secure GitHub Sign-In"
Write-Host "=========================================="
Write-Host "Please follow the instructions below to authenticate."
Write-Host "1. Note the one-time code."
Write-Host "2. Press ENTER to open your browser."
Write-Host "3. Authorize GitHub CLI."
gh auth login -h github.com -p https -w

Write-Host "`n=========================================="
Write-Host " Creating Repository & Pushing Code..."
Write-Host "=========================================="
gh repo create block-breaker-game --public --source=. --remote=origin --push

Write-Host "`n=========================================="
Write-Host " SUCCESS! Everything is published."
Write-Host " You can close this window now and head to Vercel."
Write-Host "=========================================="
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
