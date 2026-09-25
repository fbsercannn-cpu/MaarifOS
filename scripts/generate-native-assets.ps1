param(
  [string]$ProjectRoot = (Split-Path -Parent $PSScriptRoot)
)

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing

$sourcePath = Join-Path $ProjectRoot 'public\assets\brand\maarifos-icon-512.png'
if (-not (Test-Path -LiteralPath $sourcePath)) {
  throw "MaarifOS marka ikonu bulunamadı: $sourcePath"
}

function Save-SquareImage {
  param(
    [System.Drawing.Image]$Source,
    [string]$Destination,
    [int]$Size
  )
  $bitmap = New-Object System.Drawing.Bitmap($Size, $Size, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
  try {
    $graphics.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
    $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $graphics.DrawImage($Source, 0, 0, $Size, $Size)
    $bitmap.Save($Destination, [System.Drawing.Imaging.ImageFormat]::Png)
  } finally {
    $graphics.Dispose()
    $bitmap.Dispose()
  }
}

function Save-SplashImage {
  param(
    [System.Drawing.Image]$Source,
    [string]$Destination,
    [int]$Width,
    [int]$Height
  )
  $bitmap = New-Object System.Drawing.Bitmap($Width, $Height, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
  try {
    $graphics.Clear([System.Drawing.ColorTranslator]::FromHtml('#001d4f'))
    $graphics.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
    $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $side = [Math]::Max(160, [Math]::Round([Math]::Min($Width, $Height) * 0.38))
    $left = [Math]::Round(($Width - $side) / 2)
    $top = [Math]::Round(($Height - $side) / 2)
    $graphics.DrawImage($Source, $left, $top, $side, $side)
    $bitmap.Save($Destination, [System.Drawing.Imaging.ImageFormat]::Png)
  } finally {
    $graphics.Dispose()
    $bitmap.Dispose()
  }
}

function New-TransparentBrandMark {
  param([System.Drawing.Image]$Source)
  $mark = New-Object System.Drawing.Bitmap($Source.Width, $Source.Height, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $graphics = [System.Drawing.Graphics]::FromImage($mark)
  try {
    $graphics.DrawImage($Source, 0, 0, $Source.Width, $Source.Height)
  } finally {
    $graphics.Dispose()
  }
  for ($x = 0; $x -lt $mark.Width; $x++) {
    for ($y = 0; $y -lt $mark.Height; $y++) {
      $pixel = $mark.GetPixel($x, $y)
      if ($pixel.B -gt ($pixel.G * 1.2) -and $pixel.B -gt ($pixel.R * 1.2) -and $pixel.R -lt 110 -and $pixel.G -lt 130) {
        $mark.SetPixel($x, $y, [System.Drawing.Color]::Transparent)
      }
    }
  }
  return $mark
}

$source = [System.Drawing.Image]::FromFile($sourcePath)
$brandMark = New-TransparentBrandMark -Source $source
try {
  $androidIcons = @{
    'mipmap-mdpi' = 48
    'mipmap-hdpi' = 72
    'mipmap-xhdpi' = 96
    'mipmap-xxhdpi' = 144
    'mipmap-xxxhdpi' = 192
  }
  foreach ($entry in $androidIcons.GetEnumerator()) {
    $directory = Join-Path $ProjectRoot "android\app\src\main\res\$($entry.Key)"
    Save-SquareImage -Source $source -Destination (Join-Path $directory 'ic_launcher.png') -Size $entry.Value
    Save-SquareImage -Source $source -Destination (Join-Path $directory 'ic_launcher_round.png') -Size $entry.Value
    Save-SquareImage -Source $brandMark -Destination (Join-Path $directory 'ic_launcher_foreground.png') -Size ([int]($entry.Value * 2.25))
  }

  Get-ChildItem (Join-Path $ProjectRoot 'android\app\src\main\res') -Recurse -Filter 'splash.png' | ForEach-Object {
    $existing = [System.Drawing.Image]::FromFile($_.FullName)
    try {
      $width = $existing.Width
      $height = $existing.Height
    } finally {
      $existing.Dispose()
    }
    Save-SplashImage -Source $brandMark -Destination $_.FullName -Width $width -Height $height
  }

  Save-SquareImage -Source $source -Destination (Join-Path $ProjectRoot 'ios\App\App\Assets.xcassets\AppIcon.appiconset\AppIcon-512@2x.png') -Size 1024
  Get-ChildItem (Join-Path $ProjectRoot 'ios\App\App\Assets.xcassets\Splash.imageset') -Filter '*.png' | ForEach-Object {
    Save-SplashImage -Source $brandMark -Destination $_.FullName -Width 2732 -Height 2732
  }
} finally {
  $brandMark.Dispose()
  $source.Dispose()
}

Write-Output 'MaarifOS Android ve iOS marka varlıkları üretildi.'
