const http = require('http');
const fs   = require('fs');
const path = require('path');
const os   = require('os');
const { spawn } = require('child_process');

const PORT = parseInt(process.env.PORT || '8765');
const ROOT = __dirname;

const MIME = {
    '.html': 'text/html; charset=utf-8',
    '.css' : 'text/css',
    '.js'  : 'application/javascript',
    '.json': 'application/json',
    '.png' : 'image/png',
    '.jpg' : 'image/jpeg',
    '.ico' : 'image/x-icon',
    '.svg' : 'image/svg+xml',
    '.woff2': 'font/woff2',
    '.woff' : 'font/woff',
};

/* ── Groq API → PowerShell üzerinden ── */
function callGroq(apiKey, payload, onDone) {
    const ts     = Date.now();
    const tmpIn  = path.join(os.tmpdir(), `groq_req_${ts}.json`);
    const tmpOut = path.join(os.tmpdir(), `groq_res_${ts}.json`);

    fs.writeFileSync(tmpIn, JSON.stringify(payload), 'utf8');

    /* HttpClient kullan: encoding doğru, proxy otomatik, BOM yok */
    const ps = `
$ErrorActionPreference = 'Stop'
$uri      = 'https://api.groq.com/openai/v1/chat/completions'
$body     = [IO.File]::ReadAllText('${tmpIn}', [Text.Encoding]::UTF8)
$encNoBom = New-Object Text.UTF8Encoding($false)
try {
    $hdrs = @{ Authorization = 'Bearer ${apiKey}' }
    $r    = Invoke-WebRequest -Uri $uri -Method POST -Headers $hdrs -Body $body -ContentType 'application/json; charset=utf-8' -TimeoutSec 60 -UseBasicParsing
    $bytes = $r.RawContentStream.ToArray()
    $text  = [Text.Encoding]::UTF8.GetString($bytes)
    [IO.File]::WriteAllText('${tmpOut}', $text, $encNoBom)
} catch {
    $msg = $_.Exception.Message -replace '\\\\', '/' -replace '"', "'"
    [IO.File]::WriteAllText('${tmpOut}', '{"error":{"message":"' + $msg + '"}}', $encNoBom)
}
`;

    let proc, stderr = '';
    proc = spawn('powershell', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', ps]);
    proc.stderr.on('data', d => { stderr += d; });

    proc.on('close', () => {
        try { fs.unlinkSync(tmpIn); } catch(_) {}
        try {
            const raw  = fs.readFileSync(tmpOut, 'utf8').replace(/^﻿/, '');
            try { fs.unlinkSync(tmpOut); } catch(_) {}
            onDone(null, JSON.parse(raw));
        } catch(e) {
            onDone(new Error(stderr.trim() || e.message), null);
        }
    });

    proc.on('error', err => onDone(err, null));
    return proc;
}

/* ── HTTP sunucusu ── */
http.createServer((req, res) => {

    /* /api/sysmd GET → Noted_System.md oku */
    if (req.url === '/api/sysmd' && req.method === 'GET') {
        const file = path.join(ROOT, 'Noted_System.md');
        try {
            const content = fs.readFileSync(file, 'utf8');
            res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
            res.end(content);
        } catch(_) {
            res.writeHead(204); res.end(''); /* dosya yoksa boş */
        }
        return;
    }

    /* /api/sysmd POST → Noted_System.md kaydet */
    if (req.url === '/api/sysmd' && req.method === 'POST') {
        let body = '';
        req.on('data', c => body += c);
        req.on('end', () => {
            const file = path.join(ROOT, 'Noted_System.md');
            try {
                fs.writeFileSync(file, body, 'utf8');
                res.writeHead(200, { 'Content-Type': 'text/plain' });
                res.end('ok');
            } catch(e) {
                res.writeHead(500, { 'Content-Type': 'text/plain' });
                res.end(e.message);
            }
        });
        return;
    }

    /* /api/chat → Groq proxy */
    if (req.url === '/api/chat' && req.method === 'POST') {
        let body = '';
        req.on('data', c => body += c);
        req.on('end', () => {
            let payload, apiKey;
            try {
                payload = JSON.parse(body);
                apiKey  = payload._apiKey;
                delete payload._apiKey;
            } catch(e) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                return res.end(JSON.stringify({ error: { message: 'Geçersiz istek' } }));
            }

            /* İptal: yalnızca socket gerçekten kapanınca işlemi durdur */
            let proc;
            req.socket?.once('close', () => { try { proc?.kill(); } catch(_) {} });

            proc = callGroq(apiKey, payload, (err, data) => {
                if (res.writableEnded) return; // zaten kapatılmışsa yaz
                if (err) {
                    res.writeHead(502, { 'Content-Type': 'application/json' });
                    return res.end(JSON.stringify({ error: { message: err.message } }));
                }
                if (data?.error) {
                    res.writeHead(500, { 'Content-Type': 'application/json' });
                    return res.end(JSON.stringify(data));
                }
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify(data));
            });
        });
        return;
    }

    /* Statik dosya sunucu */
    let urlPath = req.url.split('?')[0];
    if (urlPath === '/') urlPath = '/Noted.html';

    const filePath = path.join(ROOT, urlPath);
    try {
        const bytes = fs.readFileSync(filePath);
        const ext   = path.extname(filePath).toLowerCase();
        res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
        res.end(bytes);
    } catch(_) {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('404 Not Found');
    }

}).listen(PORT, () => {
    console.log(`\nNoted sunucusu: http://localhost:${PORT}/Noted.html`);
    console.log('Groq API -> PowerShell (sistem proxy otomatik, UTF-8 duzgün)');
    console.log('Kapatmak icin Ctrl+C basin.\n');
});
