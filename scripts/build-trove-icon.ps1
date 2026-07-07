# Gera icone Trove (verde + T) para atalho Windows
$ProjectRoot = Split-Path $PSScriptRoot -Parent
$Public = Join-Path $ProjectRoot "public"
$PngPath = Join-Path $Public "trove-autopilot.png"
$IcoPath = Join-Path $Public "trove-autopilot.ico"

Add-Type -AssemblyName System.Drawing

function New-TroveBitmap([int]$size) {
  $bmp = New-Object System.Drawing.Bitmap $size, $size
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit

  $green = [System.Drawing.Color]::FromArgb(255, 95, 138, 122)
  $radius = [int]($size * 0.4)
  $rect = New-Object System.Drawing.Rectangle 0, 0, $size, $size
  $path = New-Object System.Drawing.Drawing2D.GraphicsPath
  $path.AddArc($rect.X, $rect.Y, $radius, $radius, 180, 90)
  $path.AddArc($rect.Right - $radius, $rect.Y, $radius, $radius, 270, 90)
  $path.AddArc($rect.Right - $radius, $rect.Bottom - $radius, $radius, $radius, 0, 90)
  $path.AddArc($rect.X, $rect.Bottom - $radius, $radius, $radius, 90, 90)
  $path.CloseFigure()
  $g.FillPath((New-Object System.Drawing.SolidBrush $green), $path)

  $fontSize = [single]($size * 0.42)
  $font = New-Object System.Drawing.Font("Segoe UI", $fontSize, [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Pixel)
  $sf = New-Object System.Drawing.StringFormat
  $sf.Alignment = [System.Drawing.StringAlignment]::Center
  $sf.LineAlignment = [System.Drawing.StringAlignment]::Center
  $g.DrawString("T", $font, [System.Drawing.Brushes]::White, (New-Object System.Drawing.RectangleF 0, 0, $size, $size), $sf)

  $g.Dispose()
  return $bmp
}

$bmp256 = New-TroveBitmap 256
$bmp256.Save($PngPath, [System.Drawing.Imaging.ImageFormat]::Png)

$icon = [System.Drawing.Icon]::FromHandle($bmp256.GetHicon())
$stream = [System.IO.File]::Open($IcoPath, [System.IO.FileMode]::Create)
$icon.Save($stream)
$stream.Close()
$bmp256.Dispose()

Write-Host "Icone Trove: $IcoPath"
