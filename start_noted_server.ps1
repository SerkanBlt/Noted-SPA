param([int]$Port = 8765)

$root = Split-Path -Parent $MyInvocation.MyCommand.Path

$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:$Port/")

try {
    $listener.Start()
} catch {
    Write-Host "[HATA] Port $Port acılamadı: $_"
    Write-Host "Baska bir uygulama portu kullanıyor olabilir. Bat dosyasını tekrar calistirin."
    Read-Host "Cıkmak icin Enter"
    exit 1
}

Write-Host "Sunucu calisiyor: http://localhost:$Port/Noted.html"
Start-Sleep 1
Start-Process "http://localhost:$Port/Noted.html"
Write-Host "Kapatmak icin Ctrl+C veya bu pencereyi kapatin."
Write-Host ""

$mime = @{
    '.html' = 'text/html; charset=utf-8'
    '.css'  = 'text/css'
    '.js'   = 'application/javascript'
    '.json' = 'application/json'
    '.png'  = 'image/png'
    '.jpg'  = 'image/jpeg'
    '.ico'  = 'image/x-icon'
    '.svg'  = 'image/svg+xml'
    '.woff2'= 'font/woff2'
    '.woff' = 'font/woff'
}

try {
    while ($listener.IsListening) {
        $ctx  = $listener.GetContext()
        $path = $ctx.Request.Url.LocalPath
        if ($path -eq '/') { $path = '/Noted.html' }

        $file = Join-Path $root ($path.TrimStart('/').Replace('/', [IO.Path]::DirectorySeparatorChar))
        $res  = $ctx.Response

        if (Test-Path $file -PathType Leaf) {
            $bytes = [IO.File]::ReadAllBytes($file)
            $ext   = [IO.Path]::GetExtension($file).ToLower()
            $res.ContentType      = if ($mime.ContainsKey($ext)) { $mime[$ext] } else { 'application/octet-stream' }
            $res.ContentLength64  = $bytes.Length
            $res.OutputStream.Write($bytes, 0, $bytes.Length)
        } else {
            $res.StatusCode = 404
            $bytes = [Text.Encoding]::UTF8.GetBytes("404 - Bulunamadı: $path")
            $res.ContentLength64 = $bytes.Length
            $res.OutputStream.Write($bytes, 0, $bytes.Length)
        }
        $res.Close()
    }
} finally {
    $listener.Stop()
}
