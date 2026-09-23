Write-Host "========================================" -ForegroundColor Cyan
Write-Host " Starting PaperLens Application Locally " -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

$RepoRoot = if ($PSScriptRoot) { $PSScriptRoot } else { (Get-Location).Path }

Write-Host "Cleaning up any existing process on port 8000..." -ForegroundColor Yellow
Get-NetTCPConnection -LocalPort 8000 -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }

Write-Host "Starting Frontend on http://localhost:8080 ..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-ExecutionPolicy", "Bypass", "-Command", "cd '$RepoRoot\frontend'; npm run dev"

Write-Host "Starting Backend on http://localhost:8000 ..." -ForegroundColor Green
$BackendCmd = "cd '$RepoRoot\backend'; if (Test-Path '.venv\Scripts\Activate.ps1') { .\.venv\Scripts\Activate.ps1 }; python -m uvicorn app.main:app --reload --port 8000 --host 127.0.0.1"
Start-Process powershell -ArgumentList "-NoExit", "-ExecutionPolicy", "Bypass", "-Command", "$BackendCmd"

Write-Host "PaperLens Application Started!" -ForegroundColor Yellow
Write-Host "Frontend: http://localhost:8080" -ForegroundColor White
Write-Host "Backend:  http://localhost:8000" -ForegroundColor White
Write-Host "API Docs: http://localhost:8000/docs" -ForegroundColor White
