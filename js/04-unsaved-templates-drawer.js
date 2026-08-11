/* ══════════════════════════════════════
   NOTED v1.4 — EK ÖZELLİKLER
   YENİ: Odaklanma Modu, HTML Dışa Aktarma, Özel Şablonlar
   ══════════════════════════════════════ */

/* ── v1.4: ODAKLANMA MODU ── */
State.focusModeActive = false;

function toggleFocusMode(forceOff) {
    const $mp   = document.querySelector('.main-panel');
    const $ct   = document.getElementById('content');
    const $card = document.getElementById('editor');
    const cardTopBefore = $card ? $card.getBoundingClientRect().top : 0;
    const ctSc  = $ct ? $ct.scrollTop : 0;

    if (forceOff === true) {
        State.focusModeActive = false;
    } else {
        /* body class ile senkronize et — desync durumunu düzelt */
        const bodyHas = document.body.classList.contains('focus-mode');
        if (bodyHas !== State.focusModeActive) State.focusModeActive = bodyHas;
        State.focusModeActive = !State.focusModeActive;
    }
    document.body.classList.toggle('focus-mode', State.focusModeActive);
    requestAnimationFrame(() => requestAnimationFrame(() => {
        if ($card && $mp) {
            const cardTopAfter = $card.getBoundingClientRect().top;
            $mp.scrollTop += (cardTopAfter - cardTopBefore);
        }
        if ($ct) $ct.scrollTop = ctSc;
    }));
    const btn = $('focus-btn');
    if (btn) {
        btn.classList.toggle('active', State.focusModeActive);
        btn.title = State.focusModeActive
            ? _t('em.focusmode.exittitle', 'Odaklanma Modundan Çık (Esc veya Ctrl+Shift+F)')
            : _t('em.focusmode.title', 'Odaklanma Modu (Ctrl+Shift+F)');
        btn.innerHTML = '<i class="fas fa-' + (State.focusModeActive ? 'compress-alt' : 'expand-alt') + '"></i><span>' + (State.focusModeActive ? _t('em.focusmode.exit', 'Odaklanmadan Çık') : _t('em.focusmode', 'Odaklanma Modu')) + '</span>';
    }
}

$('focus-btn').addEventListener('click', function() { toggleFocusMode(); });

