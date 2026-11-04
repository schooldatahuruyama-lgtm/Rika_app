$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
$projectDir = (Resolve-Path (Join-Path $PSScriptRoot '../..')).Path
$assetDir = Join-Path $projectDir 'assets/avatars'
$originalDir = Join-Path $assetDir 'originals'
New-Item -ItemType Directory -Path $originalDir -Force | Out-Null
$sources = Get-Content -LiteralPath (Join-Path $PSScriptRoot 'sources.json') -Raw | ConvertFrom-Json
foreach ($item in $sources) {
  $original = Join-Path $originalDir ($item.id + '.png')
  Copy-Item -LiteralPath $item.source -Destination $original
  $sourceImage = [System.Drawing.Image]::FromFile($original)
  $bitmap = [System.Drawing.Bitmap]::new(256, 256, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
  try {
    $graphics.Clear([System.Drawing.Color]::Transparent)
    $graphics.CompositingMode = [System.Drawing.Drawing2D.CompositingMode]::SourceCopy
    $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $scale = [Math]::Min(256 / $sourceImage.Width, 256 / $sourceImage.Height)
    $width = [int][Math]::Round($sourceImage.Width * $scale)
    $height = [int][Math]::Round($sourceImage.Height * $scale)
    $rect = [System.Drawing.Rectangle]::new([int]((256 - $width) / 2), [int]((256 - $height) / 2), $width, $height)
    $graphics.DrawImage($sourceImage, $rect, 0, 0, $sourceImage.Width, $sourceImage.Height, [System.Drawing.GraphicsUnit]::Pixel)
    $outputFile = Join-Path $assetDir ($item.id + '.png')
    $bitmap.Save($outputFile, [System.Drawing.Imaging.ImageFormat]::Png)
    $transparentPixels = 0
    $opaquePixels = 0
    for ($y = 0; $y -lt 256; $y++) {
      for ($x = 0; $x -lt 256; $x++) {
        $alpha = $bitmap.GetPixel($x, $y).A
        if ($alpha -eq 0) { $transparentPixels++ }
        if ($alpha -ge 240) { $opaquePixels++ }
      }
    }
    if ($transparentPixels -lt 5000 -or $opaquePixels -lt 10000) { throw "Unexpected alpha channel: $($item.id)" }
    [pscustomobject]@{Name=$item.label; File=$outputFile; OriginalSize=('{0}x{1}' -f $sourceImage.Width,$sourceImage.Height); Bytes=(Get-Item -LiteralPath $outputFile).Length; TransparentPixels=$transparentPixels; OpaquePixels=$opaquePixels}
  } finally {
    $graphics.Dispose()
    $bitmap.Dispose()
    $sourceImage.Dispose()
  }
}

# 実画面のスクリーンショットではなく、画像を実際の使用サイズで並べる確認用シート。
$preview = [System.Drawing.Bitmap]::new(810, 570)
$canvas = [System.Drawing.Graphics]::FromImage($preview)
$font = [System.Drawing.Font]::new('Yu Gothic UI', 14)
$smallFont = [System.Drawing.Font]::new('Yu Gothic UI', 10)
$colors = @('#FFF0E9', '#FFF7DA', '#E4F5F1', '#F3EBFC', '#EDF6DF', '#E9F4FF')
try {
  $canvas.Clear([System.Drawing.ColorTranslator]::FromHtml('#EEF3FF'))
  $canvas.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  for ($i = 0; $i -lt $sources.Count; $i++) {
    $item = $sources[$i]
    $left = 15 + ($i % 3) * 265
    $top = 15 + [Math]::Floor($i / 3) * 280
    $canvas.FillRectangle([System.Drawing.Brushes]::White, $left, $top, 250, 265)
    $asset = [System.Drawing.Image]::FromFile((Join-Path $assetDir ($item.id + '.png')))
    $brush = [System.Drawing.SolidBrush]::new([System.Drawing.ColorTranslator]::FromHtml($colors[$i]))
    try {
      $canvas.DrawImage($asset, [int]($left + 45), [int]($top + 8), 160, 160)
      $canvas.DrawString($item.label, $font, [System.Drawing.Brushes]::Black, [single]($left + 85), [single]($top + 168))
      $canvas.FillEllipse($brush, [int]($left + 30), [int]($top + 194), 60, 60)
      $canvas.DrawImage($asset, [int]($left + 33), [int]($top + 197), 54, 54)
      $canvas.FillEllipse($brush, [int]($left + 122), [int]($top + 204), 36, 36)
      $canvas.DrawImage($asset, [int]($left + 125), [int]($top + 207), 30, 30)
      $canvas.DrawString('36px', $smallFont, [System.Drawing.Brushes]::DimGray, [single]($left + 172), [single]($top + 211))
    } finally { $asset.Dispose(); $brush.Dispose() }
  }
  $preview.Save((Join-Path $PSScriptRoot 'preview.png'), [System.Drawing.Imaging.ImageFormat]::Png)
} finally { $canvas.Dispose(); $preview.Dispose(); $font.Dispose(); $smallFont.Dispose() }
