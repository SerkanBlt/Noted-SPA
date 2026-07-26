
/* ══ YARDIMCI: Güvenli JSON okuma ══ */
function safeLoadJSON(key, fallback) {
    const raw = localStorage.getItem(key);
    if (raw === null) return fallback;
    try {
        return JSON.parse(raw);
    } catch (e) {
        try { localStorage.setItem(key + '_corrupt_backup_' + Date.now(), raw); } catch (e2) {}
        console.error('[Noted] "' + key + '" anahtarındaki veri okunamadı, yedeklendi ve sıfırlandı:', e);
        return fallback;
    }
}
/* ══ DEPOLAMA YÖNETİMİ ══ */
function getAiCfg()      { try { return JSON.parse(localStorage.getItem('noted_ai_v1')      || '{}'); } catch(_) { return {}; } }
function patchAiCfg(p)   { try { localStorage.setItem('noted_ai_v1',      JSON.stringify({...getAiCfg(),      ...p})); } catch(_) {} }
function getUiCfg()      { try { return JSON.parse(localStorage.getItem('noted_ui_v1')      || '{}'); } catch(_) { return {}; } }
function patchUiCfg(p)   { try { localStorage.setItem('noted_ui_v1',      JSON.stringify({...getUiCfg(),      ...p})); } catch(_) {} }
function getContentCfg() { try { return JSON.parse(localStorage.getItem('noted_content_v1') || '{}'); } catch(_) { return {}; } }
function patchContentCfg(p) { try { localStorage.setItem('noted_content_v1', JSON.stringify({...getContentCfg(), ...p})); } catch(_) {} }

/* ── Tek seferlik migration: eski çok-anahtar yapısı → yeni birleşik yapı ── */
(function _migrateStorageV2() {
    if (localStorage.getItem('noted_storage_v') === '2') return;
    const _ls  = k => { try { return localStorage.getItem(k); } catch(_) { return null; } };
    const _lsj = k => { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch(_) { return null; } };
    const _ss  = k => { try { return JSON.parse(sessionStorage.getItem(k) || 'null'); } catch(_) { return null; } };

    /* AI */
    const sessCfg = _ss('noted_ai_cfg_v1') || {};
    patchAiCfg({
        providers : _lsj('noted_ai_providers_v1') || [],
        pool      : _lsj('noted_ai_pool_v1')      || [],
        key       : _ls('noted_ai_key_v1')        || '',
        sys       : _ls('noted_ai_sys_v1')        || sessCfg.sys    || '',
        model     : sessCfg.model || '',
        temp      : sessCfg.temp  ?? 0.7,
        ctx       : sessCfg.ctx   ?? 10,
        md        : _ls('noted-ai-md')             !== 'false',
        tone      : _ls('noted-ai-tone')           || 'informative',
        action    : _ls('noted-ai-default-action') || 'expand',
        bmClick   : _ls('noted-ai-bm-click')       !== 'false',
        exportAi  : _ls('noted-export-ai')         === 'true',
    });

    /* UI */
    patchUiCfg({
        theme      : _ls('noted_theme')          || 'system',
        customDark : _lsj('noted_custom_dark')   || {},
        customLight: _lsj('noted_custom_light')  || {},
        sort       : _ls('noted_sort_v1')        || 'newest',
        listView   : _ls('noted_list_view_v1')   || 'standard',
        aiPanelW   : parseInt(_ls('noted_ai_panel_w')    || '0') || 0,
        todoW      : parseInt(_ls('noted_todo_panel_w')   || '0') || 0,
        typewriter : _ls('noted_typewriter_v1')  === '1',
    });

    /* İçerik */
    patchContentCfg({
        templates : _lsj('noted_templates_v1') || [],
        ccbs      : _lsj('noted_ccbs')         || [],
        groups    : _lsj('noted_groups_v1')    || [],
    });

    /* Eski anahtarları temizle */
    ['noted_ai_providers_v1','noted_ai_pool_v1','noted_ai_key_v1','noted_ai_sys_v1',
     'noted_ai_panel_w','noted-ai-md','noted-ai-tone','noted-ai-default-action',
     'noted-ai-bm-click','noted-export-ai','noted_theme','noted_custom_dark',
     'noted_custom_light','noted_sort_v1','noted_list_view_v1','noted_todo_panel_w',
     'noted_typewriter_v1','noted_templates_v1','noted_ccbs','noted_groups_v1',
    ].forEach(k => { try { localStorage.removeItem(k); } catch(_) {} });
    try { sessionStorage.removeItem('noted_ai_cfg_v1'); } catch(_) {}
    localStorage.setItem('noted_storage_v', '2');
})();

/* ══ UYGULAMA DURUMU ══ */
let notes = safeLoadJSON('noted_v1', []); let openGroups = getContentCfg().groups || [];
if (!Array.isArray(notes)) notes = []; if (!Array.isArray(openGroups)) openGroups = [];
/* ══ contentMd migration (existing notes — re-runs if contentMd is empty) ══ */
(function() {
    let dirty = false;
    notes.forEach(n => {
        if (n.content && (n.contentMd === undefined || n.contentMd === '')) {
            n.contentMd = htmlToMd(n.content);
            dirty = true;
        }
    });
    if (dirty) try { localStorage.setItem('noted_v1', JSON.stringify(notes)); } catch(_) {}
})();
const TRASH_GROUP = 'Çöp Kutusu';
let expandedNotes=new Set(), searchQuery='', filterGroup='all', filterTag='all';
const _themeSaved = getUiCfg().theme || 'system';
let themeMode = (_themeSaved==='dark'||_themeSaved==='light'||_themeSaved==='system') ? _themeSaved : 'system';
let isDark = themeMode === 'dark'; /* geriye dönük uyumluluk — applyTheme günceller */
let editorGroup='Genel', editorColorLabel=null, editorPinned=false, editorReminders=[], editorReminderNote='', tocOpen=false;
let activePickerId=null, deleteTargetId=null, deletePermanent=false, pendingNoteId=null;

/* ══ RENK PALETİ ══ */
const PALETTE = [
    '#000000','#434343','#666666','#999999','#b7b7b7','#ffffff',
    '#e53935','#f4511e','#fb8c00','#f9a825','#43a047','#00897b',
    '#039be5','#1e88e5','#3949ab','#8e24aa','#d81b60','#546e7a',
    '#fce4ec','#f8bbd0','#f48fb1','#f06292','#e91e63',
    '#ede7f6','#d1c4e9','#b39ddb','#9575cd','#7e57c2',
    '#e3f2fd','#bbdefb','#90caf9','#64b5f6','#42a5f5',
    '#e8f5e9','#c8e6c9','#a5d6a7','#81c784','#66bb6a',
    '#fffde7','#fff9c4','#fff176','#ffee58','#ffca28',
    '#fff3e0','#ffe0b2','#ffcc80','#ffb74d','#ffa726',
    '#fce4ec','#ffcdd2','#ef9a9a','#e57373','#ef5350',
    '#efebe9','#d7ccc8','#bcaaa4','#a1887f','#8d6e63',
];

/* v1.1: Renk etiketi seçenekleri */
const COLOR_LABELS = [
    { key:'red',    hex:'#ef4444', label:'Acil' },
    { key:'orange', hex:'#f97316', label:'Önemli' },
    { key:'yellow', hex:'#eab308', label:'Bekliyor' },
    { key:'green',  hex:'#22c55e', label:'Tamam' },
    { key:'blue',   hex:'#3b82f6', label:'Bilgi' },
    { key:'purple', hex:'#a855f7', label:'Fikir' },
];

/* ══ YARDIMCI ══ */
function debounce(fn, ms) {
    let t;
    return function(...args) { clearTimeout(t); t = setTimeout(() => fn.apply(this, args), ms); };
}
let _idSeed = Date.now();
function genId() { return ++_idSeed; }


/* v1.1: Mevcut notlara eksik alanları ekle (backward compat) */
notes = notes.map(n => ({
    pinned:     false,
    colorLabel: null,
    tags:       [],
    ...n
}));


