/* ══ ACCORDION & EXPAND ══ */
function toggleAccordion(name) {
    if (openGroups.includes(name)) openGroups=openGroups.filter(x=>x!==name); else openGroups.push(name);
    localStorage.setItem('noted_groups_v1',JSON.stringify(openGroups)); render();
}
function toggleExpand(id) { expandedNotes.has(id)?expandedNotes.delete(id):expandedNotes.add(id); render(); }

/* ══ SEARCH ══ */
const searchInput=$('search-input'), searchClear=$('search-clear');
function clearSearch() {
    searchInput.value=''; searchQuery=''; searchClear.classList.remove('visible'); render();
}
const renderDebounced=debounce(render,150);
searchInput.addEventListener('input', e => {
    searchQuery=e.target.value.trim(); searchClear.classList.toggle('visible',searchQuery.length>0); renderDebounced();
});
searchInput.addEventListener('keydown', e => {
    if (e.key==='Escape') { clearSearch(); searchInput.blur(); }
});
searchClear.addEventListener('click', e => { e.stopPropagation(); clearSearch(); searchInput.focus(); });

/* v1.3: arama operatörleri ipucu */
/* Gelişmiş arama operatörleri — hover ile göster/gizle */
function positionSearchOpHint() {
    const rect = DOM.$searchOpBtn.getBoundingClientRect();
    let top = rect.bottom + 6, left = rect.left;
    if (left + 250 > window.innerWidth) left = window.innerWidth - 256;
    DOM.$searchOpHint.style.top = top + 'px';
    DOM.$searchOpHint.style.left = left + 'px';
}
let _searchOpHideT = null;
DOM.$searchOpBtn.addEventListener('mouseenter', () => {
    clearTimeout(_searchOpHideT);
    positionSearchOpHint();
    DOM.$searchOpHint.classList.add('open');
});
DOM.$searchOpBtn.addEventListener('mouseleave', () => {
    _searchOpHideT = setTimeout(() => DOM.$searchOpHint.classList.remove('open'), 200);
});
DOM.$searchOpHint.addEventListener('mouseenter', () => { clearTimeout(_searchOpHideT); });
DOM.$searchOpHint.addEventListener('mouseleave', () => {
    _searchOpHideT = setTimeout(() => DOM.$searchOpHint.classList.remove('open'), 200);
});

/* ══ VOICE SEARCH ══ */
(function() {
    const SR=window.SpeechRecognition||window.webkitSpeechRecognition; if(!SR) return;
    const micBtn=$('search-mic'), recognition=new SR();
    recognition.lang='tr-TR'; recognition.continuous=false; recognition.interimResults=true;
    micBtn.classList.add('available');
    recognition.onresult=e => {
        const raw=Array.from(e.results).map(r=>r[0].transcript).join('');
        const transcript=raw.replace(/[.,،؟?!;:]/g,'').trim();
        searchInput.value=transcript; searchQuery=transcript;
        searchClear.classList.toggle('visible',transcript.length>0); render();
    };
    recognition.onend=()=>{ micBtn.classList.remove('listening'); micBtn.title='Sesle ara'; };
    recognition.onerror=e=>{ micBtn.classList.remove('listening'); micBtn.title='Sesle ara'; };
    micBtn.addEventListener('click', e => {
        e.stopPropagation();
        if (!_se.classList.contains('open')) { _se.classList.add('open'); searchInput.focus(); }
        if (micBtn.classList.contains('listening')) recognition.stop();
        else { recognition.start(); micBtn.classList.add('listening'); micBtn.title='Dinleniyor…'; }
    });
})();

/* ══ GROUP FILTER BADGE ══ */
function _positionDropdown(badgeEl, dropEl) {
    const r = badgeEl.getBoundingClientRect();
    const dropW = dropEl.offsetWidth  || 170;
    const dropH = dropEl.offsetHeight || 220;
    const vW = window.innerWidth, vH = window.innerHeight;

    /* Yatay */
    let left = r.left;
    if (left + dropW > vW - 6) left = vW - dropW - 6;
    if (left < 6) left = 6;

    /* Dikey — alta sığmazsa yukarı aç */
    let top = r.bottom + 6;
    if (top + dropH > vH - 6) top = r.top - dropH - 6;
    if (top < 6) top = 6;

    dropEl.style.left    = left + 'px';
    dropEl.style.top     = top  + 'px';
    dropEl.style.zIndex  = '9900'; /* her zaman üstte */
}

function _closeHeaderDropdowns(except) {
    if (except !== 'gf') { DOM.$gfBadge.classList.remove('open'); DOM.$gfDropdown.classList.remove('open'); }
    if (except !== 'tf') { DOM.$tfBadge.classList.remove('open'); DOM.$tfDropdown.classList.remove('open'); }
    if (except !== 'sort') { DOM.$sortBadge.classList.remove('open'); DOM.$sortDropdown.classList.remove('open'); }
    if (except !== 'view' && typeof DOM.$viewBadge !== 'undefined' && DOM.$viewBadge) { DOM.$viewBadge.classList.remove('open'); DOM.$viewDropdown.classList.remove('open'); }
}

DOM.$gfBadge.addEventListener('click', e => {
    e.stopPropagation();
    const willOpen = !DOM.$gfDropdown.classList.contains('open');
    _closeHeaderDropdowns('gf');
    if (willOpen) {
        DOM.$gfBadge.classList.add('open'); DOM.$gfDropdown.classList.add('open');
        buildGroupDropdown();
        _positionDropdown(DOM.$gfBadge, DOM.$gfDropdown);
    }
});

/* ══ v1.1: TAG FILTER BADGE ══ */
DOM.$tfBadge.addEventListener('click', e => {
    e.stopPropagation();
    const willOpen = !DOM.$tfDropdown.classList.contains('open');
    _closeHeaderDropdowns('tf');
    if (willOpen) {
        DOM.$tfBadge.classList.add('open'); DOM.$tfDropdown.classList.add('open');
        buildTagDropdown();
        _positionDropdown(DOM.$tfBadge, DOM.$tfDropdown);
    }
});

