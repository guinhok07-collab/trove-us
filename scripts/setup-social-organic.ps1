# Agendar Social Autopilot — 1 Reel/dia (Instagram + Facebook)
# Run: powershell -ExecutionPolicy Bypass -File scripts/setup-social-organic.ps1

$ProjectRoot = "C:\Users\Guimi\meusprojeto\techdrop-us"
$Node = (Get-Command node).Source
$Hour = "15:00"

$envFile = Join-Path $ProjectRoot ".env.local"
if (Test-Path $envFile) {
  $line = Get-Content $envFile | Where-Object { $_ -match '^\s*META_SOCIAL_ORGANIC_HOUR\s*=\s*(\d+)\s*$' } | Select-Object -First 1
  if ($line -match 'META_SOCIAL_ORGANIC_HOUR\s*=\s*(\d+)') {
    $h = [int]$Matches[1]
    if ($h -ge 0 -and $h -le 23) { $Hour = "{0:D2}:00" -f $h }
  }
}

$action = New-ScheduledTaskAction -Execute $Node -Argument "--env-file=.env.local scripts/social-organic-daily.mjs" -WorkingDirectory $ProjectRoot
$trigger = New-ScheduledTaskTrigger -Daily -At $Hour
$settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -DontStopOnIdleEnd -AllowStartIfOnBatteries

Unregister-ScheduledTask -TaskName "Trove-Social-Organic" -Confirm:$false -ErrorAction SilentlyContinue
Register-ScheduledTask -TaskName "Trove-Social-Organic" -Action $action -Trigger $trigger -Settings $settings -Description "Trove: 1 Reel organico/dia no Instagram + Facebook"

Write-Host ""
Write-Host "OK - Trove-Social-Organic agendado todo dia as $Hour"
Write-Host "Automatico: Windows Task + scheduler no painel (quando Trove estiver aberto)"
Write-Host "Teste: npm run social:organic:dry"
Write-Host ""
Write-Host "Requisito Meta: permissao instagram_content_publish + pages_manage_posts"
Write-Host ""
