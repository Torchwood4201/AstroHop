Add-Type -AssemblyName System.Drawing

function New-ContactSheet {
  param($Src, $Out, $Cell, $Scale)
  $img = [System.Drawing.Bitmap]::FromFile($Src)
  $cols = [int]($img.Width / $Cell)
  $rows = [int]($img.Height / $Cell)
  $cellOut = $Cell * $Scale
  $labelH = 14
  $W = $cols * ($cellOut + 2)
  $H = $rows * ($cellOut + $labelH + 2)
  $sheet = New-Object System.Drawing.Bitmap($W, $H)
  $g = [System.Drawing.Graphics]::FromImage($sheet)
  $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::NearestNeighbor
  $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::Half
  $g.Clear([System.Drawing.Color]::FromArgb(40, 40, 48))
  $font = New-Object System.Drawing.Font('Consolas', 8)
  $brush = [System.Drawing.Brushes]::White
  for ($r = 0; $r -lt $rows; $r++) {
    for ($c = 0; $c -lt $cols; $c++) {
      $i = $r * $cols + $c
      $dx = $c * ($cellOut + 2)
      $dy = $r * ($cellOut + $labelH + 2)
      $sx = $c * $Cell
      $sy = $r * $Cell
      $dest = New-Object System.Drawing.Rectangle($dx, $dy, $cellOut, $cellOut)
      $srcR = New-Object System.Drawing.Rectangle($sx, $sy, $Cell, $Cell)
      $g.DrawImage($img, $dest, $srcR, [System.Drawing.GraphicsUnit]::Pixel)
      $g.DrawString([string]$i, $font, $brush, $dx, $dy + $cellOut)
    }
  }
  $g.Dispose()
  $sheet.Save($Out, [System.Drawing.Imaging.ImageFormat]::Png)
  $sheet.Dispose()
  $img.Dispose()
  Write-Output "saved $Out ($cols x $rows cells)"
}

# Generates labeled contact sheets of the Kenney spritesheets, so you can
# look up any tile/frame index. Output lands next to this script (gitignored).
$root = Split-Path $PSScriptRoot -Parent
$base = "$root\public\assets\kenney_pixel-platformer\Tilemap"
New-ContactSheet -Src "$base\tilemap_packed.png" -Out "$PSScriptRoot\_sheet_tiles.png" -Cell 18 -Scale 3
New-ContactSheet -Src "$base\tilemap-characters_packed.png" -Out "$PSScriptRoot\_sheet_chars.png" -Cell 24 -Scale 4
New-ContactSheet -Src "$base\tilemap-backgrounds_packed.png" -Out "$PSScriptRoot\_sheet_bg.png" -Cell 24 -Scale 4
