/* ══ BOOKMARK GUTTER ══ */
let _aiInserting = false; /* AI text eklerken bookmark tetiklenmesin */
let _bmMousedownInGutter = false; /* mousedown gutter içinde başlamadıysa bookmark koyma */
DOM.$content.addEventListener('mousemove', function(e) {
    const xInContent = e.clientX - DOM.$content.getBoundingClientRect().left;
    this.style.cursor = xInContent < 28 ? 'pointer' : '';
});
DOM.$content.addEventListener('mouseleave', function() { this.style.cursor = ''; });
DOM.$content.addEventListener('mousedown', function(e) {
    _bmMousedownInGutter = (e.clientX - DOM.$content.getBoundingClientRect().left) < 28;
});
DOM.$content.addEventListener('click', function(e) {
    if (_aiInserting) return;
    if (!_bmMousedownInGutter) return;
    const xInContent = e.clientX - DOM.$content.getBoundingClientRect().left;
    if (xInContent > 28) return;
    const rect = DOM.$content.getBoundingClientRect();
    const el = document.elementFromPoint(rect.left + 36, e.clientY);
    if (!el) return;

    /* Tıklanan noktadan yukarı çıkarak en uygun bookmark hedefini bul */
    let block = null;
    let node = el;
    while (node && node !== DOM.$content) {
        /* Tablo satırı */
        if (node.tagName === 'TR') { block = node; break; }
        /* Todo liste öğesi */
        if (node.tagName === 'LI' && node.classList.contains('todo-item')) { block = node; break; }
        const par = node.parentElement;
        if (!par) break;
        /* DOM.$content'in doğrudan çocuğu */
        if (par === DOM.$content) { block = node; break; }
        /* Panel veya kolon içeriğinin doğrudan çocuğu */
        if (par.classList && (par.classList.contains('col-panel-content') || par.classList.contains('layout-col'))) {
            block = node; break;
        }
        node = par;
    }
    if (!block) return;

    /* AI blok: data-generated-by="ai" olanlar — etiketi gizleme, bookmark toggle'a izin ver */
    if (block.classList && block.classList.contains('ai-block')) {
        if (block.getAttribute('data-generated-by') !== 'ai') {
            /* Eski ai-block — sadece tek yönlü gizle */
            if (!block.hasAttribute('data-ai-hidden')) {
                block.setAttribute('data-ai-hidden', '1');
                _markDirty();
            }
            return;
        }
        /* data-generated-by="ai": AI etiketi kalıcı */
        /* Ayarda AI bookmark kapatıldıysa gutter tıklaması bir şey yapmaz */
        if (getAiCfg().bmClick === false) return;
        /* Aksi hâlde bookmark toggle normal devam eder */
    }

    if (block.hasAttribute('data-bookmark')) {
        block.removeAttribute('data-bookmark');
    } else {
        block.setAttribute('data-bookmark', '1');
    }
    _markDirty();
});

/* AI üretilen içerik kullanıcı tarafından düzenlenince işaretle */
DOM.$content.addEventListener('input', () => {
    const sel = window.getSelection();
    if (!sel || !sel.rangeCount) return;
    const node = sel.anchorNode;
    const el   = node && (node.nodeType === 3 ? node.parentElement : node);
    const aiEl = el && el.closest('[data-generated-by="ai"]');
    if (aiEl && !aiEl.hasAttribute('data-modified-by-user')) {
        aiEl.setAttribute('data-modified-by-user', 'true');
        _markDirty();
    }
}, true);

/* ══ CF-TRIGGER (footer çekmece) ══ */
(function() {
    const trigger   = document.getElementById('cf-trigger');
    const footer    = document.querySelector('.main-panel .content-footer');
    const innerWrap = document.getElementById('editor-inner-wrap');
    if (!trigger || !footer || !innerWrap) return;

    function open()  { innerWrap.classList.add('cf-open'); }
    function close() { innerWrap.classList.remove('cf-open'); }

    /* Touch cihazlarda hover-based kapanma çalışmaz; mouseleave'i atla */
    const isTouch = () => window.matchMedia('(hover: none) and (pointer: coarse)').matches;

    let _t;
    trigger.addEventListener('mouseenter', () => { clearTimeout(_t); open(); });
    trigger.addEventListener('mouseleave', () => { if (!isTouch()) _t = setTimeout(close, 400); });
    footer.addEventListener('mouseenter',  () => clearTimeout(_t));
    footer.addEventListener('mouseleave',  () => { if (!isTouch()) _t = setTimeout(close, 400); });
    trigger.addEventListener('touchstart', e => { e.stopPropagation(); clearTimeout(_t); open(); }, { passive: true });
    trigger.addEventListener('click', e => { e.stopPropagation(); open(); });

    /* Dışarı tıklama/dokunma → kapat */
    function onOutside(e) {
        if (!innerWrap.classList.contains('cf-open')) return;
        if (footer.contains(e.target) || trigger.contains(e.target)) return;
        close();
    }
    document.addEventListener('click',      onOutside);
    document.addEventListener('touchstart', onOutside, { passive: true });
})();

