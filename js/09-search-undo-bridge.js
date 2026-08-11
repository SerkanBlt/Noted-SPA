/* ══ EDİTÖR İÇİ ARAMA ══ */
(function () {
    const _mainContent = document.getElementById('content'); /* DOM.$content değişmez ref */
    const searchBtn    = $('editor-search-btn');
    const wrap         = $('editor-search-wrap');
    const panel        = $('editor-search-panel');
    const input        = $('editor-search-input');
    const closeBtn     = $('editor-search-close');
    const resultsEl    = $('editor-search-results');
    if (!searchBtn || !panel || !input || !resultsEl) return;

    let _debTimer = null;

    function _positionPanel() {
        const wr = (wrap || searchBtn).getBoundingClientRect();
        panel.style.top   = (wr.bottom + 2) + 'px';
        panel.style.left  = wr.left + 'px';
        panel.style.width = Math.max(wr.width, 200) + 'px';
    }

    function openPanel() {
        if (wrap) wrap.classList.add('open');
        input.focus();
        input.select();
        /* Only show results panel if there is already text */
        if (input.value.trim()) {
            panel.classList.add('open');
            _positionPanel();
            runSearch(input.value.trim());
        }
    }
    function closePanel() {
        if (wrap) wrap.classList.remove('open');
        panel.classList.remove('open');
        input.value = '';
        resultsEl.innerHTML = '';
    }

    searchBtn.addEventListener('click', () => {
        (wrap ? wrap.classList.contains('open') : panel.classList.contains('open')) ? closePanel() : openPanel();
    });
    if (closeBtn) closeBtn.addEventListener('click', closePanel);

    /* Ctrl+F arama panelini aç */
    document.addEventListener('keydown', e => {
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'f') {
            const editing = DOM.$content && !DOM.$content.hasAttribute('disabled');
            if (!editing) return;
            e.preventDefault();
            openPanel();
        }
        if (e.key === 'Escape' && panel.classList.contains('open')) closePanel();
    }, true);

    /* Dışarı tıklanınca kapat — header araması gibi */
    document.addEventListener('click', e => {
        if (!wrap || !wrap.classList.contains('open')) return;
        if (!e.target.closest('#editor-search-wrap') && !e.target.closest('#editor-search-panel')) {
            closePanel();
        }
    });

    /* Arama — debounce 200ms; panel yalnızca metin varsa görünür */
    input.addEventListener('input', () => {
        clearTimeout(_debTimer);
        const kw = input.value.trim();
        if (!kw) {
            panel.classList.remove('open');
            resultsEl.innerHTML = '';
            return;
        }
        panel.classList.add('open');
        _positionPanel();
        _debTimer = setTimeout(() => runSearch(kw), 200);
    });

    function esc(s) {
        return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
    }

    function getBlocks() {
        if (!_mainContent) return [];
        /* Anlamlı metin bloklarını topla — iç içe olanları dışla */
        const sel = 'p, li, h2, h3, h4, h5, td, th, blockquote > *:not(blockquote), .callout-body > p, pre';
        const all = [..._mainContent.querySelectorAll(sel)];
        /* Sadece doğrudan metin içeren (başka blok elementi barındırmayan) düğümleri al */
        return all.filter(el => {
            const inner = el.querySelectorAll('p,li,h2,h3,h4,h5,td,th');
            return inner.length === 0;
        });
    }

    function buildSnippet(text, keyword) {
        const lower = text.toLowerCase();
        const kLower = keyword.toLowerCase();
        let pos = lower.indexOf(kLower);
        if (pos === -1) return null;

        /* kelimeye göre sözcük bazlı bağlam */
        const words = text.split(/(\s+)/); /* boşlukları koru */
        const tokens = []; /* {w, isSpace} */
        let charIdx = 0;
        let kwToken = -1;
        for (let i = 0; i < words.length; i++) {
            const w = words[i];
            if (charIdx <= pos && pos < charIdx + w.length && !/^\s+$/.test(w)) {
                kwToken = i;
            }
            tokens.push(w);
            charIdx += w.length;
        }
        if (kwToken === -1) return null;

        /* Sözcük indeksleri (boşluk olmayanlar) */
        const wordIdxs = tokens.map((w, i) => /^\s+$/.test(w) ? -1 : i).filter(i => i !== -1);
        const wPos = wordIdxs.indexOf(kwToken);
        const before3 = wordIdxs.slice(Math.max(0, wPos - 3), wPos);
        const after3  = wordIdxs.slice(wPos + 1, wPos + 4);

        const hasBefore = before3.length > 0 && wPos > 0;
        const hasAfter  = after3.length > 0 && wPos < wordIdxs.length - 1;
        const moreBefore = wPos > 3;
        const moreAfter  = wPos + 4 < wordIdxs.length;

        /* Aralıkları derle */
        function slice(idxList) {
            if (!idxList.length) return '';
            const from = idxList[0], to = idxList[idxList.length - 1];
            return tokens.slice(from, to + 1).join('');
        }

        let html = '';
        if (moreBefore)  html += '<span class="esp-dots">…</span> ';
        if (hasBefore)   html += esc(slice(before3)) + ' ';
        /* keyword — tüm eşleşmeleri highlight et */
        const kwRaw = tokens[kwToken];
        const kIdx  = kwRaw.toLowerCase().indexOf(kLower);
        html += esc(kwRaw.slice(0, kIdx)) +
                '<span class="esp-kw">' + esc(kwRaw.slice(kIdx, kIdx + keyword.length)) + '</span>' +
                esc(kwRaw.slice(kIdx + keyword.length));
        if (hasAfter)   html += ' ' + esc(slice(after3));
        if (moreAfter)  html += ' <span class="esp-dots">…</span>';
        return html;
    }

    function runSearch(kw) {
        resultsEl.innerHTML = '';
        if (!kw || kw.length < 1) return;

        const blocks = getBlocks();
        let count = 0;

        blocks.forEach(el => {
            const text = el.textContent || '';
            if (!text.toLowerCase().includes(kw.toLowerCase())) return;
            const snippet = buildSnippet(text, kw);
            if (!snippet) return;
            const row = document.createElement('div');
            row.className = 'esp-hit';
            row.innerHTML = snippet;
            /* Tıklanınca ilgili bloğa scroll et */
            row.addEventListener('click', () => {
                el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                el.style.outline = '2px solid var(--accent)';
                setTimeout(() => { el.style.outline = ''; }, 1400);
            });
            resultsEl.appendChild(row);
            count++;
        });

        if (count === 0) {
            resultsEl.innerHTML = '<div class="esp-empty"><i class="fas fa-search" style="opacity:.3"></i><br>' + NotedI18n.t('editor.search.notfound').replace('{kw}', esc(kw)) + '</div>';
        }
    }
})();

