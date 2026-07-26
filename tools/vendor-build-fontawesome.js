/* Font Awesome 6.4.0 all.min.css -> yalnizca kullanilan ikonlar + solid font */
const fs = require('fs');
const path = require('path');

const ROOT = process.argv[2];
const VENDOR = path.join(ROOT, 'vendor');

/* 1) Uygulamada gecen tum fa-* siniflarini topla */
const sources = [
    path.join(ROOT, 'Noted.html'),
    path.join(ROOT, 'noted.css'),
    ...fs.readdirSync(path.join(ROOT, 'js')).map(f => path.join(ROOT, 'js', f)),
];
const used = new Set();
const allText = [];
for (const f of sources) {
    const txt = fs.readFileSync(f, 'utf8');
    allText.push(txt);
    for (const m of txt.matchAll(/\bfa-([a-z0-9-]+)/g)) used.add(m[1]);
}
console.log('dogrudan fa-* token:', used.size);

let css = fs.readFileSync(path.join(VENDOR, 'fa-all.css'), 'utf8');

/* Ikon adlari DINAMIK de uretiliyor: 'fa-' + (kosul ? 'a' : 'b') ve `fa-${...}`.
   Bu adlar statik fa-* taramasina takilmaz (fa-eye-slash boyle kaybolmustu).
   Cozum: kaynaktaki TUM tirnakli dizgileri gercek FA ikon adlariyla kesistir —
   fazladan birkac ikon tutmak, sessizce bos ikon birakmaktan cok daha ucuz. */
const faNames = new Set([...css.matchAll(/\.fa-([a-z0-9-]+):before/g)].map(m => m[1]));
const joined = allText.join('\n');
let dinamik = 0;
for (const m of joined.matchAll(/['"`]([a-z0-9-]{2,30})['"`]/g)) {
    if (faNames.has(m[1]) && !used.has(m[1])) { used.add(m[1]); dinamik++; }
}
console.log('dizgi eslesmesiyle eklenen (dinamik guvenligi):', dinamik);
console.log('toplam korunacak aday:', used.size);
const before = css.length;

/* 2) Kullanilmayan ikon kurallarini sil.
   DIKKAT: FA minified CSS GRUPLU selektor kullanir:
     .fa-bolt:before,.fa-zap:before{content:"\f0e7"}
   Tek selektor arayan bir regex grubun ORTASINDAN eslesir; sildiginde geriye
   yetim ".fa-bolt:before," kalir ve bir SONRAKI kuralla birlesip o kuralin
   kod noktasini alir (bolt -> gunes ikonu olmustu). Bu, projenin daha once
   3 kez yasadigi yetim-selektor tuzaginin aynisidir.
   Cozum: kuralin TAMAMINI (tum grup) yakala, icinden yalnizca kullanilan
   selektorleri birak, hicbiri kullanilmiyorsa kurali komple sil. */
let removed = 0, kept = 0, budandi = 0;
css = css.replace(/((?:\.fa-[a-z0-9-]+:before,)*\.fa-[a-z0-9-]+:before)\{content:"([^"]*)"\}/g,
    (full, sel, code) => {
        const names = [...sel.matchAll(/\.fa-([a-z0-9-]+):before/g)].map(m => m[1]);
        const keep = names.filter(n => used.has(n));
        if (!keep.length) { removed++; return ''; }
        if (keep.length !== names.length) budandi++;
        kept++;
        return keep.map(n => `.fa-${n}:before`).join(',') + `{content:"${code}"}`;
    });
console.log('ikon kurali — korunan:', kept, '| silinen:', removed, '| grup budandi:', budandi);

/* 3) Yalnizca solid (Font Awesome 6 Free / weight 900) @font-face kalsin;
      brands, regular, FA5 ve v4 uyumluluk bloklari gitsin */
let ffKept = 0, ffDropped = 0;
css = css.replace(/@font-face\{[^}]*\}/g, (block) => {
    const isFA6Free = /font-family:"Font Awesome 6 Free"/.test(block);
    const isSolid = /font-weight:900/.test(block);
    if (isFA6Free && isSolid) {
        ffKept++;
        return block.replace(/src:url\([^)]*\)[^;]*;/,
            `src:url(fonts/fa-solid-900.woff2) format("woff2");`);
    }
    ffDropped++; return '';
});
console.log('@font-face — korunan:', ffKept, '| silinen:', ffDropped);

/* 4) Artik fontu olmayan aile kurallarini sil (brands/regular/v4) */
css = css
    .replace(/\.fa-brands,\.fab\{[^}]*\}/g, '')
    .replace(/\.fa-regular,\.far\{[^}]*\}/g, '')
    .replace(/@font-face\{[^}]*FontAwesome[^}]*\}/g, '');

/* 5) Fazla bosluk/artik virgul temizligi */
css = css.replace(/\n{2,}/g, '\n').trim() + '\n';

fs.writeFileSync(path.join(VENDOR, 'fontawesome.css'), css, 'utf8');
console.log('fontawesome.css:', before, '->', css.length, 'bayt',
    '(%' + Math.round((1 - css.length / before) * 100) + ' kucuk)');