/* ══ DOM CACHE ══ */
const $ = id => document.getElementById(id);
const $title       = $('title');
let $content       = $('content');
const $editId      = $('edit-id');
const $editor      = $('editor');
const $cancelBtn   = $('cancel-btn');
const $badgeText   = $('badge-text');
const $editorBadge = $('editor-badge');
const $mainList    = $('main-list');
const $headerCount = $('header-count');
const $gfBadge     = $('gf-badge');
const $gfDropdown  = $('gf-dropdown');
const $tfBadge     = $('tf-badge');     /* v1.1 */
const $tfDropdown  = $('tf-dropdown');  /* v1.1 */
const $picker      = $('group-picker');
const $gpList      = $('gp-list');
const $pinBtn      = $('pin-btn');      /* v1.1 */
const $clBtn       = $('color-label-btn'); /* v1.1 */
/* v1.6 */
const $tocToggleBtn   = $('toc-toggle-btn');
const $editorToc      = $('editor-toc');
const $editorTocList  = $('editor-toc-list');
const $reminderBtn    = $('reminder-btn');
const $reminderPopup  = $('reminder-popup');
const $reminderDate   = $('reminder-date');
const $reminderTime   = $('reminder-time');
const $exportMdBtn    = $('export-md-btn');
const $reminderToastOverlay = $('reminder-toast-overlay');
/* v1.3 */
const $wlAutocomplete = $('wl-autocomplete');
const $wlAcList       = $('wl-ac-list');
const $wlPreview      = $('wl-preview'); /* v1.3.1: hover önizleme paneli */

/* daily-note-btn kaldırıldı — Şablonlar > Günlük Not ile aynı işlev */
const $searchOpBtn    = $('search-op-btn');
const $searchOpHint   = $('search-op-hint');

/* ══ MULTI-EDITOR INSTANCE MANAGER ══ */
let activeInstance = null;

function createInstance(contentEl, noteId) {
    const inst = { $el: contentEl, noteId: String(noteId || ''), _stack: [], _idx: -1, dirty: false };
    contentEl.addEventListener('focus', () => activateInstance(inst), true);
    return inst;
}

function activateInstance(inst) {
    if (!inst || inst === activeInstance) return;
    if (activeInstance) saveContext(activeInstance);
    activeInstance = inst;
    $content = inst.$el;
    if (typeof window._undoSwitchTarget === 'function') window._undoSwitchTarget(inst.$el);
}

function saveContext(inst) {
    inst.dirty = _contentDirty;
}

/* Ana editör instance'ı — _undoSwitchTarget henüz tanımlı değil, doğrudan set */
window._mainEditorInstance = createInstance($content, '');
activeInstance = window._mainEditorInstance;

