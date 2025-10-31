param(
    [switch]$NoWait
)

$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$backendDir = Join-Path $root "backend"
$frontendDir = Join-Path $root "frontend"

if (-not (Test-Path (Join-Path $backendDir "package.json"))) {
    throw "Folder backend tidak ditemukan. Pastikan skrip dijalankan dari akar repositori."
}

if (-not (Test-Path (Join-Path $frontendDir "package.json"))) {
    throw "Folder frontend tidak ditemukan. Pastikan skrip dijalankan dari akar repositori."
}

Write-Host "Menjalankan backend (npm run dev)..." -ForegroundColor Cyan
$backendProcess = Start-Process -FilePath "powershell.exe" `
    -ArgumentList "-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", "npm run dev" `
    -WorkingDirectory $backendDir -PassThru

Write-Host "Menjalankan frontend (npm run dev)..." -ForegroundColor Cyan
$frontendProcess = Start-Process -FilePath "powershell.exe" `
    -ArgumentList "-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", "npm run dev" `
    -WorkingDirectory $frontendDir -PassThru

Write-Host ""
Write-Host "Backend PID : $($backendProcess.Id)"
Write-Host "Frontend PID: $($frontendProcess.Id)"
Write-Host ""

if (-not $NoWait) {
    Write-Host "Tekan ENTER untuk menghentikan kedua proses..." -ForegroundColor Yellow
    [void](Read-Host)
    Write-Host "Menghentikan proses..." -ForegroundColor Cyan
}

foreach ($proc in @($frontendProcess, $backendProcess)) {
    if ($proc -and -not $proc.HasExited) {
        try {
            Stop-Process -Id $proc.Id -Force
        } catch {
            Write-Warning "Gagal menghentikan proses PID $($proc.Id): $_"
        }
    }
}

Write-Host "Selesai." -ForegroundColor Green
