(function () {
    const FP             = document.getElementById('float-panel');
    const fpHead         = document.getElementById('fp-head');
    const fpTitle        = document.getElementById('fp-title');
    const fpContent      = document.getElementById('fp-content');
    const fpMinBtn       = document.getElementById('fp-minimize');
    const fpDockBtn      = document.getElementById('fp-dock');
    const fpDockRightBtn = document.getElementById('fp-dock-right');
    const floatBtn       = document.getElementById('float-btn');
    if (!FP || !fpContent) return;

    /* Float panel instance — her nota ait bağımsız undo/redo geçmişi */
    const _fpInst = typeof createInstance === 'function' ? createInstance(fpContent, '') : null;
    window._fpEditorInstance = _fpInst;

    let _fpNoteId     = null;
    let _isOpen       = false;
    let _isDocked     = false;
    let _dockW        = 400;
    let _floatGeom    = null;
    let _saveTimer    = null;
    let _fpOrigParent = null;
    let _fpOrigNext   = null;

    /* ── Geometry (yüzer mod) ── */
    function setGeom(l, t, w, h) {
        FP.style.left = l + 'px'; FP.style.top  = t + 'px';
        FP.style.width = w + 'px'; FP.style.height = h + 'px';
    }
    function defaultGeom() {
        const vw = window.innerWidth, vh = window.innerHeight;
        const pw = Math.min(720, Math.max(420, Math.round(vw * .45)));
        const ph = Math.min(680, Math.max(380, Math.round(vh * .72)));
        setGeom(Math.round((vw - pw) / 2), Math.round((vh - ph) / 4), pw, ph);
    }

    /* ── Not erişimi ── */
    function getNote(id) {
        if (typeof window._fpGetNote === 'function') return window._fpGetNote(id);
        /* Faz 5: localStorage['noted_v1'] artık her zaman güncel olmayabilir (IndexedDB
           kalıcılık arka ucu) — window._fpGetAllNotes bellekteki State.notes'u döndürür */
        if (typeof window._fpGetAllNotes === 'function') {
            const a = window._fpGetAllNotes();
            return a.find(n => String(n.id) === String(id)) || null;
        }
        return null;
    }
    let _fpResetZoom = null; /* zoom IIFE tarafından doldurulur */

    window._fpGetCurrentNoteId = () => _fpNoteId;

    function loadNote(id) {
        const n = getNote(id); if (!n) return false;
        /* Aynı notu hem ana editörde hem float editörde aç engeli */
        const mainId = (document.getElementById('edit-id') || {}).value;
        if (mainId && String(id) === String(mainId)) {
            if (typeof _showSnack === 'function') _showSnack('Bu not zaten ana editörde açık', 'warn', 2400);
            return false;
        }
        if (_fpNoteId && String(id) !== String(_fpNoteId) && !_isDocked && _isOpen) {
            _floatGeom = null; defaultGeom();
        }
        _fpNoteId = String(id);
        document.body.classList.remove('cf-ready');
        fpTitle.value = n.title || 'Not';
        fpContent.innerHTML = sanitize(n.content || '');
        if ((n.title||'').trim()||(n.content||'').trim()) document.body.classList.add('cf-ready');
        /* editNote() ile aynı restore zinciri — eskiden burada eksikti: not içeriği kaydedilirken
           .ng-toolbar/.ng-add-col her zaman çıkarılır (saveNote), yalnızca editör içinde
           GÖRÜNTÜLENİRKEN _restoreGrids() tarafından yeniden üretilir. Bu çağrılar olmadan
           float panelde tablo/panel/kolon blokları toolbar'sız kalıyor + eski notlarda
           .ng-v-wrap sarmalayıcısı eklenmediği için başlık hücresinin arka planı .ng-v-wrap
           kartının rengi yerine th'nin kendi rengini gösteriyordu (bkz. Comments.json). */
        if (typeof _upgradeGridWraps === 'function') _upgradeGridWraps(fpContent);
        if (typeof _restoreGrids === 'function') _restoreGrids(fpContent);
        if (typeof initShapeOverlays === 'function') initShapeOverlays(fpContent);
        if (typeof window._inflateCcbBlocks === 'function') window._inflateCcbBlocks(fpContent);
        if (_fpInst) { _fpInst._stack = [{ html: n.content || '', cursor: null }]; _fpInst._idx = 0; _fpInst.noteId = String(id); }
        if (_fpResetZoom) _fpResetZoom();
        /* Grup badge güncelle — metin + renk */
        const _fpBadgeText = document.getElementById('fp-badge-text');
        const _fpBadgeEl   = document.getElementById('fp-editor-badge');
        const _fpGroup     = n.group || 'Genel';
        if (_fpBadgeText) _fpBadgeText.textContent = _fpGroup;
        if (_fpBadgeEl && typeof getColor === 'function') {
            const c = getColor(_fpGroup);
            _fpBadgeEl.style.color = c.main;
            _fpBadgeEl.style.backgroundColor = c.bg;
        }
        /* Export butonlarını etkinleştir */
        const _fpExpH = document.getElementById('fp-export-html-btn');
        const _fpExpM = document.getElementById('fp-export-md-btn');
        if (_fpExpH) _fpExpH.removeAttribute('disabled');
        if (_fpExpM) _fpExpM.removeAttribute('disabled');
        setTimeout(() => { if (typeof _fpSyncFooter === 'function') _fpSyncFooter(); if (typeof window._fpSyncLock === 'function') window._fpSyncLock(_fpNoteId); }, 0);
        return true;
    }
    function loadLatest() {
        if (typeof window._fpGetAllNotes !== 'function') return false;
        const a = window._fpGetAllNotes();
        if (!a || !a.length) return false;
        return loadNote(a.slice().sort((x, y) => (y.updatedAt || 0) - (x.updatedAt || 0))[0].id);
    }
    function ensureNote() {
        if (_fpNoteId) return true;
        const editId = (document.getElementById('edit-id') || {}).value;
        return editId ? loadNote(editId) : loadLatest();
    }

    /* ── Otomatik kayıt (1.2 s gecikme) ── */
    fpContent.addEventListener('input', () => { document.body.classList.add('cf-ready');

        clearTimeout(_saveTimer);
        _saveTimer = setTimeout(() => {
            if (!_fpNoteId || typeof window._fpUpdateNote !== 'function') return;
            const n = getNote(_fpNoteId);
            const sb = document.getElementById('fp-save-btn');
            if (sb) sb.classList.add('saving');
            window._fpUpdateNote(_fpNoteId, n ? n.title : (fpTitle.value || 'Not'), fpContent.innerHTML, true);
            if (sb) setTimeout(() => {
                sb.classList.remove('saving');
                sb.classList.add('saved');
                setTimeout(() => sb.classList.remove('saved'), 600);
            }, 300);
        }, 1200);
    });

    /* ── Wikilink hover önizleme ── */
    fpContent.addEventListener('mouseover', e => {
        const wl = e.target.closest('a.wikilink');
        if (wl && wl.dataset.noteId && typeof scheduleWlPreview === 'function') { scheduleWlPreview(wl); return; }
        const a = e.target.closest('a[href]:not(.wikilink)');
        if (a && typeof scheduleExtLinkPreview === 'function') scheduleExtLinkPreview(a);
    });
    fpContent.addEventListener('mouseout', e => {
        const wl = e.target.closest('a.wikilink');
        if (wl && !wl.contains(e.relatedTarget) && typeof scheduleHideWlPreview === 'function') { scheduleHideWlPreview(); return; }
        const a = e.target.closest('a[href]:not(.wikilink)');
        if (a && !a.contains(e.relatedTarget)) clearTimeout(EditorState._extPanelTimer);
    });

    /* ── Wikilink tıklama → ana editörde aç ── */
    fpContent.addEventListener('mousedown', e => {
        const wl = e.target.closest('a.wikilink');
        if (!wl || !wl.dataset.noteId) return;
        e.preventDefault();
        if (typeof hideWlPreview === 'function') hideWlPreview();
        if (typeof handleEditNoteRequest === 'function') handleEditNoteRequest(wl.dataset.noteId);
    });

    /* ── [[ otomatik tamamlama — bridge (let değişkenleri main script bloğunda) ── */
    fpContent.addEventListener('input', function wlDetectFp(e) {
        if (typeof window._fpWlDetect === 'function') window._fpWlDetect(e);
    });
    fpContent.addEventListener('keydown', function(e) {
        if (typeof window._fpWlKeydown === 'function') window._fpWlKeydown(e);
    }, true);

    /* ── Undock yardımcısı ── */
    function _undock() {
        const mp = document.querySelector('.main-panel');
        const vs = document.getElementById('fp-vsplitter');
        if (vs) vs.remove();
        const edMobH = document.getElementById('editor-mob-handle');
        if (edMobH) edMobH.remove();
        const fpMobH = document.getElementById('fp-mob-handle');
        if (fpMobH) fpMobH.remove();
        const edCard = mp && mp.querySelector('.editor-card');
        if (edCard) edCard.style.removeProperty('--editor-mob-h');
        if (mp) mp.classList.remove('fp-split-mode');
        if (_fpOrigParent) {
            if (_fpOrigNext && _fpOrigNext.parentNode === _fpOrigParent)
                _fpOrigParent.insertBefore(FP, _fpOrigNext);
            else _fpOrigParent.appendChild(FP);
        }
        _fpOrigParent = _fpOrigNext = null;
        _isDocked = false;
        fpDockRightBtn.innerHTML = '<i class="fas fa-columns"></i>';
        fpDockRightBtn.title = 'Sağa Yerleştir';
    }

    /* ── Aç / Yüzer ── */
    function doFloat() {
        if (!_isOpen) {
            if (!_isDocked) defaultGeom();
            FP.classList.add('fp-open');
            FP.classList.remove('fp-minimized');
            if (fpMinBtn) { fpMinBtn.innerHTML = '<i class="fas fa-minus"></i>'; fpMinBtn.title = 'Küçült'; }
            _isOpen = true;
        }
        const dd = document.getElementById('editor-menu-dropdown');
        if (dd) dd.style.display = '';
    }

    /* ── Kapat ── */
    function doClose() {
        clearTimeout(_saveTimer);
        if (_isDocked) _undock();
        FP.classList.remove('fp-open', 'fp-minimized');
        _isOpen = false;
        /* _fpNoteId sıfırlanmazsa editNote() bu notu kalıcı olarak "ikinci editörde açık"
           sanıp reddeder. DOM.$content de fpContent'te kalmış olabilir (kullanıcı float
           paneldeyken oraya odaklanmışsa activateInstance onu oraya yönlendirmişti) —
           ana editöre geri dönülmezse sonraki bir kayıt (Kaydet/Ctrl+Enter/kaydet-onay
           diyaloğu) ana editördeki notun üzerine float panelin bayat içeriğini yazar. */
        _fpNoteId = null;
        fpTitle.value = '';
        fpContent.innerHTML = '';
        if (typeof activateInstance === 'function' && window._mainEditorInstance &&
            EditorState.activeInstance === _fpInst) {
            activateInstance(window._mainEditorInstance);
        }
        /* activateInstance yalnızca DOM.$content'i taşır — EditorState._activeEditTarget
           ayrı bir sistemdir (toolbar formatlama, bkz. js/02 _restoreToolbarSel) ve yalnızca
           gerçek focus event'leriyle güncellenir. fp-content kapanışta gizlense de bu değer
           takılı kalabilir; kalırsa ana editörün Kalın/İtalik/liste vb. butonları
           _restoreToolbarSel() üzerinden yanlışlıkla (artık boş de olsa) float panelin
           elementine odaklanmaya çalışır. */
        if (EditorState._activeEditTarget === fpContent) {
            EditorState._activeEditTarget = document.getElementById('content');
        }
        EditorState._savedToolbarSel = null;
    }
    window._fpClose = doClose;

    /* ── Sağa Yerleştir (toggle) ── */
    function doDockRight() {
        if (!_isDocked) {
            const mp = document.querySelector('.main-panel');
            if (!mp) return;
            _floatGeom = { l:parseInt(FP.style.left)||0, t:parseInt(FP.style.top)||0, w:FP.offsetWidth, h:FP.offsetHeight };
            _fpOrigParent = FP.parentNode;
            _fpOrigNext   = FP.nextSibling;

            /* ── Mobil yükseklik çekme kulağı ── */
            function _makeMobHandle(id, getH, setH) {
                const el = document.createElement('div');
                el.id = id; el.className = 'mob-handle';
                el.innerHTML = '<span class="mob-handle-bar"></span>';
                const bar = el.querySelector('.mob-handle-bar');
                function startDrag(e) {
                    e.preventDefault();
                    const startY = e.touches ? e.touches[0].clientY : e.clientY;
                    const startH = getH();
                    bar.style.background = 'var(--accent)';
                    document.body.style.userSelect = 'none';
                    function onMove(ev) {
                        if (ev.touches) ev.preventDefault();
                        setH((ev.touches ? ev.touches[0].clientY : ev.clientY) - startY, startH);
                    }
                    function onUp() {
                        bar.style.background = '';
                        document.body.style.userSelect = '';
                        document.removeEventListener('mousemove', onMove);
                        document.removeEventListener('mouseup', onUp);
                        document.removeEventListener('touchmove', onMove);
                        document.removeEventListener('touchend', onUp);
                    }
                    document.addEventListener('mousemove', onMove);
                    document.addEventListener('mouseup', onUp);
                    document.addEventListener('touchmove', onMove, { passive: false });
                    document.addEventListener('touchend', onUp);
                }
                el.addEventListener('mousedown', startDrag);
                el.addEventListener('touchstart', startDrag, { passive: false });
                return el;
            }

            const edCard = mp.querySelector('.editor-card');

            /* Mobil başlangıç yükseklikleri */
            const vh = window.innerHeight;
            const headerH = document.querySelector('.app-header')?.offsetHeight || 52;
            const initEdH = Math.max(200, vh - headerH - 16);
            const initFpH = Math.max(160, Math.floor(vh * 0.55));
            if (edCard) edCard.style.setProperty('--editor-mob-h', initEdH + 'px');
            FP.style.setProperty('--fp-dock-h', initFpH + 'px');

            /* Editör çekme kulağı: aşağı sürükle → editör büyür */
            const edHandle = _makeMobHandle('editor-mob-handle',
                () => parseInt(edCard && edCard.style.getPropertyValue('--editor-mob-h') || '') || initEdH,
                (dy, startH) => {
                    const h = Math.max(120, Math.min(Math.round(window.innerHeight * .65), startH + dy));
                    if (edCard) edCard.style.setProperty('--editor-mob-h', h + 'px');
                }
            );
            if (edCard) edCard.after(edHandle);

            /* FP çekme kulağı: aşağı sürükle → FP büyür */
            const fpHandle = _makeMobHandle('fp-mob-handle',
                () => parseInt(FP.style.getPropertyValue('--fp-dock-h') || '') || initFpH,
                (dy, startH) => {
                    const h = Math.max(160, Math.min(Math.round(window.innerHeight * .72), startH + dy));
                    FP.style.setProperty('--fp-dock-h', h + 'px');
                }
            );

            /* ── Masaüstü dikey splitter ── */
            const vs = document.createElement('div');
            vs.id = 'fp-vsplitter';
            function startVsDrag(e) {
                e.preventDefault();
                const startX = e.clientX, startW = _dockW;
                vs.classList.add('dragging');
                document.body.style.cursor = 'col-resize';
                document.body.style.userSelect = 'none';
                function onMove(e) {
                    _dockW = Math.max(280, Math.min(700, startW + (startX - e.clientX)));
                    FP.style.setProperty('--fp-dock-w', _dockW + 'px');
                }
                startPointerDrag(onMove, function onUp() {
                    vs.classList.remove('dragging');
                    document.body.style.cursor = '';
                    document.body.style.userSelect = '';
                });
            }
            vs.addEventListener('pointerdown', startVsDrag);
            vs.addEventListener('dblclick', e => {
                e.preventDefault();
                const mainId = (document.getElementById('edit-id') || {}).value;
                const fpId   = _fpNoteId;
                if (!mainId || !fpId || String(mainId) === String(fpId)) return;
                // Float editor'ı kaydet
                if (typeof window._fpUpdateNote === 'function') {
                    const n = getNote(fpId);
                    window._fpUpdateNote(fpId, n ? n.title : (fpTitle.value || ''), fpContent.innerHTML, true);
                }
                // Ana editörü dialog göstermeden kaydet
                const _mainN = (typeof State.notes !== 'undefined') ? State.notes.find(x => String(x.id) === String(mainId)) : null;
                if (_mainN) {
                    const $c = document.getElementById('content');
                    const $t = document.getElementById('title');
                    if ($c) _mainN.content = $c.innerHTML;
                    if ($t) _mainN.title = $t.value;
                    _mainN.modified = Date.now();
                    if (typeof saveNotes === 'function') saveNotes();
                }
                vs.classList.add('dragging');
                setTimeout(() => vs.classList.remove('dragging'), 350);
                _fpNoteId = null;
                if (typeof editNote === 'function') editNote(fpId);
                loadNote(mainId);
            });

            /* DOM sırası: editör → edHandle → vsplitter → FP → fpHandle */
            mp.appendChild(vs);
            mp.appendChild(FP);
            mp.appendChild(fpHandle);
            FP.style.setProperty('--fp-dock-w', _dockW + 'px');

            mp.classList.add('fp-split-mode');

            _isDocked = true;
            FP.classList.add('fp-open');
            FP.classList.remove('fp-minimized');
            if (fpMinBtn) { fpMinBtn.innerHTML = '<i class="fas fa-minus"></i>'; fpMinBtn.title = 'Küçült'; }
            _isOpen = true;
            fpDockRightBtn.innerHTML = '<i class="fas fa-window-restore"></i>';
            fpDockRightBtn.title = 'Yüzer Moda Geç';

            ensureNote();
        } else {
            /* Undock → yüzer moda geri dön */
            _undock();
            if (_isOpen) {
                if (_floatGeom) setGeom(_floatGeom.l, _floatGeom.t, _floatGeom.w, _floatGeom.h);
                else defaultGeom();
            }
        }
    }

    /* ── Küçült ── */
    function doToggleMin() {
        FP.classList.toggle('fp-minimized');
        const isMin = FP.classList.contains('fp-minimized');
        if (fpMinBtn) { fpMinBtn.innerHTML = isMin ? '<i class="fas fa-window-restore"></i>' : '<i class="fas fa-minus"></i>'; fpMinBtn.title = isMin ? 'Geri Aç' : 'Küçült'; }
    }

    /* ── Butonlar ── */
    if (floatBtn)       floatBtn.addEventListener('click', doFloat);
    if (fpDockBtn)      fpDockBtn.addEventListener('click', doClose);
    if (fpMinBtn)       fpMinBtn.addEventListener('click', doToggleMin);
    if (fpDockRightBtn) fpDockRightBtn.addEventListener('click', doDockRight);

    /* ── Undo / Redo butonları ── */
    const fpUndoBtn = document.getElementById('fp-undo-btn');
    const fpRedoBtn = document.getElementById('fp-redo-btn');
    if (fpUndoBtn) fpUndoBtn.addEventListener('click', () => {
        if (typeof activateInstance === 'function' && _fpInst) activateInstance(_fpInst);
        if (typeof window.editorUndo === 'function') window.editorUndo();
    });
    if (fpRedoBtn) fpRedoBtn.addEventListener('click', () => {
        if (typeof activateInstance === 'function' && _fpInst) activateInstance(_fpInst);
        if (typeof window.editorRedo === 'function') window.editorRedo();
    });

    /* ── Sil butonu ── */
/* ── Grup rozeti ── */
    const fpEditorBadge = document.getElementById('fp-editor-badge');
    if (fpEditorBadge) fpEditorBadge.addEventListener('click', e => {
        if (!_fpNoteId) return;
        e.stopPropagation();
        if (typeof window._fpOpenPicker === 'function') window._fpOpenPicker(e.currentTarget, _fpNoteId);
    });

    /* ── Editör menüsü ── */
    (function() {
        const fpMenuBtn  = document.getElementById('fp-menu-btn');
        const fpMenuDrop = document.getElementById('fp-menu-dropdown');
        if (!fpMenuBtn || !fpMenuDrop) return;

        function openFpMenu()  { fpMenuDrop.classList.add('open'); fpMenuBtn.classList.add('open'); }
        function closeFpMenu() { fpMenuDrop.classList.remove('open'); fpMenuBtn.classList.remove('open'); const fpTplDd = document.getElementById('fp-template-dropdown'); if (fpTplDd) fpTplDd.classList.remove('show'); }

        fpMenuBtn.addEventListener('click', e => { e.stopPropagation(); fpMenuDrop.classList.contains('open') ? closeFpMenu() : openFpMenu(); });
        document.addEventListener('click', e => { if (!e.target.closest('#fp-menu-wrap')) closeFpMenu(); });

        /* PDF yazdır */
        const fpPdfBtn = document.getElementById('fp-pdf-btn');
        if (fpPdfBtn) fpPdfBtn.addEventListener('click', () => {
            closeFpMenu();
            if (!_fpNoteId) { alert('Yazdırmak için önce bir not açın.'); return; }
            const n = getNote(_fpNoteId); if (!n) return;
            const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${(n.title||'').replace(/</g,'&lt;')}</title><style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:Georgia,serif;max-width:720px;margin:40px auto;padding:0 40px;color:#1a1a1a;line-height:1.7}h1{font-size:1.8rem;font-weight:700;margin-bottom:6px}h2{font-size:1.25rem;margin:22px 0 6px;font-weight:700}h3{font-size:1.05rem;margin:16px 0 5px;font-weight:700}p{margin:6px 0}ul,ol{padding-left:22px;margin:8px 0}li{margin:3px 0}blockquote{border-left:3px solid #3B82F6;padding:6px 14px;margin:10px 0;color:#555;font-style:italic}code{background:#EFF6FF;color:#2563EB;border:1px solid #BFDBFE;padding:1px 5px;border-radius:3px;font-family:monospace;font-size:.88em}pre{background:#1E293B;color:#E2E8F0;padding:14px;border-radius:6px;overflow-x:auto;margin:8px 0}@media print{body{margin:0;padding:20px}}</style></head><body><h1>${(n.title||'').replace(/</g,'&lt;')}</h1>${typeof sanitize==='function'?sanitize(n.content||''):n.content||''}</body></html>`;
            const iframe = document.createElement('iframe');
            iframe.style.cssText = 'position:fixed;top:-9999px;left:-9999px;width:0;height:0;border:none';
            document.body.appendChild(iframe);
            iframe.contentDocument.open(); iframe.contentDocument.write(html); iframe.contentDocument.close();
            iframe.contentWindow.focus();
            setTimeout(() => { iframe.contentWindow.print(); setTimeout(() => document.body.removeChild(iframe), 1000); }, 300);
        });

        /* HTML dışa aktar */
        const fpExpHtml = document.getElementById('fp-export-html-btn');
        if (fpExpHtml) fpExpHtml.addEventListener('click', () => {
            closeFpMenu();
            if (_fpNoteId && typeof exportNoteAsHtml === 'function') exportNoteAsHtml(_fpNoteId);
        });

        /* Markdown dışa aktar */
        const fpExpMd = document.getElementById('fp-export-md-btn');
        if (fpExpMd) fpExpMd.addEventListener('click', () => {
            closeFpMenu();
            if (!_fpNoteId) return;
            const n = getNote(_fpNoteId); if (!n) return;
            const md = typeof htmlToMd === 'function' ? htmlToMd(n.content || '') : (n.contentMd || '');
            const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a'); a.href = url; a.download = (n.title || 'not').replace(/[^\w\-]/g, '_') + '.md';
            document.body.appendChild(a); a.click(); document.body.removeChild(a);
            setTimeout(() => URL.revokeObjectURL(url), 1000);
        });

        /* Şablon seç — dinamik yapı (özel şablonlar + Bu Notu Şablon Kaydet) */
        const fpTplBtn = document.getElementById('fp-template-btn');
        const fpTplDrop = document.getElementById('fp-template-dropdown');
        if (fpTplBtn && fpTplDrop) {
            function buildFpTplDropdown() {
                fpTplDrop.innerHTML = '';
                const hdr = document.createElement('div');
                hdr.className = 'tpl-header'; hdr.textContent = 'Hazır Şablonlar';
                fpTplDrop.appendChild(hdr);
                [{ key:'daily', label:'📅 Günlük Not' }, { key:'meeting', label:'🤝 Toplantı Notları' }, { key:'idea', label:'💡 Fikir' }].forEach(b => {
                    const d = document.createElement('div');
                    d.className = 'tpl-item'; d.dataset.fpTpl = b.key; d.textContent = b.label;
                    fpTplDrop.appendChild(d);
                });
                const saveBtn = document.createElement('div');
                saveBtn.className = 'tpl-item tpl-save-btn';
                saveBtn.innerHTML = '<i class="fas fa-plus-circle"></i><span>Bu Notu Şablon Kaydet</span>';
                saveBtn.addEventListener('click', e => {
                    e.stopPropagation();
                    const title = fpTitle.value.trim();
                    const content = fpContent.innerHTML;
                    if (!title && !(typeof stripHtml === 'function' ? stripHtml(content) : content).trim()) {
                        alert('Şablon kaydetmek için önce başlık veya içerik ekleyin.'); return;
                    }
                    const name = prompt('Şablon adı:', title || 'Özel Şablon');
                    if (!name || !name.trim()) return;
                    if (typeof State.customTemplates !== 'undefined' && typeof saveCustomTemplates === 'function') {
                        State.customTemplates.push({ id: Date.now().toString(36) + Math.random().toString(36).slice(2,6), name: name.trim(), title, content });
                        saveCustomTemplates();
                        if (typeof buildTemplateDropdownContent === 'function') buildTemplateDropdownContent();
                    }
                    fpTplDrop.classList.remove('show'); closeFpMenu();
                });
                fpTplDrop.appendChild(saveBtn);
                const cTpls = typeof State.customTemplates !== 'undefined' ? State.customTemplates : [];
                if (cTpls.length > 0) {
                    const sep2 = document.createElement('div');
                    sep2.className = 'tpl-header'; sep2.textContent = 'Özel Şablonlar'; sep2.style.marginTop = '4px';
                    fpTplDrop.appendChild(sep2);
                    cTpls.forEach(tpl => {
                        const row = document.createElement('div');
                        row.className = 'tpl-item tpl-item-custom';
                        const nameSpan = document.createElement('span');
                        nameSpan.textContent = '📄 ' + tpl.name; nameSpan.title = tpl.name;
                        nameSpan.addEventListener('click', e2 => {
                            e2.stopPropagation();
                            fpContent.innerHTML = typeof sanitize === 'function' ? sanitize(tpl.content || '') : (tpl.content || '');
                            fpTitle.value = tpl.title || fpTitle.value;
                            fpContent.focus();
                            fpContent.dispatchEvent(new Event('input', { bubbles: true }));
                            fpTplDrop.classList.remove('show'); closeFpMenu();
                        });
                        row.appendChild(nameSpan);
                        fpTplDrop.appendChild(row);
                    });
                }
            }
            buildFpTplDropdown();
            fpTplBtn.addEventListener('click', e => { e.stopPropagation(); buildFpTplDropdown(); fpTplDrop.classList.toggle('show'); });
            fpTplDrop.addEventListener('click', e => {
                const item = e.target.closest('.tpl-item[data-fp-tpl]');
                if (!item) return;
                const key = item.dataset.fpTpl;
                if (typeof Const !== 'undefined' && Const.TEMPLATES_V2 && Const.TEMPLATES_V2[key]) {
                    const tpl = Const.TEMPLATES_V2[key];
                    fpContent.innerHTML = typeof sanitize === 'function' ? sanitize(tpl.content || '') : (tpl.content || '');
                    fpTitle.value = tpl.title || fpTitle.value;
                    fpContent.focus();
                    fpContent.dispatchEvent(new Event('input', { bubbles: true }));
                }
                fpTplDrop.classList.remove('show');
                closeFpMenu();
            });
            document.addEventListener('click', e => { if (!e.target.closest('#fp-template-wrap')) fpTplDrop.classList.remove('show'); });
        }

        /* ── Daktilo Modu (float panel) ── */
        const fpTwBtn = document.getElementById('fp-tw-btn');
        let _fpTwActive = false;
        if (fpTwBtn) {
            function _fpUpdateTwBlock() {
                if (!_fpTwActive) return;
                const sel = window.getSelection();
                if (!sel || !sel.rangeCount) return;
                let node = sel.anchorNode;
                if (node && node.nodeType === 3) node = node.parentElement;
                let block = node;
                while (block && block.parentElement !== fpContent) block = block.parentElement;
                Array.prototype.forEach.call(fpContent.children, ch => ch.classList.remove('tw-active'));
                if (block && fpContent.contains(block)) block.classList.add('tw-active');
            }
            function _fpSetTw(on) {
                _fpTwActive = on;
                FP.classList.toggle('fp-tw-mode', on);
                fpTwBtn.classList.toggle('active', on);
                fpTwBtn.title = on ? 'Daktilo Modundan Çık' : 'Daktilo Modu';
                const sp = fpTwBtn.querySelector('span');
                if (sp) sp.textContent = on ? 'Daktilo Modundan Çık' : 'Daktilo Modu';
                if (on) _fpUpdateTwBlock();
                else Array.prototype.forEach.call(fpContent.children, ch => ch.classList.remove('tw-active'));
            }
            fpTwBtn.addEventListener('click', () => { _fpSetTw(!_fpTwActive); closeFpMenu(); });
            fpContent.addEventListener('keyup', _fpUpdateTwBlock);
            fpContent.addEventListener('click', _fpUpdateTwBlock);
            document.addEventListener('selectionchange', () => {
                if (_fpTwActive && (document.activeElement === fpContent || fpContent.contains(document.activeElement))) _fpUpdateTwBlock();
            });
        }

        /* ── Tam Ekran / Küçült (float panel) ── */
        const fpFocusBtn = document.getElementById('fp-focus-btn');
        if (fpFocusBtn) {
            let _fpMaximized = false;
            function _fpToggleMaximize() {
                if (_fpMaximized) {
                    if (FP.dataset.prevGeom) {
                        const g = JSON.parse(FP.dataset.prevGeom);
                        FP.style.left = g.l + 'px'; FP.style.top = g.t + 'px';
                        FP.style.width = g.w + 'px'; FP.style.height = g.h + 'px';
                        delete FP.dataset.prevGeom;
                    }
                    _fpMaximized = false;
                    fpFocusBtn.innerHTML = '<i class="fas fa-expand-alt"></i><span>Tam Ekran</span>';
                    fpFocusBtn.title = 'Tam Ekran';
                } else {
                    if (!FP.dataset.prevGeom) FP.dataset.prevGeom = JSON.stringify({ l: parseInt(FP.style.left)||0, t: parseInt(FP.style.top)||0, w: FP.offsetWidth, h: FP.offsetHeight });
                    FP.style.left = '8px'; FP.style.top = '8px';
                    FP.style.width = (window.innerWidth - 16) + 'px'; FP.style.height = (window.innerHeight - 16) + 'px';
                    _fpMaximized = true;
                    fpFocusBtn.innerHTML = '<i class="fas fa-compress-alt"></i><span>Küçült</span>';
                    fpFocusBtn.title = 'Küçült';
                }
                closeFpMenu();
            }
            fpFocusBtn.addEventListener('click', _fpToggleMaximize);
        }

        /* ── Paneli Kapat (menüden) ── */
        const fpCloseMenuBtn = document.getElementById('fp-close-menu-btn');
        if (fpCloseMenuBtn) fpCloseMenuBtn.addEventListener('click', () => { closeFpMenu(); doClose(); });
    })();

    /* ── FP Başlık düzenleme ── */
    if (fpTitle) {
        let _titleTimer;
        fpTitle.addEventListener('input', () => {
            document.body.classList.add('cf-ready');
            if (!_fpNoteId || typeof window._fpUpdateNote !== 'function') return;
            clearTimeout(_titleTimer);
            _titleTimer = setTimeout(() => {
                window._fpUpdateNote(_fpNoteId, fpTitle.value.trim() || 'Not', fpContent.innerHTML, false);
            }, 600);
        });
        fpTitle.addEventListener('blur', () => {
            clearTimeout(_titleTimer);
            if (!_fpNoteId || typeof window._fpUpdateNote !== 'function') return;
            if (!fpTitle.value.trim()) fpTitle.value = 'Not';
            window._fpUpdateNote(_fpNoteId, fpTitle.value.trim(), fpContent.innerHTML, false);
        });
        fpTitle.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); fpTitle.blur(); } });
    }

    /* ── Elle kaydet (fp-footer) ── */
    const fpSaveBtn = document.getElementById('fp-save-btn');
    if (fpSaveBtn) {
        fpSaveBtn.addEventListener('click', () => {
            if (!_fpNoteId || typeof window._fpUpdateNote !== 'function') return;
            clearTimeout(_saveTimer);
            const n = getNote(_fpNoteId);
            fpSaveBtn.classList.add('saving');
            window._fpUpdateNote(_fpNoteId, n ? n.title : (fpTitle.value || 'Not'), fpContent.innerHTML, false);
            setTimeout(() => {
                fpSaveBtn.classList.remove('saving');
                fpSaveBtn.classList.add('saved');
                setTimeout(() => fpSaveBtn.classList.remove('saved'), 600);
            }, 300);
        });
    }

    /* ── Sabitle (fp-footer) ── */
    const fpPinBtn = document.getElementById('fp-pin-btn');
    if (fpPinBtn) {
        fpPinBtn.addEventListener('click', () => {
            if (!_fpNoteId) return;
            if (typeof togglePin === 'function') {
                togglePin(_fpNoteId);
            } else {
                const n = getNote(_fpNoteId);
                if (!n) return;
                n.pinned = !n.pinned; n.updatedAt = Date.now();
                if (typeof saveNotes === 'function') saveNotes();
            }
            const n2 = getNote(_fpNoteId);
            const pinned = n2 && n2.pinned;
            fpPinBtn.classList.toggle('pinned', !!pinned);
            fpPinBtn.title = pinned ? 'Sabitlemeyi Kaldır' : 'Sabitle';
        });
    }

    /* ── Renk Etiketi (fp-footer) ── */
    const fpColorBtn = document.getElementById('fp-color-btn');
    if (fpColorBtn) {
        fpColorBtn.addEventListener('click', e => {
            e.stopPropagation();
            if (!_fpNoteId) return;
            window._fpColorLabelContext = _fpNoteId;
            const popup = document.getElementById('color-label-popup');
            if (!popup) return;
            const rect = fpColorBtn.getBoundingClientRect();
            let top = rect.bottom + 4, left = rect.left;
            if (left + 210 > window.innerWidth) left = window.innerWidth - 215;
            if (top + 230 > window.innerHeight) top = rect.top - 234;
            popup.style.top = top + 'px'; popup.style.left = left + 'px';
            popup.classList.toggle('open');
        });
    }

    /* loadNote sonrası footer butonlarını güncelle */
    function _fpSyncFooter() {
        const n = _fpNoteId ? getNote(_fpNoteId) : null;
        if (fpPinBtn) {
            const pinned = n && n.pinned;
            fpPinBtn.classList.toggle('pinned', !!pinned);
            fpPinBtn.title = pinned ? 'Sabitlemeyi Kaldır' : 'Sabitle';
        }
        if (fpColorBtn) {
            const cl = n && n.colorLabel
                ? [{ key:'red',hex:'#ef4444' },{ key:'orange',hex:'#f97316' },{ key:'yellow',hex:'#eab308' },
                   { key:'green',hex:'#22c55e' },{ key:'blue',hex:'#3b82f6' },{ key:'purple',hex:'#a855f7' }]
                    .find(c => c.key === n.colorLabel)
                : null;
            fpColorBtn.style.color = cl ? cl.hex : '';
            fpColorBtn.style.borderColor = cl ? cl.hex : '';
        }
        const _fpRB = document.getElementById('fp-reminder-btn');
        if (_fpRB) {
            const _rems = n ? (n.reminders || (n.reminder ? [n.reminder] : [])) : [];
            const active = _rems.filter(r => r && r.at && !r.fired);
            const overdue = active.some(r => r.at <= Date.now());
            _fpRB.classList.toggle('has-reminder', active.length > 0 && !overdue);
            _fpRB.classList.toggle('overdue', overdue);
            _fpRB.title = active.length ? 'Hatırlatıcı (' + active.length + ')' : 'Hatırlatıcı';
        }
    }
    window._fpSyncFooter = _fpSyncFooter;

    /* Çift tık → büyüt / geri al (sadece yüzer modda) */
    fpHead.addEventListener('dblclick', e => {
        if (_isDocked || e.target.closest('.fp-btn')) return;
        if (FP.dataset.prevGeom) {
            const g = JSON.parse(FP.dataset.prevGeom);
            setGeom(g.l, g.t, g.w, g.h); delete FP.dataset.prevGeom;
        } else {
            FP.dataset.prevGeom = JSON.stringify({ l: parseInt(FP.style.left), t: parseInt(FP.style.top), w: FP.offsetWidth, h: FP.offsetHeight });
            setGeom(8, 8, window.innerWidth - 16, window.innerHeight - 16);
        }
    });

    /* Esc → float panel'i KAPATMAZ (kullanıcı isteği) */

    /* ── Sürükle (yüzer mod) ── */
    let _drag = null;
    fpHead.addEventListener('mousedown', e => {
        if (_isDocked || e.target.closest('.fp-btn') || e.target.closest('.fp-rs')) return;
        e.preventDefault();
        _drag = { sx: e.clientX, sy: e.clientY, ol: parseInt(FP.style.left) || 0, ot: parseInt(FP.style.top) || 0 };
        document.body.style.userSelect = 'none';
        document.body.style.cursor = 'move';
    });

    /* ── Yeniden boyutlandır (yüzer mod) ── */
    let _rs = null;
    FP.querySelectorAll('.fp-rs').forEach(h => {
        h.addEventListener('mousedown', e => {
            if (_isDocked) return;
            e.preventDefault(); e.stopPropagation();
            _rs = { dir: h.dataset.dir, sx: e.clientX, sy: e.clientY, ol: parseInt(FP.style.left) || 0, ot: parseInt(FP.style.top) || 0, ow: FP.offsetWidth, oh: FP.offsetHeight };
            document.body.style.userSelect = 'none';
        });
    });

    document.addEventListener('mousemove', e => {
        if (_drag) {
            const dx = e.clientX - _drag.sx, dy = e.clientY - _drag.sy;
            FP.style.left = Math.max(0, Math.min(window.innerWidth - FP.offsetWidth, _drag.ol + dx)) + 'px';
            FP.style.top  = Math.max(0, Math.min(window.innerHeight - 38, _drag.ot + dy)) + 'px';
        }
        if (_rs) {
            const dx = e.clientX - _rs.sx, dy = e.clientY - _rs.sy;
            const MIN_W = 320, MIN_H = 180;
            let { ol: l, ot: t, ow: w, oh: h } = _rs;
            const dir = _rs.dir;
            if (dir.includes('e')) w = Math.max(MIN_W, _rs.ow + dx);
            if (dir.includes('s')) h = Math.max(MIN_H, _rs.oh + dy);
            if (dir.includes('w')) { w = Math.max(MIN_W, _rs.ow - dx); l = _rs.ol + _rs.ow - w; }
            if (dir.includes('n')) { h = Math.max(MIN_H, _rs.oh - dy); t = _rs.ot + _rs.oh - h; }
            setGeom(l, t, w, h);
        }
    });

    document.addEventListener('mouseup', () => {
        if (_drag || _rs) {
            document.body.style.userSelect = ''; document.body.style.cursor = '';
            if (!_isDocked) _floatGeom = { l:parseInt(FP.style.left)||0, t:parseInt(FP.style.top)||0, w:FP.offsetWidth, h:FP.offsetHeight };
        }
        _drag = null; _rs = null;
    });

    /* ── ResizeObserver → responsive kırılma noktaları ── */
    if (typeof ResizeObserver !== 'undefined') {
        new ResizeObserver(entries => {
            const w = entries[0].contentRect.width;
            FP.classList.toggle('fp-sm', w < 580);
            FP.classList.toggle('fp-xs', w < 380);
        }).observe(FP);
    }

    window._openFloatPanel = doFloat;

    /* Dışarıdan belirli bir notu yüzer panelde aç */
    window._fpLoadNote = function(id) {
        /* Önce yükle — guard başarısız olursa panel açılmaz */
        const ok = loadNote(id);
        if (!ok) return;
        if (!_isOpen) {
            if (!_isDocked) defaultGeom();
            FP.classList.add('fp-open');
            FP.classList.remove('fp-minimized');
            if (fpMinBtn) { fpMinBtn.innerHTML = '<i class="fas fa-minus"></i>'; fpMinBtn.title = 'Küçült'; }
            _isOpen = true;
        }
    };
    /* Ana editörden aktarılan notlar: _floatGeom sıfırla → undock'ta defaultGeom kullanılır */
    window._fpLoadNoteFromMain = function(id) {
        _floatGeom = null;
        window._fpLoadNote(id);
    };

    /* ── İçindekiler (fp-footer) ── */
    const fpTocBtn = document.getElementById('fp-toc-btn');
    let _fpTocPopup = null, _fpTocOpen = false;
    function buildFpToc() {
        if (!_fpTocPopup) {
            _fpTocPopup = document.createElement('div');
            _fpTocPopup.style.cssText = 'display:none;position:fixed;z-index:9230;background:var(--surface);border:1px solid var(--border);border-radius:10px;padding:6px 0;box-shadow:0 8px 24px rgba(0,0,0,.18);min-width:200px;max-width:280px;max-height:280px;overflow-y:auto;';
            document.body.appendChild(_fpTocPopup);
        }
        _fpTocPopup.innerHTML = '';
        const heads = Array.from(fpContent.querySelectorAll('h2,h3'));
        if (!heads.length) return false;
        heads.forEach(h => {
            const item = document.createElement('div');
            const isH3 = h.tagName === 'H3';
            item.style.cssText = 'padding:7px 14px;cursor:pointer;font-size:.82rem;transition:background .1s;color:var(--text);' + (isH3 ? 'padding-left:26px;font-size:.78rem;color:var(--text-muted);' : '');
            item.textContent = h.innerText || h.textContent || '';
            item.addEventListener('mouseenter', () => item.style.background = 'var(--surface-2)');
            item.addEventListener('mouseleave', () => item.style.background = '');
            item.addEventListener('click', () => {
                h.scrollIntoView({ behavior:'smooth', block:'center' });
                _fpTocPopup.style.display = 'none'; _fpTocOpen = false;
                if (fpTocBtn) fpTocBtn.classList.remove('active');
            });
            _fpTocPopup.appendChild(item);
        });
        return true;
    }
    if (fpTocBtn) {
        fpTocBtn.addEventListener('click', e => {
            e.stopPropagation();
            if (!_fpNoteId) return;
            _fpTocOpen = !_fpTocOpen;
            if (_fpTocOpen && buildFpToc()) {
                _fpTocPopup.style.display = 'block';
                const r = fpTocBtn.getBoundingClientRect();
                const popH = _fpTocPopup.offsetHeight || 200;
                let top = r.top - popH - 6, left = Math.max(8, r.left);
                if (top < 8) top = r.bottom + 6;
                if (left + 280 > window.innerWidth - 8) left = window.innerWidth - 288;
                _fpTocPopup.style.top = top + 'px'; _fpTocPopup.style.left = left + 'px';
            } else {
                _fpTocOpen = false;
                if (_fpTocPopup) _fpTocPopup.style.display = 'none';
            }
            fpTocBtn.classList.toggle('active', _fpTocOpen);
        });
        document.addEventListener('click', e => {
            if (_fpTocOpen && _fpTocPopup && !_fpTocPopup.contains(e.target) && e.target !== fpTocBtn && !fpTocBtn.contains(e.target)) {
                _fpTocPopup.style.display = 'none'; _fpTocOpen = false; fpTocBtn.classList.remove('active');
            }
        });
    }

    /* ── Hatırlatıcı (fp-footer) ── */
    const fpReminderBtn = document.getElementById('fp-reminder-btn');
    if (fpReminderBtn) {
        fpReminderBtn.addEventListener('click', e => {
            e.stopPropagation();
            if (!_fpNoteId) return;
            if (typeof window._fpOpenReminderForNote === 'function')
                window._fpOpenReminderForNote(_fpNoteId, fpReminderBtn);
        });
    }

    /* ── İçerik Zoom (Ctrl+Scroll) ── */
    (function() {
        const STEP = 0.1, MIN = 0.6, MAX = 2.0;
        let _fpz = 1;
        let _timer, _ind;

        function showInd(z) {
            if (!_ind) {
                _ind = document.createElement('div');
                _ind.style.cssText = 'position:fixed;z-index:9500;background:var(--surface-2);border:1px solid var(--border);border-radius:6px;padding:3px 10px;font-size:.75rem;font-weight:600;color:var(--text-muted);pointer-events:none;user-select:none;transition:opacity .3s;opacity:0;transform:translateX(-50%);';
                document.body.appendChild(_ind);
            }
            const ref = fpContent.parentElement || fpContent;
            const r = ref.getBoundingClientRect();
            _ind.style.left = Math.round(r.left + r.width / 2) + 'px';
            _ind.style.top  = Math.round(r.bottom - 44) + 'px';
            _ind.textContent = Math.round(z * 100) + '%';
            _ind.style.opacity = '1';
            clearTimeout(_timer);
            _timer = setTimeout(() => { _ind.style.opacity = '0'; }, 1400);
        }

        fpContent.addEventListener('wheel', e => {
            if (!e.ctrlKey) return;
            e.preventDefault();
            _fpz = Math.max(MIN, Math.min(MAX, Math.round((_fpz + (e.deltaY < 0 ? STEP : -STEP)) * 10) / 10));
            fpContent.style.zoom = _fpz;
            showInd(_fpz);
        }, { passive: false });

        _fpResetZoom = function() { _fpz = 1; fpContent.style.zoom = ''; };
    })();

    /* ── fp-footer butonları ── */
    (function() {
        const fpMicBtn    = document.getElementById('fp-mic-btn');
        const fpLockBtn   = document.getElementById('fp-lock-btn');
        const fpCancelBtn = document.getElementById('fp-cancel-btn');

        /* ── Sesle Yaz: fp-content'e dikte ── */
        if (fpMicBtn) {
            const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
            if (SR) {
                fpMicBtn.classList.add('available');
                const rec = new SR();
                rec.lang = 'tr-TR'; rec.continuous = true; rec.interimResults = true;
                let _fpListening = false;
                let _fpPaused = false;
                const interimEl = document.getElementById('fp-voice-interim');
                const fpVri = document.getElementById('fp-voice-record-indicator');
                const fpVriPauseBtn = document.getElementById('fp-vri-pause-btn');
                const fpVriResumeBtn = document.getElementById('fp-vri-resume-btn');
                const fpVriStopBtn = document.getElementById('fp-vri-stop-btn');
                function _fpSetPaused(on) {
                    _fpPaused = on;
                    if (fpVri) fpVri.classList.toggle('paused', on);
                }
                function _fpSetMicListening(on) {
                    _fpListening = on;
                    fpMicBtn.classList.toggle('listening', on);
                    fpMicBtn.title = on ? 'Dinleniyor — durdurmak için tıkla' : 'Sesle Yaz';
                    FP.classList.toggle('fp-mic-listening', on);
                    if (!on) { if (interimEl) { interimEl.textContent = ''; interimEl.classList.remove('visible'); } _fpSetPaused(false); }
                }
                rec.onresult = e => {
                    let interim = '';
                    for (let i = e.resultIndex; i < e.results.length; i++) {
                        const t = e.results[i][0].transcript;
                        if (e.results[i].isFinal) {
                            fpContent.focus();
                            document.execCommand('insertText', false, t);
                            if (interimEl) { interimEl.textContent = ''; interimEl.classList.remove('visible'); }
                        } else interim += t;
                    }
                    if (interim && interimEl) { interimEl.textContent = '🎤 ' + interim; interimEl.classList.add('visible'); }
                };
                rec.onend = () => {
                    if (!_fpListening) { _fpSetMicListening(false); return; }
                    if (_fpPaused) return; /* Duraklat tarafından durduruldu — otomatik yeniden başlatma yok */
                    try { rec.start(); } catch(e) {}
                };
                rec.onerror = e => { if (e.error === 'aborted') return; _fpSetMicListening(false); };
                fpMicBtn.addEventListener('click', e => {
                    e.stopPropagation();
                    if (_fpListening) { _fpSetMicListening(false); rec.stop(); }
                    else { fpContent.focus(); rec.start(); _fpSetMicListening(true); }
                });
                if (fpVriPauseBtn) fpVriPauseBtn.addEventListener('click', e => {
                    e.stopPropagation();
                    if (!_fpListening || _fpPaused) return;
                    _fpSetPaused(true); rec.stop();
                });
                if (fpVriResumeBtn) fpVriResumeBtn.addEventListener('click', e => {
                    e.stopPropagation();
                    if (!_fpListening || !_fpPaused) return;
                    _fpSetPaused(false); fpContent.focus(); try { rec.start(); } catch(err) {}
                });
                if (fpVriStopBtn) fpVriStopBtn.addEventListener('click', e => {
                    e.stopPropagation();
                    _fpSetMicListening(false); rec.stop();
                });
            }
        }

        /* ── Notu Kilitle: FP'nin kendi notunu etkiler ── */
        let _fpLocked = false;
        const fpBodyEl = document.getElementById('fp-body');
        if (fpLockBtn) {
            function _fpSetLocked(locked) {
                _fpLocked = locked;
                /* contentEditable + pointer-events CSS class */
                fpContent.contentEditable = locked ? 'false' : 'true';
                if (fpTitle) fpTitle.readOnly = locked;
                if (fpBodyEl) fpBodyEl.classList.toggle('fp-locked', locked);
                fpLockBtn.classList.toggle('locked', locked);
                fpLockBtn.title = locked ? 'Kilidi Aç' : 'Notu Kilitle';
                fpLockBtn.innerHTML = locked ? '<i class="fas fa-lock"></i>' : '<i class="fas fa-lock-open"></i>';
                /* FP notunun kilit verisini kaydet */
                if (_fpNoteId && typeof getNote === 'function' && typeof saveNotes === 'function') {
                    const n = getNote(_fpNoteId);
                    if (n) { n.locked = locked; saveNotes(); }
                }
                /* Eğer ana editörde aynı not açıksa senkronize et */
                const mainEditId = document.getElementById('edit-id');
                if (mainEditId && String(mainEditId.value) === String(_fpNoteId) && typeof setEditorLocked === 'function') {
                    setEditorLocked(locked);
                }
            }
            fpLockBtn.addEventListener('click', e => { e.stopPropagation(); _fpSetLocked(!_fpLocked); });
            window._fpSyncLock = function(noteId) {
                if (!noteId) return;
                const n = typeof getNote === 'function' ? getNote(noteId) : null;
                _fpSetLocked(!!(n && n.locked));
            };
            window._fpSetLockedExternal = _fpSetLocked;
        }

        if (fpCancelBtn) {
            fpCancelBtn.addEventListener('click', e => { e.stopPropagation(); doClose(); });
        }
    })();

    /* ── fp-footer çekmece (DOM burada hazır) ── */
    (function() {
        const trigger = document.getElementById('fp-cf-trigger');
        const footer  = document.getElementById('fp-footer');
        const fpBody  = document.getElementById('fp-body');
        if (!trigger || !footer || !fpBody) return;

        function open()  { fpBody.classList.add('fp-cf-open'); }
        function close() { fpBody.classList.remove('fp-cf-open'); }

        const isTouch = () => window.matchMedia('(hover: none) and (pointer: coarse)').matches;

        let _t;
        trigger.addEventListener('mouseenter', () => { clearTimeout(_t); open(); });
        trigger.addEventListener('mouseleave', () => { if (!isTouch()) _t = setTimeout(close, 400); });
        footer.addEventListener('mouseenter',  () => clearTimeout(_t));
        footer.addEventListener('mouseleave',  () => { if (!isTouch()) _t = setTimeout(close, 400); });
        trigger.addEventListener('touchstart', e => { e.stopPropagation(); clearTimeout(_t); open(); }, { passive: true });
        trigger.addEventListener('click', e => { e.stopPropagation(); open(); });

        function onOutside(e) {
            if (!fpBody.classList.contains('fp-cf-open')) return;
            if (footer.contains(e.target) || trigger.contains(e.target)) return;
            close();
        }
        document.addEventListener('click',      onOutside);
        document.addEventListener('touchstart', onOutside, { passive: true });
    })();
})();