/* ── v1.4: HTML DIŞA AKTARMA ── */
function exportNoteAsHtml(noteId) {
    var n = noteId ? State.notes.find(function(x) { return String(x.id) === String(noteId); }) : null;
    if (!n) n = typeof _buildLiveNoteForExport === 'function' ? _buildLiveNoteForExport() : null;
    if (!n) return;
    var safeContent = sanitize(convertWikiSyntax(n.content));
    var dateStr = n.updatedAt
        ? new Date(n.updatedAt).toLocaleDateString(_notedLocale(), { day:'2-digit', month:'long', year:'numeric' })
        : '';
    var tagsHtml = (n.tags && n.tags.length > 0)
        ? '<span>\uD83C\uDFF7 ' + n.tags.map(function(t){ return '#'+esc(t); }).join(' ') + '</span>'
        : '';
    var todayStr = new Date().toLocaleDateString(_notedLocale());
    var html = [
        '<!DOCTYPE html>',
        '<html lang="tr">',
        '<head>',
        '<meta charset="UTF-8">',
        '<meta name="viewport" content="width=device-width,initial-scale=1.0">',
        '<title>' + esc(n.title) + '</title>',
        '<link href="https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;700&family=Roboto+Condensed:wght@300;400;700&display=swap" rel="stylesheet">',
        '<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">',
        '<style>',
        '*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}',
        'body{font-family:Roboto,sans-serif;max-width:780px;margin:0 auto;padding:44px 28px 60px;color:#1a1a1a;background:#fafafa;line-height:1.65}',
        'h1{font-size:2rem;margin-bottom:6px;font-weight:700;line-height:1.2}',
        '.meta{color:#888;font-size:.82rem;margin-bottom:32px;display:flex;align-items:center;gap:10px;flex-wrap:wrap}',
        '.content{font-family:"Roboto Condensed",sans-serif;font-size:1.02rem;line-height:1.75}',
        'h2{font-size:1.3rem;margin:24px 0 8px;font-weight:700}',
        'h3{font-size:1.1rem;margin:18px 0 6px;font-weight:700}',
        'p{margin:6px 0}',
        'ul,ol{padding-left:24px;margin:8px 0}li{margin:4px 0}',
        'blockquote{border-left:3px solid #3B82F6;padding:8px 16px;margin:12px 0;color:#555;font-style:italic}',
        'code{background:#EFF6FF;color:#2563EB;border:1px solid #BFDBFE;padding:2px 6px;border-radius:4px;font-family:monospace;font-size:.88em}',
        'pre{background:#1E293B;color:#E2E8F0;padding:16px;border-radius:8px;overflow-x:auto;margin:10px 0}',
        'pre code{background:none;border:none;color:inherit}',
        'a{color:#3B82F6;text-decoration:none}a:hover{text-decoration:underline}',
        'a.wikilink{color:#8b5cf6;font-weight:600;border-bottom:1px dashed #8b5cf6}',
        'strong{font-weight:700}mark{background:rgba(212,168,67,.25);border-radius:2px;padding:0 2px}',
        '.badge{display:inline-block;padding:0 7px;border-radius:999px;font-size:.75em;font-weight:600;background:rgba(59,130,246,.12);color:#3B82F6;border:1px solid rgba(59,130,246,.3);line-height:1.6}',
        '.todo-list{list-style:none;padding-left:0}.todo-item{padding-left:22px;position:relative;min-height:1.4em}',
        '.todo-item[data-checked="true"]{text-decoration:line-through;color:#aaa}',
        'footer{margin-top:48px;padding-top:14px;border-top:1px solid #eee;font-size:.73rem;color:#bbb;text-align:center}',
        '</style>',
        '</head>',
        '<body>',
        '<h1>' + esc(n.title) + '</h1>',
        '<div class="meta"><span>\uD83D\uDCC5 ' + dateStr + '</span><span>\uD83D\uDCC1 ' + esc(n.group) + '</span>' + tagsHtml + '</div>',
        '<div class="content">' + safeContent + '</div>',
        '<footer>Noted uygulamasından dışa aktarıldı &nbsp;·&nbsp; ' + todayStr + '</footer>',
        '</body>',
        '</html>'
    ].join('\n');
    var blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = n.title.replace(/[\\\/:*?"<>|]/g, '-').slice(0, 60) + '.html';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

$('export-html-btn').addEventListener('click', function() {
    exportNoteAsHtml(DOM.$editId.value || null);
});

/* v1.6: İçindekiler */
if (DOM.$tocToggleBtn) DOM.$tocToggleBtn.addEventListener('click', toggleTocPanel);

/* v1.6: Hatırlatıcı */
if (DOM.$reminderBtn) DOM.$reminderBtn.addEventListener('click', function(e) {
    e.stopPropagation();
    if (DOM.$reminderPopup.classList.contains('show')) closeReminderPopup();
    else openReminderPopup();
});
if ($('reminder-save'))   $('reminder-save').addEventListener('click', saveReminderFromPopup);
if ($('reminder-clear'))  $('reminder-clear').addEventListener('click', clearReminderFromPopup);
if ($('reminder-cancel')) $('reminder-cancel').addEventListener('click', closeReminderPopup);
document.addEventListener('click', function(e) {
    if (!DOM.$reminderPopup || !DOM.$reminderPopup.classList.contains('show')) return;
    if (e.target === DOM.$reminderBtn || DOM.$reminderBtn.contains(e.target)) return;
    if (DOM.$reminderPopup.contains(e.target)) return;
    closeReminderPopup();
});
setInterval(checkReminders, 60000);
setTimeout(checkReminders, 2000);

/* v1.6: Markdown dışa aktar */
if (DOM.$exportMdBtn) DOM.$exportMdBtn.addEventListener('click', function() {
    exportNoteAsMarkdown(DOM.$editId.value || null);
});

/* ── v1.4: ÖZEL ŞABLONLAR ── */
State.customTemplates = getContentCfg().templates || [];
if (!Array.isArray(State.customTemplates)) State.customTemplates = [];

function saveCustomTemplates() {
    patchContentCfg({templates: State.customTemplates});
}

function buildTemplateDropdownContent() {
    var dropdown = $('template-dropdown');
    if (!dropdown) return;
    dropdown.innerHTML = '';
    var hdr = document.createElement('div');
    hdr.className = 'tpl-header';
    hdr.textContent = _t('tpl.header', 'Hazır Şablonlar');
    dropdown.appendChild(hdr);
    var builtins = [
        { key:'daily',   label:_t('tpl.daily', '\uD83D\uDCC5 Günlük Not') },
        { key:'meeting', label:_t('tpl.meeting', '\uD83E\uDD1D Toplantı Notları') },
        { key:'idea',    label:_t('tpl.idea', '\uD83D\uDCA1 Fikir') }
    ];
    builtins.forEach(function(b) {
        var d = document.createElement('div');
        d.className = 'tpl-item'; d.dataset.tpl = b.key; d.textContent = b.label;
        dropdown.appendChild(d);
    });
    var saveBtn = document.createElement('div');
    saveBtn.className = 'tpl-item tpl-save-btn';
    saveBtn.innerHTML = '<i class="fas fa-plus-circle"></i><span>' + _t('tpl.savebtn', 'Bu Notu Şablon Kaydet') + '</span>';
    saveBtn.addEventListener('click', function(e) { e.stopPropagation(); saveCurrentNoteAsTemplate(); });
    dropdown.appendChild(saveBtn);
    if (State.customTemplates.length > 0) {
        var sep = document.createElement('div');
        sep.className = 'tpl-header'; sep.textContent = _t('tpl.customheader', 'Özel Şablonlar'); sep.style.marginTop = '4px';
        dropdown.appendChild(sep);
        State.customTemplates.forEach(function(tpl) {
            var row = document.createElement('div');
            row.className = 'tpl-item tpl-item-custom';
            var nameSpan = document.createElement('span');
            nameSpan.textContent = '\uD83D\uDCC4 ' + tpl.name;
            nameSpan.title = tpl.name;
            nameSpan.addEventListener('click', function(e) { e.stopPropagation(); applyCustomTemplate(tpl); });
            var delBtn = document.createElement('button');
            delBtn.className = 'tpl-item-del';
            delBtn.innerHTML = '<i class="fas fa-times"></i>';
            delBtn.title = _t('tpl.deletebtn', 'Şablonu Sil');
            delBtn.addEventListener('click', function(e) {
                e.stopPropagation();
                if (confirm(NotedI18n.t('msg.tpldeleteconfirm').replace('{name}', tpl.name))) {
                    deleteCustomTemplate(String(tpl.id));
                }
            });
            row.appendChild(nameSpan); row.appendChild(delBtn);
            dropdown.appendChild(row);
        });
    }
}

function saveCurrentNoteAsTemplate() {
    var title = DOM.$title.value.trim();
    var content = DOM.$content.innerHTML;
    if (!title && !stripHtml(content).trim()) {
        alert(NotedI18n.t('msg.tplneedcontent')); return;
    }
    var name = prompt(NotedI18n.t('msg.tplnameprompt'), title || NotedI18n.t('msg.tplnamedefault'));
    if (!name || !name.trim()) return;
    State.customTemplates.push({ id: genId(), name: name.trim(), title: title, content: content });
    saveCustomTemplates();
    buildTemplateDropdownContent();
    closeTemplateDropdown();
}

function deleteCustomTemplate(id) {
    State.customTemplates = State.customTemplates.filter(function(t) { return String(t.id) !== id; });
    saveCustomTemplates();
    buildTemplateDropdownContent();
}

function applyCustomTemplate(tpl) {
    closeTemplateDropdown();
    if (typeof activateInstance === 'function' && window._mainEditorInstance) activateInstance(window._mainEditorInstance);
    DOM.$title.value = tpl.title || '';
    DOM.$content.innerHTML = sanitize(tpl.content || '');
    if (typeof window._inflateCodeBlocks === 'function') window._inflateCodeBlocks(DOM.$content);
    EditorState._snapTitle = '';
    updateFooterVisibility();
    DOM.$title.focus();
}



/* Klavye kısayolları */


/* İlk yükleme: şablon dropdown içeriğini oluştur */
buildTemplateDropdownContent();

/* ==============================================================================
   NOTED v1.5 EK OZELLiKLER: Slash Komutlari, Siralama, Zaman Damgasi
   ============================================================================== */

/* v1.5: NOT SIRALAMA */
State.sortOrder = getUiCfg().sort || 'newest';

DOM.$sortBadge    = $('sort-badge');
DOM.$sortDropdown = $('sort-dropdown');

function setSortOrder(value) {
    State.sortOrder = value;
    patchUiCfg({sort: value});
    DOM.$sortBadge.classList.toggle('active-sort', value !== 'newest');
    DOM.$sortDropdown.classList.remove('open');
    DOM.$sortBadge.classList.remove('open');
    buildSortDropdown();
    render();
}

function buildSortDropdown() {
    if (!DOM.$sortDropdown) return;
    DOM.$sortDropdown.innerHTML = '';
    const SORT_ITEMS = [
        { value:'newest', label:NotedI18n.t('lhr.sort.newest') },
        { value:'oldest', label:NotedI18n.t('lhr.sort.oldest') },
        { value:'az',     label:NotedI18n.t('lhr.sort.aztitle') },
        { value:'za',     label:NotedI18n.t('lhr.sort.zatitle') },
    ];
    SORT_ITEMS.forEach(it => {
        const d = document.createElement('div');
        d.className = 'sort-item' + (State.sortOrder === it.value ? ' active' : '');
        d.textContent = it.label;
        d.addEventListener('click', () => setSortOrder(it.value));
        DOM.$sortDropdown.appendChild(d);
    });
}

/* ── Liste Görünüm Modu ── */
State.listView = getUiCfg().listView || 'standard';

DOM.$viewBadge    = $('view-badge');
DOM.$viewDropdown = $('view-dropdown');

Object.defineProperty(Const, 'VIEW_ITEMS', { configurable: true, get: function () {
    return [
        { value:'standard', label:_t('view.standard', 'Standart'), icon:'fa-list' },
        { value:'wide',     label:_t('view.wide', 'Geniş'),        icon:'fa-align-justify' },
        { value:'compact',  label:_t('view.compact', 'Kompakt'),   icon:'fa-bars' },
        { value:'cascade',  label:_t('view.cascade', 'Cascade'),   icon:'fa-layer-group' },
        { value:'pill',     label:_t('view.pill', 'Pil'),          icon:'fa-tags' },
    ];
}});

function applyListView(v) {
    ['view-wide','view-compact','view-cascade','view-pill'].forEach(c => DOM.$mainList.classList.remove(c));
    if (v !== 'standard') DOM.$mainList.classList.add('view-' + v);
    if (DOM.$viewBadge) DOM.$viewBadge.classList.toggle('active-view', v !== 'standard');
}

function setListView(value) {
    State.listView = value;
    patchUiCfg({listView: value});
    applyListView(value);
    if (DOM.$viewDropdown) DOM.$viewDropdown.classList.remove('open');
    if (DOM.$viewBadge)    DOM.$viewBadge.classList.remove('open');
    buildViewDropdown();
}

function buildViewDropdown() {
    if (!DOM.$viewDropdown) return;
    DOM.$viewDropdown.innerHTML = '';
    Const.VIEW_ITEMS.forEach(it => {
        const d = document.createElement('div');
        d.className = 'view-item' + (State.listView === it.value ? ' active' : '');
        d.innerHTML = `<i class="fas ${it.icon}"></i>${esc(it.label)}`;
        d.addEventListener('click', () => setListView(it.value));
        DOM.$viewDropdown.appendChild(d);
    });
}

if (DOM.$viewBadge) {
    DOM.$viewBadge.addEventListener('click', e => {
        e.stopPropagation();
        const willOpen = !DOM.$viewDropdown.classList.contains('open');
        _closeHeaderDropdowns('view');
        if (willOpen) {
            DOM.$viewBadge.classList.add('open');
            DOM.$viewDropdown.classList.add('open');
            buildViewDropdown();
            _positionDropdown(DOM.$viewBadge, DOM.$viewDropdown);
        }
    });
}

buildViewDropdown();
applyListView(State.listView);

function applySort(arr) {
    const a = [...arr];
    switch (State.sortOrder) {
        case 'newest': return a.sort((x, y) => ((y.updatedAt||y.id||0) - (x.updatedAt||x.id||0)));
        case 'oldest': return a.sort((x, y) => ((x.updatedAt||x.id||0) - (y.updatedAt||y.id||0)));
        case 'az':     return a.sort((x, y) => (x.title||'').localeCompare(y.title||'', _notedLocale()));
        case 'za':     return a.sort((x, y) => (y.title||'').localeCompare(x.title||'', _notedLocale()));
        default:       return a;
    }
}

DOM.$sortBadge.addEventListener('click', e => {
    e.stopPropagation();
    const willOpen = !DOM.$sortDropdown.classList.contains('open');
    _closeHeaderDropdowns('sort');
    if (willOpen) {
        DOM.$sortBadge.classList.add('open');
        DOM.$sortDropdown.classList.add('open');
        buildSortDropdown();
        _positionDropdown(DOM.$sortBadge, DOM.$sortDropdown);
    }
});

/* Ilk yukleme aktif gosterge */
if (State.sortOrder !== 'newest') DOM.$sortBadge.classList.add('active-sort');


/* v1.5: ZAMAN DAMGASI — side toolbar ve kısayol ile tetiklenir */
function insertTimestamp() {
    const now = new Date();
    const dateStr = now.toLocaleDateString(_notedLocale(), { day:'numeric', month:'long', year:'numeric' });
    const timeStr = now.toLocaleTimeString(_notedLocale(), { hour:'2-digit', minute:'2-digit' });
    const text = '📅 ' + dateStr + ', ' + timeStr;
    (EditorState._activeEditTarget||DOM.$content).focus();
    document.execCommand('insertText', false, text);
}

/* Ctrl+Shift+T */

/* v1.5: SLASH KOMUTLARI — gruplandırılmış */
Const.SLASH_COMMAND_GROUPS = [
    {
        label: 'Başlık',
        items: [
            { type:'h2',      icon:'fa-heading',     label:'Başlık 1',      hint:'/h2' },
            { type:'h3',      icon:'fa-heading',     label:'Başlık 2',      hint:'/h3' },
            { type:'h4',      icon:'fa-heading',     label:'Başlık 3',      hint:'/h4' },
        ]
    },
    {
        label: 'Liste',
        items: [
            { type:'ul',      icon:'fa-list-ul',     label:'Madde Listesi', hint:'/ul'   },
            { type:'ol',      icon:'fa-list-ol',     label:'Sıralı Liste',  hint:'/ol'   },
            { type:'todo',    icon:'fa-check-square',label:'Görev Listesi', hint:'/todo' },
        ]
    },
    {
        label: 'Kod',
        items: [
            { type:'cblock',  icon:'fa-terminal',    label:'Kod Bloğu',     hint:'/code' },
            { type:'icode',   icon:'fa-code',        label:'Satır içi Kod', hint:'/icode'},
        ]
    },
    {
        label: 'Blok',
        items: [
            { type:'blockquote',icon:'fa-quote-right',  label:'Alıntı',          hint:'/q'    },
            { type:'hr',        icon:'fa-minus',         label:'Yatay Çizgi',     hint:'/hr'   },
            { type:'badge',     icon:'fa-tag',           label:'Rozet',           hint:'/badge'},
            { type:'table',     icon:'fa-table',         label:'Tablo (3×3)',      hint:'/t'  },
            { type:'panel2',    icon:'fa-table-cells-large', label:'Panel 2 Kolon', hint:'/p2'},
            { type:'panel3',    icon:'fa-table-cells-large', label:'Panel 3 Kolon', hint:'/p3'},
            { type:'layout2',   icon:'fa-table-columns', label:'Kolon 2',          hint:'/l2'},
            { type:'layout3',   icon:'fa-table-columns', label:'Kolon 3',          hint:'/l3'},
        ]
    },
    {
        label: 'Vurgu',
        items: [
            { type:'callout-info',    icon:'fa-circle-info',           label:'Bilgi',   hint:'/ci'},
            { type:'callout-warning', icon:'fa-triangle-exclamation',  label:'Uyarı',   hint:'/cw'},
            { type:'callout-tip',     icon:'fa-lightbulb',             label:'İpucu',   hint:'/ct'},
            { type:'callout-success', icon:'fa-circle-check',          label:'Başarı',  hint:'/cs'},
        ]
    },
];
/* Düz liste (klavye navigasyonu için) */
Const.SLASH_COMMANDS = Const.SLASH_COMMAND_GROUPS.flatMap(g => g.items);

/* Satır-başı /komut<SPACE> inline kısayol haritası */
Const.SLASH_INLINE_MAP = {
    'ul':'ul', 'ol':'ol', 'todo':'todo',
    'h1':'h2', 'h2':'h2', 'h3':'h3', 'h4':'h4',
    'code':'cblock', 'cblock':'cblock', 'icode':'icode',
    'blockquote':'blockquote', 'q':'blockquote', 'quote':'blockquote',
    'hr':'hr', 'badge':'badge',
    't':'table', 'table':'table',
    'p2':'panel2', 'p3':'panel3', 'panel2':'panel2', 'panel3':'panel3',
    'l2':'layout2', 'l3':'layout3', 'layout2':'layout2', 'layout3':'layout3',
    'ci':'callout-info', 'cw':'callout-warning', 'ct':'callout-tip', 'cs':'callout-success',
};

DOM.$slashMenu = $('slash-menu');
EditorState.slashMenuOpen = false; EditorState.slashTextNode = null; EditorState.slashOffset = 0; EditorState.slashSelIndex = 0;
EditorState._slashActiveSub = null; /* Açık alt panel referansı */
EditorState._slashHideTimer = null;

function _slashPositionSub(catEl, subEl) {
    const catRect = catEl.getBoundingClientRect();
    const subW = subEl.offsetWidth  || 194;
    const subH = subEl.offsetHeight || 160;
    const vW = window.innerWidth, vH = window.innerHeight;

    /* Varsayılan: ana menünün SAĞINDA aç */
    let left = catRect.right + 4;
    /* Sağa sığmıyorsa sola aç */
    if (left + subW > vW - 6) left = catRect.left - subW - 4;
    /* Hâlâ sola taşıyorsa viewport'a sıkıştır */
    if (left < 6) left = 6;

    /* Dikey: kategori satırı ile hizalı, sığmazsa yukarı kaydır */
    let top = catRect.top;
    if (top + subH > vH - 6) top = vH - subH - 6;
    if (top < 6) top = 6;

    subEl.style.left = left + 'px';
    subEl.style.top  = top  + 'px';
}

function buildSlashMenuItems(filter) {
    /* Açık sub paneli temizle */
    if (EditorState._slashActiveSub) { EditorState._slashActiveSub.remove(); EditorState._slashActiveSub = null; }
    DOM.$slashMenu.innerHTML = '';

    if (filter) {
        /* Filtre varsa düz liste */
        let first = true;
        Const.SLASH_COMMAND_GROUPS.forEach(grp => {
            grp.items.filter(c => c.label.toLowerCase().includes(filter.toLowerCase()))
            .forEach(cmd => {
                const d = document.createElement('div');
                d.className = 'slash-menu-item' + (first ? ' active' : '');
                d.dataset.type = cmd.type;
                d.innerHTML = '<i class="fas ' + cmd.icon + '"></i><span class="sm-label">' + cmd.label + '</span><span class="sm-hint">' + cmd.hint + '</span>';
                d.addEventListener('mousedown', ev => { ev.preventDefault(); applySlashCommand(cmd.type); });
                DOM.$slashMenu.appendChild(d);
                first = false;
            });
        });
        return;
    }

    /* Kategori listesi + JS-yönetimli sub-panel */
    const CAT_ICONS = { 'Başlık':'fa-heading', 'Liste':'fa-list-ul', 'Kod':'fa-code', 'Blok':'fa-th-large', 'Düzen':'fa-table-columns' };

    Const.SLASH_COMMAND_GROUPS.forEach((grp, gi) => {
        const cat = document.createElement('div');
        cat.className = 'slash-cat';
        cat.dataset.gi = String(gi);
        cat.innerHTML =
            '<i class="fas ' + (CAT_ICONS[grp.label]||'fa-folder') + ' cat-icon"></i>' +
            '<span class="cat-label">' + grp.label + '</span>' +
            '<i class="fas fa-chevron-right cat-arrow"></i>';

        /* Sub panel DOM'u body'ye ekle */
        const sub = document.createElement('div');
        sub.className = 'slash-cat-sub';
        grp.items.forEach((cmd, i) => {
            const d = document.createElement('div');
            d.className = 'slash-menu-item';
            d.dataset.type = cmd.type;
            d.innerHTML = '<i class="fas ' + cmd.icon + '"></i><span class="sm-label">' + cmd.label + '</span><span class="sm-hint">' + cmd.hint + '</span>';
            d.addEventListener('mousedown', ev => { ev.preventDefault(); ev.stopPropagation(); applySlashCommand(cmd.type); });
            sub.appendChild(d);
        });
        document.body.appendChild(sub);
        sub.style.display = 'none';
        cat._sub = sub;

        function showSub() {
            if (EditorState._slashHideTimer) { clearTimeout(EditorState._slashHideTimer); EditorState._slashHideTimer = null; }
            /* Diğer açık sub'ları gizle */
            if (EditorState._slashActiveSub && EditorState._slashActiveSub !== sub) {
                EditorState._slashActiveSub.style.display = 'none';
                const prevCat = DOM.$slashMenu.querySelector('.slash-cat.active');
                if (prevCat) prevCat.classList.remove('active');
            }
            sub.style.display = 'block';
            EditorState._slashActiveSub = sub;
            _slashPositionSub(cat, sub);
            cat.classList.add('active');
        }

        function hideSub() {
            EditorState._slashHideTimer = setTimeout(() => {
                sub.style.display = 'none';
                cat.classList.remove('active');
                if (EditorState._slashActiveSub === sub) EditorState._slashActiveSub = null;
            }, 120);
        }

        cat.addEventListener('mouseenter', showSub);
        cat.addEventListener('mouseleave', e => {
            /* Sub'a geçiyorsa gizleme */
            if (e.relatedTarget && sub.contains(e.relatedTarget)) return;
            hideSub();
        });
        sub.addEventListener('mouseenter', () => {
            if (EditorState._slashHideTimer) { clearTimeout(EditorState._slashHideTimer); EditorState._slashHideTimer = null; }
        });
        sub.addEventListener('mouseleave', e => {
            /* Parent cat'e dönüyorsa gizleme */
            if (e.relatedTarget && cat.contains(e.relatedTarget)) return;
            hideSub();
        });
        cat.addEventListener('click', showSub);

        DOM.$slashMenu.appendChild(cat);
    });
}

function openSlashMenu(rect) {
    EditorState.slashMenuOpen = true; EditorState.slashSelIndex = 0;
    buildSlashMenuItems(null);

    DOM.$slashMenu.style.visibility = 'hidden';
    DOM.$slashMenu.style.left = '0';
    DOM.$slashMenu.style.top  = '0';
    DOM.$slashMenu.classList.add('open');

    requestAnimationFrame(() => {
        const mW  = DOM.$slashMenu.offsetWidth  || 164;
        const mH  = DOM.$slashMenu.offsetHeight || 200;
        const PAD = 6;
        const vW  = window.innerWidth;
        const vH  = window.innerHeight;

        const editorEl = (EditorState._activeEditTarget || DOM.$content).closest('.editor-card') || document.body;
        const eR = editorEl.getBoundingClientRect();

        /* Yatay: slash'ın hemen solundan başla, sığmazsa sola kaydır */
        let left = rect.left;
        if (left + mW + PAD > Math.min(eR.right, vW - PAD)) {
            left = rect.right - mW;
        }
        left = Math.max(eR.left + PAD, Math.max(PAD, Math.min(left, vW - mW - PAD)));

        /* Dikey: slash'ın hemen altı; alta taşarsa üstüne */
        let top = rect.bottom + 2;
        if (top + mH + PAD > Math.min(eR.bottom, vH - PAD)) {
            top = rect.top - mH - 2;
        }
        top = Math.max(eR.top + PAD, Math.max(PAD, Math.min(top, vH - mH - PAD)));

        DOM.$slashMenu.style.left = left + 'px';
        DOM.$slashMenu.style.top  = top  + 'px';
        DOM.$slashMenu.style.visibility = '';
    });
}

function closeSlashMenu() {
    EditorState.slashMenuOpen = false; EditorState.slashTextNode = null; EditorState.slashOffset = 0; EditorState.slashSelIndex = 0;
    if (EditorState._slashActiveSub) { EditorState._slashActiveSub.style.display = 'none'; EditorState._slashActiveSub = null; }
    if (EditorState._slashHideTimer) { clearTimeout(EditorState._slashHideTimer); EditorState._slashHideTimer = null; }
    /* Tüm body'e eklenmiş sub panelleri temizle */
    document.querySelectorAll('.slash-cat-sub').forEach(s => s.remove());
    DOM.$slashMenu.classList.remove('open');
}

/* Slash menü dışına tıklayınca kapat */
document.addEventListener('mousedown', e => {
    if (!EditorState.slashMenuOpen) return;
    if (DOM.$slashMenu.contains(e.target)) return;
    if (e.target.closest('.slash-cat-sub')) return;
    closeSlashMenu();
}, true);

function applySlashCommand(type) {
    (EditorState._activeEditTarget||DOM.$content).focus();
    if (EditorState.slashTextNode && EditorState.slashTextNode.isConnected) {
        const text = EditorState.slashTextNode.nodeValue || '';
        const idx = text.lastIndexOf('/', EditorState.slashOffset - 1);
        if (idx !== -1) {
            const sel = window.getSelection();
            const r = document.createRange();
            r.setStart(EditorState.slashTextNode, idx);
            r.setEnd(EditorState.slashTextNode, idx + 1); /* '/' karakterini seç */
            sel.removeAllRanges(); sel.addRange(r);
            (EditorState._activeEditTarget||DOM.$content).focus(); document.execCommand('delete', false, null); /* seçili '/' sil */
        }
    }
    closeSlashMenu();
    if (type.startsWith('ccb:')) {
        if (typeof window._insertCcb === 'function') window._insertCcb(type.slice(4));
        return;
    }
    if (type === 'hr') {
        const sel = window.getSelection();
        if (sel && sel.rangeCount) {
            const r = sel.getRangeAt(0); r.deleteContents();
            const hr = document.createElement('hr');
            r.insertNode(hr); insertEmptyParaAfter(hr);
        }
    } else if (type === 'cblock')  { runSpecial('cblock');
    } else if (type === 'icode')   { runSpecial('icode');
    } else if (type === 'todo')    { runSpecial('todo');
    } else if (type === 'badge')   { runSpecial('badge');
    } else if (type === 'ul')      { document.execCommand('insertUnorderedList', false, null);
    } else if (type === 'ol')      { document.execCommand('insertOrderedList', false, null);
    } else if (type.startsWith('panel')) {
        const cols = parseInt(type.replace('panel','')) || 2;
        applyGridPanel(cols);
    } else if (type.startsWith('layout')) {
        const cols = parseInt(type.replace('layout','')) || 2;
        applyGridColumn(cols);
    } else if (type === 'table') {
        applyGridTable(3, 3);
    } else if (type.startsWith('callout-')) {
        const variant = type.replace('callout-', '');
        const cfgs = {
            'info':    { icon:'fa-circle-info',           label:'Bilgi',   ph:'Bilgi notu ekleyin…' },
            'warning': { icon:'fa-triangle-exclamation',  label:'Uyarı',   ph:'Uyarı mesajı ekleyin…' },
            'tip':     { icon:'fa-lightbulb',             label:'İpucu',   ph:'İpucu ekleyin…' },
            'success': { icon:'fa-circle-check',          label:'Başarı',  ph:'Başarı mesajı ekleyin…' },
        };
        const cfg = cfgs[variant] || cfgs['info'];
        /* EditorState._savedToolbarSel kullan — STB/klavye tıklamasında focus kaybolmuş olabilir */
        _restoreToolbarSel();
        const sel = window.getSelection();
        const savedRange = EditorState._savedToolbarSel ? EditorState._savedToolbarSel.range : (sel && sel.rangeCount ? sel.getRangeAt(0) : null);
        if (savedRange) {
            /* İmlecin bulunduğu block'tan sonrasına ekle (satır doluysa), boşsa yerine */
            let insertAfterNode = null;
            let anchorNode = savedRange.startContainer;
            if (anchorNode.nodeType === 3) anchorNode = anchorNode.parentElement;
            let blockNode = anchorNode;
            while (blockNode && blockNode.parentElement !== DOM.$content) blockNode = blockNode.parentElement;
            if (blockNode) {
                const isEmpty = blockNode.textContent.trim() === '';
                if (!isEmpty) insertAfterNode = blockNode;
            }
            if (sel && sel.rangeCount === 0 && savedRange) {
                sel.removeAllRanges(); sel.addRange(savedRange);
            }

            const callout = document.createElement('div');
            callout.className = 'callout callout-' + variant;
            callout.contentEditable = 'false';
            const hdr = document.createElement('div');
            hdr.className = 'callout-header';
            hdr.innerHTML = '<i class="fas ' + cfg.icon + '"></i>' + cfg.label;
            const body = document.createElement('div');
            body.className = 'callout-body';
            body.contentEditable = 'true';
            body.spellcheck = false;
            body.dataset.placeholder = cfg.ph;
            const delBtn = document.createElement('button');
            delBtn.className = 'callout-del';
            delBtn.title = _t('callout.deleteblock', 'Vurgu bloğunu sil');
            delBtn.innerHTML = '<i class="fas fa-times"></i>';
            delBtn.contentEditable = 'false';
            delBtn.addEventListener('mousedown', e => e.preventDefault());
            delBtn.addEventListener('click', e => {
                e.stopPropagation();
                const p = document.createElement('p'); p.innerHTML = '<br>';
                if (callout.parentNode) { callout.parentNode.insertBefore(p, callout); callout.remove(); }
                const r = document.createRange(); r.setStart(p,0); r.collapse(true);
                const s = window.getSelection(); s.removeAllRanges(); s.addRange(r);
                DOM.$content.focus(); _markDirty(); updateFooterVisibility();
            });
            callout.appendChild(hdr);
            callout.appendChild(body);
            callout.appendChild(delBtn);

            if (insertAfterNode) {
                if (insertAfterNode.nextSibling) {
                    DOM.$content.insertBefore(callout, insertAfterNode.nextSibling);
                } else {
                    DOM.$content.appendChild(callout);
                }
            } else {
                if (savedRange) { try { savedRange.deleteContents(); savedRange.insertNode(callout); } catch(e) { DOM.$content.appendChild(callout); } }
                else DOM.$content.appendChild(callout);
            }
            insertEmptyParaAfter(callout);
            requestAnimationFrame(() => { body.focus(); });
        }
    } else {
        document.execCommand('formatBlock', false, type);
    }
}

/* Alıntı (blockquote) sonunda Enter → normal paragraf */
DOM.$content.addEventListener('keydown', function blockquoteExitOnEnter(e) {
    if (e.key !== 'Enter' || e.shiftKey || e.ctrlKey || e.altKey || e.metaKey) return;
    const sel = window.getSelection();
    if (!sel || !sel.rangeCount || !sel.isCollapsed) return;
    const range = sel.getRangeAt(0);
    const node = range.startContainer;
    if (!node) return;
    const el = node.nodeType === 3 ? node.parentElement : node;
    const bq = el ? el.closest('blockquote') : null;
    if (!bq || !DOM.$content.contains(bq)) return;

    /* Cursor'dan blockquote sonuna kadar kalan içerik var mı? */
    const tail = document.createRange();
    tail.setStart(range.startContainer, range.startOffset);
    tail.setEnd(bq, bq.childNodes.length);
    if (tail.toString().trim() !== '') return; /* Ortada — normal Enter */

    /* Blokquote sonunda: normal metne geç */
    e.preventDefault();
    insertEmptyParaAfter(bq);
    DOM.$content.dispatchEvent(new Event('input', { bubbles: true }));
}, false);

/* "/" tetikleme: input event */
/* Slash menüsü — DOM.$content + panel/layout içinde çalışsın */
function _isInEditorArea(node) {
    if (!node) return false;
    if (DOM.$content.contains(node)) return true;
    const _fpC = document.getElementById('fp-content');
    if (_fpC && _fpC.contains(node)) return true;
    if (node.nodeType === 3) node = node.parentElement;
    return !!(node && node.closest('.col-panel-content, .layout-col'));
}

function _tryOpenSlash(node, sel) {
    if (!node || node.nodeType !== 3) { if (EditorState.slashMenuOpen) closeSlashMenu(); return; }
    const parentEl = node.parentElement;
    if (parentEl && parentEl.closest('code, pre, .wikilink')) { if (EditorState.slashMenuOpen) closeSlashMenu(); return; }
    const text = node.nodeValue || '';
    const offset = sel.anchorOffset;
    const before = text.slice(0, offset);
    const trimmed = before.replace(/^[\s ]*/,'');
    if (trimmed === '/') {
        EditorState.slashTextNode = node; EditorState.slashOffset = offset;
        const r = sel.getRangeAt(0).cloneRange();
        const rect = r.getBoundingClientRect();
        if (!rect.width && !rect.height) { if (EditorState.slashMenuOpen) closeSlashMenu(); return; }
        openSlashMenu(rect);
    } else {
        if (EditorState.slashMenuOpen) closeSlashMenu();
    }
}

DOM.$content.addEventListener('input', function slashDetect() {
    if (EditorState.wlAcActive) { if (EditorState.slashMenuOpen) closeSlashMenu(); return; }
    const sel = window.getSelection();
    if (!sel || !sel.isCollapsed || !sel.rangeCount || !DOM.$content.contains(sel.anchorNode)) {
        if (EditorState.slashMenuOpen) closeSlashMenu(); return;
    }
    _tryOpenSlash(sel.anchorNode, sel);
}, true);

/* Panel ve layout kolon içinde slash tetikle */
document.addEventListener('input', function slashDetectDelegate(e) {
    if (!e.target.classList.contains('col-panel-content') &&
        !e.target.classList.contains('layout-col') &&
        e.target.id !== 'fp-content') return;
    if (EditorState.wlAcActive) { if (EditorState.slashMenuOpen) closeSlashMenu(); return; }
    const sel = window.getSelection();
    if (!sel || !sel.isCollapsed || !sel.rangeCount) { if (EditorState.slashMenuOpen) closeSlashMenu(); return; }
    _tryOpenSlash(sel.anchorNode, sel);
}, true);

/* Klavye navigasyonu — tüm editör alanları, capture phase */
document.addEventListener('keydown', function slashKeydown(e) {
    if (!EditorState.slashMenuOpen || !DOM.$slashMenu.classList.contains('open')) return;
    if (!_isInEditorArea(window.getSelection()?.anchorNode)) return;

    const cats = [...DOM.$slashMenu.querySelectorAll('.slash-cat')];
    if (!cats.length) return;

    /* Aktif kategori — active sınıfına bak */
    let activeCatIdx = cats.findIndex(c => c.classList.contains('active'));

    if (e.key === 'Escape') {
        e.preventDefault();
        if (EditorState._slashActiveSub) {
            /* Alt menü açıksa önce onu kapat */
            EditorState._slashActiveSub.style.display = 'none';
            EditorState._slashActiveSub = null;
            cats.forEach(c => c.classList.remove('active'));
        } else {
            closeSlashMenu();
        }
        return;
    }

    /* Alt menü açıksa içinde gezin */
    if (EditorState._slashActiveSub && EditorState._slashActiveSub.style.display !== 'none') {
        const items = [...EditorState._slashActiveSub.querySelectorAll('.slash-menu-item')];
        const activeIdx = items.findIndex(i => i.classList.contains('active'));

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            const next = (activeIdx + 1) % items.length;
            items.forEach((it, i) => it.classList.toggle('active', i === next));
            items[next].scrollIntoView({ block:'nearest' });
            return;
        }
        if (e.key === 'ArrowUp') {
            e.preventDefault();
            const prev = (activeIdx - 1 + items.length) % items.length;
            items.forEach((it, i) => it.classList.toggle('active', i === prev));
            items[prev].scrollIntoView({ block:'nearest' });
            return;
        }
        if (e.key === 'Enter') {
            e.preventDefault();
            const activeItem = items[activeIdx >= 0 ? activeIdx : 0];
            if (activeItem) applySlashCommand(activeItem.dataset.type);
            return;
        }
        if (e.key === 'ArrowLeft') {
            e.preventDefault();
            /* Alt menüden ana menüye dön — parent cat seçili kalır */
            EditorState._slashActiveSub.style.display = 'none';
            EditorState._slashActiveSub = null;
            return;
        }
    }

    /* Ana kategoriler arası gezinme */
    if (e.key === 'ArrowDown') {
        e.preventDefault();
        const next = (activeCatIdx + 1) % cats.length;
        /* Önceki sub'u kapat */
        if (EditorState._slashActiveSub) { EditorState._slashActiveSub.style.display = 'none'; EditorState._slashActiveSub = null; }
        cats.forEach(c => c.classList.remove('active'));
        cats[next].classList.add('active');
        return;
    }
    if (e.key === 'ArrowUp') {
        e.preventDefault();
        const prev = (activeCatIdx - 1 + cats.length) % cats.length;
        if (EditorState._slashActiveSub) { EditorState._slashActiveSub.style.display = 'none'; EditorState._slashActiveSub = null; }
        cats.forEach(c => c.classList.remove('active'));
        cats[prev].classList.add('active');
        return;
    }
    if (e.key === 'ArrowRight' || e.key === 'Enter') {
        e.preventDefault();
        /* Aktif kategorinin sub menüsünü aç */
        const activeCat = activeCatIdx >= 0 ? cats[activeCatIdx] : cats[0];
        if (activeCat && activeCat._sub) {
            activeCat._sub.style.display = 'block';
            EditorState._slashActiveSub = activeCat._sub;
            _slashPositionSub(activeCat, activeCat._sub);
            /* Sub'daki ilk itemi aktif et */
            const items = [...activeCat._sub.querySelectorAll('.slash-menu-item')];
            items.forEach((it, i) => it.classList.toggle('active', i === 0));
        }
        return;
    }

    if (!['Shift','Control','Alt','Meta','CapsLock','/'].includes(e.key) && !e.key.startsWith('Arrow')) {
        closeSlashMenu();
    }
}, true);

/* ── /komut<SPACE> satır-başı inline kısayollar ── */
document.addEventListener('keydown', function inlineSlashShortcut(e) {
    if (e.key !== ' ') return;
    if (EditorState.slashMenuOpen) return;
    if (e.ctrlKey || e.altKey || e.metaKey) return;
    const sel = window.getSelection();
    if (!sel || !sel.isCollapsed || !sel.rangeCount) return;
    const node = sel.anchorNode;
    if (!node || node.nodeType !== 3) return;
    if (!_isInEditorArea(node)) return;
    const parentEl = node.parentElement;
    if (parentEl && parentEl.closest('code, pre, .wikilink')) return;
    const text = node.nodeValue || '';
    const offset = sel.anchorOffset;
    const before = text.slice(0, offset);
    /* Sadece satır başında: başında yalnızca boşluk var */
    const m = before.match(/^[\s ]*\/([a-z0-9-]+)$/i);
    if (!m) return;
    const cmdType = Const.SLASH_INLINE_MAP[m[1].toLowerCase()];
    if (!cmdType) return;
    e.preventDefault();
    /* "keyword" kısmını sil, "/" bırak — applySlashCommand "/" yi silecek */
    const slashPos = before.lastIndexOf('/');
    if (slashPos + 1 < offset) {
        const r = document.createRange();
        r.setStart(node, slashPos + 1);
        r.setEnd(node, offset);
        sel.removeAllRanges(); sel.addRange(r);
        (EditorState._activeEditTarget || DOM.$content).focus();
        document.execCommand('delete', false, null);
    }
    EditorState.slashTextNode = node;
    EditorState.slashOffset = slashPos + 1;
    applySlashCommand(cmdType);
}, true);

/* ── Markdown-tarzı satır-başı kısayollar (karakter + boşluk) ──
   "* "/"- " madde listesi, "[] " görev listesi, "|| " tablo (/t ile aynı),
   ayrıca "# "/"## "/"### " başlık, "> " alıntı, "1. " sıralı liste — hepsi
   applySlashCommand ile aynı işlemi (Const.SLASH_INLINE_MAP'teki type'lar) tetikler. */
Const.MD_INLINE_TRIGGERS = [
    { re: /^\*$/,   type: 'ul' },
    { re: /^-$/,    type: 'ul' },
    { re: /^\[\]$/, type: 'todo' },
    { re: /^\|\|$/, type: 'table' },
    { re: /^#$/,    type: 'h2' },
    { re: /^##$/,   type: 'h3' },
    { re: /^###$/,  type: 'h4' },
    { re: /^>$/,    type: 'blockquote' },
    { re: /^1\.$/,  type: 'ol' },
];
document.addEventListener('keydown', function inlineMdShortcut(e) {
    if (e.key !== ' ') return;
    if (EditorState.slashMenuOpen) return;
    if (e.ctrlKey || e.altKey || e.metaKey) return;
    const sel = window.getSelection();
    if (!sel || !sel.isCollapsed || !sel.rangeCount) return;
    const node = sel.anchorNode;
    if (!node || node.nodeType !== 3) return;
    if (!_isInEditorArea(node)) return;
    const parentEl = node.parentElement;
    if (parentEl && parentEl.closest('code, pre, .wikilink, li')) return;
    const text = node.nodeValue || '';
    const offset = sel.anchorOffset;
    const before = text.slice(0, offset);
    const trimmed = before.replace(/^[\s ]*/, '');
    const leadingWs = before.length - trimmed.length;
    let matchType = null;
    for (const t of Const.MD_INLINE_TRIGGERS) {
        if (t.re.test(trimmed)) { matchType = t.type; break; }
    }
    if (!matchType) return;
    e.preventDefault();
    /* Tetikleyici metni (örn. "* ") sil */
    if (leadingWs < offset) {
        const r = document.createRange();
        r.setStart(node, leadingWs);
        r.setEnd(node, offset);
        sel.removeAllRanges(); sel.addRange(r);
        (EditorState._activeEditTarget || DOM.$content).focus();
        document.execCommand('delete', false, null);
    }
    EditorState.slashTextNode = null; /* applySlashCommand'ın '/' silme adımı atlansın — zaten sildik */
    applySlashCommand(matchType);
}, true);

/* ── Şekil tanımları (STB IIFE'den önce olmalı) ── */
Const._SHAPES = [
    { id:'rect',    label:'Dikdörtgen',    icon:'fa-square',      vb:'0 0 300 120', d:'<rect x="6" y="6" width="288" height="108" fill="none" stroke="currentColor" stroke-width="3"/>' },
    { id:'rounded', label:'Yuvarlatılmış', icon:'fa-square',      vb:'0 0 300 120', d:'<rect x="6" y="6" width="288" height="108" rx="22" fill="none" stroke="currentColor" stroke-width="3"/>' },
    { id:'circle',  label:'Daire',         icon:'fa-circle',      vb:'0 0 300 120', d:'<ellipse cx="150" cy="60" rx="136" ry="54" fill="none" stroke="currentColor" stroke-width="3"/>' },
    { id:'diamond', label:'Baklava',       icon:'fa-gem',         vb:'0 0 300 120', d:'<polygon points="150,6 294,60 150,114 6,60" fill="none" stroke="currentColor" stroke-width="3"/>' },
    { id:'arrow',   label:'Ok',            icon:'fa-arrow-right', vb:'0 0 300 120', d:'<polygon points="6,38 210,38 210,10 294,60 210,110 210,82 6,82" fill="none" stroke="currentColor" stroke-width="3"/>' },
    { id:'star',    label:'Yıldız',        icon:'fa-star',        vb:'0 0 300 120', d:'<polygon points="150,8 163,42 200,44 171,67 181,102 150,82 119,102 129,67 101,44 137,42" fill="none" stroke="currentColor" stroke-width="3"/>' },
];

/* ══ ÜST ÇEKMECE TOOLBAR ══ */
(function initSideToolbar() {
    const trigger   = $('stb-trigger');
    const tb        = $('side-toolbar');
    const closeBtn  = $('stb-close');
    const editor    = $('editor');
    const editorCard = document.querySelector('.editor-card');
    const innerWrap = $('editor-inner-wrap');
    const container = editorCard || innerWrap || editor;
    if (!trigger || !tb || !container) return;

    /* ── Aç / Kapat ── */
    function open()  { container.classList.add('stb-open'); }
    function close() { container.classList.remove('stb-open'); }
    /* Hover ile aç */
    if (trigger) {
        trigger.addEventListener('mouseenter', open);
        /* Toolbar üzerinden çıkınca kapat — delay ile */
        let _closeTimer;
        const tb2 = $('side-toolbar');
        if (tb2) {
            tb2.addEventListener('mouseleave', () => { _closeTimer = setTimeout(close, 400); });
            tb2.addEventListener('mouseenter', () => clearTimeout(_closeTimer));
        }
        trigger.addEventListener('mouseleave', () => { _closeTimer = setTimeout(close, 400); });
        trigger.addEventListener('mouseenter', () => clearTimeout(_closeTimer));
    }

    trigger.addEventListener('click', e => { e.stopPropagation(); open(); });
    if (closeBtn) closeBtn.addEventListener('click', e => { e.stopPropagation(); close(); });

    document.addEventListener('click', e => {
        if (!container.classList.contains('stb-open')) return;
        if (tb.contains(e.target) || trigger.contains(e.target)) return;
        close();
    });

    /* ── Columns / Layout alt-panel dropdown'u ── */
    function closeAllColDropdowns(exceptId) {
        document.querySelectorAll('[id^="stb-col-dd-"]').forEach(el => {
            if (el.id !== exceptId) el.style.display = 'none';
        });
    }

    function makeColDropdown(btnEl, colCounts, applyFn) {
        /* Mevcut dropdown varsa kaldır */
        const existId = btnEl.dataset.dropId;
        if (existId) { const old = $(existId); if (old) old.remove(); }

        const dd = document.createElement('div');
        const id = 'stb-col-dd-' + Date.now();
        dd.id = id; btnEl.dataset.dropId = id;
        dd.style.cssText = 'position:fixed;z-index:9300;background:var(--surface);border:1px solid var(--border);border-radius:8px;padding:4px 0;box-shadow:0 4px 16px var(--shadow);min-width:130px;display:none';

        colCounts.forEach(n => {
            const item = document.createElement('div');
            item.style.cssText = 'padding:6px 14px;cursor:pointer;font-size:.8rem;color:var(--text);transition:background .1s';
            item.textContent = n + ' Kolon';
            item.addEventListener('mouseenter', () => item.style.background = 'var(--surface-2)');
            item.addEventListener('mouseleave', () => item.style.background = '');
            item.addEventListener('mousedown', ev => {
                ev.preventDefault(); ev.stopPropagation();
                (EditorState._activeEditTarget || DOM.$content).focus();
                applyFn(n);
                dd.style.display = 'none';
            });
            dd.appendChild(item);
        });

        document.body.appendChild(dd);

        btnEl.addEventListener('click', ev => {
            ev.stopPropagation();
            const isOpen = dd.style.display === 'block';
            closeAllColDropdowns(null); /* Hepsini kapat */
            if (!isOpen) {
                const r = btnEl.getBoundingClientRect();
                dd.style.left = (r.right + 8) + 'px';
                dd.style.top  = r.top + 'px';
                dd.style.display = 'block';
            }
        });

        document.addEventListener('click', () => { dd.style.display = 'none'; });
        return dd;
    }

    /* ── Düğme tıklamaları ── */
    tb.addEventListener('click', e => {
        const btn = e.target.closest('.stb');
        if (!btn) return;
        const type = btn.dataset.stb;
        if (!type) return;
        e.preventDefault();

        /* columns / layout: dropdown'a bırak */
        if (type === 'columns' || type === 'layout') return;

        /* Cursor konumunu restore et — focus() değil, selection korunsun */
        _restoreToolbarSel();

        if      (type === 'timestamp')  { if (EditorState._editActive) insertTimestamp(); }
        else if (type === 'ul')         { document.execCommand('insertUnorderedList', false, null); }
        else if (type === 'ol')         { document.execCommand('insertOrderedList', false, null); }
        else if (type === 'todo')       { runSpecial('todo'); }
        else if (type === 'blockquote' || type === 'h2' || type === 'h3' || type === 'h4')
                                        { document.execCommand('formatBlock', false, type); }
        else if (type === 'icode' || type === 'badge' || type === 'cblock' || type === 'link')
                                        { runSpecial(type); }
        else if (type === 'grid-panel')   { applyGridPanel(3); }
        else if (type === 'grid-column')  { applyGridColumn(3); }
        else if (type === 'grid-table')   { applyGridTable(3, 3); }
        else if (type === 'justifyLeft' || type === 'justifyCenter' || type === 'justifyRight')
                                        { document.execCommand(type, false, null); }
        else if (type === 'callout-menu') { /* flyout ile açılır — makeCalloutDropdown yönetir */ }
        else if (type === 'line-height') { /* flyout ile açılır */ }
        else if (type === 'shape-menu')  { /* flyout ile açılır — makeShapeDropdown yönetir */ }
        else if (type === 'bookmark')    { applyBookmark(); }
        else if (type.startsWith('callout-')) { applySlashCommand(type); }
    });

    /* Columns ve Layout dropdown'larını kur */
    const colBtn    = tb.querySelector('[data-stb="columns"]');
    const layoutBtn = tb.querySelector('[data-stb="layout"]');
    if (colBtn)    makeColDropdown(colBtn,    [2,3,4], applyGridPanel);
    if (layoutBtn) makeColDropdown(layoutBtn, [2,3,4], applyGridColumn);

    /* Vurgu flyout */
    const calloutBtn = tb.querySelector('[data-stb="callout-menu"]');
    if (calloutBtn) {
        const CALLOUTS = [
            { type:'callout-info',    icon:'fa-circle-info',           label:'Bilgi'  },
            { type:'callout-warning', icon:'fa-triangle-exclamation',  label:'Uyarı'  },
            { type:'callout-tip',     icon:'fa-lightbulb',             label:'İpucu'  },
            { type:'callout-success', icon:'fa-circle-check',          label:'Başarı' },
        ];
        const dd = document.createElement('div');
        dd.id = 'stb-callout-dd';
        dd.style.cssText = 'position:fixed;z-index:9300;background:var(--surface);border:1px solid var(--border);border-radius:8px;padding:4px 0;box-shadow:0 4px 16px var(--shadow);min-width:150px;display:none';
        CALLOUTS.forEach(co => {
            const item = document.createElement('div');
            item.style.cssText = 'padding:7px 14px;cursor:pointer;font-size:.82rem;color:var(--text);display:flex;align-items:center;gap:9px;transition:background .1s';
            item.innerHTML = '<i class="fas ' + co.icon + '" style="width:14px;text-align:center"></i>' + co.label;
            item.addEventListener('mouseenter', () => item.style.background = 'var(--surface-2)');
            item.addEventListener('mouseleave', () => item.style.background = '');
            item.addEventListener('mousedown', ev => {
                ev.preventDefault(); ev.stopPropagation();
                (EditorState._activeEditTarget || DOM.$content).focus();
                applySlashCommand(co.type);
                dd.style.display = 'none';
            });
            dd.appendChild(item);
        });
        document.body.appendChild(dd);
        calloutBtn.addEventListener('click', ev => {
            ev.stopPropagation();
            const isOpen = dd.style.display === 'block';
            dd.style.display = 'none';
            if (!isOpen) {
                const r = calloutBtn.getBoundingClientRect();
                dd.style.left = (r.right + 8) + 'px';
                dd.style.top  = r.top + 'px';
                dd.style.display = 'block';
            }
        });
        document.addEventListener('click', () => { dd.style.display = 'none'; });
    }

    /* Satır aralığı flyout */
    const lhBtn = tb.querySelector('[data-stb="line-height"]');
    if (lhBtn) {
        const lhDD = document.createElement('div');
        lhDD.id = 'stb-lh-dd';
        lhDD.style.cssText = 'position:fixed;z-index:9300;background:var(--surface);border:1px solid var(--border);border-radius:8px;padding:4px 0;box-shadow:0 4px 16px var(--shadow);min-width:100px;display:none';
        ['0.85','1.0','1.5','2.0'].forEach(v => {
            const item = document.createElement('div');
            item.style.cssText = 'padding:7px 14px;cursor:pointer;font-size:.82rem;color:var(--text);transition:background .1s;text-align:center;';
            item.textContent = v;
            item.addEventListener('mouseenter', () => item.style.background = 'var(--surface-2)');
            item.addEventListener('mouseleave', () => item.style.background = '');
            item.addEventListener('mousedown', ev => {
                ev.preventDefault(); ev.stopPropagation();
                /* Seçili metin varsa span ile sar, yoksa aktif alana uygula */
                const sel = window.getSelection();
                if (sel && !sel.isCollapsed) {
                    const range = sel.getRangeAt(0);
                    const span = document.createElement('span');
                    span.style.lineHeight = v;
                    try { range.surroundContents(span); }
                    catch { const frag = range.extractContents(); span.appendChild(frag); range.insertNode(span); }
                    _markDirty();
                } else {
                    const target = EditorState._activeEditTarget || DOM.$content;
                    target.style.lineHeight = v;
                }
                lhDD.style.display = 'none';
            });
            lhDD.appendChild(item);
        });
        document.body.appendChild(lhDD);
        lhBtn.addEventListener('click', ev => {
            ev.stopPropagation();
            const isOpen = lhDD.style.display === 'block';
            lhDD.style.display = 'none';
            if (!isOpen) {
                const r = lhBtn.getBoundingClientRect();
                lhDD.style.left = (r.right + 8) + 'px';
                lhDD.style.top  = r.top + 'px';
                lhDD.style.display = 'block';
            }
        });
        document.addEventListener('click', () => { lhDD.style.display = 'none'; });
    }

    /* Şekil flyout */
    const shapeBtn = tb.querySelector('[data-stb="shape-menu"]');
    if (shapeBtn) {
        const shDD = document.createElement('div');
        shDD.id = 'stb-shape-dd';
        shDD.style.cssText = 'position:fixed;z-index:9300;background:var(--surface);border:1px solid var(--border);border-radius:8px;padding:4px 0;box-shadow:0 4px 16px var(--shadow);min-width:160px;display:none';
        Const._SHAPES.forEach(sh => {
            const item = document.createElement('div');
            item.style.cssText = 'padding:7px 14px;cursor:pointer;font-size:.82rem;color:var(--text);display:flex;align-items:center;gap:9px;transition:background .1s';
            item.innerHTML = `<i class="fas ${sh.icon}" style="width:14px;text-align:center"></i>${sh.label}`;
            item.addEventListener('mouseenter', () => item.style.background = 'var(--surface-2)');
            item.addEventListener('mouseleave', () => item.style.background = '');
            item.addEventListener('mousedown', ev => {
                ev.preventDefault(); ev.stopPropagation();
                (EditorState._activeEditTarget || DOM.$content).focus();
                insertShapeOverlay(sh.id);
                shDD.style.display = 'none';
            });
            shDD.appendChild(item);
        });
        document.body.appendChild(shDD);
        shapeBtn.addEventListener('click', ev => {
            ev.stopPropagation();
            const isOpen = shDD.style.display === 'block';
            shDD.style.display = 'none';
            if (!isOpen) {
                const r = shapeBtn.getBoundingClientRect();
                shDD.style.left = (r.right + 8) + 'px';
                shDD.style.top  = r.top + 'px';
                shDD.style.display = 'block';
            }
        });
        document.addEventListener('click', () => { shDD.style.display = 'none'; });
    }
})();