/* ══ UNDO / REDO YÖNETİCİSİ ══ */
(function () {
    const MAX = 100;
    let _locked = false, _setup = false, _debTimer = null;
    let _observedEl = null, _obs = null;

    function _saveCursor() {
        const sel = window.getSelection();
        if (!sel || !sel.rangeCount || !DOM.$content) return null;
        const r = sel.getRangeAt(0);
        if (!DOM.$content.contains(r.startContainer)) return null;
        function path(n) {
            const p = [];
            while (n && n !== DOM.$content) { p.unshift([...n.parentNode.childNodes].indexOf(n)); n = n.parentNode; }
            return p;
        }
        return { a: path(r.startContainer), ao: r.startOffset,
                 f: path(r.endContainer),   fo: r.endOffset };
    }

    function _restoreCursor(cur) {
        if (!cur || !DOM.$content) return;
        try {
            function byPath(p) {
                let n = DOM.$content;
                for (const i of p) { if (!n.childNodes[i]) return null; n = n.childNodes[i]; }
                return n;
            }
            const a = byPath(cur.a), f = byPath(cur.f) || a;
            if (!a) { DOM.$content.focus(); return; }
            const clamp = (n, v) => Math.min(v, n.nodeType === 3 ? n.length : n.childNodes.length);
            const range = document.createRange();
            range.setStart(a, clamp(a, cur.ao));
            range.setEnd(f, clamp(f, cur.fo));
            const sel = window.getSelection(); sel.removeAllRanges(); sel.addRange(range);
        } catch (_) { DOM.$content.focus(); }
    }

    function _pushState(html, cursor) {
        if (_locked || _setup || !EditorState.activeInstance) return;
        /* Duplicate check ÖNCE yapılıyor — yoksa slice redo branch'ini keser */
        const inst = EditorState.activeInstance;
        const trimmed = inst._stack.slice(0, inst._idx + 1);
        if (trimmed.length && trimmed[trimmed.length - 1].html === html) return;
        inst._stack = trimmed;
        if (inst._stack.length >= MAX) inst._stack.shift(); else inst._idx++;
        inst._stack.push({ html, cursor: cursor ?? _saveCursor() });
    }

    function _flushDebounce() {
        if (_debTimer) { clearTimeout(_debTimer); _debTimer = null; }
        if (DOM.$content && !_locked && !_setup) _pushState(DOM.$content.innerHTML, _saveCursor());
    }

    function _debouncePush() {
        if (_locked || _setup) return;
        if (_debTimer) clearTimeout(_debTimer);
        const html = DOM.$content?.innerHTML ?? '', cursor = _saveCursor();
        _debTimer = setTimeout(() => { _debTimer = null; _pushState(html, cursor); }, 500);
    }

    window.clearUndoHistory = function () {
        if (EditorState.activeInstance) { EditorState.activeInstance._stack = []; EditorState.activeInstance._idx = -1; }
        if (_debTimer) { clearTimeout(_debTimer); _debTimer = null; }
    };

    window._undoSetupStart = function () {
        _setup = true;
        window.clearUndoHistory();
    };

    window._undoSetupEnd = function () {
        _setup = false;
        if (DOM.$content) _pushState(DOM.$content.innerHTML, null);
    };

    window.editorUndo = function () {
        _flushDebounce();
        const inst = EditorState.activeInstance; if (!inst || inst._idx <= 0) return;
        inst._idx--;
        const state = inst._stack[inst._idx];
        _locked = true;
        DOM.$content.innerHTML = state.html;
        if (typeof _restoreGrids === 'function') _restoreGrids();
        if (typeof initShapeOverlays === 'function') initShapeOverlays();
        requestAnimationFrame(() => {
            _locked = false;
            DOM.$content.focus();
            _restoreCursor(state.cursor);
            if (typeof _markDirty === 'function') _markDirty();
            if (typeof updateFooterVisibility === 'function') updateFooterVisibility();
            if (typeof window._todoUpdateBadge === 'function') window._todoUpdateBadge();
            if (typeof buildTocPanel === 'function') buildTocPanel();
        });
    };

    window.editorRedo = function () {
        if (_debTimer) { clearTimeout(_debTimer); _debTimer = null; }
        const inst = EditorState.activeInstance; if (!inst || inst._idx >= inst._stack.length - 1) return;
        inst._idx++;
        const state = inst._stack[inst._idx];
        _locked = true;
        DOM.$content.innerHTML = state.html;
        if (typeof _restoreGrids === 'function') _restoreGrids();
        if (typeof initShapeOverlays === 'function') initShapeOverlays();
        requestAnimationFrame(() => {
            _locked = false;
            DOM.$content.focus();
            _restoreCursor(state.cursor);
            if (typeof _markDirty === 'function') _markDirty();
            if (typeof updateFooterVisibility === 'function') updateFooterVisibility();
            if (typeof window._todoUpdateBadge === 'function') window._todoUpdateBadge();
            if (typeof buildTocPanel === 'function') buildTocPanel();
        });
    };

    window._undoLockForSave = function () {
        _locked = true;
        requestAnimationFrame(() => { if (!_setup) _locked = false; });
    };

    /* ── Gözlemci ve olay dinleyicileri — hedef elemente bağla/kopar ── */
    /* ── Dış kaynaktan gelen HTML'i temizle (Word, web sayfası, vb.) ── */
    function _cleanExternalHtml(html) {
        const ALLOWED = {
            tags: ['p','div','br','hr','h1','h2','h3','h4','h5','h6',
                   'strong','b','em','i','u','s','strike','mark','sub','sup',
                   'ul','ol','li','dl','dt','dd',
                   'table','thead','tbody','tfoot','tr','th','td','colgroup','col',
                   'a','img','figure','figcaption',
                   'span','blockquote','pre','code'],
            attr: ['href','src','alt','title','target','colspan','rowspan','width','height']
        };
        const safe = typeof DOMPurify !== 'undefined'
            ? DOMPurify.sanitize(html, { ALLOWED_TAGS: ALLOWED.tags, ALLOWED_ATTR: ALLOWED.attr })
            : html;
        const div = document.createElement('div');
        div.innerHTML = safe;
        /* <b> → <strong>, <i> → <em> */
        div.querySelectorAll('b').forEach(el => { const s = document.createElement('strong'); s.append(...el.childNodes); el.replaceWith(s); });
        div.querySelectorAll('i').forEach(el => { const s = document.createElement('em');     s.append(...el.childNodes); el.replaceWith(s); });
        /* Anlamsız kalan boş span'ları kaldır */
        div.querySelectorAll('span').forEach(el => { if (!el.attributes.length) el.replaceWith(...el.childNodes); });
        /* Boş blok elementleri kaldır */
        div.querySelectorAll('p,div').forEach(el => { if (!el.innerHTML.trim()) el.remove(); });
        return div.innerHTML;
    }

    /* ── Harici HTML yapıştırma yakalayıcı (en yüksek öncelik) ── */
    function _pasteHandlerClean(e) {
        const cd  = e.clipboardData || window.clipboardData;
        const htm = cd?.getData('text/html');
        if (!htm) return; /* Sadece HTML içeriyorsa devreye gir */
        /* MD tablo ise _pasteHandler1'e bırak */
        const txt = cd?.getData('text/plain') || '';
        if (/^[ \t]*\|?[ \t]*:?-{2,}[-: |]*[ \t]*\r?$/m.test(txt) && txt.split('\n').filter(l => /\|/.test(l)).length >= 2) return;
        e.preventDefault();
        e.stopImmediatePropagation();
        const cleaned = _cleanExternalHtml(htm);
        document.execCommand('insertHTML', false, cleaned);
        if (typeof _restoreGrids === 'function') _restoreGrids();
        if (!_locked && !_setup) _flushDebounce();
        if (typeof updateFooterVisibility === 'function') updateFooterVisibility();
    }

    function _pasteHandler1(e) {
        const txt = (e.clipboardData || window.clipboardData)?.getData('text/plain') || '';
        if (!txt || typeof window._mdToHtml !== 'function') return;
        if (!/^[ \t]*\|?[ \t]*:?-{2,}[-: |]*[ \t]*\r?$/m.test(txt)) return;
        if (txt.split('\n').filter(l => /\|/.test(l)).length < 2) return;
        e.preventDefault();
        e.stopImmediatePropagation();
        const html = window._mdToHtml(txt, true);
        document.execCommand('insertHTML', false, html);
        if (typeof _restoreGrids === 'function') _restoreGrids();
        if (!_locked && !_setup) _flushDebounce();
        if (typeof updateFooterVisibility === 'function') updateFooterVisibility();
    }
    function _pasteHandler2() {
        if (!_locked && !_setup) _flushDebounce();
    }
    function _keydownHandler(e) {
        const ctrl = e.ctrlKey || e.metaKey;
        if (ctrl && !e.shiftKey && e.key.toLowerCase() === 'z') {
            e.preventDefault(); e.stopImmediatePropagation();
            window.editorUndo();
        } else if (ctrl && (e.key.toLowerCase() === 'y' || (e.shiftKey && e.key.toLowerCase() === 'z'))) {
            e.preventDefault(); e.stopImmediatePropagation();
            window.editorRedo();
        } else if (ctrl && e.shiftKey && e.key.toLowerCase() === 'v') {
            e.preventDefault(); e.stopImmediatePropagation();
            navigator.clipboard.readText().then(t => {
                if (!t || typeof window._mdToHtml !== 'function') return;
                const html = window._mdToHtml(t, true);
                document.execCommand('insertHTML', false, html);
                if (typeof _restoreGrids === 'function') _restoreGrids();
                if (typeof updateFooterVisibility === 'function') updateFooterVisibility();
            }).catch(() => {});
        }
    }

    function _attach(el) {
        if (!el) return;
        if (!_obs) {
            _obs = new MutationObserver(mutations => {
                if (_locked || _setup || !DOM.$content) return;
                const hasChildList = mutations.some(m => m.type === 'childList');
                if (hasChildList) _flushDebounce(); else _debouncePush();
            });
        }
        _obs.observe(el, {
            childList: true, subtree: true, characterData: true,
            attributes: true,
            /* contenteditable lock/unlock gibi UI attr'larını hariç tut */
            attributeFilter: ['style', 'data-checked', 'data-col', 'data-cols', 'data-grid-type', 'data-bookmark',
                              'data-sx', 'data-sy', 'data-sw', 'data-sh', 'data-stroke', 'data-fill-mode', 'data-rotate', 'data-shape']
        });
        el.addEventListener('paste', _pasteHandlerClean, true);
        el.addEventListener('paste', _pasteHandler1, true);
        el.addEventListener('paste', _pasteHandler2, true);
        el.addEventListener('keydown', _keydownHandler, true);
        _observedEl = el;
    }

    function _detach(el) {
        if (!el) return;
        if (_obs) _obs.disconnect();
        el.removeEventListener('paste', _pasteHandlerClean, true);
        el.removeEventListener('paste', _pasteHandler1, true);
        el.removeEventListener('paste', _pasteHandler2, true);
        el.removeEventListener('keydown', _keydownHandler, true);
    }

    /* Aktif editör değiştiğinde observer + dinleyicileri yeni elemente taşı */
    window._undoSwitchTarget = function (newEl) {
        if (!newEl || _observedEl === newEl) return;
        _detach(_observedEl);
        _observedEl = null;
        _attach(newEl);
    };

    /* activateInstance() tarafından ESKİ instance hâlâ aktifken çağrılır — bekleyen
       500ms'lik debounce'u ESKİ instance'a ait doğru şekilde flush eder. Aksi halde
       zamanlayıcı instance geçişinden SONRA ateşlenip düzenlemeyi YANLIŞ (yeni aktif)
       instance'ın undo yığınına yazar; eski instance'ın kendi geçmişinden de kaybolur. */
    window._undoFlushPending = _flushDebounce;

    if (DOM.$content) _attach(DOM.$content);
})();