/* ══ FP İÇİ ARAMA ══ */
(function () {
    const searchBtn = document.getElementById('fp-search-btn');
    const wrap      = document.getElementById('fp-search-wrap');
    const panel     = document.getElementById('fp-search-panel');
    const input     = document.getElementById('fp-search-input');
    const closeBtn  = document.getElementById('fp-search-close');
    const resultsEl = document.getElementById('fp-search-results');
    const fpContent = document.getElementById('fp-content');
    if (!searchBtn || !panel || !input || !resultsEl || !fpContent) return;

    let _debTimer = null;

    function _positionPanel() {
        const wr = wrap.getBoundingClientRect();
        panel.style.top   = (wr.bottom + 2) + 'px';
        panel.style.left  = wr.left + 'px';
        panel.style.width = Math.max(wr.width, 200) + 'px';
    }

    function openPanel() {
        wrap.classList.add('open');
        input.focus();
        input.select();
        if (input.value.trim()) {
            panel.classList.add('open');
            _positionPanel();
            runSearch(input.value.trim());
        }
    }
    function closePanel() {
        wrap.classList.remove('open');
        panel.classList.remove('open');
        input.value = '';
        resultsEl.innerHTML = '';
    }

    searchBtn.addEventListener('click', () => {
        wrap.classList.contains('open') ? closePanel() : openPanel();
    });
    closeBtn.addEventListener('click', closePanel);

    input.addEventListener('input', () => {
        clearTimeout(_debTimer);
        const kw = input.value.trim();
        if (!kw) { panel.classList.remove('open'); resultsEl.innerHTML = ''; return; }
        panel.classList.add('open');
        _positionPanel();
        _debTimer = setTimeout(() => runSearch(kw), 200);
    });

    document.addEventListener('click', e => {
        if (!wrap.classList.contains('open')) return;
        if (!e.target.closest('#fp-search-wrap') && !e.target.closest('#fp-search-panel')) closePanel();
    });

    function esc(s) {
        return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
    }

    function getBlocks() {
        const sel = 'p, li, h2, h3, h4, h5, td, th, blockquote > *:not(blockquote), .callout-body > p, pre';
        return [...fpContent.querySelectorAll(sel)].filter(el => el.querySelectorAll('p,li,h2,h3,h4,h5,td,th').length === 0);
    }

    function buildSnippet(text, keyword) {
        const lower = text.toLowerCase();
        const kLower = keyword.toLowerCase();
        let pos = lower.indexOf(kLower);
        if (pos === -1) return null;
        const words = text.split(/(\s+)/);
        const tokens = [];
        let charIdx = 0, kwToken = -1;
        for (let i = 0; i < words.length; i++) {
            const w = words[i];
            if (charIdx <= pos && pos < charIdx + w.length && !/^\s+$/.test(w)) kwToken = i;
            tokens.push(w);
            charIdx += w.length;
        }
        if (kwToken === -1) return null;
        const wordIdxs = tokens.map((w, i) => /^\s+$/.test(w) ? -1 : i).filter(i => i !== -1);
        const wPos = wordIdxs.indexOf(kwToken);
        const before3 = wordIdxs.slice(Math.max(0, wPos - 3), wPos);
        const after3  = wordIdxs.slice(wPos + 1, wPos + 4);
        const hasBefore = before3.length > 0 && wPos > 0;
        const hasAfter  = after3.length > 0 && wPos < wordIdxs.length - 1;
        const moreBefore = wPos > 3;
        const moreAfter  = wPos + 4 < wordIdxs.length;
        function slice(idxList) {
            if (!idxList.length) return '';
            const from = idxList[0], to = idxList[idxList.length - 1];
            return tokens.slice(from, to + 1).join('');
        }
        let html = '';
        if (moreBefore)  html += '<span class="esp-dots">…</span> ';
        if (hasBefore)   html += esc(slice(before3)) + ' ';
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
        if (!kw) return;
        let count = 0;
        getBlocks().forEach(el => {
            const text = el.textContent || '';
            if (!text.toLowerCase().includes(kw.toLowerCase())) return;
            const snippet = buildSnippet(text, kw);
            if (!snippet) return;
            const row = document.createElement('div');
            row.className = 'esp-hit';
            row.innerHTML = snippet;
            row.addEventListener('click', () => {
                el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                el.style.outline = '2px solid var(--accent)';
                setTimeout(() => { el.style.outline = ''; }, 1400);
            });
            resultsEl.appendChild(row);
            count++;
        });
        if (count === 0) {
            resultsEl.innerHTML = '<div class="esp-empty"><i class="fas fa-search" style="opacity:.3"></i><br>"' + esc(kw) + '" bulunamadı</div>';
        }
    }
})();

