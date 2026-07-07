# Cria atalho "Trove" na Area de Trabalho (icone verde + abre autopilot)
$ProjectRoot = "C:\Users\Guimi\meusprojeto\techdrop-us"
$Launcher = Join-Path $ProjectRoot "scripts\trove-autopilot-app.ps1"
$IconScript = Join-Path $ProjectRoot "scripts\build-trove-icon.ps1"
$Desktop = [Environment]::GetFolderPath("Desktop")
$ShortcutPath = Join-Path $Desktop "Trove.lnk"
$IcoPath = Join-Path $ProjectRoot "public\trove-autopilot.ico"

& powershell -ExecutionPolicy Bypass -File $IconScript

$WatchdogScript = Join-Path $ProjectRoot "scripts\setup-dashboard-watchdog.ps1"
if (Test-Path $WatchdogScript) {
  & powershell -ExecutionPolicy Bypass -File $WatchdogScript
}

$SocialScript = Join-Path $ProjectRoot "scripts\setup-social-organic.ps1"
if (Test-Path $SocialScript) {
  & powershell -ExecutionPolicy Bypass -File $SocialScript
}

$WshShell = New-Object -ComObject WScript.Shell
$Shortcut = $WshShell.CreateShortcut($ShortcutPath)
$Shortcut.TargetPath = "powershell.exe"
$Shortcut.Arguments = "-ExecutionPolicy Bypass -WindowStyle Hidden -File `"$Launcher`""
$Shortcut.WorkingDirectory = $ProjectRoot
$Shortcut.Description = "Trove Autopilot - painel Meta Ads e automacao"
if (Test-Path $IcoPath) {
  $Shortcut.IconLocation = "$IcoPath,0"
} else {
  $png = Join-Path $ProjectRoot "public\trove-autopilot.png"
  if (Test-Path $png) { $Shortcut.IconLocation = "$png,0" }
}
$Shortcut.Save()

# Remove atalho antigo com nome longo (se existir)
$OldShortcut = Join-Path $Desktop "Trove Autopilot.lnk"
if (Test-Path $OldShortcut) { Remove-Item $OldShortcut -Force }

Write-Host ""
Write-Host "Atalho criado: $ShortcutPath"
Write-Host "Icone Trove na Area de Trabalho - duplo clique abre o painel"
Write-Host ""