/* ══ EDİTÖR ZOOM (Ctrl+Scroll) ══ */
(function() {
    const STEP = 0.1, MIN = 0.6, MAX = 2.0;
    let _zoom = 1;
    let _timer, _ind;

    function showInd(z) {
        if (!_ind) {
            _ind = document.createElement('div');
            _ind.style.cssText = 'position:fixed;z-index:9500;background:var(--surface-2);border:1px solid var(--border);border-radius:6px;padding:3px 10px;font-size:.75rem;font-weight:600;color:var(--text-muted);pointer-events:none;user-select:none;transition:opacity .3s;opacity:0;transform:translateX(-50%);';
            document.body.appendChild(_ind);
        }
        /* Parent zoom'dan etkilenmez, kararlı konum referansı */
        const ref = DOM.$content.parentElement || DOM.$content;
        const r = ref.getBoundingClientRect();
        _ind.style.left = Math.round(r.left + r.width / 2) + 'px';
        _ind.style.top  = Math.round(r.bottom - 44) + 'px';
        _ind.textContent = Math.round(z * 100) + '%';
        _ind.style.opacity = '1';
        clearTimeout(_timer);
        _timer = setTimeout(() => { _ind.style.opacity = '0'; }, 1400);
    }

    window._setEditorZoom = function(z) {
        _zoom = Math.max(MIN, Math.min(MAX, Math.round(z * 10) / 10));
        DOM.$content.style.zoom = _zoom;
        showInd(_zoom);
    };
    window._resetEditorZoom = function() { _zoom = 1; DOM.$content.style.zoom = ''; };

    DOM.$content.addEventListener('wheel', e => {
        if (!e.ctrlKey) return;
        e.preventDefault();
        window._setEditorZoom(_zoom + (e.deltaY < 0 ? STEP : -STEP));
    }, { passive: false });

    document.addEventListener('keydown', e => {
        if (!e.ctrlKey || e.key !== '0') return;
        if (document.activeElement === DOM.$content || DOM.$content.contains(document.activeElement)) {
            e.preventDefault();
            window._setEditorZoom(1);
        }
    });
})();

/* ══ IDLE BLUR ══ */
(function() {
    const IDLE_MS = 5 * 60 * 1000; /* 5 dakika */
    const overlay = document.getElementById('idle-overlay');
    if (!overlay) return;
    let _timer = null;
    function wake() {
        overlay.classList.remove('active');
        reset();
    }
    function sleep() { overlay.classList.add('active'); }
    function reset() {
        clearTimeout(_timer);
        _timer = setTimeout(sleep, IDLE_MS);
    }
    ['mousemove','mousedown','keydown','touchstart','wheel'].forEach(ev =>
        document.addEventListener(ev, () => { if (!overlay.classList.contains('active')) reset(); else wake(); }, { passive:true })
    );
    overlay.addEventListener('click', wake);
    reset();
})();

/* ══ TODO PANELİ ══ */
(function initTodoPanel() {
    const overlay  = $('todo-panel-overlay');
    const list     = $('todo-panel-list');
    const closeBtn = $('todo-panel-close');
    const openBtn  = $('todo-panel-btn');
    const badge    = $('todo-count-badge');
    if (!overlay || !list || !openBtn) return;

    let currentFilter = 'all';

    /* Tüm notlardaki todo'ları topla */
    function collectTodos() {
        const items = [];
        State.notes.forEach(note => {
            if (!note.content) return;
            const tmp = document.createElement('div');
            tmp.innerHTML = note.content;
            tmp.querySelectorAll('.todo-item').forEach(li => {
                const textEl = li.querySelector('.todo-text');
                const text   = textEl ? textEl.textContent.trim() : li.textContent.trim();
                if (!text) return;
                items.push({
                    noteId:   note.id,
                    noteTitle: note.title || '(Başlıksız)',
                    text,
                    checked:  li.dataset.checked === 'true',
                });
            });
        });
        return items;
    }

    /* Badge'i güncelle */
    function updateBadge() {
        const open = collectTodos().filter(t => !t.checked).length;
        if (open > 0) {
            badge.textContent = open > 99 ? '99+' : String(open);
            badge.style.display = 'block';
        } else {
            badge.style.display = 'none';
        }
    }
    window._todoUpdateBadge = updateBadge;

    /* Listeyi render et */
    function renderList() {
        const all   = collectTodos();
        const shown = all.filter(t =>
            currentFilter === 'all'  ? true :
            currentFilter === 'open' ? !t.checked :
            t.checked
        );

        list.innerHTML = '';

        if (!shown.length) {
            list.innerHTML = '<div class="todo-panel-empty"><i class="fas fa-check-circle"></i>' +
                (currentFilter === 'done' ? 'Henüz tamamlanan görev yok' :
                 currentFilter === 'open' ? 'Tüm görevler tamamlandı!' :
                 'Henüz hiç görev yok') + '</div>';
            return;
        }

        /* Notlara göre grupla */
        const byNote = {};
        shown.forEach(t => {
            if (!byNote[t.noteId]) byNote[t.noteId] = { title: t.noteTitle, items: [] };
            byNote[t.noteId].items.push(t);
        });

        Object.entries(byNote).forEach(([noteId, group]) => {
            const grp = document.createElement('div');
            grp.className = 'todo-panel-note-group';

            const title = document.createElement('div');
            title.className = 'todo-panel-note-title';
            title.textContent = group.title;
            grp.appendChild(title);

            group.items.forEach(t => {
                const row = document.createElement('div');
                row.className = 'todo-panel-item' + (t.checked ? ' checked' : '');

                const cb = document.createElement('div');
                cb.className = 'todo-panel-cb';

                const txt = document.createElement('div');
                txt.className = 'todo-panel-text';
                txt.textContent = t.text;
                txt.title = t.text;

                row.appendChild(cb);
                row.appendChild(txt);

                row.addEventListener('click', () => {
                    overlay.classList.remove('open');
                    /* Nota git */
                    editNote(noteId);
                });

                grp.appendChild(row);
            });

            list.appendChild(grp);
        });
    }

    /* Aç */
    function open() {
        renderList();
        overlay.classList.add('open');
        document.body.style.overflow = 'hidden';
    }

    /* Kapat */
    function close() {
        overlay.classList.remove('open');
        if (!document.querySelector('#ai-chat-panel.open')) document.body.style.overflow = '';
    }

    openBtn.addEventListener('click', e => {
        e.stopPropagation();
        overlay.classList.contains('open') ? close() : open();
    });

    if (closeBtn) closeBtn.addEventListener('click', close);
    overlay.addEventListener('click', e => { if (e.target === overlay) close(); });
    document.addEventListener('keydown', e => {
        if (e.key === 'Escape' && overlay.classList.contains('open')) close();
    });

    /* Filtre butonları */
    $('todo-filter-row').addEventListener('click', e => {
        const btn = e.target.closest('.todo-filter-btn');
        if (!btn) return;
        currentFilter = btn.dataset.filter;
        $('todo-filter-row').querySelectorAll('.todo-filter-btn').forEach(b =>
            b.classList.toggle('active', b === btn));
        renderList();
    });

    /* ── Resize ── */
    (function() {
        const TODO_W_MIN  = 280;
        const TODO_W_MAX  = () => Math.min(860, Math.round(window.innerWidth * 0.85));
        const todoPanel   = $('todo-panel');
        const todoHandle  = $('todo-panel-resize-handle');
        if (!todoPanel || !todoHandle) return;

        const _updateFs = () =>
            todoPanel.classList.toggle('todo-fullscreen', todoPanel.offsetWidth >= window.innerWidth - 1);

        (function _init() {
            if (window.innerWidth <= 600) return;
            const saved = getUiCfg().todoW || 0;
            if (saved >= TODO_W_MIN) todoPanel.style.width = saved + 'px';
            _updateFs();
        })();

        window.addEventListener('resize', () => {
            if (window.innerWidth <= 600) { todoPanel.style.width = ''; return; }
            _updateFs();
        });

        const _applyW = clientX => {
            const w = Math.min(TODO_W_MAX(), Math.max(TODO_W_MIN, window.innerWidth - clientX));
            todoPanel.style.width = w + 'px';
            _updateFs();
            return w;
        };

        todoHandle.addEventListener('mousedown', e => {
            e.preventDefault();
            todoPanel.classList.add('resizing');
            document.body.classList.add('ai-resizing');
            const onMove = ev => _applyW(ev.clientX);
            const onUp   = ev => {
                const w = _applyW(ev.clientX);
                patchUiCfg({ todoW: w });
                todoPanel.classList.remove('resizing');
                document.body.classList.remove('ai-resizing');
                document.removeEventListener('mousemove', onMove);
                document.removeEventListener('mouseup', onUp);
            };
            document.addEventListener('mousemove', onMove);
            document.addEventListener('mouseup', onUp);
        });
    })();

    /* Badge'i başlangıçta ve her render sonrası güncelle */
    updateBadge();
    /* Checkbox tıklanınca (content + paneller) */
    document.addEventListener('click', e => {
        if (e.target.closest('.todo-mark')) {
            requestAnimationFrame(updateBadge);
        }
    });
})();