/* ══ COLOR PICKER (metin rengi) ══ */
(function() {
    let lastColor='#000000';
    const popup=$('color-popup'), bar=$('color-bar');
    /* v1.10 güncelleme (4. tur): statik HTML içindeki hazır ızgara nedeniyle
       palet iki kez görünüyordu — JS kendi ızgarasını kurmadan önce temizler */
    popup.innerHTML = '';
    const grid=document.createElement('div'); grid.className='color-swatches';
    const rm=document.createElement('div'); rm.className='cswatch remove'; rm.title='Rengi kaldır';
    rm.addEventListener('mousedown',e=>{ e.preventDefault(); e.stopPropagation(); applyColor(null); });
    grid.appendChild(rm);
    Const.PALETTE.forEach(c => {
        const s=document.createElement('div'); s.className='cswatch'; s.style.background=c; s.title=c;
        s.addEventListener('mousedown',e=>{ e.preventDefault(); e.stopPropagation(); applyColor(c); });
        grid.appendChild(s);
    });
    const customRow=document.createElement('div'); customRow.className='color-custom';
    customRow.innerHTML='<label>Özel renk</label><input type="color" id="custom-color" value="#000000">';
    popup.appendChild(grid); popup.appendChild(customRow);
    const ci=$('custom-color');
    ci.addEventListener('input',e=>applyColor(e.target.value,false));
    ci.addEventListener('click',e=>e.stopPropagation()); ci.addEventListener('mousedown',e=>e.stopPropagation());
    function applyColor(color,close=true) {
        _restoreToolbarSel();
        if (color) {
            document.execCommand('foreColor',false,color);
            /* execCommand('foreColor') <font color="..."> üretir — sanitize() allowlist'inde
               'font' tag'ı yok, kayıtta tamamen siliniyordu (renk kayboluyordu). fontFamily'deki
               aynı workaround: <font> -> <span style="color"> dönüşümü. */
            const et = (_savedToolbarSel && _savedToolbarSel.et) || _activeEditTarget || DOM.$content;
            et.querySelectorAll('font[color]').forEach(font => {
                const span = document.createElement('span');
                span.style.color = font.color;
                if (font.face) span.style.fontFamily = font.face;
                span.innerHTML = font.innerHTML;
                font.parentNode.replaceChild(span, font);
            });
            lastColor=color; bar.style.background=color;
        }
        else { document.execCommand('removeFormat',false,null); bar.style.background='#000'; }
        if (close) popup.classList.remove('open');
    }
    popup.addEventListener('click',e=>e.stopPropagation());
    $('tb-color-apply').addEventListener('mousedown',e=>{ e.preventDefault(); _restoreToolbarSel(); if(lastColor) applyColor(lastColor,true); });
    $('tb-color-apply').addEventListener('click',e=>e.stopPropagation());
    $('tb-color').addEventListener('click',e=>e.stopPropagation());
})();

/* ══ CONTENT MIC ══ */
(function() {
    const SR=window.SpeechRecognition||window.webkitSpeechRecognition; if(!SR) return;
    const micBtn=$('content-mic'), interimEl=$('voice-interim'), recognition=new SR();
    const editorEl = $('editor');
    recognition.lang='tr-TR'; recognition.continuous=true; recognition.interimResults=true;
    micBtn.classList.add('available');
    function setListening(on) {
        micBtn.classList.toggle('listening', on);
        micBtn.title = on ? 'Dinleniyor — durdurmak için tıkla' : 'Sesle yaz';
        if (editorEl) editorEl.classList.toggle('mic-listening', on);
        if (!on) { interimEl.textContent=''; interimEl.classList.remove('visible'); }
    }
    recognition.onresult=e => {
        let interimText='';
        for(let i=e.resultIndex;i<e.results.length;i++) {
            const t=e.results[i][0].transcript;
            if(e.results[i].isFinal) { DOM.$content.focus(); document.execCommand('insertText',false,t); interimEl.textContent=''; interimEl.classList.remove('visible'); }
            else interimText+=t;
        }
        if(interimText) { interimEl.textContent='🎤 '+interimText; interimEl.classList.add('visible'); }
    };
    recognition.onend=()=>{ if(micBtn.classList.contains('listening')) { try{recognition.start();}catch(e){} } else { setListening(false); } };
    recognition.onerror=e=>{ if(e.error==='aborted') return; setListening(false); };
    micBtn.addEventListener('click',e=>{
        e.stopPropagation();
        if(micBtn.classList.contains('listening')) { setListening(false); recognition.stop(); }
        else { DOM.$content.focus(); recognition.start(); setListening(true); }
    });
})();

/* ══ ARKA PLAN RENGİ ══ */
(function() {
    let lastBgColor='#ffff00';
    const popup=$('bg-color-popup'), bar=$('bg-color-bar');
    /* v1.10 güncelleme (4. tur): statik HTML içindeki hazır ızgara nedeniyle
       palet iki kez görünüyordu — JS kendi ızgarasını kurmadan önce temizler */
    popup.innerHTML = '';
    const grid=document.createElement('div'); grid.className='color-swatches';
    const rm=document.createElement('div'); rm.className='cswatch remove'; rm.title='Arka planı kaldır';
    rm.addEventListener('mousedown',e=>{ e.preventDefault(); e.stopPropagation(); applyBgColor(null); });
    grid.appendChild(rm);
    Const.PALETTE.forEach(c=>{
        const s=document.createElement('div'); s.className='cswatch'; s.style.background=c; s.title=c;
        s.addEventListener('mousedown',e=>{ e.preventDefault(); e.stopPropagation(); applyBgColor(c); });
        grid.appendChild(s);
    });
    const customRow=document.createElement('div'); customRow.className='color-custom';
    customRow.innerHTML='<label>Özel renk</label><input type="color" id="bg-custom-color" value="#ffff00">';
    popup.appendChild(grid); popup.appendChild(customRow);
    const ci=$('bg-custom-color');
    ci.addEventListener('input',e=>applyBgColor(e.target.value,false));
    ci.addEventListener('click',e=>e.stopPropagation()); ci.addEventListener('mousedown',e=>e.stopPropagation());
    function closeColorPopup() { const p=$('bg-color-popup'); if(p) p.classList.remove('open'); }
function applyBgColor(color,close=true) {
        _restoreToolbarSel();
        /* Grid hücresi: imlecin olduğu hücre — _activeEditTarget ile bul */
        const activeCell = _activeEditTarget && _activeEditTarget.closest('.ng-cell, .ng-title')
                           ? _activeEditTarget
                           : (document.activeElement && document.activeElement.closest('.ng-cell, .ng-title')
                              ? document.activeElement : null);
        if (activeCell) {
            const td = activeCell.closest('td, th');
            if (td) {
                const table = td.closest('.noted-grid');
                const gType = table ? table.dataset.gridType : '';
                /* Kolon: her zaman metin arka planı. Panel: yalnızca içerik satırında (td) metin
                   arka planı — başlıkta (th) hücre arka planı. Tablo: her zaman hücre arka planı. */
                const useTextHighlight = gType === 'column' || (gType === 'panel' && td.tagName === 'TD');
                if (useTextHighlight) {
                    /* Metin arka planı — execCommand */
                    if (color) {
                        if (!document.execCommand('hiliteColor', false, color)) document.execCommand('backColor', false, color);
                    } else {
                        document.execCommand('hiliteColor', false, 'transparent');
                        document.execCommand('backColor',  false, 'transparent');
                    }
                } else {
                    /* Panel başlığı (th) ve Tablo: hücre arka planı.
                       Panel'de görsel kart arka planı th/td'nin kendisinde değil .ng-v-wrap'te
                       (bkz. v1.15.105 taşma düzeltmesi) — bg oraya uygulanmazsa görünmez kalır. */
                    const bgTarget = gType === 'panel' ? (td.querySelector('.ng-v-wrap') || td) : td;
                    bgTarget.style.backgroundColor = color || '';
                }
                if (bar) { bar.style.background = color || 'transparent'; }
                lastBgColor = color || lastBgColor;
                _markDirty();
                if (close) { const p=$('bg-color-popup'); if(p) p.classList.remove('open'); }
                return;
            }
        }
        if(color) { if(!document.execCommand('hiliteColor',false,color)) document.execCommand('backColor',false,color); lastBgColor=color; bar.style.background=color; }
        else { document.execCommand('hiliteColor',false,'transparent'); document.execCommand('backColor',false,'transparent'); bar.style.background='transparent'; }
        /* Panel başlığı seçiliyse header arka planını da değiştir */
        const et = (_savedToolbarSel && _savedToolbarSel.et) || _activeEditTarget;
        if (et && et.classList && et.classList.contains('col-panel-title')) {
            const hdr = et.closest('.col-panel-header');
            if (hdr) hdr.style.backgroundColor = color || '';
        }
        if(close) popup.classList.remove('open');
    }
    popup.addEventListener('click',e=>e.stopPropagation());
    $('tb-bgcolor').addEventListener('click',e=>e.stopPropagation());
    $('tb-bgcolor-apply').addEventListener('mousedown',e=>{ e.preventDefault(); _restoreToolbarSel(); if(lastBgColor) applyBgColor(lastBgColor,true); });
    $('tb-bgcolor-apply').addEventListener('click',e=>e.stopPropagation());
    document.addEventListener('click',e=>{ if($('bg-custom-color')&&document.activeElement===$('bg-custom-color')) return; });
})();

