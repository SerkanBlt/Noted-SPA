/* Google Fonts CSS -> yerel woff2 + yerel CSS (yalnizca latin + latin-ext) */
const fs = require('fs');
const path = require('path');
const https = require('https');

const VENDOR = process.argv[2];
const FONTS_DIR = path.join(VENDOR, 'fonts');
fs.mkdirSync(FONTS_DIR, { recursive: true });

const css = fs.readFileSync(path.join(VENDOR, 'gf.css'), 'utf8');
const KEEP = new Set(['latin', 'latin-ext']);

/* Bloklari "/* subset *\/ @font-face {...}" seklinde ayikla */
const blocks = [];
const re = /\/\*\s*([a-z-]+)\s*\*\/\s*(@font-face\s*\{[^}]*\})/g;
let m;
while ((m = re.exec(css))) blocks.push({ subset: m[1], body: m[2] });

const wanted = blocks.filter(b => KEEP.has(b.subset));
console.log('toplam blok:', blocks.length, '| secilen:', wanted.length);

function get(url, dest) {
    return new Promise((res, rej) => {
        https.get(url, r => {
            if (r.statusCode !== 200) return rej(new Error(url + ' -> ' + r.statusCode));
            const f = fs.createWriteStream(dest);
            r.pipe(f);
            f.on('finish', () => f.close(() => res()));
        }).on('error', rej);
    });
}

(async () => {
    const out = [];
    for (const b of wanted) {
        const fam = (b.body.match(/font-family:\s*'([^']+)'/) || [])[1];
        const wt = (b.body.match(/font-weight:\s*(\d+)/) || [])[1];
        const url = (b.body.match(/url\((https:[^)]+\.woff2)\)/) || [])[1];
        if (!fam || !wt || !url) { console.log('ATLANDI:', b.subset, fam, wt); continue; }

        const slug = fam.toLowerCase().replace(/\s+/g, '-');
        const file = `${slug}-${wt}-${b.subset}.woff2`;
        await get(url, path.join(FONTS_DIR, file));

        /* src'yi yerel goreli yola cevir, geri kalani aynen koru */
        const local = b.body.replace(/src:\s*url\([^)]+\)\s*format\('woff2'\);/,
            `src: url(fonts/${file}) format('woff2');`);
        out.push(`/* ${fam} ${wt} — ${b.subset} */\n${local}`);
        console.log('indirildi:', file, fs.statSync(path.join(FONTS_DIR, file)).size, 'bayt');
    }
    fs.writeFileSync(path.join(VENDOR, 'fonts.css'),
        '/* Google Fonts — yerele gomuldu (latin + latin-ext). Kaynak: fonts.googleapis.com */\n' +
        out.join('\n\n') + '\n', 'utf8');
    console.log('fonts.css yazildi:', out.length, 'kural');
})();