/* side-toolbar: editor-top altına konumlandır (dinamik height) */
(function positionSideToolbar() {
    const toolbar = $('side-toolbar');
    const editorTop = document.querySelector('.editor-top');
    if (!toolbar || !editorTop) return;
    function update() {
        toolbar.style.top = editorTop.offsetHeight + 'px';
    }
    update();
    new ResizeObserver(update).observe(editorTop);
})();

/* ── Sağdan kayan snack bildirimi ── */
function _showSnack(msg, type, dur) {
    type = type || 'warn'; dur = dur || 2800;
    /* Konteyner markup'ta YOKTU — bu yuzden uygulamadaki tum snack mesajlari
       (hucre uyarilari, "Baglanti kopyalandi", AI yedek model bildirimi…)
       sessizce kayboluyordu. Tooltip host'u gibi burada olusturuluyor. */
    let c = document.getElementById('snack-container');
    if (!c && document.body) {
        c = document.createElement('div');
        c.id = 'snack-container';
        document.body.appendChild(c);
    }
    if (!c) { console.warn(msg); return; }
    const s = document.createElement('div');
    s.className = 'snack snack-' + type;
    s.textContent = msg;
    c.appendChild(s);
    requestAnimationFrame(() => requestAnimationFrame(() => s.classList.add('snack-show')));
    setTimeout(() => { s.classList.remove('snack-show'); setTimeout(() => s.remove(), 300); }, dur);
}

