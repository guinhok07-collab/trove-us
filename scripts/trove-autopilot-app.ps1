# Trove Autopilot — abre como programa (janela propria, sem terminal)

$ProjectRoot = "C:\Users\Guimi\meusprojeto\techdrop-us"

$Port = 3847

$Url = "http://localhost:$Port"

$Node = (Get-Command node -ErrorAction SilentlyContinue).Source



if (-not $Node) {

  Add-Type -AssemblyName System.Windows.Forms | Out-Null

  [System.Windows.Forms.MessageBox]::Show("Node.js nao encontrado. Instale nodejs.org", "Trove Autopilot")

  exit 1

}



Add-Type -AssemblyName System.Windows.Forms | Out-Null



function Test-DashboardReady {

  try {

    $r = Invoke-WebRequest -Uri "$Url/api/job-status" -UseBasicParsing -TimeoutSec 3

    return ($r.StatusCode -eq 200)

  } catch {

    return $false

  }

}



function Ensure-Watchdog {

  $watchdog = Get-Process -Name "node" -ErrorAction SilentlyContinue | Where-Object {

    try {

      $cmd = (Get-CimInstance Win32_Process -Filter "ProcessId=$($_.Id)" -ErrorAction SilentlyContinue).CommandLine

      $cmd -match "ads-dashboard-watchdog\.mjs"

    } catch { $false }

  }

  if ($watchdog) { return }



  $watchdogScript = Join-Path $ProjectRoot "scripts\ads-dashboard-watchdog.mjs"

  if (-not (Test-Path (Join-Path $ProjectRoot ".env.local"))) { return }



  Start-Process -FilePath $Node -ArgumentList @("--env-file=.env.local", $watchdogScript) -WorkingDirectory $ProjectRoot -WindowStyle Hidden

}



Ensure-Watchdog



if (-not (Test-DashboardReady)) {

  for ($i = 0; $i -lt 40; $i++) {

    Start-Sleep -Milliseconds 500

    if (Test-DashboardReady) { break }

  }

}



if (-not (Test-DashboardReady)) {

  [System.Windows.Forms.MessageBox]::Show(

    "Painel ainda iniciando ou offline.`n`nAguarde 10s e tente de novo.`nSe persistir: npm run ads:dashboard:install",

    "Trove Autopilot"

  )

  exit 1

}



$edge = "${env:ProgramFiles(x86)}\Microsoft\Edge\Application\msedge.exe"

$edge64 = "$env:ProgramFiles\Microsoft\Edge\Application\msedge.exe"

$chrome = "${env:ProgramFiles(x86)}\Google\Chrome\Application\chrome.exe"

$chrome64 = "$env:ProgramFiles\Google\Chrome\Application\chrome.exe"



$browser = $null

foreach ($b in @($edge64, $edge, $chrome64, $chrome)) {

  if ($b -and (Test-Path $b)) { $browser = $b; break }

}



if ($browser) {

  Start-Process $browser -ArgumentList "--app=$Url", "--window-size=1280,900", "--name=Trove Autopilot"

} else {

  Start-Process $Url

}

