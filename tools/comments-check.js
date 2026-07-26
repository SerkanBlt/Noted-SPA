#!/usr/bin/env node
/*
 * Comments.json dogrulayici / onarici
 *
 * NEDEN VAR: Comments.json girdileri satir numarasi tasir, ama satir numaralari
 * ustteki her duzenlemede kayar. Bu yuzden 'anchor' (kodda birebir gecen benzersiz
 * metin) OTORITEDIR, 'line' yalnizca ipucudur. Bu script anchor'lari dogrular,
 * kaymis satir numaralarini onarir ve yetim (kodu silinmis) girdileri yakalar.
 *
 * Kullanim:
 *   node tools/comments-check.js           # dogrula, hatalari raporla (CI/commit oncesi)
 *   node tools/comments-check.js --fix     # kaymis 'line' degerlerini onar
 *   node tools/comments-check.js --list            # tum girdileri ozetle
 *   node tools/comments-check.js --list critical   # yalnizca o seviyeyi
 *   node tools/comments-check.js --for Noted.html  # tek dosyanin girdileri
 *
 * Cikis kodu: hata varsa 1, temizse 0.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const DB_PATH = path.join(ROOT, 'Comments.json');

const args = process.argv.slice(2);
const has = (f) => args.includes(f);
const valOf = (f) => { const i = args.indexOf(f); return i !== -1 ? args[i + 1] : null; };

const FIX = has('--fix');
const LIST = has('--list');
const FOR_FILE = valOf('--for');
const LIST_LEVEL = LIST ? (args[args.indexOf('--list') + 1] || null) : null;

if (!fs.existsSync(DB_PATH)) {
    console.error('HATA: Comments.json bulunamadi:', DB_PATH);
    process.exit(1);
}

let db;
try {
    db = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
} catch (e) {
    console.error('HATA: Comments.json ayristirilamadi ->', e.message);
    process.exit(1);
}

const entries = Array.isArray(db.entries) ? db.entries : [];
const VALID_LEVELS = Object.keys(db.levels || {});
const VALID_TYPES = Object.keys(db.types || {});

/* Dosya icerigi cache — ayni dosya defalarca okunmasin */
const fileCache = new Map();
function readLines(rel) {
    if (fileCache.has(rel)) return fileCache.get(rel);
    const abs = path.join(ROOT, rel);
    if (!fs.existsSync(abs)) { fileCache.set(rel, null); return null; }
    const lines = fs.readFileSync(abs, 'utf8').split(/\r?\n/);
    fileCache.set(rel, lines);
    return lines;
}

/* ── Listeleme modu ── */
if (LIST || FOR_FILE) {
    let sel = entries;
    if (FOR_FILE) sel = sel.filter(e => e.file === FOR_FILE);
    if (LIST_LEVEL && VALID_LEVELS.includes(LIST_LEVEL)) sel = sel.filter(e => e.level === LIST_LEVEL);

    const order = { critical: 0, important: 1, info: 2 };
    sel.sort((a, b) => (order[a.level] ?? 9) - (order[b.level] ?? 9) || (a.line || 0) - (b.line || 0));

    if (!sel.length) { console.log('(eslesen girdi yok)'); process.exit(0); }
    for (const e of sel) {
        console.log(`[${(e.level || '?').toUpperCase()}/${e.type || '?'}] ${e.file}:${e.line}  ${e.symbol || ''}`);
        console.log(`  ${e.title}`);
        console.log(`  id: ${e.id}${e.refs && e.refs.length ? '  refs: ' + e.refs.join(', ') : ''}`);
        console.log('');
    }
    process.exit(0);
}

/* ── Dogrulama modu ── */
const errors = [];
const drifts = [];
const seenIds = new Set();

for (const e of entries) {
    const where = e.id || '(id yok)';

    /* Sema kontrolleri */
    for (const f of ['id', 'level', 'type', 'file', 'anchor', 'title', 'body']) {
        if (!e[f]) errors.push(`${where}: zorunlu alan eksik -> ${f}`);
    }
    if (e.id) {
        if (seenIds.has(e.id)) errors.push(`${where}: id tekrar ediyor`);
        seenIds.add(e.id);
    }
    if (e.level && VALID_LEVELS.length && !VALID_LEVELS.includes(e.level))
        errors.push(`${where}: gecersiz level '${e.level}' (gecerli: ${VALID_LEVELS.join(', ')})`);
    if (e.type && VALID_TYPES.length && !VALID_TYPES.includes(e.type))
        errors.push(`${where}: gecersiz type '${e.type}' (gecerli: ${VALID_TYPES.join(', ')})`);

    if (!e.file || !e.anchor) continue;

    const lines = readLines(e.file);
    if (lines === null) { errors.push(`${where}: dosya bulunamadi -> ${e.file}`); continue; }

    /* Anchor arama — birebir substring */
    const hits = [];
    for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes(e.anchor)) hits.push(i + 1);
    }

    if (hits.length === 0) {
        errors.push(`${where}: YETIM — anchor ${e.file} icinde bulunamadi. Kod silindi/degisti mi? Girdiyi guncelle veya kaldir.\n    anchor: ${e.anchor}`);
        continue;
    }
    if (hits.length > 1) {
        /* Ilk birkac isabeti goster — hepsini basmak binlerce satir cikti uretebilir */
        const shown = hits.slice(0, 8).join(', ') + (hits.length > 8 ? `, … (+${hits.length - 8} tane daha)` : '');
        errors.push(`${where}: BELIRSIZ — anchor ${hits.length} yerde geciyor (satir ${shown}). Anchor'i benzersiz olacak sekilde uzat.`);
        continue;
    }

    const actual = hits[0];
    if (e.line !== actual) {
        drifts.push({ entry: e, from: e.line, to: actual });
        if (FIX) e.line = actual;
    }
}

/* ── Rapor ── */
console.log(`Comments.json: ${entries.length} girdi, ${fileCache.size} dosya tarandi.`);

if (drifts.length) {
    console.log(`\n${FIX ? 'ONARILDI' : 'KAYMA TESPIT EDILDI'} — ${drifts.length} girdide satir numarasi bayat:`);
    for (const d of drifts) console.log(`  ${d.entry.id}: ${d.entry.file}:${d.from} -> ${d.to}`);
    if (!FIX) console.log("\n  Onarmak icin: node tools/comments-check.js --fix");
}

if (errors.length) {
    console.log(`\nHATA (${errors.length}):`);
    for (const m of errors) console.log('  - ' + m);
}

if (FIX && drifts.length) {
    fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2) + '\n', 'utf8');
    console.log('\nComments.json guncellendi.');
}

if (errors.length) process.exit(1);
if (!drifts.length && !errors.length) console.log('\nTemiz — tum anchor\'lar benzersiz ve satir numaralari guncel.');
process.exit(0);