/* ── STB tooltip (body-level, overflow kırpmasından bağımsız) ── */
(function() {
    const tip = document.createElement('div');
    tip.style.cssText = 'position:fixed;z-index:9999;background:var(--surface);color:var(--text);border:1px solid var(--border);font-size:.7rem;font-weight:600;padding:3px 9px;border-radius:6px;pointer-events:none;box-shadow:0 2px 10px var(--shadow);display:none;white-space:nowrap;';
    document.body.appendChild(tip);
    let _t = null;
    document.addEventListener('mouseover', e => {
        const b = e.target.closest('.stb[data-tip]');
        if (!b) return;
        clearTimeout(_t);
        tip.textContent = b.dataset.tip;
        tip.style.display = 'block';
        const r = b.getBoundingClientRect(), tw = tip.offsetWidth;
        let L = r.left + r.width / 2 - tw / 2;
        if (L < 4) L = 4;
        if (L + tw > window.innerWidth - 4) L = window.innerWidth - tw - 4;
        tip.style.left = L + 'px';
        tip.style.top  = (r.bottom + 5) + 'px';
    });
    document.addEventListener('mouseout', e => {
        if (!e.target.closest('.stb[data-tip]')) return;
        _t = setTimeout(() => { tip.style.display = 'none'; }, 60);
    });
})();

