# Agendar Trove Auto-Watch (analise + ajuste + novos anuncios)
# Run: powershell -ExecutionPolicy Bypass -File scripts/setup-ad-auto-watch.ps1

$ProjectRoot = "C:\Users\Guimi\meusprojeto\techdrop-us"
$Node = (Get-Command node).Source

$action = New-ScheduledTaskAction -Execute $Node -Argument "--env-file=.env.local scripts/ads-auto-watch.mjs" -WorkingDirectory $ProjectRoot

# 12x por dia: a cada 2 horas
$times = @("00:00", "02:00", "04:00", "06:00", "08:00", "10:00", "12:00", "14:00", "16:00", "18:00", "20:00", "22:00")
$triggers = foreach ($t in $times) {
  New-ScheduledTaskTrigger -Daily -At $t
}

$settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -DontStopOnIdleEnd -AllowStartIfOnBatteries

Unregister-ScheduledTask -TaskName "Trove-Auto-Watch" -Confirm:$false -ErrorAction SilentlyContinue
Register-ScheduledTask -TaskName "Trove-Auto-Watch" -Action $action -Trigger $triggers -Settings $settings -Description "Trove: analisa Meta ads, pausa ruins, cria novos"

Write-Host ""
Write-Host "OK - Trove-Auto-Watch agendado 12x por dia (a cada 2h)"
Write-Host "Analisa metricas, pausa ruins, impulsiona bons, cria novos se precisar"
Write-Host "Painel: clique em Trove Autopilot na Area de Trabalho"
Write-Host ""

# Rodar 1 ciclo agora para confirmar
Write-Host "Rodando primeiro ciclo agora..."
Set-Location $ProjectRoot
& $Node --env-file=.env.local scripts/ads-auto-watch.mjs
