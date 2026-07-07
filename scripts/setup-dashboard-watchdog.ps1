# Watchdog do painel Trove - inicia no login + verifica a cada 10 min
# Run: powershell -ExecutionPolicy Bypass -File scripts/setup-dashboard-watchdog.ps1

$ProjectRoot = "C:\Users\Guimi\meusprojeto\techdrop-us"
$Node = (Get-Command node).Source

$watchdogAction = New-ScheduledTaskAction -Execute $Node -Argument "--env-file=.env.local scripts/ads-dashboard-watchdog.mjs" -WorkingDirectory $ProjectRoot
$watchdogTrigger = New-ScheduledTaskTrigger -AtLogOn
$settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -DontStopOnIdleEnd -AllowStartIfOnBatteries -RestartCount 3 -RestartInterval (New-TimeSpan -Minutes 1)

Unregister-ScheduledTask -TaskName "Trove-Dashboard-Watchdog" -Confirm:$false -ErrorAction SilentlyContinue
try {
  Register-ScheduledTask -TaskName "Trove-Dashboard-Watchdog" -Action $watchdogAction -Trigger $watchdogTrigger -Settings $settings -User $env:USERNAME -RunLevel Limited -Description "Trove: mantem painel localhost:3847 no ar" | Out-Null
} catch {
  Write-Host "Aviso: watchdog no login precisa de permissao - checagem a cada 10 min ainda funciona"
}

$ensureAction = New-ScheduledTaskAction -Execute $Node -Argument "--env-file=.env.local scripts/ads-dashboard-ensure.mjs" -WorkingDirectory $ProjectRoot
$ensureTrigger = New-ScheduledTaskTrigger -Once -At (Get-Date).Date -RepetitionInterval (New-TimeSpan -Minutes 10) -RepetitionDuration (New-TimeSpan -Days 3650)

Unregister-ScheduledTask -TaskName "Trove-Dashboard-Health" -Confirm:$false -ErrorAction SilentlyContinue
Register-ScheduledTask -TaskName "Trove-Dashboard-Health" -Action $ensureAction -Trigger $ensureTrigger -Settings $settings -User $env:USERNAME -RunLevel Limited -Description "Trove: verifica painel a cada 10 min e avisa Telegram se cair" | Out-Null

Write-Host ""
Write-Host "OK - Trove-Dashboard-Watchdog (inicia no login)"
Write-Host "OK - Trove-Dashboard-Health (checagem a cada 10 min + Telegram)"
Write-Host ""

$startup = [Environment]::GetFolderPath('Startup')
$vbsSrc = Join-Path $ProjectRoot "scripts\trove-watchdog-hidden.vbs"
$vbsDst = Join-Path $startup "Trove-Watchdog.vbs"
if (Test-Path $vbsSrc) {
  Copy-Item $vbsSrc $vbsDst -Force
  Write-Host "OK - Startup folder: $vbsDst"
}

Write-Host "Iniciando watchdog agora..."
Set-Location $ProjectRoot
Start-Process -FilePath $Node -ArgumentList "--env-file=.env.local", "scripts/ads-dashboard-watchdog.mjs" -WorkingDirectory $ProjectRoot -WindowStyle Hidden
Start-Sleep -Seconds 6

try {
  $r = Invoke-WebRequest -Uri "http://localhost:3847/api/ping" -UseBasicParsing -TimeoutSec 8
  if ($r.StatusCode -eq 200) {
    Write-Host "Painel online: http://localhost:3847"
  }
} catch {
  Write-Host 'Aguarde alguns segundos e abra http://localhost:3847'
}

Write-Host ""