/* ══ FONT & BOYUT ══ */

/* applyInlineStyle ve getCurrentFontSize: global — toolbar mousedown ve IIFE her ikisinden erişilir */
function applyInlineStyle(prop, value) {
    /* Önce selection'ı restore et */
    _restoreToolbarSel();
    const sel = window.getSelection();
    const et  = (_savedToolbarSel && _savedToolbarSel.et) || _activeEditTarget || DOM.$content;
    if (!sel || !sel.rangeCount || !et.contains(sel.anchorNode)) return;
    if (sel.isCollapsed) return;

    if (prop === 'fontFamily') {
        const marker = '__FF_APPLY__';
        document.execCommand('fontName', false, marker);
        et.querySelectorAll(`font[face="${marker}"]`).forEach(font => {
            if (font.closest('.todo-cb') || font.closest('.todo-mark')) { font.removeAttribute('face'); return; }
            const span = document.createElement('span');
            span.style.fontFamily = value;
            if (font.color) span.style.color = font.color;
            span.innerHTML = font.innerHTML;
            font.parentNode.replaceChild(span, font);
        });
        _savedToolbarSel = null;
        return;
    }

    if (prop === 'fontSize') {
        /* execCommand('fontSize') DOM'u değiştirip range'i invalid yapıyor.
           Genel inline stil dalı ile aynı surroundContents yaklaşımı — selection korunur. */
        const range = sel.getRangeAt(0).cloneRange();
        const span = document.createElement('span');
        span.style.fontSize = value;
        try {
            range.surroundContents(span);
        } catch {
            const frag = range.extractContents();
            frag.querySelectorAll('[style*="font-size"]').forEach(el => { el.style.fontSize = value; });
            span.appendChild(frag);
            range.insertNode(span);
        }
        /* Seçimi yeni span'a taşı → sel.isCollapsed=false → toolbar açık kalır */
        const newRange = document.createRange();
        newRange.selectNodeContents(span);
        sel.removeAllRanges();
        sel.addRange(newRange);
        _savedToolbarSel = { et, range: newRange.cloneRange() };
        return;
    }

    /* Genel inline stil */
    const range = sel.getRangeAt(0);
    const span  = document.createElement('span');
    span.style[prop] = value;
    try { range.surroundContents(span); }
    catch { const frag = range.extractContents(); span.appendChild(frag); range.insertNode(span); }
    _savedToolbarSel = null;
}

function getCurrentFontSize() {
    const sel = window.getSelection();
    if (!sel || !sel.rangeCount) return 16;
    const node = sel.getRangeAt(0).startContainer;
    const el   = node.nodeType === 3 ? node.parentElement : node;
    return Math.round(parseFloat(window.getComputedStyle(el).fontSize)) || 16;
}