/* ══ HEADER HAMBURGER MENÜ ══ */
(function() {
    const menuBtn  = $('header-menu-btn');
    const dropdown = $('header-menu-dropdown');
    if (!menuBtn || !dropdown) return;

    menuBtn.addEventListener('click', e => {
        e.stopPropagation();
        dropdown.classList.toggle('open');
    });

    document.addEventListener('click', e => {
        if (!dropdown.classList.contains('open')) return;
        if (menuBtn.contains(e.target) || dropdown.contains(e.target)) return;
        dropdown.classList.remove('open');
    });

    function closeMenu() { dropdown.classList.remove('open'); }
    window._closeHamburgerMenu = closeMenu;

    const helpBtn = $('hm-help-btn');
    if (helpBtn) {
        helpBtn.addEventListener('click', () => {
            closeMenu();
            if (window._openHelpOverlay) window._openHelpOverlay();
        });
    }

})();

/* ── Editör hamburger menüsü ── */
(function() {
    const btn      = $('editor-menu-btn');
    const dropdown = $('editor-menu-dropdown');
    if (!btn || !dropdown) return;

    btn.addEventListener('click', e => {
        e.stopPropagation();
        const opening = !dropdown.classList.contains('open');
        dropdown.classList.toggle('open', opening);
        btn.classList.toggle('open', opening);
    });

    document.addEventListener('click', e => {
        if (!dropdown.classList.contains('open')) return;
        if (btn.contains(e.target) || dropdown.contains(e.target)) return;
        dropdown.classList.remove('open');
        btn.classList.remove('open');
    });

    function closeEditorMenu() {
        dropdown.classList.remove('open');
        btn.classList.remove('open');
    }
    window._closeEditorMenu = closeEditorMenu;

    /* Menüyü kapatan aksiyonlar — template hariç (kendi sub-dropdown'u var) */
    ['pdf-btn','lock-btn','tw-btn','focus-btn','cancel-btn','content-mic','export-html-btn','export-md-btn'].forEach(id => {
        const el = $(id);
        if (el) el.addEventListener('click', () => closeEditorMenu(), true);
    });
})();

(function() {
    function closeHM() { if (typeof window._closeHamburgerMenu === 'function') window._closeHamburgerMenu(); }
    const hmOpen     = $('hm-open-btn');
    const hmDownload = $('hm-download-btn');
    const hmGraph    = $('hm-graph-btn');
    const hmTheme    = $('hm-theme-btn');
    const hmSettings = $('hm-settings-btn');

    const hmTodo      = $('todo-panel-btn');
    const hmFullscreen = $('fullscreen-btn');

    if (hmOpen)     hmOpen.addEventListener('click',     () => { closeHM(); $('upload-input').click(); });
    if (hmDownload) hmDownload.addEventListener('click', () => { closeHM(); exportNotes(); });
    if (hmGraph)    hmGraph.addEventListener('click',    () => { closeHM(); openLinkGraph(); });
    /* Tema submenu seçenekleri */
    document.querySelectorAll('.hm-theme-option').forEach(btn => {
        btn.addEventListener('click', () => { State.themeMode = btn.dataset.theme; applyTheme(); closeHM(); });
    });
    /* hm-theme-btn: hover submenu yeterli, tıklama kapatmasın */
    if (hmTheme) hmTheme.addEventListener('click', e => e.stopPropagation());
    if (hmSettings) hmSettings.addEventListener('click', () => { closeHM(); openSettings(); });
    if (hmFullscreen) hmFullscreen.addEventListener('click', () => {
        closeHM();
        if (!document.fullscreenElement && !document.webkitFullscreenElement) {
            (document.documentElement.requestFullscreen || document.documentElement.webkitRequestFullscreen)
                .call(document.documentElement);
        } else {
            (document.exitFullscreen || document.webkitExitFullscreen).call(document);
        }
    });
    function _updateFullscreenBtn() {
        if (!hmFullscreen) return;
        const isFs = !!(document.fullscreenElement || document.webkitFullscreenElement);
        hmFullscreen.querySelector('i').className = isFs ? 'fas fa-compress' : 'fas fa-expand';
        hmFullscreen.querySelector('span').textContent = isFs ? 'Tam Ekrandan Çık' : 'Tam Ekran';
        hmFullscreen.title = isFs ? 'Tam Ekrandan Çık' : 'Tam Ekran';
    }
    document.addEventListener('fullscreenchange', _updateFullscreenBtn);
    document.addEventListener('webkitfullscreenchange', _updateFullscreenBtn);
    /* todo-panel-btn artık menü içinde — initTodoPanel'in openBtn dinleyicisi bunu zaten yakalar */
    if (hmTodo) hmTodo.addEventListener('click', () => closeHM());
})();