/* ══ Float editör köprüsü: let değişkenleri farklı <script> bloklarında paylaşılmaz.
   Bu fonksiyonlar main script kapsamında tanımlanıp window üzerinden float IIFE'ye açılır. ══ */
window._fpWlDetect = function(e) {
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
    r.setStart(node, startOffset); r.setEnd(node, sel.anchorOffset);
    EditorState.wlAcRange = r;
    const rect = r.getBoundingClientRect();
    if (!rect.width && !rect.height) { closeWlAutocomplete(); return; }
    openWlAutocomplete(query, rect);
};
window._fpWlKeydown = function(e) {
    if (!EditorState.wlAcActive || !DOM.$wlAutocomplete.classList.contains('open')) return;
    const items = [...DOM.$wlAcList.querySelectorAll('.wl-ac-item')];
    if (e.key === 'Escape') { e.preventDefault(); closeWlAutocomplete(); return; }
    if (e.key === 'ArrowDown' && items.length) {
        e.preventDefault(); EditorState.wlAcSelIndex = (EditorState.wlAcSelIndex + 1) % items.length;
        items.forEach((it, i) => it.classList.toggle('active', i === EditorState.wlAcSelIndex));
        items[EditorState.wlAcSelIndex].scrollIntoView({ block:'nearest' });
    } else if (e.key === 'ArrowUp' && items.length) {
        e.preventDefault(); EditorState.wlAcSelIndex = (EditorState.wlAcSelIndex - 1 + items.length) % items.length;
        items.forEach((it, i) => it.classList.toggle('active', i === EditorState.wlAcSelIndex));
        items[EditorState.wlAcSelIndex].scrollIntoView({ block:'nearest' });
    } else if (e.key === 'Enter' && items.length) {
        e.preventDefault(); insertWikilink(items[EditorState.wlAcSelIndex].dataset.title);
    }
};
window._fpOpenPicker = openPicker;
