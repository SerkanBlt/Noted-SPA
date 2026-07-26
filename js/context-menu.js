(function () {
    const $content = document.getElementById('content');
    const menu = document.getElementById('ctx-menu');
    if (!$content || !menu) return;

    /* ── Callout meta ── */
    const CALLOUT_TYPES = [
        { key:'info',    icon:'fa-circle-info',          label:'Bilgi'   },
        { key:'warning', icon:'fa-triangle-exclamation', label:'Uyarı'   },
        { key:'tip',     icon:'fa-lightbulb',            label:'İpucu'   },
        { key:'success', icon:'fa-circle-check',         label:'Başarı'  },
    ];

    /* ── Context detection ── */
    function detect(target, root) {
        root = root || $content;
        const c = {};
        let el = target;
        while (el && el !== root) {
            if (!c.shape    && el.classList && el.classList.contains('note-shape-overlay')) c.shape = el;
            if (!c.td       && (el.tagName === 'TD' || el.tagName === 'TH')) {
                c.td = el; c.tr = el.closest('tr'); c.table = el.closest('table');
            }
            if (!c.link     && el.tagName === 'A' && !el.classList.contains('wikilink') && el.getAttribute('href')) c.link = el;
            if (!c.wikilink && el.classList && el.classList.contains('wikilink')) c.wikilink = el;
            if (!c.pre      && el.tagName === 'PRE') c.pre = el;
            if (!c.callout  && el.classList && el.classList.contains('callout')) c.callout = el;
            if (!c.li       && el.tagName === 'LI') c.li = el;
            if (!c.heading  && /^H[1-3]$/.test(el.tagName)) c.heading = el;
            if (!c.img      && el.tagName === 'IMG') c.img = el;
            el = el.parentElement;
        }
        const sel = window.getSelection();
        c.hasSel = sel && sel.toString().trim().length > 0;
        return c;
    }

    /* ── Table helpers ── */
    function insertRow(tr, where) {
        if (!tr) return;
        const row = tr.cloneNode(false);
        for (let i = 0; i < tr.cells.length; i++) {
            const td = document.createElement('td'); td.innerHTML = '<br>'; row.appendChild(td);
        }
        tr.parentNode.insertBefore(row, where === 'before' ? tr : tr.nextSibling);
    }
    function insertCol(table, td, where) {
        if (!table || !td) return;
        const idx = td.cellIndex;
        Array.from(table.rows).forEach((row, ri) => {
            const cell = document.createElement(ri === 0 ? 'th' : 'td');
            cell.innerHTML = '<br>';
            const ref = row.cells[where === 'before' ? idx : idx + 1];
            ref ? row.insertBefore(cell, ref) : row.appendChild(cell);
        });
    }
    function deleteCol(table, td) {
        if (!table || !td) return;
        const idx = td.cellIndex;
        if (table.rows[0] && table.rows[0].cells.length <= 1) { table.remove(); return; }
        Array.from(table.rows).forEach(row => { if (row.cells[idx]) row.deleteCell(idx); });
    }

    /* ── Heading helper ── */
    function changeHeading(el, level) {
        const newEl = document.createElement(level === 0 ? 'p' : 'h' + level);
        newEl.innerHTML = el.innerHTML;
        el.parentNode.replaceChild(newEl, el);
    }

    /* ── Callout type change ── */
    function setCalloutType(callout, key) {
        CALLOUT_TYPES.forEach(t => callout.classList.remove('callout-' + t.key));
        callout.classList.add('callout-' + key);
        const cfg = CALLOUT_TYPES.find(t => t.key === key);
        if (!cfg) return;
        const hdr = callout.querySelector('.callout-header');
        if (hdr) hdr.innerHTML = '<i class="fas ' + cfg.icon + '"></i>' + cfg.label;
    }

    /* ── Build items ── */
    function buildItems(c) {
        const S   = { type:'sep' };
        const grp = label => ({ type:'grp', label });
        const it  = (icon, label, action, opts={}) => ({ type:'item', icon, label, action, ...opts });

        const items = [
            it('↺', 'Geri Al',  () => window.editorUndo && window.editorUndo(), { shortcut:'Ctrl+Z' }),
            it('↻', 'Yinele',   () => window.editorRedo && window.editorRedo(), { shortcut:'Ctrl+Y' }),
            S,
            it('✂', 'Kes',                   () => document.execCommand('cut'),   { shortcut:'Ctrl+X', disabled:!c.hasSel }),
            it('⿻', 'Kopyala',               () => document.execCommand('copy'),  { shortcut:'Ctrl+C', disabled:!c.hasSel }),
            it('📋', 'Yapıştır',              () => document.execCommand('paste'), { shortcut:'Ctrl+V' }),
            it('Aa', 'Düz Metin Yapıştır',    () => navigator.clipboard.readText().then(t => document.execCommand('insertText', false, t)).catch(()=>{})),
            it('↓M', 'Markdown Yapıştır',     () => navigator.clipboard.readText().then(t => {
                if (!t || typeof window._mdToHtml !== 'function') return;
                const html = window._mdToHtml(t, true);
                document.execCommand('insertHTML', false, html);
                if (typeof _restoreGrids === 'function') _restoreGrids();
                if (typeof updateFooterVisibility === 'function') updateFooterVisibility();
            }).catch(() => {}), { shortcut:'Ctrl+Shift+V' }),
            S,
            it('⬜', 'Tümünü Seç', () => document.execCommand('selectAll'), { shortcut:'Ctrl+A' }),
            S,
            it('🖨', 'Yazdır', () => window.print(), { shortcut:'Ctrl+P' }),
        ];

        /* TABLE */
        if (c.table) {
            items.push(S, grp('Tablo İşlemleri'));
            items.push(it('⬆', 'Üstüne Satır Ekle', () => insertRow(c.tr, 'before')));
            items.push(it('⬇', 'Altına Satır Ekle',  () => insertRow(c.tr, 'after')));
            items.push(it('⬅', 'Sola Sütun Ekle',   () => insertCol(c.table, c.td, 'before')));
            items.push(it('➡', 'Sağa Sütun Ekle',   () => insertCol(c.table, c.td, 'after')));
            items.push(S);
            items.push(it('🗑', 'Satırı Sil',  () => { if (c.tr && c.tr.parentNode.rows.length > 1) c.tr.remove(); }, { danger:true }));
            items.push(it('🗑', 'Sütunu Sil',   () => deleteCol(c.table, c.td),   { danger:true }));
            items.push(it('✕',  'Tabloyu Sil',  () => c.table.remove(),           { danger:true }));
        }

        /* EXTERNAL LINK */
        if (c.link) {
            items.push(S, grp('Bağlantı'));
            items.push(it('🔗', 'Bağlantıyı Aç',      () => window.open(c.link.href, '_blank')));
            items.push(it('📋', "URL'yi Kopyala",       () => navigator.clipboard.writeText(c.link.href)));
            items.push(it('✂',  'Bağlantıyı Kaldır',  () => {
                const r = document.createRange(); r.selectNodeContents(c.link);
                c.link.parentNode.replaceChild(r.extractContents(), c.link);
            }));
        }

        /* WIKILINK */
        if (c.wikilink) {
            items.push(S, grp('Wiki Bağlantısı'));
            const broken = c.wikilink.classList.contains('broken');
            items.push(it('📝', broken ? 'Nota Git (bulunamadı)' : 'Bağlı Nota Git',
                () => c.wikilink.click(), { disabled: broken }));
            items.push(it('📋', 'Metin Olarak Kopyala',
                () => navigator.clipboard.writeText(c.wikilink.textContent.trim())));
        }

        /* CODE BLOCK */
        if (c.pre) {
            items.push(S, grp('Kod Bloğu'));
            items.push(it('📋', 'Kodu Kopyala', () => {
                const code = c.pre.querySelector('code') || c.pre;
                navigator.clipboard.writeText(code.innerText || code.textContent);
            }));
        }

        /* SHAPE */
        if (c.shape) {
            items.push(S, grp('Şekil'));
            items.push(it('⬆', 'Öne Getir', () => {
                const all = [...document.querySelectorAll('.note-shape-overlay')];
                const max = Math.max(0, ...all.map(s => parseInt(s.style.zIndex) || 0));
                c.shape.style.zIndex = max + 1;
            }));
            items.push(it('⬇', 'Arkaya Gönder', () => {
                const all = [...document.querySelectorAll('.note-shape-overlay')];
                const min = Math.min(...all.map(s => parseInt(s.style.zIndex) || 0));
                c.shape.style.zIndex = Math.max(0, min - 1);
            }));
            items.push(S);
            items.push(it('🗑', 'Şekli Sil', () => c.shape.remove(), { danger:true }));
        }

        /* CALLOUT */
        if (c.callout) {
            items.push(S, grp('Vurgu Bloğu Türü'));
            const cur = CALLOUT_TYPES.find(t => c.callout.classList.contains('callout-' + t.key));
            const icons = { info:'ℹ', warning:'⚠', tip:'💡', success:'✓' };
            CALLOUT_TYPES.forEach(t => items.push(
                it(icons[t.key] || '•', t.label, () => setCalloutType(c.callout, t.key),
                    { active: cur && cur.key === t.key })
            ));
        }

        /* HEADING */
        if (c.heading) {
            items.push(S, grp('Başlık Düzeyi'));
            const lvl = parseInt(c.heading.tagName[1]);
            if (lvl > 1) items.push(it('↑', 'Yükselt → H' + (lvl - 1), () => changeHeading(c.heading, lvl - 1)));
            if (lvl < 3) items.push(it('↓', 'Alçalt → H' + (lvl + 1),  () => changeHeading(c.heading, lvl + 1)));
            items.push(it('¶', 'Normal Metne Çevir', () => changeHeading(c.heading, 0)));
        }

        /* LIST ITEM */
        if (c.li) {
            items.push(S, grp('Liste'));
            items.push(it('→', 'İçeri Al (Indent)',   () => document.execCommand('indent')));
            items.push(it('←', 'Dışarı Al (Outdent)', () => document.execCommand('outdent')));
        }

        /* IMAGE */
        if (c.img) {
            items.push(S, grp('Görsel'));
            items.push(it('📋', "URL'yi Kopyala", () => navigator.clipboard.writeText(c.img.src)));
            items.push(it('🗑', 'Görseli Sil', () => c.img.remove(), { danger:true }));
        }

        /* CCB — cascaded submenu: CCB Ekle → Grup → CCB */
        if (!c.table && !c.pre && !c.callout && typeof window._ccbGetAll === 'function') {
            const ccbs = window._ccbGetAll();
            if (ccbs.length > 0) {
                const groups = {};
                ccbs.forEach(b => { (groups[b.group||'Genel'] = groups[b.group||'Genel']||[]).push(b); });
                const gNames = Object.keys(groups);
                const mkCcbItem = ccb => ({ type:'item', icon:'⬛', label: ccb.name, action: () => { if (typeof window._insertCcb==='function') window._insertCcb(ccb.id); } });
                let subItems;
                if (gNames.length === 1) {
                    /* Tek grup → doğrudan CCB listesi */
                    subItems = groups[gNames[0]].map(mkCcbItem);
                } else {
                    /* Çok grup → her grup bir sub-sub */
                    subItems = gNames.map(gName => ({
                        type: 'sub', icon: '▸', label: gName,
                        sub: groups[gName].map(mkCcbItem)
                    }));
                }
                items.push(S, { type:'sub', icon:'⬛', label:'CCB Ekle', sub: subItems });
            }
        }

        return items;
    }

    /* ── Sub-panel yönetimi ── */
    const _activeSubs = [];

    function _closeAllSubs() {
        _activeSubs.forEach(s => { clearTimeout(s._timer); s.style.display = 'none'; s._activeSub = null; });
    }

    function _positionPanel(panel, anchorRect) {
        panel.style.cssText = 'display:block;left:0;top:0;';
        const pw = panel.offsetWidth  || 170;
        const ph = panel.offsetHeight || 100;
        const vw = window.innerWidth, vh = window.innerHeight;
        let left = anchorRect.right + 4;
        if (left + pw > vw - 6) left = anchorRect.left - pw - 4;
        if (left < 6) left = 6;
        let top = anchorRect.top;
        if (top + ph > vh - 6) top = vh - ph - 6;
        if (top < 6) top = 6;
        panel.style.left = left + 'px';
        panel.style.top  = top  + 'px';
    }

    /*
     * _buildSubPanel — parentPanel: L1 paneli L2'den de erişebilmek için referans
     * Her panelin _timer ve _activeSub özellikleri var.
     * Kurallar:
     *  - Herhangi bir item hover → o panelin _timer'ını temizle (panel açık kalsın)
     *  - Sub item hover → kardeş alt paneli kapat, kendi alt panelini aç
     *  - Sub item / alt panelden ayrılırken → timer başlat
     *  - Alt panele girerken → hem kendi timer'ını hem parent _timer'ını temizle
     */
    function _buildSubPanel(items, parentPanel) {
        const panel = document.createElement('div');
        panel.className = 'ctx-sub-panel';
        panel.style.display = 'none';
        panel._timer  = null;
        panel._activeSub = null;

        items.forEach(item => {
            if (item.type === 'sep') {
                panel.appendChild(Object.assign(document.createElement('div'), { className:'cm-sep' }));
                return;
            }
            const d = document.createElement('div');
            d.className = 'cm-item' + (item.type === 'sub' ? ' cm-has-sub' : '');
            d.innerHTML = `<span class="cm-icon">${item.icon||''}</span><span class="cm-label">${item.label}</span>`;

            if (item.type === 'sub' && item.sub) {
                const child = _buildSubPanel(item.sub, panel);
                document.body.appendChild(child);
                _activeSubs.push(child);

                d.addEventListener('mouseenter', () => {
                    clearTimeout(panel._timer); /* Bu panel açık kalsın */
                    if (parentPanel) clearTimeout(parentPanel._timer); /* Üst panel de açık kalsın */
                    /* Kardeş alt paneli kapat */
                    if (panel._activeSub && panel._activeSub !== child) {
                        clearTimeout(panel._activeSub._timer);
                        panel._activeSub.style.display = 'none';
                        panel._activeSub = null;
                    }
                    _positionPanel(child, d.getBoundingClientRect());
                    panel._activeSub = child;
                });
                d.addEventListener('mouseleave', e => {
                    if (e.relatedTarget && child.contains(e.relatedTarget)) return;
                    child._timer = setTimeout(() => {
                        child.style.display = 'none';
                        if (panel._activeSub === child) panel._activeSub = null;
                    }, 200);
                });
                child.addEventListener('mouseenter', () => {
                    clearTimeout(child._timer);
                    clearTimeout(panel._timer); /* L1 panel açık kalsın */
                    if (parentPanel) clearTimeout(parentPanel._timer); /* L0 panel açık kalsın */
                });
                child.addEventListener('mouseleave', e => {
                    if (e.relatedTarget && d.contains(e.relatedTarget)) return;
                    if (child._activeSub && e.relatedTarget && child._activeSub.contains(e.relatedTarget)) return;
                    child._timer = setTimeout(() => {
                        child.style.display = 'none';
                        if (panel._activeSub === child) panel._activeSub = null;
                    }, 200);
                });
            } else if (item.action) {
                d.addEventListener('mouseenter', () => {
                    clearTimeout(panel._timer); /* Bu panel açık kalsın */
                    if (parentPanel) clearTimeout(parentPanel._timer); /* Üst panel de açık kalsın */
                    /* Bu panelde açık alt panel varsa kapat */
                    if (panel._activeSub) {
                        clearTimeout(panel._activeSub._timer);
                        panel._activeSub.style.display = 'none';
                        panel._activeSub = null;
                    }
                });
                d.addEventListener('mousedown', e => {
                    e.preventDefault(); e.stopPropagation();
                    close(); setTimeout(() => item.action(), 0);
                });
            }
            panel.appendChild(d);
        });
        return panel;
    }

    /* ── Render ── */
    function render(items) {
        _closeAllSubs();
        _activeSubs.length = 0;
        menu.innerHTML = '';
        items.forEach(item => {
            if (item.type === 'sep') {
                menu.appendChild(Object.assign(document.createElement('div'), { className:'cm-sep' }));
                return;
            }
            if (item.type === 'grp') {
                const d = document.createElement('div');
                d.className = 'cm-grp'; d.textContent = item.label;
                menu.appendChild(d); return;
            }
            if (item.type === 'sub') {
                const d = document.createElement('div');
                d.className = 'cm-item cm-has-sub';
                d.innerHTML = `<span class="cm-icon">${item.icon||''}</span><span class="cm-label">${item.label}</span>`;
                const sub = _buildSubPanel(item.sub || [], null);
                sub._timer = null;
                document.body.appendChild(sub);
                _activeSubs.push(sub);
                d.addEventListener('mouseenter', () => {
                    clearTimeout(sub._timer);
                    /* Kardeş L0 sub-panelleri kapat */
                    _activeSubs.forEach(s => { if (s !== sub) { clearTimeout(s._timer); s.style.display='none'; } });
                    _positionPanel(sub, d.getBoundingClientRect());
                });
                d.addEventListener('mouseleave', e => {
                    if (e.relatedTarget && sub.contains(e.relatedTarget)) return;
                    sub._timer = setTimeout(() => { sub.style.display='none'; }, 200);
                });
                sub.addEventListener('mouseenter', () => clearTimeout(sub._timer));
                sub.addEventListener('mouseleave', e => {
                    if (e.relatedTarget && d.contains(e.relatedTarget)) return;
                    if (sub._activeSub && e.relatedTarget && sub._activeSub.contains(e.relatedTarget)) return;
                    sub._timer = setTimeout(() => { sub.style.display='none'; }, 200);
                });
                menu.appendChild(d);
                return;
            }
            const d = document.createElement('div');
            d.className = 'cm-item'
                + (item.disabled ? ' cm-disabled' : '')
                + (item.danger   ? ' cm-danger'   : '')
                + (item.active   ? ' cm-active'   : '');
            d.innerHTML = `<span class="cm-icon">${item.icon}</span>`
                + `<span class="cm-label">${item.label}</span>`
                + (item.shortcut ? `<span class="cm-shortcut">${item.shortcut}</span>` : '');
            if (!item.disabled && item.action) {
                d.addEventListener('mousedown', e => {
                    e.preventDefault(); e.stopPropagation();
                    close(); setTimeout(() => item.action(), 0);
                });
            }
            menu.appendChild(d);
        });
    }

    function openAt(x, y, items) {
        render(items);
        menu.style.cssText = 'display:block; left:0; top:0;';
        const mw = menu.offsetWidth, mh = menu.offsetHeight;
        menu.style.left = Math.min(x, window.innerWidth  - mw - 6) + 'px';
        menu.style.top  = Math.min(y, window.innerHeight - mh - 6) + 'px';
    }

    function close() {
        _closeAllSubs();
        _activeSubs.forEach(s => s.remove());
        _activeSubs.length = 0;
        menu.style.display = 'none';
    }

    /* Tarayıcı sağ-tık menüsünü uygulama genelinde kapat */
    document.addEventListener('contextmenu', e => e.preventDefault());

    /* ── Bind events ── */
    $content.addEventListener('contextmenu', e => {
        e.preventDefault();
        openAt(e.clientX, e.clientY, buildItems(detect(e.target, $content)));
    });

    const $fpContent = document.getElementById('fp-content');
    if ($fpContent) {
        $fpContent.addEventListener('contextmenu', e => {
            e.preventDefault();
            openAt(e.clientX, e.clientY, buildItems(detect(e.target, $fpContent)));
        });
        $fpContent.addEventListener('scroll', close, { passive:true });
    }

    document.addEventListener('mousedown', e => { if (!menu.contains(e.target)) close(); });
    document.addEventListener('keydown',   e => { if (e.key === 'Escape') close(); });
    window.addEventListener('scroll',       close, { passive:true });
    $content.addEventListener('scroll',     close, { passive:true });
})();

/* ══ PAYLAŞILAN BAĞLANTI: ?note=<id> ile açılınca float panelde önizleme ══ */
(function() {
    const sharedId = new URLSearchParams(location.search).get('note');
    if (!sharedId) return;
    history.replaceState(null, '', location.pathname);
    setTimeout(function() {
        if (typeof window._fpLoadNote !== 'function') return;
        window._fpLoadNote(decodeURIComponent(sharedId));
        setTimeout(function() {
            const fpBody = document.getElementById('fp-body');
            if (fpBody && !fpBody.classList.contains('fp-locked') && typeof window._fpSetLockedExternal === 'function') {
                window._fpSetLockedExternal(true);
            }
        }, 80);
    }, 0);
})();