/* ══ PANEL GİZLE / GÖSTER ══ */
(function() {
    const hideBtn   = $('panel-hide-btn');
    const drawerBtn = $('panel-drawer-btn');
    if (!hideBtn || !drawerBtn) return;
    hideBtn.addEventListener('click', () => {
        document.body.classList.add('panel-hidden');
    });
    drawerBtn.addEventListener('click', () => {
        document.body.classList.remove('panel-hidden');
    });
})();

/* ══ AYARLAR PANELİ ══ */
(function initSettings() {
    const overlay = $('settings-overlay');
    const modal   = $('settings-modal');
    const closeBtn= $('settings-close');
    if (!overlay) return;

    window.openSettings = function() { overlay.classList.add('open'); };
    function close() { overlay.classList.remove('open'); }

    if (closeBtn) closeBtn.addEventListener('click', close);
    overlay.addEventListener('click', e => { if (e.target === overlay) close(); });

    document.addEventListener('keydown', e => {
        if (e.key === 'Escape' && overlay.classList.contains('open')) { e.stopPropagation(); close(); }
    }, true);

    /* Sekme geçişi */
    const tabMap = { tab1:'stab-tab1', tab2:'stab-tab2', shortcuts:'stab-shortcuts', tab3:'stab-tab3', ai:'stab-ai', dev:'stab-dev' };
    if (modal) {
        modal.querySelectorAll('.stab').forEach(tab => {
            tab.addEventListener('click', () => {
                modal.querySelectorAll('.stab').forEach(t => t.classList.remove('active'));
                modal.querySelectorAll('.stab-panel').forEach(p => p.classList.remove('active'));
                tab.classList.add('active');
                const panelId = tabMap[tab.dataset.stab];
                const panel = panelId ? $(panelId) : null;
                if (panel) panel.classList.add('active');
                if (tab.dataset.stab === 'tab2') _thcInitUI();
            });
        });
    }
})();

