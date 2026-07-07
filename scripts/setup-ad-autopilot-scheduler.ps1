# Agendar autopilot Trove no Windows Task Scheduler
# Run: powershell -ExecutionPolicy Bypass -File scripts/setup-ad-autopilot-scheduler.ps1

$ProjectRoot = "C:\Users\Guimi\meusprojeto\techdrop-us"
$Node = (Get-Command node).Source

function Register-TroveTask {
  param(
    [string]$Name,
    [string]$Schedule,
    [string]$Script
  )

  $action = New-ScheduledTaskAction -Execute $Node -Argument "--env-file=.env.local scripts/$Script" -WorkingDirectory $ProjectRoot
  $trigger = New-ScheduledTaskTrigger @Schedule
  $settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -DontStopOnIdleEnd

  Unregister-ScheduledTask -TaskName $Name -Confirm:$false -ErrorAction SilentlyContinue
  Register-ScheduledTask -TaskName $Name -Action $action -Trigger $trigger -Settings $settings -Description "Trove Meta Ads Autopilot"
  Write-Host "Registered: $Name"
}

# Review diario 9h
Register-TroveTask -Name "Trove-Ads-Review" -Schedule @{ Daily = $true; At = "09:00" } -Script "meta-ads-review.mjs"

# Autopilot segunda 10h
Register-TroveTask -Name "Trove-Ads-Autopilot" -Schedule @{ Weekly = $true; DaysOfWeek = Monday; At = "10:00" } -Script "meta-ads-autopilot.mjs"

Write-Host ""
Write-Host "Done. Tasks: Trove-Ads-Review (daily 9h), Trove-Ads-Autopilot (Mon 10h)"
Write-Host "Requires .env.local with META_ACCESS_TOKEN in $ProjectRoot"