/* ══ HELPERS ══ */
function esc(s) {
    return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function stripHtml(h) { const d = document.createElement('div'); d.innerHTML = h; return d.textContent || ''; }
function highlight(text, q) {
    if (!q) return text;
    return text.replace(new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'), 'gi'), m => `<mark>${m}</mark>`);
}
function getColor(str) {
    let h = 0;
    for (let i = 0; i < str.length; i++) h = str.charCodeAt(i) + ((h << 5) - h);
    h = Math.abs(h) % 360;
    return { main: `hsl(${h},50%,50%)`, bg: `hsla(${h},50%,50%,.11)` };
}
function normalizeHtml(html) {
    if (!html) return html;
    const div = document.createElement('div');
    div.innerHTML = html;
    const INLINE = new Set(['STRONG','EM','U','S','MARK','CODE','SUB','SUP']);
    div.querySelectorAll('*').forEach(el => {
        /* Boş style/class attribute'larını temizle */
        if (el.getAttribute('style') === '') el.removeAttribute('style');
        if (el.getAttribute('class') === '') el.removeAttribute('class');
        /* İç içe aynı inline tag'ları düzleştir: <strong><strong>x</strong></strong> → <strong>x</strong> */
        if (INLINE.has(el.tagName) && el.parentElement?.tagName === el.tagName) {
            el.replaceWith(...el.childNodes);
        }
    });
    /* Yalnızca <br> içeren boş blok elementleri temizle (birden fazla art arda <br>).
       Grid yapısal elemanları (ng-cell, ng-title, ng-resize, ng-v-wrap...) hariç —
       bunlar kullanıcı hiç yazı girmediğinde de boş olarak var olmalı, silinirse
       hücre reload sonrası editable olmaktan çıkıyor (kayıp/bozuk toolbar bug'ı). */
    div.querySelectorAll('p,div').forEach(el => {
        if (el.hasAttribute('data-ph')) return;
        if (/(^|\s)ng-/.test(el.className)) return;
        if (el.children.length === 0 && !(el.textContent || '').trim()) el.remove();
    });
    return div.innerHTML;
}

function sanitize(html) {
    if (typeof DOMPurify === 'undefined') return html;
    return DOMPurify.sanitize(html, {
        ALLOWED_TAGS: [
            /* Yapısal */
            'p','div','br','hr','h1','h2','h3','h4','h5','h6',
            'blockquote','pre','code','details','summary',
            /* İnline */
            'strong','b','em','i','u','s','strike','del','mark','sub','sup','span','a',
            /* Listeler */
            'ul','ol','li','dl','dt','dd',
            /* Tablo */
            'table','thead','tbody','tfoot','tr','th','td','colgroup','col',
            /* Medya */
            'img','figure','figcaption','iframe',
            /* SVG (çizim) */
            'svg','path','circle','rect','ellipse','line','polyline','polygon',
            'g','defs','use','text','tspan','image',
            /* Uygulama özel */
            'ng-wrap','ng-col','ng-cell','ng-row',
        ],
        ALLOWED_ATTR: [
            'href','src','alt','title','target','rel',
            'colspan','rowspan','width','height',
            'class','style','id',
            'contenteditable','spellcheck',
            'preserveAspectRatio','viewBox','xmlns',
            /* data-* uygulamaya özel */
            'data-note-id','data-wikilink','data-grid-type','data-gridtype',
            'data-cols','data-col','data-ph','data-placeholder',
            'data-stab','data-type','data-tpl','data-bookmark',
            'data-shape','data-sx','data-sy','data-sw','data-sh',
            'data-stroke','data-fill-mode','data-rotate',
            'data-valign','data-halign','data-ccb-id','data-checked',
        ],
        FORCE_BODY: false,
    });
}
function saveNotes() {
    try {
        localStorage.setItem('noted_v1', JSON.stringify(notes));
        try { recordActivityToday(); } catch(_e) {}
    } catch (e) {
        alert('⚠️ Depolama alanı dolu! Bazı notlar kaydedilemeyebilir.\nEski notları dışa aktarıp silerek yer açabilirsiniz.');
    }
}
/* ── Float panel helpers (notes scope'u gerektirir) ── */
window._fpGetNote = function(id) {
    return notes.find(n => String(n.id) === String(id)) || null;
};
window._fpUpdateNote = function(id, title, content, silent) {
    const idx = notes.findIndex(n => String(n.id) === String(id));
    if (idx === -1) return;
    const tags = parseTagsFromContent(content);
    notes[idx] = { ...notes[idx], title, content, contentMd: htmlToMd(content), tags, updatedAt: Date.now() };
    saveNotes();
    if (!silent) try { render(); } catch(_) {}
};
function noteNeedsExpand(n) {
    return stripHtml(n.content).length > 120 || /<(h[23]|ul|ol|pre|blockquote)/i.test(n.content);
}

/* ══ v1.1: TAG PARSE ══ */
function parseTagsFromContent(html) {
    /* HTML etiketlerini boşlukla değiştir — #tag ile hemen ardındaki wikilink veya
       başka inline element birleşmesin; etiket yalnızca boşluk/satır sonu ile biter. */
    const text = (html || '').replace(/<[^>]+>/g, ' ') + ' ' + ($title.value || '');
    const matches = text.matchAll(/#([a-zA-ZğüşıöçĞÜŞİÖÇ][a-zA-ZğüşıöçĞÜŞİÖÇ0-9_]{1,30})/g);
    return [...new Set([...matches].map(m => m[1].toLowerCase()))];
}

function getAllTags() {
    const all = new Set();
    notes.forEach(n => (n.tags || []).forEach(t => all.add(t)));
    return [...all].sort();
}

/* ══ htmlToMd: HTML → temiz Markdown (AI context için) ══ */
function _mdNode(node) {
    if (node.nodeType === 3) return node.textContent;
    if (node.nodeType !== 1) return '';
    const cl  = node.classList;
    /* UI chrome: toolbar, resize handle, delete btn — içerik değil */
    if (cl && (cl.contains('ng-toolbar') || cl.contains('ng-resize') ||
               cl.contains('ng-add-col') || cl.contains('callout-del'))) return '';
    const tag = node.tagName.toLowerCase();
    const inner = () => [...node.childNodes].map(_mdNode).join('');
    switch (tag) {
        case 'h1': return `\n# ${inner().trim()}\n\n`;
        case 'h2': return `\n## ${inner().trim()}\n\n`;
        case 'h3': return `\n### ${inner().trim()}\n\n`;
        case 'h4': case 'h5': case 'h6': return `\n#### ${inner().trim()}\n\n`;
        case 'p':  { const t = inner().trim(); return t ? `${t}\n\n` : ''; }
        case 'br': return '\n';
        case 'strong': case 'b': return `**${inner()}**`;
        case 'em': return `*${inner()}*`;
        case 'i':  { const t = inner(); return t ? `*${t}*` : ''; } /* FA icon → boş */
        case 'del': case 's': return `~~${inner()}~~`;
        case 'mark': return inner();
        case 'u': return inner();
        case 'code': return node.closest('pre') ? inner() : `\`${inner()}\``;
        case 'pre': return `\n\`\`\`\n${node.textContent.trim()}\n\`\`\`\n\n`;
        case 'blockquote': return `\n> ${inner().trim().replace(/\n/g, '\n> ')}\n\n`;
        case 'ul': {
            const rows = [...node.children].filter(c => c.tagName === 'LI')
                .map(li => {
                    const isTodo = li.classList && li.classList.contains('todo-item');
                    const check  = isTodo ? (li.dataset.checked === 'true' ? '[x] ' : '[ ] ') : '';
                    return `- ${check}${[...li.childNodes].map(_mdNode).join('').trim()}`;
                }).join('\n');
            return `\n${rows}\n\n`;
        }
        case 'ol': {
            const rows = [...node.children].filter(c => c.tagName === 'LI')
                .map((li, i) => `${i + 1}. ${[...li.childNodes].map(_mdNode).join('').trim()}`).join('\n');
            return `\n${rows}\n\n`;
        }
        case 'li': return inner();
        case 'a':
            if (cl && (cl.contains('wikilink') || node.dataset.noteId))
                return `[[${inner()}]]`;
            return node.href ? `[${inner()}](${node.href})` : inner();
        case 'input':
            return node.type === 'checkbox' ? (node.checked ? '[x] ' : '[ ] ') : '';
        case 'hr': return '\n---\n\n';
        case 'colgroup': case 'col': return ''; /* tablo genişlik meta-verisi */
        case 'table': {
            if (cl && cl.contains('noted-grid')) {
                /* Panel / Kolon / Tablo bloğu — başlık + hücre içeriklerini çek */
                const parts = [];
                node.querySelectorAll('thead .ng-title').forEach(t => {
                    const txt = t.textContent.trim();
                    if (txt) parts.push(`**${txt}**`);
                });
                node.querySelectorAll('tbody .ng-cell').forEach(cell => {
                    const txt = [...cell.childNodes].map(_mdNode).join('').trim();
                    if (txt) parts.push(txt);
                });
                return parts.length ? `\n${parts.join('\n\n')}\n\n` : '';
            }
            return inner(); /* standart HTML tablo */
        }
        case 'div': {
            /* Grid sarmalayıcı — içine bak */
            if (cl && cl.contains('ng-wrap')) return inner();
            /* Callout (vurgu bloğu) */
            if (cl && cl.contains('callout')) {
                const header  = node.querySelector('.callout-header');
                const body    = node.querySelector('.callout-body');
                const title   = header ? header.textContent.trim() : '';
                const content = body ? [...body.childNodes].map(_mdNode).join('').trim() : '';
                const icon    = cl.contains('callout-warning') ? '⚠ ' :
                                cl.contains('callout-tip')     ? '💡 ' :
                                cl.contains('callout-success') ? '✅ ' : 'ℹ ';
                const lines   = [`> ${icon}**${title}**`, ...(content ? content.split('\n').map(l => `> ${l}`) : [])];
                return `\n${lines.join('\n')}\n\n`;
            }
            const t = inner();
            return t ? (t.endsWith('\n') ? t : t + '\n') : '';
        }
        case 'script': case 'style': case 'svg': return '';
        default: return inner();
    }
}
function htmlToMd(html) {
    if (!html) return '';
    const div = document.createElement('div');
    div.innerHTML = html;
    return _mdNode(div).replace(/\n{3,}/g, '\n\n').trim();
}

/* ══ v1.3: WİKİ-BAĞLANTILAR ══ */
const WIKILINK_RE = /\[\[([^\[\]]{1,120})\]\]/g;

function findNoteByTitle(title) {
    if (!title) return null;
    const t = title.trim().toLocaleLowerCase('tr');
    return notes.find(n => n.title.trim().toLocaleLowerCase('tr') === t) || null;
}

/* Bir notun HTML içeriğindeki [[Başlık]] dizgilerini wikilink <a> öğelerine çevirir.
   Zaten <a>, <code> veya <pre> içindeyse dokunmaz (çakışmayı önler). */
function convertWikiSyntax(html) {
    if (!html || html.indexOf('[[') === -1) return html;
    const wrap = document.createElement('div');
    wrap.innerHTML = html;
    const walker = document.createTreeWalker(wrap, NodeFilter.SHOW_TEXT, null);
    const targets = [];
    let node;
    while ((node = walker.nextNode())) {
        if (!node.nodeValue || node.nodeValue.indexOf('[[') === -1) continue;
        if (node.parentElement && node.parentElement.closest('a, code, pre, .wikilink')) continue;
        targets.push(node);
    }
    targets.forEach(textNode => {
        const text = textNode.nodeValue;
        WIKILINK_RE.lastIndex = 0;
        if (!WIKILINK_RE.test(text)) return;
        WIKILINK_RE.lastIndex = 0;
        const frag = document.createDocumentFragment();
        let last = 0, m;
        while ((m = WIKILINK_RE.exec(text))) {
            if (m.index > last) frag.appendChild(document.createTextNode(text.slice(last, m.index)));
            const title = m[1].trim();
            const target = findNoteByTitle(title);
            const a = document.createElement('a');
            a.className = 'wikilink' + (target ? '' : ' broken');
            a.href = '#';
            if (target) a.dataset.noteId = String(target.id);
            a.innerHTML = '<i class="fas fa-link"></i>' + esc(title);
            frag.appendChild(a);
            last = m.index + m[0].length;
        }
        if (last < text.length) frag.appendChild(document.createTextNode(text.slice(last)));
        textNode.parentNode.replaceChild(frag, textNode);
    });
    return wrap.innerHTML;
}

/* Belirli bir nota bağlantı veren diğer notları bulur (geri bağlantılar) */
/* ── Wiki-bağlantı otomatik tamamlama ── */
let wlAcActive = false, wlAcRange = null, wlAcStartOffset = -1, wlAcStartNode = null, wlAcSelIndex = 0;

function closeWlAutocomplete() {
    wlAcActive = false; wlAcRange = null; wlAcStartNode = null; wlAcStartOffset = -1; wlAcSelIndex = 0;
    $wlAutocomplete.classList.remove('open');
}

function openWlAutocomplete(query, rect) {
    wlAcActive = true;
    const matches = notes.filter(n => n.title.toLowerCase().includes(query.toLowerCase())).slice(0, 8);
    $wlAcList.innerHTML = '';
    wlAcSelIndex = 0;
    if (matches.length === 0) {
        const d = document.createElement('div');
        d.className = 'wl-ac-empty';
        d.textContent = query ? `“${query}” ile eşleşen not yok` : 'Yazmaya başlayın…';
        $wlAcList.appendChild(d);
    } else {
        matches.forEach((n, i) => {
            const d = document.createElement('div');
            d.className = 'wl-ac-item' + (i === 0 ? ' active' : '');
            d.dataset.title = n.title;
            d.innerHTML = `<i class="fas fa-file-alt"></i>${esc(n.title)}`;
            d.addEventListener('mousedown', ev => { ev.preventDefault(); insertWikilink(n.title); });
            $wlAcList.appendChild(d);
        });
    }
    let top = rect.bottom + 4, left = rect.left;
    if (left + 320 > window.innerWidth) left = window.innerWidth - 326;
    if (top + 220 > window.innerHeight) top = rect.top - 224;
    $wlAutocomplete.style.top = top + 'px';
    $wlAutocomplete.style.left = left + 'px';
    $wlAutocomplete.classList.add('open');
}

function insertWikilink(title) {
    if (!wlAcRange) { closeWlAutocomplete(); return; }
    /* insertNode sonrası range.startContainer element'e dönüşür — hedefi önceden yakala */
    const _targetCE = (wlAcRange.startContainer && wlAcRange.startContainer.nodeType === 3)
        ? wlAcRange.startContainer.parentElement?.closest('[contenteditable]')
        : null;
    const target = findNoteByTitle(title);
    const a = document.createElement('a');
    a.className = 'wikilink' + (target ? '' : ' broken');
    a.href = '#';
    if (target) a.dataset.noteId = String(target.id);
    a.innerHTML = '<i class="fas fa-link"></i>' + esc(title);
    const range = wlAcRange;
    range.deleteContents();
    range.insertNode(a);
    const space = document.createTextNode(' ');
    a.parentNode.insertBefore(space, a.nextSibling);
    const sel = window.getSelection();
    const r2 = document.createRange();
    r2.setStartAfter(space); r2.collapse(true);
    sel.removeAllRanges(); sel.addRange(r2);
    closeWlAutocomplete();
    const _focusTarget = _targetCE || document.getElementById('content');
    _focusTarget.focus();
    _focusTarget.dispatchEvent(new Event('input', { bubbles: true }));
}

/* [[ yazıldığında otomatik tamamlamayı tetikle */
$content.addEventListener('input', function wlDetect(e) {
    const _el = e.currentTarget;
    const sel = window.getSelection();
    if (!sel || !sel.isCollapsed || !sel.rangeCount || !_el.contains(sel.anchorNode)) { closeWlAutocomplete(); return; }
    const node = sel.anchorNode;
    if (node.nodeType !== 3) { closeWlAutocomplete(); return; }
    const text = node.nodeValue.slice(0, sel.anchorOffset);
    const m = text.match(/\[\[([^\[\]]{0,40})$/);
    if (!m) { closeWlAutocomplete(); return; }
    const query = m[1];
    const startOffset = sel.anchorOffset - m[0].length;
    const r = document.createRange();
    r.setStart(node, startOffset);
    r.setEnd(node, sel.anchorOffset);
    wlAcRange = r;
    const rect = r.getBoundingClientRect();
    if (!rect.width && !rect.height) { closeWlAutocomplete(); return; }
    openWlAutocomplete(query, rect);
});

$content.addEventListener('keydown', e => {
    if (!wlAcActive || !$wlAutocomplete.classList.contains('open')) return;
    const items = [...$wlAcList.querySelectorAll('.wl-ac-item')];
    if (e.key === 'Escape') { e.preventDefault(); closeWlAutocomplete(); return; }
    if (e.key === 'ArrowDown' && items.length) {
        e.preventDefault(); wlAcSelIndex = (wlAcSelIndex + 1) % items.length;
        items.forEach((it, i) => it.classList.toggle('active', i === wlAcSelIndex));
        items[wlAcSelIndex].scrollIntoView({ block:'nearest' });
    } else if (e.key === 'ArrowUp' && items.length) {
        e.preventDefault(); wlAcSelIndex = (wlAcSelIndex - 1 + items.length) % items.length;
        items.forEach((it, i) => it.classList.toggle('active', i === wlAcSelIndex));
        items[wlAcSelIndex].scrollIntoView({ block:'nearest' });
    } else if (e.key === 'Enter' && items.length) {
        e.preventDefault(); insertWikilink(items[wlAcSelIndex].dataset.title);
    }
}, true);

/* ══ v1.3: GÜNLÜK NOT ══ */
function dailyNoteTitle(d) {
    return 'Günlük Not — ' + d.toLocaleDateString('tr-TR', { day:'2-digit', month:'long', year:'numeric' });
}

function openOrCreateDailyNote() {
    const title = dailyNoteTitle(new Date());
    let n = findNoteByTitle(title);
    if (!n) {
        const content = sanitize('<h2>Bugün Ne Yaptım?</h2><p><br></p><h2>Yarın Ne Yapacağım?</h2><p><br></p><h2>Notlar</h2><p><br></p>');
        n = {
            id: genId(), title, content, contentMd: htmlToMd(content), group: 'Genel',
            pinned: false, colorLabel: null, tags: [],
            createdAt: Date.now(), updatedAt: Date.now()
        };
        notes.push(n);
        saveNotes(); render();
    }
    handleEditNoteRequest(n.id);
}
/* $dailyNoteBtn listener kaldırıldı */

/* ══ v1.3: GELİŞMİŞ ARAMA OPERATÖRLERİ ══ */
const COLOR_LABEL_ALIASES = {
    'kırmızı':'red','red':'red','acil':'red',
    'turuncu':'orange','orange':'orange','önemli':'orange',
    'sarı':'yellow','yellow':'yellow','bekliyor':'yellow',
    'yeşil':'green','green':'green','tamam':'green',
    'mavi':'blue','blue':'blue','bilgi':'blue',
    'mor':'purple','purple':'purple','fikir':'purple'
};
const SEARCH_OP_RE = /\b(grup|etiket|renk|sabit):(\S+)/gi;

function parseSearchQuery(q) {
    const ops = { group:null, tag:null, colorLabel:null, pinned:null };
    let free = q;
    free = free.replace(SEARCH_OP_RE, (_, key, val) => {
        const k = key.toLowerCase(), v = val.toLocaleLowerCase('tr');
        if (k === 'grup')   ops.group = v;
        if (k === 'etiket') ops.tag = v.replace(/^#/, '');
        if (k === 'renk')   ops.colorLabel = COLOR_LABEL_ALIASES[v] || v;
        if (k === 'sabit')  ops.pinned = (v === 'evet' || v === 'true' || v === 'yes');
        return ' ';
    }).trim();
    return { ops, free };
}

/* ══ THEME ══ */
const _themeIcons = { system:'fa-desktop', light:'fa-sun', dark:'fa-moon' };

function applyTheme() {
    isDark = themeMode === 'dark' || (themeMode === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
    patchUiCfg({theme: themeMode});
    const hmBtn = $('hm-theme-btn');
    if (hmBtn) {
        const ico = hmBtn.querySelector('i:first-child');
        if (ico) ico.className = 'fas ' + _themeIcons[themeMode];
    }
    document.querySelectorAll('.hm-theme-option').forEach(el =>
        el.classList.toggle('hm-theme-active', el.dataset.theme === themeMode));
    _applyThemeCustom();
}

/* ── Tema Özelleştirici ── */
const _THC_ALL_VARS = ['--accent','--bg','--surface','--surface-2','--border','--text','--text-muted','--tbl-header-bg','--tbl-border','--pnl-header-bg','--pnl-border','--col-sep'];
const _THC_LINKED  = ['--accent-dim','--edit-glow'];
const _THC_DEFS = {
    light: { '--accent':'#3b82f6','--bg':'#f8f9fa','--surface':'#ffffff','--surface-2':'#f1f3f5','--border':'#e5e7eb','--text':'#212529','--text-muted':'#6c757d','--tbl-header-bg':'#f1f3f5','--tbl-border':'#e5e7eb','--pnl-header-bg':'#f1f3f5','--pnl-border':'#e5e7eb','--col-sep':'#e5e7eb' },
    dark:  { '--accent':'#5b9df9','--bg':'#16181d','--surface':'#1e2127','--surface-2':'#262a31','--border':'#383d46','--text':'#e6e8eb','--text-muted':'#9aa3ad','--tbl-header-bg':'#262a31','--tbl-border':'#383d46','--pnl-header-bg':'#262a31','--pnl-border':'#383d46','--col-sep':'#383d46' },
};
function _thcGetCustom()  { const ui = getUiCfg(); return isDark ? (ui.customDark || {}) : (ui.customLight || {}); }
function _thcSaveCustom(obj) { patchUiCfg(isDark ? {customDark: obj} : {customLight: obj}); }
function _thcHexToRgba(hex, a) {
    const r=parseInt(hex.slice(1,3),16), g=parseInt(hex.slice(3,5),16), b=parseInt(hex.slice(5,7),16);
    return `rgba(${r},${g},${b},${a})`;
}
function _applyThemeCustom() {
    /* Önceki özel değerleri temizle */
    [..._THC_ALL_VARS, ..._THC_LINKED].forEach(v => document.documentElement.style.removeProperty(v));
    /* Kayıtlı özel değerleri uygula */
    const custom = _thcGetCustom();
    for (const [v, val] of Object.entries(custom)) {
        document.documentElement.style.setProperty(v, val);
        if (v === '--accent') {
            document.documentElement.style.setProperty('--accent-dim', _thcHexToRgba(val, isDark ? 0.16 : 0.12));
            document.documentElement.style.setProperty('--edit-glow', val);
        }
    }
    /* Picker'ları güncelle (ayarlar paneli açıksa) */
    if (typeof _thcRefreshUI === 'function') _thcRefreshUI();
}
let _thcRefreshUI = null;
/* Sistem teması değişince güncelle */
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    if (themeMode === 'system') applyTheme();
});
applyTheme();

/* ══ RENDER ══ */
function applyGroupFilterColor() {
    if (filterGroup === 'all') {
        $gfBadge.style.cssText = '';
    } else {
        const c = getColor(filterGroup);
        $gfBadge.style.color = c.main;
        $gfBadge.style.borderColor = c.main;
        $gfBadge.style.backgroundColor = c.bg;
    }
}

function applyTagFilterStyle() {
    $tfBadge.classList.toggle('active-filter', filterTag !== 'all');
    $tfBadge.textContent = filterTag !== 'all' ? '#' + filterTag : '#';
}

function buildGroupDropdown() {
    const gs = [...new Set(notes.map(n => n.group))].sort();
    $gfDropdown.innerHTML = '';
    const mkItem = (value, label) => {
        const d = document.createElement('div');
        d.className = 'gf-item' + (filterGroup === value ? ' active' : '');
        d.textContent = label;
        if (filterGroup === value && value !== 'all') d.style.color = getColor(value).main;
        d.addEventListener('click', () => setGroupFilter(value));
        return d;
    };
    $gfDropdown.appendChild(mkItem('all', 'Tüm Gruplar'));
    gs.forEach(g => $gfDropdown.appendChild(mkItem(g, g)));
}

function buildTagDropdown() {
    const tags = getAllTags();
    $tfDropdown.innerHTML = '';
    const mkItem = (value, label) => {
        const d = document.createElement('div');
        d.className = 'tf-item' + (filterTag === value ? ' active' : '');
        d.textContent = label;
        d.addEventListener('click', () => setTagFilter(value));
        return d;
    };
    const allItem = mkItem('all', 'Tüm Etiketler');
    allItem.classList.add('tf-item-all');
    $tfDropdown.appendChild(allItem);
    if (tags.length === 0) {
        const d = document.createElement('div');
        d.className = 'tf-item';
        d.style.color = 'var(--text-muted)';
        d.style.fontStyle = 'italic';
        d.textContent = 'Henüz etiket yok';
        d.style.pointerEvents = 'none';
        $tfDropdown.appendChild(d);
    }
    tags.forEach(t => $tfDropdown.appendChild(mkItem(t, '#' + t)));
}

function setGroupFilter(value) {
    filterGroup = value;
    $gfBadge.classList.remove('open');
    $gfDropdown.classList.remove('open');
    applyGroupFilterColor();
    render();
}

function setTagFilter(value) {
    filterTag = value;
    $tfBadge.classList.remove('open');
    $tfDropdown.classList.remove('open');
    applyTagFilterStyle();
    render();
}

function render() {
    applyGroupFilterColor();
    applyTagFilterStyle();

    const ec = getColor(editorGroup);
    $editorBadge.style.color = ec.main;
    $editorBadge.style.backgroundColor = ec.bg;
    $badgeText.textContent = editorGroup;

    let filtered = notes;
    if (filterGroup !== 'all') filtered = filtered.filter(n => n.group === filterGroup);
    if (filterTag   !== 'all') filtered = filtered.filter(n => (n.tags || []).includes(filterTag));
    if (searchQuery) {
        /* v1.3: gelişmiş arama operatörleri (grup:, etiket:, renk:, sabit:) */
        const { ops, free } = parseSearchQuery(searchQuery);
        if (ops.group)      filtered = filtered.filter(n => n.group.toLowerCase().includes(ops.group));
        if (ops.tag)        filtered = filtered.filter(n => (n.tags || []).some(t => t.toLowerCase().includes(ops.tag)));
        if (ops.colorLabel) filtered = filtered.filter(n => (n.colorLabel || '') === ops.colorLabel);
        if (ops.pinned !== null) filtered = filtered.filter(n => !!n.pinned === ops.pinned);
        if (free) {
            const q = free.toLowerCase();
            filtered = filtered.filter(n =>
                n.title.toLowerCase().includes(q) ||
                stripHtml(n.content).toLowerCase().includes(q) ||
                (n.tags || []).some(t => t.includes(q))
            );
        }
    }
    $headerCount.textContent = `${filtered.length}/${notes.length}`;

    $mainList.innerHTML = '';
    if (filtered.length === 0) {
        $mainList.innerHTML = `<div class="empty-state"><i class="fas fa-file-alt"></i>
            <p>${searchQuery ? 'Sonuç bulunamadı' : 'Henüz not yok'}</p></div>`;
        return;
    }

    /* v1.1: Sabitlenmiş notları en üste al */
    /* v1.5: sıralama uygulanmış */
    const pinnedNotes  = applySort(filtered.filter(n => n.pinned));
    const normalNotes  = applySort(filtered.filter(n => !n.pinned));

    /* Sabitlenmiş notlar bölümü */
    if (pinnedNotes.length > 0) {
        const ph = document.createElement('div');
        ph.className = 'pinned-group-header';
        ph.innerHTML = '<i class="fas fa-thumbtack" style="font-size:.65rem"></i> SABİTLENMİŞ';
        $mainList.appendChild(ph);

        const pinnedContainer = document.createElement('div');
        pinnedContainer.className = 'pinned-notes-container';
        pinnedContainer.style.marginBottom = '12px';
        pinnedNotes.forEach(n => pinnedContainer.appendChild(buildNoteItem(n)));
        $mainList.appendChild(pinnedContainer);
    }

    /* Normal notlar gruplandırılmış */
    const groups = {};
    normalNotes.forEach(n => { (groups[n.group] = groups[n.group] || []).push(n); });

    Object.keys(groups).sort().forEach(gName => {
        const isOpen = openGroups.includes(gName) || !!searchQuery || filterTag !== 'all';
        const c = getColor(gName);

        const gh = document.createElement('div');
        gh.className = 'group-header';
        gh.dataset.group = gName;
        gh.style.borderLeftColor = c.main;
        gh.style.color = c.main;
        gh.innerHTML = `<span>${esc(gName)}</span>
            <div style="display:flex;align-items:center;gap:9px">
                <span style="font-size:.69rem;color:var(--text-muted);font-weight:400;text-transform:none;letter-spacing:0">${groups[gName].length} not</span>
                <i class="fas fa-chevron-${isOpen ? 'up' : 'down'}" style="font-size:.69rem"></i>
            </div>`;

        const gc = document.createElement('div');
        gc.className = 'group-content' + (isOpen ? ' open' : '');
        groups[gName].forEach(n => gc.appendChild(buildNoteItem(n)));

        const box = document.createElement('div');
        box.className = 'group-box';
        box.appendChild(gh);
        box.appendChild(gc);
        $mainList.appendChild(box);
    });
    if (typeof window._todoUpdateBadge === 'function') window._todoUpdateBadge();
}

/* v1.1: Not kartı oluşturma — ayrı fonksiyon */
function buildNoteItem(n) {
    const exp    = expandedNotes.has(n.id);
    const expand = noteNeedsExpand(n);
    const plain  = stripHtml(n.content);
    const c      = getColor(n.group);

    const item = document.createElement('div');
    item.className = 'note-item' + (n.pinned ? ' is-pinned' : '');
    if ($editId.value && String(n.id) === String($editId.value)) item.classList.add('selected');
    item.dataset.id = String(n.id);

    /* v1.1: colorLabel yoksa grup rengini kullan */
    if (!n.colorLabel) {
        item.style.borderLeftColor = c.main;
    }
    if (n.colorLabel) item.dataset.cl = n.colorLabel;

    const titleRow = document.createElement('div');
    titleRow.className = 'note-title-row';

    const titleEl = document.createElement('div');
    titleEl.className = 'note-title' + (expand ? ' can-expand' : '');
    titleEl.innerHTML = highlight(esc(n.title || '(Başlıksız Not)'), searchQuery);
    if (expand) titleEl.title = exp ? 'Daralt' : 'Genişlet';

    const acts = document.createElement('div');
    acts.className = 'note-actions';
    const _rems = n.reminders || (n.reminder ? [n.reminder] : []);
    const _hasRem = _rems.some(r => r && r.at && !r.fired);
    const _remOverdue = _rems.some(r => r && r.at && !r.fired && r.at <= Date.now());
    acts.innerHTML = `
        <button class="nab fp-open" title="İkinci Editörde Aç"><i class="fas fa-columns"></i></button>
        <button class="nab share-link" title="Bağlantıyı Kopyala"><i class="fas fa-link"></i></button>
        <button class="nab pin ${n.pinned ? 'pinned' : ''}" title="${n.pinned ? 'Sabitlemeyi Kaldır' : 'Sabitle'}"><i class="fas fa-thumbtack"></i></button>
        <button class="nab reminder${_hasRem ? (_remOverdue ? ' overdue' : ' has-reminder') : ''}" title="Hatırlatıcı"><i class="fas fa-bell"></i></button>
        <button class="nab del" title="Sil"><i class="fas fa-trash"></i></button>`;

    titleRow.appendChild(titleEl);
    titleRow.appendChild(acts);

    const sumEl = document.createElement('p');
    sumEl.className = 'note-summary';
    sumEl.innerHTML = highlight(esc(plain.slice(0, 160)), searchQuery) + (expand && !exp ? '…' : '');

    /* v1.1: Tag badge'leri */
    const tagsEl = document.createElement('div');
    if (n.tags && n.tags.length > 0) {
        tagsEl.className = 'note-tags';
        n.tags.forEach(t => {
            const span = document.createElement('span');
            span.className = 'ntag';
            span.textContent = '#' + t;
            span.addEventListener('click', e => { e.stopPropagation(); setTagFilter(t); });
            tagsEl.appendChild(span);
        });
    }

    /* Tarih */
    const dateEl = document.createElement('div');
    dateEl.className = 'note-date';
    const ts = n.updatedAt || n.createdAt;
    if (ts) {
        const d = new Date(ts);
        dateEl.textContent = d.toLocaleDateString('tr-TR', { day:'2-digit', month:'short', year:'numeric' })
            + ' ' + d.toLocaleTimeString('tr-TR', { hour:'2-digit', minute:'2-digit' });
    }

    item.appendChild(titleRow);
    item.appendChild(sumEl);
    if (n.tags && n.tags.length > 0) item.appendChild(tagsEl);
    item.appendChild(dateEl);

    /* Grup rozeti — yalnızca sabitlenmiş notlarda; acts'tan sonra titleRow'un sağ ucunda */
    if (n.pinned) {
        const badge = document.createElement('div');
        badge.className = 'group-badge note-gbadge';
        badge.style.color = c.main;
        badge.style.backgroundColor = c.bg;
        badge.innerHTML = `<i class="fas fa-tag"></i> ${esc(n.group)}`;
        titleRow.appendChild(badge);
    }

    /* Renk etiketi rozeti — titleRow'da group badge ile aynı satırda, sağda */
    if (n.colorLabel) {
        const cl = COLOR_LABELS.find(c => c.key === n.colorLabel);
        if (cl) {
            const clBadge = document.createElement('span');
            clBadge.className = 'note-cl-badge';
            clBadge.textContent = cl.label;
            clBadge.style.background = cl.hex;
            if (n.colorLabel === 'yellow') clBadge.style.color = '#1a1a1a';
            titleRow.appendChild(clBadge);
        }
    }

    if (expand) {
        const full = document.createElement('div');
        full.className = 'note-full' + (exp ? ' open' : '');
        /* v1.3: eski notlardaki düz [[Başlık]] dizgilerini de görüntülerken bağlantıya çevir */
        full.innerHTML = sanitize(convertWikiSyntax(n.content));
        /* v1.3.1: wiki-bağlantılar uygulama içinde (aynı sayfada) gezinmeli —
           yalnızca gerçek dış bağlantılara target=_blank uygula, .wikilink hariç
           (Ctrl/Orta-tık ile yeni sekmede açılmasını da böylece engelliyoruz) */
        full.querySelectorAll('a[href]:not(.wikilink)').forEach(a => { a.target='_blank'; a.rel='noopener noreferrer'; });
        item.appendChild(full);
    }

    return item;
}

/* ══ EVENT DELEGATION — note list ══ */
$mainList.addEventListener('click', e => {
    const gh = e.target.closest('.group-header');
    if (gh) { toggleAccordion(gh.dataset.group); return; }

    const item = e.target.closest('.note-item');
    if (!item) return;
    const id = item.dataset.id;

    if (e.target.closest('.nab.fp-open')) { e.stopPropagation(); if (typeof window._fpLoadNote === 'function') window._fpLoadNote(id); return; }
    if (e.target.closest('.nab.share-link')) {
        e.stopPropagation();
        const url = location.href.split('?')[0] + '?note=' + encodeURIComponent(id);
        if (navigator.share) {
            const n = notes.find(n => String(n.id) === String(id));
            navigator.share({ title: n?.title || 'Not', url }).catch(() => {});
        } else {
            navigator.clipboard?.writeText(url).then(() => {
                if (typeof _showSnack === 'function') _showSnack('Bağlantı kopyalandı', 'ok', 2000);
            }).catch(() => { prompt('Bağlantıyı kopyalayın:', url); });
        }
        return;
    }
    /* v1.1: Pin toggle */
    if (e.target.closest('.nab.pin')) { togglePin(id); return; }
    if (e.target.closest('.nab.reminder')) {
        handleEditNoteRequest(id);
        setTimeout(() => { if (typeof openReminderPopup === 'function') openReminderPopup(); }, 250);
        return;
    }
    if (e.target.closest('.nab.del'))     { delNote(id);  return; }
    if (e.target.closest('.note-gbadge')) { e.stopPropagation(); openPicker(e.target.closest('.note-gbadge'), id); return; }
    /* v1.3: wiki-bağlantı tıklaması — hedef nota git */
    const wl = e.target.closest('a.wikilink');
    if (wl) {
        e.preventDefault(); e.stopPropagation();
        if (wl.dataset.noteId) handleEditNoteRequest(wl.dataset.noteId);
        return;
    }
    if (e.target.closest('.note-full'))   { return; }
    if (e.target.closest('.ntag'))        { return; } /* tag tıklaması setTagFilter ile halloluyor */

    handleEditNoteRequest(id);
});

/* ══ v1.3.1: WİKİ-BAĞLANTI HOVER ÖNİZLEME PANELİ ══
   Bağlı nota tıklamadan, üzerine gelindiğinde içeriğinin küçültülmüş
   ("zoom-out") bir önizlemesini yüzen bir panelde gösterir. */
let _wlPreviewShowT = null, _wlPreviewHideT = null, _wlPreviewLink = null;
const $wlPreviewInner = document.getElementById('wl-preview-inner');

/* ── Çoklu dış bağlantı panelleri ── */
let _extPanelTimer = null, _extPanelZ = 99999;
const _extPanelMap = new Map(); /* link → panel */

function createExtLinkPanel(link) {
    if (!link || !link.isConnected) return;
    if (_extPanelMap.has(link)) { _extPanelMap.get(link).style.zIndex = ++_extPanelZ; return; }
    const url = link.getAttribute('href') || '';
    if (!url || url.startsWith('#') || url.startsWith('javascript')) return;

    const isYT = !!extractYouTubeId(url);
    const initW = isYT ? 340 : 480;
    const initH = isYT ? Math.round(340 * 9 / 16) : 340;
    const panel = document.createElement('div');
    panel.className = 'wl-preview ext-mode ' + (isYT ? 'yt-mode' : 'web-mode') + ' open';
    panel.style.zIndex = ++_extPanelZ;
    panel.style.width = initW + 'px'; panel.style.height = initH + 'px';
    panel.innerHTML =
        '<div class="yt-drag-bar"></div>' +
        '<button class="wl-preview-close-btn" title="Kapat"><i class="fas fa-times"></i></button>' +
        '<div class="wl-preview-inner">' + buildExtLinkPreview(url, link.textContent) + '</div>' +
        '<div class="ext-resize-handle"></div>';

    /* Tahmini konum — DOM'a eklenmeden önce, görünür pozisyonda başlasın */
    const _lr = link.getBoundingClientRect();
    const _estW = initW;
    let _initLeft = _lr.left, _initTop = _lr.bottom + 4;
    if (_initLeft + _estW > window.innerWidth - 12) _initLeft = Math.max(12, window.innerWidth - _estW - 12);
    if (_initTop > window.innerHeight - 80) _initTop = Math.max(12, _lr.top - 120);
    panel.style.left = _initLeft + 'px'; panel.style.top = _initTop + 'px';

    document.body.appendChild(panel);
    _extPanelMap.set(link, panel);

    /* Gerçek yüksekliğe göre dikey ince ayar */
    requestAnimationFrame(() => {
        const ph = panel.offsetHeight || 100;
        const curTop = parseFloat(panel.style.top);
        if (curTop + ph > window.innerHeight - 12) panel.style.top = Math.max(12, _lr.top - ph - 4) + 'px';
    });

    /* Kapat */
    panel.querySelector('.wl-preview-close-btn').addEventListener('click', (e) => {
        e.stopPropagation(); panel.remove(); _extPanelMap.delete(link);
    });

    /* Taşı */
    const dragEl = panel.querySelector('.yt-drag-bar');
    let _ox = 0, _oy = 0;
    function onMove(e) { panel.style.left = (e.clientX - _ox) + 'px'; panel.style.top = (e.clientY - _oy) + 'px'; }
    function onUp()   { panel.style.transition = ''; document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp); }
    dragEl.addEventListener('mousedown', (e) => {
        if (e.target.closest('button')) return;
        const r2 = panel.getBoundingClientRect();
        _ox = e.clientX - r2.left; _oy = e.clientY - r2.top;
        panel.style.transition = 'none'; panel.style.zIndex = ++_extPanelZ;
        document.addEventListener('mousemove', onMove); document.addEventListener('mouseup', onUp);
        e.preventDefault();
    });

    /* Boyutlandır — sağ alt köşe */
    const resizeHandle = panel.querySelector('.ext-resize-handle');
    let _rox = 0, _roy = 0, _rw = 0, _rh = 0;
    function onResize(e) {
        panel.style.width  = Math.max(200, _rw + (e.clientX - _rox)) + 'px';
        panel.style.height = Math.max(100, _rh + (e.clientY - _roy)) + 'px';
    }
    function onResizeUp() { document.removeEventListener('mousemove', onResize); document.removeEventListener('mouseup', onResizeUp); }
    resizeHandle.addEventListener('mousedown', (e) => {
        e.stopPropagation();
        const r3 = panel.getBoundingClientRect();
        _rox = e.clientX; _roy = e.clientY; _rw = r3.width; _rh = r3.height;
        panel.style.zIndex = ++_extPanelZ;
        document.addEventListener('mousemove', onResize); document.addEventListener('mouseup', onResizeUp);
        e.preventDefault();
    });

    panel.addEventListener('mousedown', () => { panel.style.zIndex = ++_extPanelZ; });
}

function scheduleExtLinkPreview(link) {
    clearTimeout(_extPanelTimer);
    if (_extPanelMap.has(link)) return;
    _extPanelTimer = setTimeout(() => createExtLinkPanel(link), 3000);
}

function buildWlPreviewContent(noteId) {
    const n = notes.find(x => String(x.id) === String(noteId));
    if (!n) {
        return '<div class="wl-preview-broken"><i class="fas fa-link-slash"></i> Bu not artık mevcut değil (kırık bağlantı)</div>';
    }
    const title = esc(n.title || 'Başlıksız');
    const bodyHtml = sanitize(convertWikiSyntax(n.content || ''));
    const body = bodyHtml.trim()
        ? `<div class="wl-preview-body">${bodyHtml}</div>`
        : '<div class="wl-preview-body wl-preview-empty">(Bu not boş)</div>';
    return `<div class="wl-preview-title"><i class="fas fa-file-lines"></i>${title}</div>${body}`;
}

function showWlPreview(link) {
    if (!link || !link.isConnected) return;
    _wlPreviewLink = link;
    $wlPreviewInner.innerHTML = buildWlPreviewContent(link.dataset.noteId);
    $wlPreview.classList.add('open');

    const r   = link.getBoundingClientRect();
    const pw  = $wlPreview.offsetWidth  || 300;
    const ph  = $wlPreview.offsetHeight || 160;

    /* Graph modal açıkken gm-body sınırlarına göre konumlandır */
    const graphBody = $('graph-body');
    const graphOpen = graphBody && $('graph-overlay') && $('graph-overlay').classList.contains('open');

    if (graphOpen && graphBody) {
        /* position:fixed → gm-body'ye göre ayarla */
        const gbr = graphBody.getBoundingClientRect();
        let left = r.left;
        let top  = r.bottom + 4;

        /* gm-body sınırları içinde tut */
        if (left + pw > gbr.right  - 8) left = Math.max(gbr.left + 8, gbr.right  - pw - 8);
        if (left < gbr.left  + 8)       left = gbr.left + 8;
        if (top  + ph > gbr.bottom - 8) top  = Math.max(gbr.top  + 8, r.top - ph - 4);
        if (top  < gbr.top   + 8)       top  = gbr.top  + 8;

        $wlPreview.style.left = left + 'px';
        $wlPreview.style.top  = top  + 'px';
        /* hover'da büyüme için max boyutu modal ile sınırla */
        $wlPreview.style.maxWidth  = (gbr.width  - 24) + 'px';
        $wlPreview.style.maxHeight = (gbr.height - 24) + 'px';
        $wlPreview.style.setProperty('--wl-preview-max-h', (gbr.height - 24) + 'px');
    } else {
        /* Normal mod — viewport sınırları */
        let left = r.left;
        let top  = r.bottom + 4;
        if (left + pw > window.innerWidth  - 12) left = Math.max(12, window.innerWidth  - pw - 12);
        if (top  + ph > window.innerHeight - 12) top  = Math.max(12, r.top - ph - 4);
        $wlPreview.style.left     = left + 'px';
        $wlPreview.style.top      = top  + 'px';
        $wlPreview.style.maxWidth  = '';
        $wlPreview.style.maxHeight = '';
        $wlPreview.style.removeProperty('--wl-preview-max-h');
    }
}

function hideWlPreview() {
    $wlPreview.classList.remove('open');
    $wlPreviewInner.innerHTML = '';
    _wlPreviewLink = null;
}

function scheduleWlPreview(link) {
    clearTimeout(_wlPreviewHideT);
    if (_wlPreviewLink === link && $wlPreview.classList.contains('open')) return;
    clearTimeout(_wlPreviewShowT);
    _wlPreviewShowT = setTimeout(() => showWlPreview(link), 260);
}

function scheduleHideWlPreview() {
    clearTimeout(_wlPreviewShowT);
    clearTimeout(_wlPreviewHideT);
    _wlPreviewHideT = setTimeout(hideWlPreview, 350);
}

/* ── Dış bağlantı hover önizleme ── */
function extractYouTubeId(url) {
    try {
        const u = new URL(url);
        if (u.hostname === 'youtu.be') return u.pathname.slice(1).split('?')[0] || null;
        if (/youtube\.com$/.test(u.hostname)) return u.searchParams.get('v');
    } catch(e) {}
    return null;
}

function extractYouTubeStart(url) {
    try {
        const t = new URL(url).searchParams.get('t');
        if (!t) return null;
        if (/^\d+$/.test(t)) return parseInt(t, 10);
        let s = 0;
        const h = t.match(/(\d+)h/); if (h) s += parseInt(h[1], 10) * 3600;
        const m = t.match(/(\d+)m/); if (m) s += parseInt(m[1], 10) * 60;
        const sec = t.match(/(\d+)s/); if (sec) s += parseInt(sec[1], 10);
        return s || null;
    } catch(e) { return null; }
}

function buildExtLinkPreview(url, text) {
    const ytId = extractYouTubeId(url);
    if (ytId) {
        const start = extractYouTubeStart(url);
        const src = 'https://www.youtube.com/embed/' + ytId + (start ? '?start=' + start : '');
        return '<div class="wl-preview-yt">' +
            '<iframe width="560" height="315" src="' + esc(src) + '" ' +
            'title="YouTube video player" frameborder="0" ' +
            'allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" ' +
            'allowfullscreen></iframe></div>';
    }
    return '<div class="wl-preview-yt"><iframe src="' + esc(url) + '" frameborder="0"></iframe></div>';
}


/* mouseover/mouseout ile delegasyon — dinamik olarak eklenen .wikilink öğeleri de yakalanır */
$mainList.addEventListener('mouseover', e => {
    const wl = e.target.closest('a.wikilink');
    if (wl && wl.dataset.noteId) { scheduleWlPreview(wl); return; }
    const a = e.target.closest('a[href]:not(.wikilink)');
    if (a) scheduleExtLinkPreview(a);
});
$mainList.addEventListener('mouseout', e => {
    const wl = e.target.closest('a.wikilink');
    if (wl && !wl.contains(e.relatedTarget)) { scheduleHideWlPreview(); return; }
    const a = e.target.closest('a[href]:not(.wikilink)');
    if (a && !a.contains(e.relatedTarget)) clearTimeout(_extPanelTimer);
});
/* Liste kaydırılırsa veya not daraltılırsa paneli kapat */
$mainList.addEventListener('scroll', () => { if ($wlPreview.classList.contains('open')) hideWlPreview(); }, { passive:true });
/* Önizleme panelinin kendisine girilince timer iptal, çıkınca gizle */
$wlPreview.addEventListener('mouseenter', () => { clearTimeout(_wlPreviewHideT); clearTimeout(_wlPreviewShowT); });
$wlPreview.addEventListener('mouseleave', () => { scheduleHideWlPreview(); }); /* ext-mode'da no-op */

/* ══ v1.3.2: EDITOR ($content) içindeki wikilink'ler için hover önizleme + tıklama ══
   $mainList yalnızca sol panel listesini kapsar; sağ panelde açık notun
   içeriğindeki [[bağlantılar]] için aynı davranışı burada sağlıyoruz.         */
$content.addEventListener('mouseover', e => {
    const wl = e.target.closest('a.wikilink');
    if (wl && wl.dataset.noteId) { scheduleWlPreview(wl); return; }
    const a = e.target.closest('a[href]:not(.wikilink)');
    if (a) scheduleExtLinkPreview(a);
});
$content.addEventListener('mouseout', e => {
    const wl = e.target.closest('a.wikilink');
    if (wl && !wl.contains(e.relatedTarget)) { scheduleHideWlPreview(); return; }
    const a = e.target.closest('a[href]:not(.wikilink)');
    if (a && !a.contains(e.relatedTarget)) clearTimeout(_extPanelTimer);
});
/* Contenteditable içinde <a> tıklaması imleci konumlandırır ama gezinmez;
   biz mousedown'da yakalayıp ilgili nota atlıyoruz.                          */
$content.addEventListener('mousedown', e => {
    const wl = e.target.closest('a.wikilink');
    if (!wl || !wl.dataset.noteId) return;
    e.preventDefault();
    hideWlPreview();
    handleEditNoteRequest(wl.dataset.noteId);
});

/* ══ Float editör wikilink dinleyicileri fp-content elementine bağlanıyor —
   Bu element main script çalışırken henüz DOM'da yok (line 14810'da tanımlı),
   bu yüzden dinleyiciler float panel IIFE içinde (14893+) ekleniyor. ══ */

/* ══ v1.1: PIN ══ */
function togglePin(id) {
    const n = notes.find(x => String(x.id) === String(id));
    if (!n) return;
    n.pinned = !n.pinned;
    n.updatedAt = Date.now();
    saveNotes();
    render();
    /* Editörde açık not ise pin butonunu güncelle */
    if (String($editId.value) === String(id)) updateEditorPinBtn(n.pinned);
}

function updateEditorPinBtn(pinned) {
    editorPinned = pinned;
    $pinBtn.classList.toggle('pinned', pinned);
    $pinBtn.title = pinned ? 'Sabitlemeyi Kaldır' : 'Sabitle';
}

$pinBtn.addEventListener('click', () => {
    const eId = $editId.value;
    if (eId) {
        togglePin(eId);
    } else {
        /* Yeni not için editörde sabitleme */
        editorPinned = !editorPinned;
        updateEditorPinBtn(editorPinned);
    }
});

/* ══ v1.1: RENK ETİKETİ POPUP ══ */
(function() {
    const popup = $('color-label-popup');
    popup.addEventListener('click', e => e.stopPropagation());

    /* Satırları bul ve tıklama ekle */
    popup.querySelectorAll('.cl-badge-row').forEach(row => {
        row.addEventListener('mousedown', e => {
            e.preventDefault(); e.stopPropagation();
            applyColorLabel(row.dataset.cl || null);
        });
    });
})();

function applyColorLabel(key) {
    /* fp-footer renk etiketi bağlamı */
    const fpCtx = window._fpColorLabelContext;
    if (fpCtx) {
        window._fpColorLabelContext = null;
        const n = notes.find(x => String(x.id) === String(fpCtx));
        if (n) { n.colorLabel = key || null; n.updatedAt = Date.now(); saveNotes(); }
        if (typeof window._fpSyncFooter === 'function') window._fpSyncFooter();
        $('color-label-popup').classList.remove('open');
        return;
    }
    const eId = $editId.value;
    if (eId) {
        const n = notes.find(x => String(x.id) === String(eId));
        if (n) { n.colorLabel = key; n.updatedAt = Date.now(); saveNotes(); render(); }
    } else {
        editorColorLabel = key;
    }
    updateColorLabelBtn(key);
    $('color-label-popup').classList.remove('open');
}

/* ══ v1.6: İÇİNDEKİLER PANELİ ══ */
function buildTocPanel(noteId) {
    if (!$editorToc || !$editorTocList) return;
    const n = notes.find(x => String(x.id) === String(noteId));
    if (!n) { $editorToc.style.display = 'none'; $editorTocList.innerHTML = ''; if($tocToggleBtn) $tocToggleBtn.classList.add('hidden'); return; }
    const tmp = document.createElement('div');
    tmp.innerHTML = sanitize(n.content);
    const heads = Array.from(tmp.querySelectorAll('h2, h3'));
    if ($tocToggleBtn) $tocToggleBtn.classList.toggle('hidden', heads.length === 0);
    if (heads.length === 0) { $editorToc.style.display = 'none'; $editorTocList.innerHTML = ''; tocOpen = false; if($tocToggleBtn) $tocToggleBtn.classList.remove('active'); return; }
    $editorTocList.innerHTML = '';
    if (tocOpen) positionTocPanel();
    heads.forEach((h, i) => {
        const item = document.createElement('div');
        item.className = 'toc-item' + (h.tagName === 'H3' ? ' lvl-3' : '');
        item.textContent = stripHtml(h.innerHTML).trim() || ('Başlık ' + (i+1));
        item.dataset.idx = String(i);
        item.title = item.textContent;
        item.addEventListener('click', () => scrollToTocHeading(i));
        $editorTocList.appendChild(item);
    });
    $editorToc.style.display = tocOpen ? '' : 'none';
}
function positionTocPanel() {
    /* v1.10 güncelleme: İçindekiler popup'ı düğmenin üstünde, sağa doğru açılır */
    if (!$editorToc || !$tocToggleBtn) return;
    const r = $tocToggleBtn.getBoundingClientRect();
    $editorToc.style.left = Math.max(8, Math.min(r.left, window.innerWidth - 296)) + 'px';
    $editorToc.style.top = 'auto';
    $editorToc.style.bottom = (window.innerHeight - r.top + 6) + 'px';
}
function scrollToTocHeading(idx) {
    if (!$content) return;
    const heads = Array.from($content.querySelectorAll('h2, h3'));
    const target = heads[idx];
    if (target) target.scrollIntoView({ behavior:'smooth', block:'center' });
}
function toggleTocPanel() {
    tocOpen = !tocOpen;
    if ($tocToggleBtn) $tocToggleBtn.classList.toggle('active', tocOpen);
    if (tocOpen) positionTocPanel();
    if ($editorToc) $editorToc.style.display = (tocOpen && $editorTocList && $editorTocList.children.length) ? '' : 'none';
}