/* ── Görünüm Sekmesi: Tema Özelleştirici ── */
(function() {
    function _thcInit() {
        const panel = document.getElementById('stab-tab2');
        if (!panel) return;

        function refresh() {
            const badge = document.getElementById('thc-badge');
            if (badge) badge.textContent = State.isDark ? 'Koyu Tema' : 'Açık Tema';
            const custom = _thcGetCustom();
            const defs   = State.isDark ? Const._THC_DEFS.dark : Const._THC_DEFS.light;
            panel.querySelectorAll('.thc-picker').forEach(inp => {
                const v = inp.dataset.var;
                const val = custom[v] || defs[v] || '#000000';
                if (/^#[0-9a-fA-F]{6}$/.test(val)) inp.value = val;
            });
        }

        function applyVar(v, hex) {
            document.documentElement.style.setProperty(v, hex);
            if (v === '--accent') {
                document.documentElement.style.setProperty('--accent-dim', _thcHexToRgba(hex, State.isDark ? 0.16 : 0.12));
                document.documentElement.style.setProperty('--edit-glow', hex);
            }
            const custom = _thcGetCustom();
            custom[v] = hex;
            _thcSaveCustom(custom);
        }

        function resetVar(v) {
            document.documentElement.style.removeProperty(v);
            if (v === '--accent') {
                document.documentElement.style.removeProperty('--accent-dim');
                document.documentElement.style.removeProperty('--edit-glow');
            }
            const custom = _thcGetCustom();
            delete custom[v];
            _thcSaveCustom(custom);
            refresh();
        }

        function resetAll() {
            [...Const._THC_ALL_VARS, ...Const._THC_LINKED].forEach(v => document.documentElement.style.removeProperty(v));
            _thcSaveCustom({});
            refresh();
        }

        _thcRefreshUI = refresh;

        panel.addEventListener('input', e => {
            if (!e.target.matches('.thc-picker')) return;
            applyVar(e.target.dataset.var, e.target.value);
        });
        panel.addEventListener('click', e => {
            const rb = e.target.closest('.thc-var-reset');
            if (rb) { resetVar(rb.dataset.var); return; }
            if (e.target.closest('#thc-reset-all')) resetAll();
        });

        refresh();
        panel.dataset.thcReady = '1';
    }

    window._thcInitUI = function() {
        const panel = document.getElementById('stab-tab2');
        if (!panel) return;
        if (!panel.dataset.thcReady) _thcInit();
        else if (typeof _thcRefreshUI === 'function') _thcRefreshUI();
    };
})();

/* ══ CCB — Customized Code Blocks ══ */
(function() {
    /* ── Veri katmanı ── */
    function ccbGetAll() { return getContentCfg().ccbs || []; }
    function ccbSave(arr) { patchContentCfg({ ccbs: arr }); }
    function ccbById(id) { return ccbGetAll().find(c => c.id === id) || null; }
    function ccbGenId() { return 'ccb_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7); }

    function ccbAdd(item)        { const arr = ccbGetAll(); arr.push({ id: ccbGenId(), ...item }); ccbSave(arr); }
    function ccbUpdate(id, item) { const arr = ccbGetAll(); const i = arr.findIndex(c => c.id === id); if (i >= 0) { arr[i] = { ...arr[i], ...item }; ccbSave(arr); } }
    function ccbDelete(id)       { ccbSave(ccbGetAll().filter(c => c.id !== id)); }

    /* public API */
    window._ccbGetAll  = ccbGetAll;
    window._ccbSave    = ccbSave;
    window._ccbById    = ccbById;
    window._ccbAdd     = ccbAdd;
    window._ccbUpdate  = ccbUpdate;
    window._ccbDelete  = ccbDelete;

    /* ── HTML syntax highlighter (basit regex tabanlı) ── */
    function ccbHighlight(code) {
        /* HTML escape */
        let s = code.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
        /* Yorumlar */
        s = s.replace(/(&lt;!--[\s\S]*?--&gt;)/g, '<span class="cch-comment">$1</span>');
        /* String literaller (attribute değerleri) */
        s = s.replace(/(=)(&quot;[^&]*&quot;|'[^']*')/g, '$1<span class="cch-str">$2</span>');
        /* HTML attribute isimleri */
        s = s.replace(/\b([\w-]+)(?==)/g, '<span class="cch-attr">$1</span>');
        /* HTML etiketleri */
        s = s.replace(/(&lt;\/?)([\w-]+)/g, '$1<span class="cch-tag">$2</span>');
        /* CSS değerleri içinde renk/sayı */
        s = s.replace(/(:\s*)([^;<{}\n]+)(;)/g, '$1<span class="cch-css-val">$2</span>$3');
        /* CSS property */
        s = s.replace(/([\w-]+)(?=\s*:)/g, '<span class="cch-css-prop">$1</span>');
        /* JS keywords */
        s = s.replace(/\b(function|const|let|var|return|if|else|for|while|class|new|this|document|window|addEventListener)\b/g,
            '<span class="cch-kw">$1</span>');
        return s;
    }
    window._ccbHighlight = ccbHighlight;

    /* ── Auto-resize: iframe içeriği yüklenince yüksekliği ayarla ── */
    const CCB_RESIZE_SCRIPT = `<script>
(function(){
  function _send(){
    var h=Math.max(document.documentElement.scrollHeight,document.body?document.body.scrollHeight:0);
    parent.postMessage({_ccbResize:true,height:h},'*');
  }
  if(document.readyState==='loading'){document.addEventListener('DOMContentLoaded',_send);}else{_send();}
  window.addEventListener('load',_send);
  if(typeof ResizeObserver!=='undefined'){new ResizeObserver(_send).observe(document.documentElement);}
  setTimeout(_send,200);
}());
<\/script>`;

    window.addEventListener('message', e => {
        if (!e.data || !e.data._ccbResize) return;
        const h = e.data.height;
        if (!h || h < 10) return;
        /* Mesajı gönderen iframe'i bul */
        document.querySelectorAll('.ccb-block iframe').forEach(f => {
            try { if (f.contentWindow === e.source) f.style.height = h + 'px'; } catch(_) {}
        });
    });

    /* ── Render: ccb-block div → iframe ── */
    function inflateCcbBlocks(root) {
        const _r = root || document;
        /* querySelectorAll matches only descendants — also check root itself */
        const nodes = [];
        if (_r !== document && _r.matches && _r.matches('.ccb-block[data-ccb-id]')) nodes.push(_r);
        _r.querySelectorAll('.ccb-block[data-ccb-id]').forEach(n => nodes.push(n));
        nodes.forEach(block => {
            /* Guard: iframe presence is reliable; data-ccb-rendered attr survives DOMPurify */
            if (block.querySelector('iframe, .ccb-not-found')) return;
            const ccb = ccbById(block.dataset.ccbId);
            if (!ccb) {
                block.innerHTML = '<div class="ccb-not-found"><i class="fas fa-triangle-exclamation"></i>&nbsp;CCB bulunamadı: <code>' + (block.dataset.ccbId||'?') + '</code></div>';
                return;
            }
            const iframe = document.createElement('iframe');
            /* Resize script'i kullanıcı kodunun başına enjekte et */
            iframe.srcdoc = CCB_RESIZE_SCRIPT + '\n' + ccb.code;
            /* Başlangıç yüksekliği kayıtlı değer; resize mesajıyla otomatik güncellenir */
            iframe.style.cssText = 'width:100%;height:' + (ccb.height || 200) + 'px;border:none;display:block;';
            iframe.setAttribute('sandbox', 'allow-scripts allow-forms allow-modals');
            iframe.setAttribute('title', ccb.name || 'CCB');
            block.innerHTML = '';
            block.appendChild(iframe);
        });
    }
    window._inflateCcbBlocks = inflateCcbBlocks;

    /* ── İlk yükleme: IIFE çalışmadan önce DOM'a yerleşmiş CCB'leri inflate et ── */
    setTimeout(() => {
        inflateCcbBlocks(document.getElementById('content'));
        inflateCcbBlocks(document.getElementById('fp-content'));
    }, 0);

    /* ── Nota CCB ekle ── */
    function insertCcb(id) {
        const target = (typeof EditorState._activeEditTarget !== 'undefined' && EditorState._activeEditTarget) || document.getElementById('content');
        if (!target) return;
        target.focus();

        /* slash '/' karakterini sil */
        if (typeof slashTextNode !== 'undefined' && slashTextNode && slashTextNode.isConnected) {
            const text = slashTextNode.nodeValue || '';
            const idx  = text.lastIndexOf('/', (typeof slashOffset !== 'undefined' ? slashOffset : text.length) - 1);
            if (idx !== -1) {
                const sel = window.getSelection();
                const r   = document.createRange();
                r.setStart(slashTextNode, idx);
                r.setEnd(slashTextNode, idx + 1);
                sel.removeAllRanges(); sel.addRange(r);
                target.focus(); document.execCommand('delete', false, null);
            }
        }
        if (typeof closeSlashMenu === 'function') closeSlashMenu();

        const block = document.createElement('div');
        block.className = 'ccb-block';
        block.contentEditable = 'false';
        block.dataset.ccbId = id;

        const sel = window.getSelection();
        /* Bulunduğumuz blok elementini bul (target'ın doğrudan çocuğu) */
        let anchorNode = null;
        if (sel && sel.rangeCount) {
            let node = sel.getRangeAt(0).startContainer;
            while (node && node.parentNode !== target && node !== target) node = node.parentNode;
            if (node && node.parentNode === target) anchorNode = node;
        }

        /* CCB'den sonra cursor için boş paragraf */
        const pAfter = document.createElement('p');
        pAfter.innerHTML = '<br>';

        if (anchorNode) {
            /* Mevcut blok boşsa (sadece <br> veya hiç içerik yok) → yerini al */
            const isEmpty = !anchorNode.textContent.trim() &&
                            /^(<br\/?>)?$/i.test(anchorNode.innerHTML || '');
            if (isEmpty) {
                target.replaceChild(block, anchorNode);
            } else {
                /* Dolu bloktan sonra CCB ekle */
                anchorNode.insertAdjacentElement('afterend', block);
            }
        } else {
            target.appendChild(block);
        }
        block.insertAdjacentElement('afterend', pAfter);

        /* Şimdi DOM'da, inflateCcbBlocks root kendisini de kontrol ediyor */
        inflateCcbBlocks(block);

        /* Cursor'ı CCB sonrasındaki paragraf başına taşı */
        const r2 = document.createRange();
        r2.setStart(pAfter, 0);
        r2.collapse(true);
        sel.removeAllRanges();
        sel.addRange(r2);
        target.focus();

        /* Programatik DOM değişikliği EditorState._contentDirty'yi tetiklemez; input event dispatch ederek
           otomatik kaydı zorla (aksi hâlde not anahtarlanmadan önce kaydedilmez) */
        target.dispatchEvent(new Event('input', { bubbles: true }));
    }
    window._insertCcb = insertCcb;

    /* ── Slash menü: CCB kategorisi ── */
    function _ccbInjectSlash() {
        if (typeof Const.SLASH_COMMAND_GROUPS === 'undefined') return;
        /* Eski CCB grubunu kaldır */
        const idx = Const.SLASH_COMMAND_GROUPS.findIndex(g => g._ccbGroup);
        if (idx >= 0) Const.SLASH_COMMAND_GROUPS.splice(idx, 1);
        const ccbs = ccbGetAll();
        if (!ccbs.length) return;
        Const.SLASH_COMMAND_GROUPS.push({
            label: 'CCB',
            _ccbGroup: true,
            items: ccbs.map(c => ({
                type: 'ccb:' + c.id,
                icon: 'fa-code',
                label: (c.group ? c.group + ' / ' : '') + c.name,
                hint: '/ccb'
            }))
        });
    }
    window._ccbInjectSlash = _ccbInjectSlash;
    _ccbInjectSlash();

    /* applySlashCommand'a CCB tipi için hook */
    const _origApply = window._slashApplyHooks || (window._slashApplyHooks = {});
    _origApply['ccb'] = insertCcb;  /* applySlashCommand içinde 'ccb:ID' → insertCcb(ID) */

    /* ── Settings — Controls sekmesi UI ── */
    (function initCcbSettings() {
        const devTab  = document.querySelector('.stab[data-stab="dev"]');
        const listEl  = document.getElementById('ccb-list');
        const addBtn  = document.getElementById('ccb-add-btn');
        if (!devTab || !listEl || !addBtn) return;

        /* Alt sekme geçişi */
        document.querySelectorAll('.dev-stab').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.dev-stab').forEach(b => b.classList.remove('active'));
                document.querySelectorAll('.dev-stab-panel').forEach(p => p.classList.remove('active'));
                btn.classList.add('active');
                const panel = document.getElementById('dev-' + btn.dataset.devStab + '-panel');
                if (panel) panel.classList.add('active');
            });
        });

        function renderList() {
            _ccbInjectSlash();
            const ccbs = ccbGetAll();
            if (!ccbs.length) {
                listEl.innerHTML = '<div class="ccb-empty">Henüz kod bloğu yok. "Yeni CCB" ile ekleyin.</div>';
                return;
            }
            listEl.innerHTML = '';
            ccbs.forEach(ccb => {
                const item = document.createElement('div');
                item.className = 'ccb-item';
                item.dataset.ccbId = ccb.id;
                item.innerHTML =
                    '<div class="ccb-item-head">' +
                        '<span class="ccb-item-grp">' + _e(ccb.group||'Genel') + '</span>' +
                        '<span class="ccb-item-name">' + _e(ccb.name) + '</span>' +
                        '<span class="ccb-item-h">' + (ccb.height||200) + 'px</span>' +
                        '<span class="ccb-item-arrow"><i class="fas fa-chevron-right"></i></span>' +
                    '</div>' +
                    '<div class="ccb-item-body">' +
                        '<div class="ccb-item-actions">' +
                            '<button class="ccb-act-btn ccb-edit-btn">Düzenle</button>' +
                            '<button class="ccb-act-btn danger ccb-del-btn">Sil</button>' +
                        '</div>' +
                        '<div class="ccb-code-view">' + _ccbHighlight(ccb.code||'') + '</div>' +
                    '</div>';

                item.querySelector('.ccb-item-head').addEventListener('click', () => {
                    item.classList.toggle('open');
                });
                item.querySelector('.ccb-edit-btn').addEventListener('click', e => {
                    e.stopPropagation();
                    openForm(ccb);
                });
                item.querySelector('.ccb-del-btn').addEventListener('click', e => {
                    e.stopPropagation();
                    if (confirm('"' + ccb.name + '" silinsin mi?')) {
                        _ccbDelete(ccb.id);
                        renderList();
                    }
                });
                listEl.appendChild(item);
            });
        }

        function _e(s) {
            return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
        }

        function openForm(ccb) {
            const isEdit = !!ccb;
            const existing = document.getElementById('ccb-form-wrap');
            if (existing) existing.remove();

            const wrap = document.createElement('div');
            wrap.id = 'ccb-form-wrap';
            wrap.className = 'ccb-form';
            wrap.innerHTML =
                '<div class="ccb-form-row ccb-form-row-2">' +
                    '<div><label>Grup</label><input id="ccb-f-group" type="text" autocomplete="off" placeholder="Genel" value="' + _e(isEdit ? ccb.group : '') + '"></div>' +
                    '<div><label>İsim</label><input id="ccb-f-name"  type="text" placeholder="Blok adı" value="' + _e(isEdit ? ccb.name  : '') + '"></div>' +
                '</div>' +
                '<div class="ccb-form-row">' +
                    '<label>Yükseklik (px)</label>' +
                    '<input id="ccb-f-height" type="number" min="50" max="2000" value="' + (isEdit ? ccb.height : 200) + '">' +
                '</div>' +
                '<div class="ccb-form-row">' +
                    '<label>HTML Kodu</label>' +
                    '<textarea id="ccb-f-code" rows="8" placeholder="&lt;div&gt;…&lt;/div&gt;\n&lt;style&gt;…&lt;/style&gt;\n&lt;script&gt;…&lt;/script&gt;">' + _e(isEdit ? ccb.code : '') + '</textarea>' +
                '</div>' +
                '<div class="ccb-form-foot">' +
                    '<button class="ccb-form-cancel">İptal</button>' +
                    '<button class="ccb-form-save">' + (isEdit ? 'Güncelle' : 'Kaydet') + '</button>' +
                '</div>';

            /* ── Grup alanı custom combobox (fixed body-level dropdown, overflow:hidden'dan etkilenmez) ── */
            (function() {
                const groupInp = wrap.querySelector('#ccb-f-group');
                const groups   = [...new Set(ccbGetAll().map(c => c.group || 'Genel'))];
                if (!groups.length) return;
                let _drop = null;

                function _closeDrop() { if (_drop) { _drop.remove(); _drop = null; } }

                function _showDrop() {
                    _closeDrop();
                    const q = groupInp.value.trim().toLowerCase();
                    const matches = q ? groups.filter(g => g.toLowerCase().includes(q)) : groups;
                    if (!matches.length) return;
                    _drop = document.createElement('ul');
                    _drop.className = 'ccb-combo-drop';
                    matches.forEach(g => {
                        const li = document.createElement('li');
                        li.textContent = g;
                        li.addEventListener('mousedown', e => { e.preventDefault(); groupInp.value = g; _closeDrop(); });
                        _drop.appendChild(li);
                    });
                    document.body.appendChild(_drop);
                    const r = groupInp.getBoundingClientRect();
                    _drop.style.left  = r.left + 'px';
                    _drop.style.top   = (r.bottom + 2) + 'px';
                    _drop.style.width = r.width + 'px';
                }

                groupInp.addEventListener('focus', _showDrop);
                groupInp.addEventListener('input', _showDrop);
                groupInp.addEventListener('blur',  () => setTimeout(_closeDrop, 150));
                /* Form kapanırken dropdown'ı temizle */
                wrap.querySelector('.ccb-form-cancel').addEventListener('click', _closeDrop);
                wrap.querySelector('.ccb-form-save').addEventListener('click', _closeDrop);
            })();

            wrap.querySelector('.ccb-form-cancel').addEventListener('click', () => wrap.remove());
            wrap.querySelector('.ccb-form-save').addEventListener('click', () => {
                const group  = document.getElementById('ccb-f-group').value.trim() || 'Genel';
                const name   = document.getElementById('ccb-f-name').value.trim();
                const height = parseInt(document.getElementById('ccb-f-height').value, 10) || 200;
                const code   = document.getElementById('ccb-f-code').value;
                if (!name) { alert('İsim zorunludur.'); return; }
                if (!code.trim()) { alert('HTML kodu zorunludur.'); return; }
                if (isEdit) _ccbUpdate(ccb.id, { group, name, height, code });
                else        _ccbAdd({ group, name, height, code });
                wrap.remove();
                renderList();
            });

            const ctrl = document.getElementById('dev-controls-panel');
            if (ctrl) ctrl.insertBefore(wrap, listEl);
        }

        addBtn.addEventListener('click', () => openForm(null));
        devTab.addEventListener('click', renderList);
        renderList();
    })();
})();

