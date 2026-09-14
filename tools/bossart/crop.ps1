param([string]$src, [string]$dst, [int]$x, [int]$y, [int]$w, [int]$h, [int]$ow, [int]$oh)
# crop a region and resize, save as jpeg quality 82
Add-Type -AssemblyName System.Drawing
$img = [System.Drawing.Image]::FromFile($src)
$bmp = New-Object System.Drawing.Bitmap $ow, $oh
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g.DrawImage($img, (New-Object System.Drawing.Rectangle 0, 0, $ow, $oh), (New-Object System.Drawing.Rectangle $x, $y, $w, $h), [System.Drawing.GraphicsUnit]::Pixel)
$enc = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.MimeType -eq 'image/jpeg' }
$ps = New-Object System.Drawing.Imaging.EncoderParameters 1
$ps.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter ([System.Drawing.Imaging.Encoder]::Quality), 82L
$bmp.Save($dst, $enc, $ps)
$g.Dispose(); $bmp.Dispose(); $img.Dispose()