/* ══ FP ÜST ÇEKMECE TOOLBAR ══ */
(function initFpSideToolbar() {
    const FP     = document.getElementById('float-panel');
    const trigger = document.getElementById('fp-stb-trigger');
    const tb      = document.getElementById('fp-side-toolbar');
    const closeBtn = document.getElementById('fp-stb-close');
    const fpHead  = document.getElementById('fp-head');
    if (!FP || !trigger || !tb) return;

    const OPEN_CLS = 'fp-stb-open';
    function open()  { FP.classList.add(OPEN_CLS); }
    function close() { FP.classList.remove(OPEN_CLS); }

    let _closeTimer;
    trigger.addEventListener('mouseenter', () => { clearTimeout(_closeTimer); open(); });
    trigger.addEventListener('mouseleave', () => { _closeTimer = setTimeout(close, 400); });
    tb.addEventListener('mouseenter', () => clearTimeout(_closeTimer));
    tb.addEventListener('mouseleave', () => { _closeTimer = setTimeout(close, 400); });
    trigger.addEventListener('click', e => { e.stopPropagation(); open(); });
    if (closeBtn) closeBtn.addEventListener('click', e => { e.stopPropagation(); close(); });

    document.addEventListener('click', e => {
        if (!FP.classList.contains(OPEN_CLS)) return;
        if (tb.contains(e.target) || trigger.contains(e.target)) return;
        close();
    });

    /* Toolbar'ı fp-head altına konumlandır */
    function positionTb() { if (fpHead) tb.style.top = fpHead.offsetHeight + 'px'; }
    positionTb();
    if (fpHead && typeof ResizeObserver !== 'undefined') {
        new ResizeObserver(positionTb).observe(fpHead);
    }

    /* Dikey tekerlek ile yatay kaydırma */
    tb.addEventListener('wheel', e => {
        if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;
        e.preventDefault();
        tb.scrollLeft += e.deltaY;
    }, { passive: false });

    /* fp-head yüksekliğini editor-top ile senkronize et */
    const editorTop = document.querySelector('.editor-top');
    if (editorTop && fpHead && typeof ResizeObserver !== 'undefined') {
        function syncFpHeadHeight() { fpHead.style.minHeight = editorTop.offsetHeight + 'px'; }
        syncFpHeadHeight();
        new ResizeObserver(syncFpHeadHeight).observe(editorTop);
    }

    tb.addEventListener('mousedown', e => {
        const btn = e.target.closest('.stb');
        if (!btn) return;
        const type = btn.dataset.stb;
        if (!type) return;
        e.preventDefault();
        if (type === 'callout-menu' || type === 'line-height' || type === 'shape-menu') return;
        if (typeof _restoreToolbarSel === 'function') _restoreToolbarSel();
        if      (type === 'timestamp')  { if ((typeof EditorState._editActive !== 'undefined' && EditorState._editActive) || (typeof _fpFocused === 'function' && _fpFocused())) insertTimestamp(); }
        else if (type === 'ul')         { document.execCommand('insertUnorderedList', false, null); }
        else if (type === 'ol')         { document.execCommand('insertOrderedList', false, null); }
        else if (type === 'todo')       { runSpecial('todo'); }
        else if (type === 'blockquote' || type === 'h2' || type === 'h3' || type === 'h4')
                                        { document.execCommand('formatBlock', false, type); }
        else if (type === 'icode' || type === 'badge' || type === 'cblock' || type === 'link')
                                        { runSpecial(type); }
        else if (type === 'grid-panel')  { applyGridPanel(3); }
        else if (type === 'grid-column') { applyGridColumn(3); }
        else if (type === 'grid-table')  { applyGridTable(3, 3); }
        else if (type === 'justifyLeft' || type === 'justifyCenter' || type === 'justifyRight')
                                         { document.execCommand(type, false, null); }
        else if (type === 'bookmark')    { applyBookmark(); }
        else if (type.startsWith('callout-')) { applySlashCommand(type); }
    });

    /* Vurgu flyout */
    const calloutBtn = tb.querySelector('[data-stb="callout-menu"]');
    if (calloutBtn) {
        const CALLOUTS = [
            { type:'callout-info',    icon:'fa-circle-info',          label:'Bilgi'  },
            { type:'callout-warning', icon:'fa-triangle-exclamation', label:'Uyarı'  },
            { type:'callout-tip',     icon:'fa-lightbulb',            label:'İpucu'  },
            { type:'callout-success', icon:'fa-circle-check',         label:'Başarı' },
        ];
        const dd = document.createElement('div');
        dd.style.cssText = 'position:fixed;z-index:9300;background:var(--surface);border:1px solid var(--border);border-radius:8px;padding:4px 0;box-shadow:0 4px 16px var(--shadow);min-width:150px;display:none';
        CALLOUTS.forEach(co => {
            const item = document.createElement('div');
            item.style.cssText = 'padding:7px 14px;cursor:pointer;font-size:.82rem;color:var(--text);display:flex;align-items:center;gap:9px;transition:background .1s';
            item.innerHTML = '<i class="fas ' + co.icon + '" style="width:14px;text-align:center"></i>' + co.label;
            item.addEventListener('mouseenter', () => item.style.background = 'var(--surface-2)');
            item.addEventListener('mouseleave', () => item.style.background = '');
            item.addEventListener('mousedown', ev => {
                ev.preventDefault(); ev.stopPropagation();
                const fc = document.getElementById('fp-content'); if (fc) fc.focus();
                applySlashCommand(co.type); dd.style.display = 'none';
            });
            dd.appendChild(item);
        });
        document.body.appendChild(dd);
        calloutBtn.addEventListener('click', ev => {
            ev.stopPropagation();
            const isOpen = dd.style.display === 'block';
            dd.style.display = 'none';
            if (!isOpen) { const r = calloutBtn.getBoundingClientRect(); dd.style.left = (r.right + 8) + 'px'; dd.style.top = r.top + 'px'; dd.style.display = 'block'; }
        });
        document.addEventListener('click', () => { dd.style.display = 'none'; });
    }

    /* Satır aralığı flyout */
    const lhBtn = tb.querySelector('[data-stb="line-height"]');
    if (lhBtn) {
        const lhDD = document.createElement('div');
        lhDD.style.cssText = 'position:fixed;z-index:9300;background:var(--surface);border:1px solid var(--border);border-radius:8px;padding:4px 0;box-shadow:0 4px 16px var(--shadow);min-width:100px;display:none';
        ['0.85','1.0','1.2','1.5','2.0'].forEach(v => {
            const item = document.createElement('div');
            item.style.cssText = 'padding:7px 14px;cursor:pointer;font-size:.82rem;color:var(--text);transition:background .1s;text-align:center';
            item.textContent = v;
            item.addEventListener('mouseenter', () => item.style.background = 'var(--surface-2)');
            item.addEventListener('mouseleave', () => item.style.background = '');
            item.addEventListener('mousedown', ev => {
                ev.preventDefault(); ev.stopPropagation();
                const fc = document.getElementById('fp-content');
                const sel = window.getSelection();
                if (sel && !sel.isCollapsed) {
                    const range = sel.getRangeAt(0);
                    const span = document.createElement('span');
                    span.style.lineHeight = v;
                    try { range.surroundContents(span); } catch { const frag = range.extractContents(); span.appendChild(frag); range.insertNode(span); }
                    if (typeof _markDirty === 'function') _markDirty();
                } else if (fc) { fc.style.lineHeight = v; }
                lhDD.style.display = 'none';
            });
            lhDD.appendChild(item);
        });
        document.body.appendChild(lhDD);
        lhBtn.addEventListener('click', ev => {
            ev.stopPropagation();
            const isOpen = lhDD.style.display === 'block';
            lhDD.style.display = 'none';
            if (!isOpen) { const r = lhBtn.getBoundingClientRect(); lhDD.style.left = (r.right + 8) + 'px'; lhDD.style.top = r.top + 'px'; lhDD.style.display = 'block'; }
        });
        document.addEventListener('click', () => { lhDD.style.display = 'none'; });
    }

    /* Şekil flyout */
    const shapeBtn = tb.querySelector('[data-stb="shape-menu"]');
    if (shapeBtn && typeof Const !== 'undefined' && Const._SHAPES) {
        const shDD = document.createElement('div');
        shDD.style.cssText = 'position:fixed;z-index:9300;background:var(--surface);border:1px solid var(--border);border-radius:8px;padding:4px 0;box-shadow:0 4px 16px var(--shadow);min-width:160px;display:none';
        Const._SHAPES.forEach(sh => {
            const item = document.createElement('div');
            item.style.cssText = 'padding:7px 14px;cursor:pointer;font-size:.82rem;color:var(--text);display:flex;align-items:center;gap:9px;transition:background .1s';
            item.innerHTML = `<i class="fas ${sh.icon}" style="width:14px;text-align:center"></i>${sh.label}`;
            item.addEventListener('mouseenter', () => item.style.background = 'var(--surface-2)');
            item.addEventListener('mouseleave', () => item.style.background = '');
            item.addEventListener('mousedown', ev => {
                ev.preventDefault(); ev.stopPropagation();
                const fc = document.getElementById('fp-content'); if (fc) fc.focus();
                insertShapeOverlay(sh.id); shDD.style.display = 'none';
            });
            shDD.appendChild(item);
        });
        document.body.appendChild(shDD);
        shapeBtn.addEventListener('click', ev => {
            ev.stopPropagation();
            const isOpen = shDD.style.display === 'block';
            shDD.style.display = 'none';
            if (!isOpen) { const r = shapeBtn.getBoundingClientRect(); shDD.style.left = (r.right + 8) + 'px'; shDD.style.top = r.top + 'px'; shDD.style.display = 'block'; }
        });
        document.addEventListener('click', () => { shDD.style.display = 'none'; });
    }
})();

/* float-panel scroll jump — fp-content HTML parse edildikten sonra */
if (window._setupScrollJump) {
    window._setupScrollJump(document.getElementById('fp-content'), document.getElementById('fp-body'));
}