/* ── Ayarlar modalı AI sekmesi ── */
(function initAiSettingsTab() {
    const tab     = document.querySelector('.stab[data-stab="ai"]');
    const saveBtn = document.getElementById('cfg-ai-save');
    const statusEl = document.getElementById('cfg-ai-status');
    if (!tab || !saveBtn) return;

    function _getCfg() { return getAiCfg(); }
    function _$(id) { return document.getElementById(id); }
    function _setStatus(msg, isErr) {
        if (!statusEl) return;
        statusEl.textContent = msg;
        statusEl.style.color = isErr ? '#e5534b' : 'var(--accent)';
        if (!isErr) setTimeout(() => { if (statusEl) { statusEl.textContent = ''; statusEl.style.color = ''; } }, 2000);
    }

    function _loadAll() {
        const c = _getCfg();
        const ai = getAiCfg();
        const mdTog  = _$('cfg-ai-md');     if (mdTog)  mdTog.checked  = ai.md    !== false;
        const toneSel = _$('cfg-ai-tone');  if (toneSel) toneSel.value = ai.tone   || 'informative';
        const actSel  = _$('cfg-ai-action'); if (actSel) actSel.value  = ai.action || 'expand';
        const bmTog  = _$('cfg-ai-bm');     if (bmTog)  bmTog.checked  = ai.bmClick !== false;
        const tempRange = _$('cfg-temp');
        const tempDisp  = _$('cfg-temp-val');
        if (tempRange) { tempRange.value = c.temp ?? 0.7; if (tempDisp) tempDisp.textContent = tempRange.value; }
        const ctxIn = _$('cfg-ctx'); if (ctxIn) ctxIn.value = c.ctx ?? 10;
        const sysTA = _$('cfg-sys'); if (sysTA) sysTA.value = c.sys || '';
    }

    tab.addEventListener('click', _loadAll);

    const tempRange = _$('cfg-temp');
    const tempDisp  = _$('cfg-temp-val');
    if (tempRange && tempDisp) tempRange.addEventListener('input', () => { tempDisp.textContent = tempRange.value; });

    saveBtn.addEventListener('click', () => {
        const mdTog   = _$('cfg-ai-md');
        const bmTog   = _$('cfg-ai-bm');
        const toneSel = _$('cfg-ai-tone');
        const actSel  = _$('cfg-ai-action');
        const sysTA = _$('cfg-sys');
        const ctxIn = _$('cfg-ctx');
        const tempR = _$('cfg-temp');
        const sysVal = sysTA?.value.trim() || '';
        patchAiCfg({
            md     : mdTog  ? mdTog.checked  : undefined,
            bmClick: bmTog  ? bmTog.checked  : undefined,
            tone   : toneSel ? toneSel.value : undefined,
            action : actSel  ? actSel.value  : undefined,
            temp   : parseFloat(tempR?.value ?? 0.7),
            ctx    : parseInt(ctxIn?.value ?? 10),
            sys    : sysVal
        });

        const toneBadge = document.querySelector('#ai-action-popup .ai-tone-name');
        if (toneBadge && toneSel) {
            const LABELS = { professional:'Profesyonel', friendly:'Samimi', informative:'Bilgilendirici', creative:'Yaratıcı' };
            toneBadge.textContent = LABELS[toneSel.value] || '';
        }
        _setStatus('Kaydedildi ✓', false);
    });
})();

