# Agendar relatório diário Trove (Telegram 08:00)
# Run: powershell -ExecutionPolicy Bypass -File scripts/setup-daily-report.ps1

$ProjectRoot = "C:\Users\Guimi\meusprojeto\techdrop-us"
$Node = (Get-Command node).Source

$action = New-ScheduledTaskAction -Execute $Node -Argument "--env-file=.env.local scripts/ads-daily-report.mjs" -WorkingDirectory $ProjectRoot
$trigger = New-ScheduledTaskTrigger -Daily -At "08:00"
$settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -DontStopOnIdleEnd -AllowStartIfOnBatteries

Unregister-ScheduledTask -TaskName "Trove-Daily-Report" -Confirm:$false -ErrorAction SilentlyContinue
Register-ScheduledTask -TaskName "Trove-Daily-Report" -Action $action -Trigger $trigger -Settings $settings -Description "Trove: relatório diário ROAS/vendas no Telegram"

Write-Host ""
Write-Host "OK - Trove-Daily-Report agendado todo dia as 08:00"
Write-Host "Teste agora: npm run ads:daily-report"
Write-Host ""

Set-Location $ProjectRoot
& $Node --env-file=.env.local scripts/ads-daily-report.mjs --dry-run