(function() {
    function updateToolbarDisplay() {
        const sel  = window.getSelection();
        const _etd = _activeEditTarget || DOM.$content;
        if (!sel || sel.isCollapsed || !_etd.contains(sel.anchorNode)) return;
        const node = sel.getRangeAt(0).startContainer;
        const el   = node.nodeType === 3 ? (node.parentElement || _etd) : node;
        const cs   = window.getComputedStyle(el);
        $('tb-fsize-val').textContent = Math.round(parseFloat(cs.fontSize)) || 16;
        const ff     = cs.fontFamily.replace(/['"]/g, '').split(',')[0].trim().toLowerCase();
        const select = $('tb-font-select');
        let found    = false;
        for (const opt of select.options) {
            const optFF = opt.value.replace(/['"]/g, '').split(',')[0].trim().toLowerCase();
            if (optFF === ff) { select.value = opt.value; found = true; break; }
        }
        if (!found) select.value = '';
    }

    /* Font seçici: select açılırken selection kaybolur — mousedown'da snapshot al.
       _savedToolbarSel debounce'lu (RAF/setTimeout) güncellendiğinden seçimden hemen
       sonra mousedown olursa eski/boş kalabilir — snapshot almadan önce senkron
       _saveToolbarSel() ile tazelenir (bkz. _restoreToolbarSel aynı sorun). */
    let _fontSelSnapshot = null;
    $('tb-font-select').addEventListener('mousedown', () => {
        _saveToolbarSel();
        _fontSelSnapshot = _savedToolbarSel
            ? { et: _savedToolbarSel.et, range: _savedToolbarSel.range.cloneRange() }
            : null;
    });
    $('tb-font-select').addEventListener('change', function() {
        if (!this.value) return;
        if (_fontSelSnapshot) {
            _savedToolbarSel = _fontSelSnapshot;
            _fontSelSnapshot = null;
        }
        applyInlineStyle('fontFamily', this.value);
        positionToolbar();
        
    });

    /* tb-fsize-dec/inc: toolbar mousedown handler'ında yakalanıyor */

    document.addEventListener('selectionchange', updateToolbarDisplay);
})();

/* ══ TODO MutationObserver ══ */
(function() {
    function upgradeTodoLi(li) {
        if (!li.closest('.todo-list')) return;
        if (li.classList.contains('todo-item')) return;
        li.classList.add('todo-item');
        li.dataset.checked = 'false';

        const sel = window.getSelection();
        let savedNode = null, savedOffset = 0;
        if (sel && sel.rangeCount && li.contains(sel.anchorNode)) {
            savedNode   = sel.anchorNode;
            savedOffset = sel.anchorOffset;
        }

        const mark = document.createElement('span');
        mark.className = 'todo-mark'; mark.contentEditable = 'false';
        const text = document.createElement('span');
        text.className = 'todo-text';
        while (li.firstChild) text.appendChild(li.firstChild);
        li.appendChild(mark);
        li.appendChild(text);

        /* Cursor'u restore et — sync, gecikme yok */
        if (savedNode && text.contains(savedNode)) {
            try {
                const r = document.createRange();
                r.setStart(savedNode, savedOffset); r.collapse(true);
                sel.removeAllRanges(); sel.addRange(r);
            } catch(_) {
                const r = document.createRange(); r.setStart(text, 0); r.collapse(true);
                sel.removeAllRanges(); sel.addRange(r);
            }
        }
    }
    const obs=new MutationObserver(muts=>{ muts.forEach(m=>m.addedNodes.forEach(n=>{ if(n.nodeName==='LI') upgradeTodoLi(n); })); });
    obs.observe(DOM.$content,{childList:true,subtree:true});
})();

/* ══ LAYOUT BREAKPOINT ══ */
(function() {
    const mq=window.matchMedia('(min-width: 900px)');
    function onBreakpoint(e) { if(e.matches){ DOM.$content.style.height=''; DOM.$content.style.minHeight=''; DOM.$content.style.maxHeight=''; } }
    mq.addEventListener('change',onBreakpoint); onBreakpoint(mq);
})();

/* ══ SPLITTER ══ */
(function() {
    const splitter=$('splitter'); if(!splitter) return;
    let startX, startW;
    function getSideW() { return parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--side-w'))||300; }
    function applyW(clientX) { const newW=Math.max(180,Math.min(520,startW+(clientX-startX))); document.documentElement.style.setProperty('--side-w',newW+'px'); }
    function startDrag(clientX) { startX=clientX; startW=getSideW(); splitter.classList.add('dragging'); document.body.style.cursor='col-resize'; document.body.style.userSelect='none'; }
    function stopDrag() { splitter.classList.remove('dragging'); document.body.style.cursor=''; document.body.style.userSelect=''; }
    function onMove(e){applyW(e.clientX);} function onUp(){stopDrag();document.removeEventListener('mousemove',onMove);document.removeEventListener('mouseup',onUp);}
    splitter.addEventListener('mousedown',e=>{ if(window.innerWidth<900)return; e.preventDefault(); startDrag(e.clientX); document.addEventListener('mousemove',onMove); document.addEventListener('mouseup',onUp); });
    function onTouchMove(e){if(window.innerWidth<900)return;e.preventDefault();applyW(e.touches[0].clientX);}
    function onTouchEnd(){stopDrag();splitter.removeEventListener('touchmove',onTouchMove);splitter.removeEventListener('touchend',onTouchEnd);}
    splitter.addEventListener('touchstart',e=>{ if(window.innerWidth<900)return; startDrag(e.touches[0].clientX); splitter.addEventListener('touchmove',onTouchMove,{passive:false}); splitter.addEventListener('touchend',onTouchEnd); },{passive:true});
})();

/* ══ RESIZE HANDLE ══ */
(function() {
    const handle=$('resize-handle');
    let startY,startH,dragging=false;
    function startResize(clientY){startY=clientY;startH=DOM.$content.offsetHeight;dragging=true;}
    function doResize(clientY){if(!dragging)return;const newH=Math.max(80,startH+(clientY-startY));DOM.$content.style.height=newH+'px';}
    function stopResize(){dragging=false;handle.classList.remove('resizing');document.body.style.userSelect='';document.removeEventListener('mousemove',onMouseMove);document.removeEventListener('mouseup',onMouseUp);}
    function onMouseMove(e){doResize(e.clientY);} function onMouseUp(){stopResize();}
    handle.addEventListener('mousedown',e=>{ e.preventDefault(); startResize(e.clientY); handle.classList.add('resizing'); document.body.style.userSelect='none'; document.addEventListener('mousemove',onMouseMove); document.addEventListener('mouseup',onMouseUp); });
    let lpTimer=null,lpActive=false;const LP_DELAY=420,LP_THRESHOLD=10;let lpY0=0;
    handle.addEventListener('touchstart',e=>{const touch=e.touches[0];lpY0=touch.clientY;handle.classList.add('pressing');lpTimer=setTimeout(()=>{lpActive=true;handle.classList.remove('pressing');handle.classList.add('resizing');if(navigator.vibrate)navigator.vibrate(40);startResize(lpY0);},LP_DELAY);},{passive:true});
    handle.addEventListener('touchmove',e=>{ const touch=e.touches[0];const dy=Math.abs(touch.clientY-lpY0); if(!lpActive){if(dy>LP_THRESHOLD){clearTimeout(lpTimer);handle.classList.remove('pressing');}return;} e.preventDefault();doResize(touch.clientY); },{passive:false});
    handle.addEventListener('touchend',()=>{clearTimeout(lpTimer);lpActive=false;dragging=false;handle.classList.remove('pressing','resizing');});
})();

/* ══ KLAVYE KISAYOLLARI ══ */
document.addEventListener('keydown',e=>{
    const _ctrl = e.ctrlKey, _shift = e.shiftKey, _key = e.key.toLowerCase();
    const _isMac = /Mac|iPhone|iPad/.test(navigator.platform || '');
    const _mod = _isMac ? e.metaKey : e.ctrlKey;

    if(e.key==='Escape'){
        DOM.$picker.classList.remove('open'); DOM.$gfBadge.classList.remove('open'); DOM.$gfDropdown.classList.remove('open');
        DOM.$tfBadge.classList.remove('open'); DOM.$tfDropdown.classList.remove('open');
        $('color-popup').classList.remove('open'); $('bg-color-popup').classList.remove('open'); $('color-label-popup').classList.remove('open');
        if (typeof DOM.$sortDropdown !== 'undefined' && DOM.$sortDropdown) { DOM.$sortBadge.classList.remove('open'); DOM.$sortDropdown.classList.remove('open'); }
        if (typeof slashMenuOpen !== 'undefined' && slashMenuOpen) closeSlashMenu();
        closeQuickCapture();
        closeTemplateDropdown();
        if (focusModeActive) toggleFocusMode(true);
        const _gOv = $('graph-overlay'); if (_gOv && _gOv.classList.contains('open')) closeLinkGraph();
        if (typeof closeQuickSwitcher === 'function') { const _qsOv=$('qs-overlay'); if(_qsOv&&_qsOv.classList.contains('open')) closeQuickSwitcher(); }
    }
    /* Ctrl+Shift+D — günlük not */
    if (_ctrl && _shift && _key === 'd') { e.preventDefault(); if (typeof openOrCreateDailyNote === 'function') openOrCreateDailyNote(); }
    /* Ctrl+Shift+N — hızlı yakalama */
    if (_ctrl && _shift && _key === 'n') { e.preventDefault(); openQuickCapture(); }
    /* Ctrl+Shift+F — odaklanma modu */
    if (_ctrl && _shift && _key === 'f') { e.preventDefault(); toggleFocusMode(); }
    /* Ctrl+Shift+T — zaman damgası */
    if (_ctrl && _shift && _key === 't') { e.preventDefault(); if (_editActive || _fpFocused()) { _restoreToolbarSel(); insertTimestamp(); } }
    /* Ctrl+Shift+U — madde listesi */
    if (_ctrl && _shift && _key === 'u') { e.preventDefault(); if (_editActive || _fpFocused()) { _restoreToolbarSel(); document.execCommand('insertUnorderedList', false, null); } }
    /* Ctrl+Shift+O — sıralı liste */
    if (_ctrl && _shift && _key === 'o') { e.preventDefault(); if (_editActive || _fpFocused()) { _restoreToolbarSel(); document.execCommand('insertOrderedList', false, null); } }
    /* Ctrl+Shift+K — görev listesi (Ctrl+K Quick Switcher'dan ayrı: Shift gerekli) */
    if (_ctrl && _shift && _key === 'k') { e.preventDefault(); if (_editActive || _fpFocused()) { _restoreToolbarSel(); runSpecial('todo'); } }
    /* Ctrl+Shift+W — daktilo modu */
    if (_ctrl && _shift && _key === 'w') { e.preventDefault(); toggleTypewriterMode(); }
    /* Ctrl/Cmd+K — hızlı geçiş (Shift olmadan) */
    if (_mod && !_shift && _key === 'k') { e.preventDefault(); const ov=$('qs-overlay'); if(ov) { if(ov.classList.contains('open')) closeQuickSwitcher(); else openQuickSwitcher(); } }
});

/* ══ GLOBAL CLICK ══ */
document.addEventListener('click',e=>{
    if (!e.target.closest('.gf-wrap')) { DOM.$gfBadge.classList.remove('open'); DOM.$gfDropdown.classList.remove('open'); }
    if (!e.target.closest('.tf-wrap')) { DOM.$tfBadge.classList.remove('open'); DOM.$tfDropdown.classList.remove('open'); }
    DOM.$picker.classList.remove('open');
    if (typeof DOM.$sortDropdown !== 'undefined' && !e.target.closest('.sort-wrap')) { DOM.$sortBadge.classList.remove('open'); DOM.$sortDropdown.classList.remove('open'); }
    if (typeof DOM.$viewDropdown !== 'undefined' && DOM.$viewDropdown && !e.target.closest('.view-wrap')) { DOM.$viewBadge.classList.remove('open'); DOM.$viewDropdown.classList.remove('open'); }
    $('color-label-popup').classList.remove('open');
    if (window._fpColorLabelContext) window._fpColorLabelContext = null;
    /* v1.10 güncelleme: İçindekiler artık yüzen bir popup — dışarı tıklanınca kapanır */
    if (DOM.$editorToc && DOM.$editorToc.style.display !== 'none' && DOM.$tocToggleBtn
        && !DOM.$editorToc.contains(e.target) && e.target !== DOM.$tocToggleBtn && !DOM.$tocToggleBtn.contains(e.target)) {
        DOM.$editorToc.style.display = 'none'; tocOpen = false; DOM.$tocToggleBtn.classList.remove('active');
    }
    const ci=$('custom-color');
    if(!ci||document.activeElement!==ci){ $('color-popup').classList.remove('open'); $('bg-color-popup').classList.remove('open'); }
});

/* ══ IMPORT / EXPORT ══ */
$('open-btn').addEventListener('click',()=>$('upload-input').click());
$('upload-input').addEventListener('change',e=>{
    const file=e.target.files[0]; if(!file) return;
    const r=new FileReader();
    r.onload=ev=>{
        try {
            const raw=JSON.parse(ev.target.result);
            /* Sarmalı format: { _notes: [...], _ai: {...}, _ccbs: [...] } */
            const importedNotes = Array.isArray(raw) ? raw : (Array.isArray(raw._notes) ? raw._notes : null);
            if(!importedNotes) throw new Error('Kök eleman bir dizi olmalı.');
            if(notes.length>0&&!confirm(`Mevcut ${notes.length} not silinecek ve içe aktarılan ${importedNotes.length} not yüklenecek.\nDevam edilsin mi?`)) return;
            notes=importedNotes.map((n,i)=>({
                id:n.id??genId(), title:typeof n.title==='string'?n.title:`İçe aktarılan not ${i+1}`,
                content:sanitize(typeof n.content==='string'?n.content:''), group:typeof n.group==='string'?n.group:'Genel',
                pinned: n.pinned||false, colorLabel: n.colorLabel||null, tags: n.tags||[],
                createdAt:typeof n.createdAt==='number'?n.createdAt:Date.now(),
                updatedAt:typeof n.updatedAt==='number'?n.updatedAt:Date.now(),
            }));
            resetEditor(); saveNotes(); render();
            /* AI ayarlarını geri yükle — yalnızca dosyada varsa, yoksa mevcut ayarlara dokunma */
            if(raw._ai && typeof raw._ai === 'object') {
                if (raw._ai.noted_ai_v1) {
                    try { patchAiCfg(JSON.parse(raw._ai.noted_ai_v1)); } catch(_) {}
                } else {
                    /* Eski format geriye dönük uyumluluk */
                    const _lsj = k => { try { return JSON.parse(raw._ai[k] || 'null'); } catch(_) { return null; } };
                    const _ls  = k => raw._ai[k] || '';
                    const sc   = _lsj('noted_ai_cfg_v1') || {};
                    patchAiCfg({ providers: _lsj('noted_ai_providers_v1') || [], pool: _lsj('noted_ai_pool_v1') || [],
                        key: _ls('noted_ai_key_v1'), sys: _ls('noted_ai_sys_v1') || sc.sys || '',
                        model: sc.model || '', temp: sc.temp ?? 0.7, ctx: sc.ctx ?? 10 });
                }
            }
            /* CCB'leri geri yükle */
            if(Array.isArray(raw._ccbs) && raw._ccbs.length > 0 && typeof window._ccbSave === 'function') {
                window._ccbSave(raw._ccbs);
                if(typeof window._ccbInjectSlash === 'function') window._ccbInjectSlash();
            }
        } catch(err){ alert('Geçersiz JSON: '+err.message); }
    };
    r.readAsText(file); e.target.value='';
});
function exportNotes() {
    const a = document.createElement('a');
    const exportAi = getAiCfg().exportAi === true;
    let payload;
    const ccbData = typeof window._ccbGetAll === 'function' ? window._ccbGetAll() : [];
    if (exportAi) {
        payload = { _notes: notes, _ai: { noted_ai_v1: JSON.stringify(getAiCfg()) } };
    } else {
        payload = { _notes: notes };
    }
    if (ccbData.length > 0) payload._ccbs = ccbData;
    a.href = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(payload, null, 2));
    a.download = 'notlar.json';
    a.click();
}

$('download-btn').addEventListener('click', exportNotes);

/* ══ LİNK TIKLAMA ══ */
DOM.$content.addEventListener('click', e => {
    const li = e.target.closest('.todo-item');
    if (li && li.closest('#content') === DOM.$content) {
        /* todo-mark span'a tıklama = checkbox toggle */
        if (e.target.classList.contains('todo-mark') || e.target.closest('.todo-mark')) {
            e.preventDefault();
            const checked = li.dataset.checked !== 'true';
            li.dataset.checked = String(checked);
            if (_editActive) _contentDirty = true;
            const text = li.querySelector('.todo-text');
            const t = text || li;
            const r = document.createRange(); r.setStart(t, 0); r.collapse(true);
            const s = window.getSelection(); s.removeAllRanges(); s.addRange(r);
            (li.closest('.ng-cell') || DOM.$content).focus();
            return;
        }
    }
    /* v1.3.2: wikilink'leri yeni sekmede açma — uygulama içinde gezin */
    const wl=e.target.closest('a.wikilink');
    if(wl){ e.preventDefault(); if(wl.dataset.noteId){ hideWlPreview(); handleEditNoteRequest(wl.dataset.noteId); } return; }
    const a=e.target.closest('a[href]:not(.wikilink)');
    if(a){ e.preventDefault(); window.open(a.href,'_blank','noopener,noreferrer'); }
});

/* Panel, layout ve fp-content içindeki todo tıklaması */
document.addEventListener('click', e => {
    const li = e.target.closest('.todo-item');
    if (!li) return;
    const ce = li.closest('.col-panel-content, .layout-col, #fp-content');
    if (!ce) return;
    if (!e.target.classList.contains('todo-mark') && !e.target.closest('.todo-mark')) return;
    e.preventDefault();
    const checked = li.dataset.checked !== 'true';
    li.dataset.checked = String(checked);
    const text = li.querySelector('.todo-text');
    const t = text || li;
    const r = document.createRange(); r.setStart(t, 0); r.collapse(true);
    const s = window.getSelection(); s.removeAllRanges(); s.addRange(r);
    ce.focus();
    if (ce.id === 'fp-content') {
        ce.dispatchEvent(new Event('input', { bubbles: true }));
    } else {
        if (_editActive) _contentDirty = true;
    }
});

/* ══ UNSAVED CHANGES ══ */
let _snapTitle='', _editActive=false, _contentDirty=false;

function editNote(id) {
    /* Aynı notu hem float editörde hem ana editörde aç engeli */
    if (typeof window._fpGetCurrentNoteId === 'function') {
        const fpId = window._fpGetCurrentNoteId();
        if (fpId && String(id) === String(fpId)) {
            if (typeof _showSnack === 'function') _showSnack('Bu not zaten ikinci editörde açık', 'warn', 2400);
            return;
        }
    }
    /* editNote her zaman ana editörü hedeflemeli — DOM.$content'i geri al */
    if (typeof activateInstance === 'function' && window._mainEditorInstance) {
        activateInstance(window._mainEditorInstance);
    }
    if (typeof window._undoSetupStart === 'function') window._undoSetupStart();
    const n=notes.find(x=>String(x.id)===String(id)); if(!n) return;
    document.body.classList.remove('editor-pristine');
    document.body.classList.remove('cf-ready');
    DOM.$title.value=n.title; DOM.$editId.value=n.id; editorGroup=n.group;
    DOM.$content.innerHTML=sanitize(n.content);
    if ((n.title||'').trim()||(n.content||'').trim()) document.body.classList.add('cf-ready');
    _upgradeGridWraps(DOM.$content);
    if (typeof window._inflateCcbBlocks === 'function') window._inflateCcbBlocks(DOM.$content);
    if (typeof window._resetEditorZoom === 'function') window._resetEditorZoom();
    initShapeOverlays();

    /* Eski formattaki todo kalıntılarını yeni yapıya dönüştür */
    DOM.$content.querySelectorAll('.todo-cb').forEach(cb => cb.remove());
    DOM.$content.querySelectorAll('.todo-item-text').forEach(wrap => {
        const text = document.createElement('span');
        text.className = 'todo-text';
        while (wrap.firstChild) text.appendChild(wrap.firstChild);
        wrap.parentNode.replaceChild(text, wrap);
    });
    /* todo-mark yoksa ekle */
    DOM.$content.querySelectorAll('.todo-item').forEach(li => {
        if (!li.querySelector('.todo-mark')) {
            const mark = document.createElement('span');
            mark.className = 'todo-mark'; mark.contentEditable = 'false';
            li.insertBefore(mark, li.firstChild);
        }
        if (!li.querySelector('.todo-text')) {
            const text = document.createElement('span');
            text.className = 'todo-text';
            const children = [...li.childNodes].filter(n => !n.classList?.contains('todo-mark'));
            children.forEach(c => text.appendChild(c));
            li.appendChild(text);
        }
    });

    _restoreGrids();
        setEditorLocked(n.locked || false);
    _snapTitle=n.title; _editActive=true; _contentDirty=false;
    /* v1.1 */
    editorPinned=n.pinned||false; editorColorLabel=n.colorLabel||null;
    updateEditorPinBtn(editorPinned); updateColorLabelBtn(editorColorLabel);
    /* v1.6 */
    /* Migrate legacy single reminder → array */
    const _rems = n.reminders || (n.reminder && n.reminder.at ? [{ at: n.reminder.at, fired: n.reminder.fired || false, title: n.reminder.reminderTitle || '' }] : []);
    updateReminderBtn(_rems, n.reminderNote || (n.reminder && n.reminder.reminderNote) || '');
    tocOpen = false; buildTocPanel(n.id);
    if (DOM.$reminderBtn) DOM.$reminderBtn.classList.remove('hidden');
    if (DOM.$exportMdBtn) DOM.$exportMdBtn.removeAttribute('disabled');
    const _expHtmlBtn = $('export-html-btn'); if (_expHtmlBtn) _expHtmlBtn.removeAttribute('disabled');
    DOM.$editor.classList.add('editing-active'); DOM.$cancelBtn.removeAttribute('disabled'); $('edit-del-btn').classList.remove('hidden');
    updateFooterVisibility();
    window.scrollTo({top:0,behavior:'smooth'});
    const _splitMp = document.querySelector('.main-panel.fp-split-mode');
    if (_splitMp) _splitMp.scrollTo({top:0,behavior:'smooth'});
    render();
    /* render() ve DOM manipülasyonları bittikten sonra flag'i sıfırla —
       ara adımlarda tetiklenmiş olabilecek sahte input eventlerini temizle */
    requestAnimationFrame(() => { _contentDirty = false; if (typeof window._undoSetupEnd === 'function') window._undoSetupEnd(); });
}

function resetEditor() {
    /* DOM.$content'in her zaman ana editörü gösterdiğinden emin ol */
    if (typeof activateInstance === 'function' && window._mainEditorInstance) {
        activateInstance(window._mainEditorInstance);
    }
    if (typeof window.clearUndoHistory === 'function') window.clearUndoHistory();
    setEditorLocked(false);
    DOM.$title.value=''; DOM.$content.innerHTML=''; DOM.$editId.value=''; editorGroup='Genel';
    _snapTitle=''; _editActive=false; _contentDirty=false;
    /* v1.1 */
    editorPinned=false; editorColorLabel=null;
    updateEditorPinBtn(false); updateColorLabelBtn(null);
    /* v1.6 */
    updateReminderBtn([], ''); tocOpen=false;
    if (DOM.$editorToc) DOM.$editorToc.style.display='none';
    if (DOM.$editorTocList) DOM.$editorTocList.innerHTML='';
    if (DOM.$tocToggleBtn) { DOM.$tocToggleBtn.classList.add('hidden'); DOM.$tocToggleBtn.classList.remove('active'); }
    if (DOM.$reminderBtn) DOM.$reminderBtn.classList.add('hidden');
    if (DOM.$exportMdBtn) DOM.$exportMdBtn.setAttribute('disabled', '');
    const _expHtmlBtn2 = $('export-html-btn'); if (_expHtmlBtn2) _expHtmlBtn2.setAttribute('disabled', '');
    closeReminderPopup();
    DOM.$editor.classList.remove('editing-active'); DOM.$cancelBtn.setAttribute('disabled', ''); $('edit-del-btn').classList.add('hidden');
    updateFooterVisibility();
    document.body.classList.add('editor-pristine');
    document.body.classList.remove('cf-ready');
}

function _twNormalizeHTML(html) {
    if (html.indexOf('tw-active') === -1 && html.indexOf('tw-todo-active') === -1) return html;
    const tmp = document.createElement('div');
    tmp.innerHTML = html;
    tmp.querySelectorAll('.tw-active, .tw-todo-active').forEach(function (el) {
        el.classList.remove('tw-active', 'tw-todo-active');
        if (!el.classList.length) el.removeAttribute('class');
    });
    return tmp.innerHTML;
}

/* ── Değişiklik tespiti: input-flag ── */
function _markDirty() { _contentDirty = true; }

/* DOM.$content ve panel içerikleri için input listener'ı bağla */
function _bindDirtyListeners() {
    DOM.$content.addEventListener('input', () => {
        _contentDirty = true;
    });
    DOM.$title.addEventListener('input', () => {
        _contentDirty = true;
        updateFooterVisibility();
    });
    document.addEventListener('input', e => {
        if (e.target.classList.contains('col-panel-content') ||
            e.target.classList.contains('col-panel-title') ||
            e.target.classList.contains('layout-col'))
            _contentDirty = true;
    });
}
_bindDirtyListeners();

function hasUnsavedChanges() {
    if (!_editActive) return false;
    if (DOM.$title.value.trim() !== _snapTitle) return true;
    return _contentDirty;
}

function handleEditNoteRequest(id) {
    if(String(DOM.$editId.value)===String(id)) return;
    if(hasUnsavedChanges()){ pendingNoteId=id; $('save-confirm-toast-overlay').classList.add('show'); }
    else editNote(id);
}

/* ══ SAVE-CONFIRM ══ */
$('toast-save-yes').addEventListener('click',()=>{
    $('save-confirm-toast-overlay').classList.remove('show');
    const title=DOM.$title.value.trim(), rawHtml=DOM.$content.innerHTML;
    if(title&&stripHtml(rawHtml).trim()) saveNote(); else resetEditor();
    const next=pendingNoteId; pendingNoteId=null; if(next) editNote(next);
});
$('toast-save-no').addEventListener('click',()=>{
    $('save-confirm-toast-overlay').classList.remove('show'); resetEditor();
    const next=pendingNoteId; pendingNoteId=null; if(next) editNote(next);
});
$('toast-save-cancel').addEventListener('click',()=>{ $('save-confirm-toast-overlay').classList.remove('show'); pendingNoteId=null; });
$('delete-toast-overlay').addEventListener('click',e=>{ if(e.target!==$('delete-toast-overlay'))return; deleteTargetId=null;deletePermanent=false;$('delete-toast-overlay').classList.remove('show'); });
$('save-confirm-toast-overlay').addEventListener('click',e=>{ if(e.target!==$('save-confirm-toast-overlay'))return; $('save-confirm-toast-overlay').classList.remove('show');pendingNoteId=null; });


/* ══ v1.2: ŞABLON ══ */
Const.TEMPLATES_V2 = {
    daily: {
        title: () => {
            const d = new Date();
            return 'Günlük Not — ' + d.toLocaleDateString('tr-TR', {day:'2-digit',month:'long',year:'numeric'});
        },
        content: '<h2>Bugün Ne Yaptım?</h2><p><br></p><h2>Yarın Ne Yapacağım?</h2><p><br></p><h2>Notlar</h2><p><br></p>'
    },
    meeting: {
        title: () => {
            const d = new Date();
            return 'Toplantı — ' + d.toLocaleDateString('tr-TR', {day:'2-digit',month:'long',year:'numeric'});
        },
        content: '<h2>Katılımcılar</h2><p><br></p><h2>Gündem</h2><p><br></p><h2>Kararlar</h2><p><br></p><h2>Aksiyon Maddeleri</h2><p><br></p>'
    },
    idea: {
        title: () => 'Yeni Fikir',
        content: '<h2>Problem</h2><p><br></p><h2>Çözüm</h2><p><br></p><h2>Sonraki Adımlar</h2><p><br></p>'
    }
};

function applyTemplate(tplKey) {
    const tpl = Const.TEMPLATES_V2[tplKey];
    if (!tpl) return;
    closeTemplateDropdown();
    if (typeof window._closeEditorMenu === 'function') window._closeEditorMenu();
    if (typeof activateInstance === 'function' && window._mainEditorInstance) activateInstance(window._mainEditorInstance);
    DOM.$title.value = tpl.title();
    DOM.$content.innerHTML = sanitize(tpl.content);
    _snapTitle = '';
    updateFooterVisibility();
    DOM.$title.focus();
}

function toggleTemplateDropdown() {
    const dd = $('template-dropdown');
    if (!dd.classList.contains('show')) buildTemplateDropdownContent();
    dd.classList.toggle('show');
}
function closeTemplateDropdown() {
    $('template-dropdown').classList.remove('show');
}

$('template-btn').addEventListener('click', e => { e.stopPropagation(); toggleTemplateDropdown(); });
(function() {
    const btn = $('pdf-btn');
    if (!btn) return;
    btn.addEventListener('click', function() {
        const eId = DOM.$editId.value;
        const n = eId ? notes.find(x => String(x.id) === String(eId)) : null;
        if (!n) { alert('Yazdırmak için önce bir not açın.'); return; }
        /* Geçici print iframe ile notu izole ederek yazdır */
        const html = `<!DOCTYPE html><html><head><meta charset="utf-8">
<title>${esc(n.title)}</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:Georgia,serif;max-width:720px;margin:40px auto;padding:0 40px;color:#1a1a1a;line-height:1.7}
h1{font-size:1.8rem;font-weight:700;margin-bottom:6px;line-height:1.2}
.meta{color:#888;font-size:.82rem;margin-bottom:28px}
h2{font-size:1.25rem;margin:22px 0 6px;font-weight:700}
h3{font-size:1.05rem;margin:16px 0 5px;font-weight:700}
p{margin:6px 0}
ul,ol{padding-left:22px;margin:8px 0}li{margin:3px 0}
blockquote{border-left:3px solid #3B82F6;padding:6px 14px;margin:10px 0;color:#555;font-style:italic}
code{background:#EFF6FF;color:#2563EB;border:1px solid #BFDBFE;padding:1px 5px;border-radius:3px;font-family:monospace;font-size:.88em}
pre{background:#1E293B;color:#E2E8F0;padding:14px;border-radius:6px;overflow-x:auto;margin:8px 0}
a{color:#3B82F6;text-decoration:none}
@media print{body{margin:0;padding:20px}}
</style></head><body>
<h1>${esc(n.title)}</h1>
<div class="meta">${n.updatedAt ? new Date(n.updatedAt).toLocaleDateString('tr-TR',{day:'2-digit',month:'long',year:'numeric'}) : ''}</div>
${sanitize(n.content)}
</body></html>`;
        const iframe = document.createElement('iframe');
        iframe.style.cssText = 'position:fixed;top:-9999px;left:-9999px;width:0;height:0;border:none';
        document.body.appendChild(iframe);
        iframe.contentDocument.open();
        iframe.contentDocument.write(html);
        iframe.contentDocument.close();
        iframe.contentWindow.focus();
        setTimeout(() => {
            iframe.contentWindow.print();
            setTimeout(() => document.body.removeChild(iframe), 1000);
        }, 300);
    });
})();
$('template-dropdown').addEventListener('click', e => {
    const item = e.target.closest('.tpl-item');
    if (item) applyTemplate(item.dataset.tpl);
});
document.addEventListener('click', e => {
    if (!e.target.closest('#template-wrap')) closeTemplateDropdown();
});

/* ══ v1.2: HIZLI YAKALAMA ══ */
function openQuickCapture() {
    $('qc-title').value = '';
    $('qc-content').value = '';
    $('qc-overlay').classList.add('show');
    setTimeout(() => $('qc-content').focus(), 60);
}
function closeQuickCapture() {
    $('qc-overlay').classList.remove('show');
}
function saveQuickCapture() {
    const title = $('qc-title').value.trim();
    const raw   = $('qc-content').value.trim();
    if (!title && !raw) { closeQuickCapture(); return; }
    const content = sanitize(
        raw.split('\n').map(l => l.trim() ? '<p>' + esc(l) + '</p>' : '<p><br></p>').join('')
    );
    const tags = parseTagsFromContent(raw);
    notes.push({
        id: genId(), title: title || 'Hızlı Not', content, contentMd: htmlToMd(content),
        group: 'Genel', pinned: false, colorLabel: null,
        tags, createdAt: Date.now(), updatedAt: Date.now()
    });
    saveNotes(); render(); closeQuickCapture();
}

$('qc-save').addEventListener('click', saveQuickCapture);
$('qc-cancel').addEventListener('click', closeQuickCapture);
$('qc-overlay').addEventListener('click', e => { if (e.target === $('qc-overlay')) closeQuickCapture(); });
$('qc-content').addEventListener('keydown', e => {
    if (e.ctrlKey && e.key === 'Enter') { e.preventDefault(); saveQuickCapture(); }
});

/* ══ v1.2: KELIME SAYACI ══ */
function updateFooterVisibility() {
    const cf = document.querySelector('.content-footer');
    if (!cf) return;
    /* Başlık varsa footer görünür — içerik şartı yok */
    const hasTitle = !!((DOM.$title.value || '').trim());
    cf.classList.toggle('cf-empty', !hasTitle);
}
DOM.$content.addEventListener('input', () => { updateFooterVisibility(); }, { passive: true });
/* Panel içerikleri değişince footer'ı güncelle */
document.addEventListener('input', e => {
    if (e.target.classList.contains('col-panel-content') ||
        e.target.classList.contains('col-context-area')) {
        updateFooterVisibility();
    }
}, { passive: true });
updateFooterVisibility();

/* ══ GLOBAL KISAYOLLAR ══ */