/* ── Gelişmiş Ayarlar sekmesi ── */
(function initAdvancedSettings() {
    const tab    = document.querySelector('.stab[data-stab="tab3"]');
    const toggle = document.getElementById('cfg-export-ai');
    if (!tab || !toggle) return;
    tab.addEventListener('click', () => {
        toggle.checked = getAiCfg().exportAi === true;
    });
    toggle.addEventListener('change', () => {
        patchAiCfg({ exportAi: toggle.checked });
    });
})();

/* ══ OTOMATİK KAYIT ══ */
(function() {
    var _timer = null;
    var _saveBtn = document.getElementById('save-btn');

    function _doSave() {
        /* Başlık veya içerik yoksa dur */
        var ttl = document.getElementById('title');
        var cnt = document.getElementById('content');
        if (!ttl || !cnt) return;
        var titleVal = ttl.value.trim();
        var bodyVal  = cnt.innerText.trim();
        if (!titleVal && !bodyVal) return;

        /* Değişiklik yoksa dur */
        if (!EditorState._contentDirty && titleVal === EditorState._snapTitle) return;

        /* save-btn'i göster */
        if (_saveBtn) {
            _saveBtn.classList.remove('saved');
            _saveBtn.classList.add('saving');
        }

        /* Notu kaydet */
        var eId = document.getElementById('edit-id');
        var eIdVal = eId ? eId.value : '';
        _cleanShapeControls();
        var rawHtml = cnt.innerHTML;
        var sanitized = sanitize(convertWikiSyntax(rawHtml));
        var tags = parseTagsFromContent(rawHtml);

        if (eIdVal) {
            var idx = State.notes.findIndex(function(n) { return String(n.id) === String(eIdVal); });
            if (idx !== -1) {
                State.notes[idx].title     = titleVal;
                State.notes[idx].content   = sanitized;
                State.notes[idx].contentMd = htmlToMd(sanitized);
                State.notes[idx].tags      = tags;
                State.notes[idx].updatedAt = Date.now();
            }
        } else {
            var newId = genId();
            State.notes.push({
                id: newId, title: titleVal, content: sanitized, contentMd: htmlToMd(sanitized),
                group: State.editorGroup, pinned: State.editorPinned,
                colorLabel: State.editorColorLabel, tags: tags,
                createdAt: Date.now(), updatedAt: Date.now()
            });
            if (eId) eId.value = newId;
            EditorState._editActive = true;
        }

        /* Snapshot güncelle */
        EditorState._snapTitle    = titleVal;
        EditorState._contentDirty = false;

        saveNotes();

        /* Hale efekti */
        setTimeout(function() {
            if (_saveBtn) {
                _saveBtn.classList.remove('saving');
                _saveBtn.classList.add('saved');
                setTimeout(function() { _saveBtn.classList.remove('saved'); }, 600);
            }
        }, 300);
    }

    function _schedule() {
        clearTimeout(_timer);
        _timer = setTimeout(_doSave, 2000);
    }

    /* Dinleyiciler — keyup/input */
    var title = document.getElementById('title');
    var content = document.getElementById('content');
    if (title)   { title.addEventListener('keyup', _schedule); title.addEventListener('input', _schedule); }
    if (content) { content.addEventListener('keyup', _schedule); content.addEventListener('input', _schedule); }

    document.addEventListener('keyup', function(e) {
        var t = e.target;
        if (t && (t.classList.contains('col-panel-content') || t.classList.contains('layout-col'))) _schedule();
    });

    /* MutationObserver — todo tıklama, toolbar formatı, renk, link gibi
       keyup/input tetiklemeyenleri yakala */
    if (content && window.MutationObserver) {
        var _obs = new MutationObserver(function() { _schedule(); });
        _obs.observe(content, { childList: true, subtree: true, characterData: true, attributes: true });
    }

    /* Periyodik — 30 saniyede bir */
    setInterval(_doSave, 30000);
})();

/* ══ INIT ══ */
resetEditor();
render();

/* Başlık veya içeriğe odaklanınca pristine moddan çık */
DOM.$title.addEventListener('focus',   () => document.body.classList.remove('editor-pristine'));
DOM.$content.addEventListener('focus', () => document.body.classList.remove('editor-pristine'));
/* Giriş yapılınca cf-trigger göster */
DOM.$title.addEventListener('input',   () => document.body.classList.add('cf-ready'));
DOM.$content.addEventListener('input', () => document.body.classList.add('cf-ready'));


