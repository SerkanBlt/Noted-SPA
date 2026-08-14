/* ══ ACCORDION & EXPAND ══ */
function toggleAccordion(name) {
    if (State.openGroups.includes(name)) State.openGroups=State.openGroups.filter(x=>x!==name); else State.openGroups.push(name);
    localStorage.setItem('noted_groups_v1',JSON.stringify(State.openGroups)); render();
}
function toggleExpand(id) { State.expandedNotes.has(id)?State.expandedNotes.delete(id):State.expandedNotes.add(id); render(); }

/* ══ SEARCH ══ */
DOM.searchInput=$('search-input'); DOM.searchClear=$('search-clear');
function clearSearch() {
    DOM.searchInput.value=''; State.searchQuery=''; DOM.searchClear.classList.remove('visible'); render();
}
DOM.renderDebounced=debounce(render,150);
DOM.searchInput.addEventListener('input', e => {
    State.searchQuery=e.target.value.trim(); DOM.searchClear.classList.toggle('visible',State.searchQuery.length>0); DOM.renderDebounced();
});
DOM.searchInput.addEventListener('keydown', e => {
    if (e.key==='Escape') { clearSearch(); DOM.searchInput.blur(); }
});
DOM.searchClear.addEventListener('click', e => { e.stopPropagation(); clearSearch(); DOM.searchInput.focus(); });

/* v1.3: arama operatörleri ipucu */
/* Gelişmiş arama operatörleri — hover ile göster/gizle */
/* Faz 4c: sadece bu blok içinde kullanılan durum IIFE'ye kapatıldı */
(function() {
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
})();

/* ══ VOICE SEARCH ══ */
(function() {
    const SR=window.SpeechRecognition||window.webkitSpeechRecognition; if(!SR) return;
    const micBtn=$('search-mic'), recognition=new SR(), _se=$('search-expand');
    recognition.lang=(window._notedLocale ? window._notedLocale() : 'tr-TR'); recognition.continuous=false; recognition.interimResults=true;
    micBtn.classList.add('available');
    recognition.onresult=e => {
        const raw=Array.from(e.results).map(r=>r[0].transcript).join('');
        const transcript=raw.replace(/[.,،؟?!;:]/g,'').trim();
        DOM.searchInput.value=transcript; State.searchQuery=transcript;
        DOM.searchClear.classList.toggle('visible',transcript.length>0); render();
    };
    recognition.onend=()=>{ micBtn.classList.remove('listening'); micBtn.title=_t('lhr.searchmic', 'Sesle ara'); };
    recognition.onerror=e=>{ micBtn.classList.remove('listening'); micBtn.title=_t('lhr.searchmic', 'Sesle ara'); };
    micBtn.addEventListener('click', e => {
        e.stopPropagation();
        if (_se && !_se.classList.contains('open')) { _se.classList.add('open'); DOM.searchInput.focus(); }
        if (micBtn.classList.contains('listening')) recognition.stop();
        else { recognition.lang=(window._notedLocale ? window._notedLocale() : 'tr-TR'); recognition.start(); micBtn.classList.add('listening'); micBtn.title=_t('mic.listening', 'Dinleniyor…'); }
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
    popup.innerHTML = '';
    const grid=document.createElement('div'); grid.className='color-swatches';
    const rm=document.createElement('div'); rm.className='cswatch remove'; rm.title=_t('color.remove', 'Rengi kaldır');
    rm.addEventListener('mousedown',e=>{ e.preventDefault(); e.stopPropagation(); applyColor(null); });
    grid.appendChild(rm);
    Const.PALETTE.forEach(c => {
        const s=document.createElement('div'); s.className='cswatch'; s.style.background=c; s.title=c;
        s.addEventListener('mousedown',e=>{ e.preventDefault(); e.stopPropagation(); applyColor(c); });
        grid.appendChild(s);
    });
    const customRow=document.createElement('div'); customRow.className='color-custom';
    customRow.innerHTML='<label>'+esc(_t('color.custom', 'Özel renk'))+'</label><input type="color" id="custom-color" value="#000000">';
    popup.appendChild(grid); popup.appendChild(customRow);
    const ci=$('custom-color');
    ci.addEventListener('input',e=>applyColor(e.target.value,false));
    ci.addEventListener('click',e=>e.stopPropagation()); ci.addEventListener('mousedown',e=>e.stopPropagation());
    function applyColor(color,close=true) {
        _restoreToolbarSel();
        if (color) {
            document.execCommand('foreColor',false,color);
            const et = (EditorState._savedToolbarSel && EditorState._savedToolbarSel.et) || EditorState._activeEditTarget || DOM.$content;
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
    const vri=$('voice-record-indicator');
    const vriPauseBtn=$('vri-pause-btn'), vriResumeBtn=$('vri-resume-btn'), vriStopBtn=$('vri-stop-btn');
    recognition.lang=(window._notedLocale ? window._notedLocale() : 'tr-TR'); recognition.continuous=true; recognition.interimResults=true;
    micBtn.classList.add('available');
    /* Web Speech API'de gerçek "duraklat" yok — Duraklat aslında recognition.stop() çağırıyor,
       _paused bayrağı onend'in normalde yaptığı otomatik yeniden-başlatmayı (continuous mod
       kendi kendini iyileştirir) bastırıyor. Devam Et tekrar recognition.start() çağırır. */
    let _paused = false;
    function setPaused(on) {
        _paused = on;
        if (vri) vri.classList.toggle('paused', on);
    }
    function setListening(on) {
        micBtn.classList.toggle('listening', on);
        micBtn.title = on ? _t('mic.listeningstop', 'Dinleniyor — durdurmak için tıkla') : _t('cf.voicewrite', 'Sesle Yaz');
        if (editorEl) editorEl.classList.toggle('mic-listening', on);
        if (!on) { interimEl.textContent=''; interimEl.classList.remove('visible'); setPaused(false); }
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
    recognition.onend=()=>{
        if (!micBtn.classList.contains('listening')) { setListening(false); return; }
        if (_paused) return; /* Duraklat tarafından durduruldu — otomatik yeniden başlatma yok */
        try{recognition.start();}catch(e){}
    };
    recognition.onerror=e=>{ if(e.error==='aborted') return; setListening(false); };
    micBtn.addEventListener('click',e=>{
        e.stopPropagation();
        if(micBtn.classList.contains('listening')) { setListening(false); recognition.stop(); }
        else { recognition.lang=(window._notedLocale ? window._notedLocale() : 'tr-TR'); DOM.$content.focus(); recognition.start(); setListening(true); }
    });
    if (vriPauseBtn) vriPauseBtn.addEventListener('click', e => {
        e.stopPropagation();
        if (!micBtn.classList.contains('listening') || _paused) return;
        setPaused(true); recognition.stop();
    });
    if (vriResumeBtn) vriResumeBtn.addEventListener('click', e => {
        e.stopPropagation();
        if (!micBtn.classList.contains('listening') || !_paused) return;
        setPaused(false); DOM.$content.focus(); try{recognition.start();}catch(err){}
    });
    if (vriStopBtn) vriStopBtn.addEventListener('click', e => {
        e.stopPropagation();
        setListening(false); recognition.stop();
    });
})();

/* ══ ARKA PLAN RENGİ ══ */
(function() {
    let lastBgColor='#ffff00';
    const popup=$('bg-color-popup'), bar=$('bg-color-bar');
    popup.innerHTML = '';
    const grid=document.createElement('div'); grid.className='color-swatches';
    const rm=document.createElement('div'); rm.className='cswatch remove'; rm.title=_t('bgcolor.remove', 'Arka planı kaldır');
    rm.addEventListener('mousedown',e=>{ e.preventDefault(); e.stopPropagation(); applyBgColor(null); });
    grid.appendChild(rm);
    Const.PALETTE.forEach(c=>{
        const s=document.createElement('div'); s.className='cswatch'; s.style.background=c; s.title=c;
        s.addEventListener('mousedown',e=>{ e.preventDefault(); e.stopPropagation(); applyBgColor(c); });
        grid.appendChild(s);
    });
    const customRow=document.createElement('div'); customRow.className='color-custom';
    customRow.innerHTML='<label>'+esc(_t('color.custom', 'Özel renk'))+'</label><input type="color" id="bg-custom-color" value="#ffff00">';
    popup.appendChild(grid); popup.appendChild(customRow);
    const ci=$('bg-custom-color');
    ci.addEventListener('input',e=>applyBgColor(e.target.value,false));
    ci.addEventListener('click',e=>e.stopPropagation()); ci.addEventListener('mousedown',e=>e.stopPropagation());
    function closeColorPopup() { const p=$('bg-color-popup'); if(p) p.classList.remove('open'); }
function applyBgColor(color,close=true) {
        _restoreToolbarSel();
        /* Grid hücresi: imlecin olduğu hücre — EditorState._activeEditTarget ile bul */
        const activeCell = EditorState._activeEditTarget && EditorState._activeEditTarget.closest('.ng-cell, .ng-title')
                           ? EditorState._activeEditTarget
                           : (document.activeElement && document.activeElement.closest('.ng-cell, .ng-title')
                              ? document.activeElement : null);
        if (activeCell) {
            const td = activeCell.closest('td, th');
            if (td) {
                const table = td.closest('.noted-grid');
                const gType = table ? table.dataset.gridType : '';
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
        const et = (EditorState._savedToolbarSel && EditorState._savedToolbarSel.et) || EditorState._activeEditTarget;
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
    const et  = (EditorState._savedToolbarSel && EditorState._savedToolbarSel.et) || EditorState._activeEditTarget || DOM.$content;
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
        EditorState._savedToolbarSel = null;
        return;
    }

    if (prop === 'fontSize') {
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
        EditorState._savedToolbarSel = { et, range: newRange.cloneRange() };
        return;
    }

    /* Genel inline stil */
    const range = sel.getRangeAt(0);
    const span  = document.createElement('span');
    span.style[prop] = value;
    try { range.surroundContents(span); }
    catch { const frag = range.extractContents(); span.appendChild(frag); range.insertNode(span); }
    EditorState._savedToolbarSel = null;
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
        const _etd = EditorState._activeEditTarget || DOM.$content;
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

    let _fontSelSnapshot = null;
    $('tb-font-select').addEventListener('mousedown', () => {
        _saveToolbarSel();
        _fontSelSnapshot = EditorState._savedToolbarSel
            ? { et: EditorState._savedToolbarSel.et, range: EditorState._savedToolbarSel.range.cloneRange() }
            : null;
    });
    $('tb-font-select').addEventListener('change', function() {
        if (!this.value) return;
        if (_fontSelSnapshot) {
            EditorState._savedToolbarSel = _fontSelSnapshot;
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
        if (typeof EditorState.slashMenuOpen !== 'undefined' && EditorState.slashMenuOpen) closeSlashMenu();
        closeQuickCapture();
        closeTemplateDropdown();
        if (State.focusModeActive) toggleFocusMode(true);
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
    if (_ctrl && _shift && _key === 't') { e.preventDefault(); if (EditorState._editActive || _fpFocused()) { _restoreToolbarSel(); insertTimestamp(); } }
    /* Ctrl+Shift+U — madde listesi */
    if (_ctrl && _shift && _key === 'u') { e.preventDefault(); if (EditorState._editActive || _fpFocused()) { _restoreToolbarSel(); document.execCommand('insertUnorderedList', false, null); } }
    /* Ctrl+Shift+O — sıralı liste */
    if (_ctrl && _shift && _key === 'o') { e.preventDefault(); if (EditorState._editActive || _fpFocused()) { _restoreToolbarSel(); document.execCommand('insertOrderedList', false, null); } }
    /* Ctrl+Shift+K — görev listesi (Ctrl+K Quick Switcher'dan ayrı: Shift gerekli) */
    if (_ctrl && _shift && _key === 'k') { e.preventDefault(); if (EditorState._editActive || _fpFocused()) { _restoreToolbarSel(); runSpecial('todo'); } }
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
        DOM.$editorToc.style.display = 'none'; State.tocOpen = false; DOM.$tocToggleBtn.classList.remove('active');
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
            if(!importedNotes) throw new Error(NotedI18n.t('msg.rootmustbearray'));
            if(State.notes.length>0&&!confirm(NotedI18n.t('msg.importwillreplace').replace('{n1}',State.notes.length).replace('{n2}',importedNotes.length))) return;
            State.notes=importedNotes.map((n,i)=>({
                id:n.id??genId(), title:typeof n.title==='string'?n.title:NotedI18n.t('msg.importednotetitle').replace('{n}',i+1),
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
        } catch(err){ alert(NotedI18n.t('msg.invalidjson')+err.message); }
    };
    r.readAsText(file); e.target.value='';
});
function exportNotes() {
    const a = document.createElement('a');
    const exportAi = getAiCfg().exportAi === true;
    let payload;
    const ccbData = typeof window._ccbGetAll === 'function' ? window._ccbGetAll() : [];
    if (exportAi) {
        payload = { _notes: State.notes, _ai: { noted_ai_v1: JSON.stringify(getAiCfg()) } };
    } else {
        payload = { _notes: State.notes };
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
            if (EditorState._editActive) EditorState._contentDirty = true;
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
        if (EditorState._editActive) EditorState._contentDirty = true;
    }
});

/* ══ UNSAVED CHANGES ══ */
EditorState._snapTitle=''; EditorState._editActive=false; EditorState._contentDirty=false;

function editNote(id) {
    /* Aynı notu hem float editörde hem ana editörde aç engeli */
    if (typeof window._fpGetCurrentNoteId === 'function') {
        const fpId = window._fpGetCurrentNoteId();
        if (fpId && String(id) === String(fpId)) {
            if (typeof _showSnack === 'function') _showSnack(NotedI18n.t('msg.notealreadyopenfp'), 'warn', 2400);
            return;
        }
    }
    /* editNote her zaman ana editörü hedeflemeli — DOM.$content'i geri al */
    if (typeof activateInstance === 'function' && window._mainEditorInstance) {
        activateInstance(window._mainEditorInstance);
    }
    /* EditorState._activeEditTarget ayrı bir sistemdir (toolbar formatlama) — yalnızca
       gerçek focus event'leriyle güncellenir, activateInstance onu taşımaz. Float panel
       veya bir grid hücresi son odaklanan yerdiyse burada takılı kalabilir; ana editör
       toolbar'ı (Kalın/İtalik/liste) o zaman yanlış elemente uygulanmaya çalışır. */
    EditorState._activeEditTarget = DOM.$content;
    EditorState._savedToolbarSel = null;
    if (typeof window._undoSetupStart === 'function') window._undoSetupStart();
    const n=State.notes.find(x=>String(x.id)===String(id)); if(!n) return;
    document.body.classList.remove('editor-pristine');
    document.body.classList.remove('cf-ready');
    DOM.$title.value=n.title; DOM.$editId.value=n.id; State.editorGroup=n.group;
    DOM.$content.innerHTML=sanitize(n.content);
    if ((n.title||'').trim()||(n.content||'').trim()) document.body.classList.add('cf-ready');
    _upgradeGridWraps(DOM.$content);
    if (typeof window._inflateCcbBlocks === 'function') window._inflateCcbBlocks(DOM.$content);
    /* forceCollapse=true — issue #16: not açıldığında kod blokları her zaman daraltılmış gelsin */
    if (typeof window._inflateCodeBlocks === 'function') window._inflateCodeBlocks(DOM.$content, true);
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
    EditorState._snapTitle=n.title; EditorState._editActive=true; EditorState._contentDirty=false;
    /* v1.1 */
    State.editorPinned=n.pinned||false; State.editorColorLabel=n.colorLabel||null;
    updateEditorPinBtn(State.editorPinned); updateColorLabelBtn(State.editorColorLabel);
    /* v1.6 */
    /* Migrate legacy single reminder → array */
    const _rems = n.reminders || (n.reminder && n.reminder.at ? [{ at: n.reminder.at, fired: n.reminder.fired || false, title: n.reminder.reminderTitle || '' }] : []);
    updateReminderBtn(_rems, n.reminderNote || (n.reminder && n.reminder.reminderNote) || '');
    State.tocOpen = false; buildTocPanel();
    if (DOM.$reminderBtn) DOM.$reminderBtn.classList.remove('hidden');
    DOM.$editor.classList.add('editing-active'); DOM.$cancelBtn.removeAttribute('disabled'); $('edit-del-btn').classList.remove('hidden');
    /* export-md-btn/export-html-btn artık updateFooterVisibility() içinde (hasTitle kriteriyle) etkinleşiyor */
    updateFooterVisibility();
    window.scrollTo({top:0,behavior:'smooth'});
    const _splitMp = document.querySelector('.main-panel.fp-split-mode');
    if (_splitMp) _splitMp.scrollTo({top:0,behavior:'smooth'});
    render();
    requestAnimationFrame(() => { EditorState._contentDirty = false; if (typeof window._undoSetupEnd === 'function') window._undoSetupEnd(); });
}

function resetEditor() {
    /* DOM.$content'in her zaman ana editörü gösterdiğinden emin ol */
    if (typeof activateInstance === 'function' && window._mainEditorInstance) {
        activateInstance(window._mainEditorInstance);
    }
    if (typeof window.clearUndoHistory === 'function') window.clearUndoHistory();
    setEditorLocked(false);
    DOM.$title.value=''; DOM.$content.innerHTML=''; DOM.$editId.value=''; State.editorGroup='Genel';
    EditorState._snapTitle=''; EditorState._editActive=false; EditorState._contentDirty=false;
    /* v1.1 */
    State.editorPinned=false; State.editorColorLabel=null;
    updateEditorPinBtn(false); updateColorLabelBtn(null);
    /* v1.6 */
    updateReminderBtn([], ''); State.tocOpen=false;
    if (DOM.$editorToc) DOM.$editorToc.style.display='none';
    if (DOM.$editorTocList) DOM.$editorTocList.innerHTML='';
    if (DOM.$tocToggleBtn) { DOM.$tocToggleBtn.classList.add('hidden'); DOM.$tocToggleBtn.classList.remove('active'); }
    if (DOM.$reminderBtn) DOM.$reminderBtn.classList.add('hidden');
    /* export-md-btn/export-html-btn artık updateFooterVisibility() içinde (hasTitle kriteriyle) devre dışı bırakılıyor */
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
function _markDirty() { EditorState._contentDirty = true; }

/* DOM.$content ve panel içerikleri için input listener'ı bağla */
function _bindDirtyListeners() {
    DOM.$content.addEventListener('input', () => {
        EditorState._contentDirty = true;
    });
    DOM.$title.addEventListener('input', () => {
        EditorState._contentDirty = true;
        updateFooterVisibility();
    });
    document.addEventListener('input', e => {
        if (e.target.classList.contains('col-panel-content') ||
            e.target.classList.contains('col-panel-title') ||
            e.target.classList.contains('layout-col'))
            EditorState._contentDirty = true;
    });
}
_bindDirtyListeners();

function hasUnsavedChanges() {
    if (!EditorState._editActive) return false;
    if (DOM.$title.value.trim() !== EditorState._snapTitle) return true;
    return EditorState._contentDirty;
}

function handleEditNoteRequest(id) {
    if(String(DOM.$editId.value)===String(id)) return;
    if(hasUnsavedChanges()){ State.pendingNoteId=id; $('save-confirm-toast-overlay').classList.add('show'); }
    else editNote(id);
}

/* ══ SAVE-CONFIRM ══ */
$('toast-save-yes').addEventListener('click',()=>{
    $('save-confirm-toast-overlay').classList.remove('show');
    const title=DOM.$title.value.trim(), rawHtml=DOM.$content.innerHTML;
    if(title&&stripHtml(rawHtml).trim()) saveNote(); else resetEditor();
    const next=State.pendingNoteId; State.pendingNoteId=null; if(next) editNote(next);
});
$('toast-save-no').addEventListener('click',()=>{
    $('save-confirm-toast-overlay').classList.remove('show'); resetEditor();
    const next=State.pendingNoteId; State.pendingNoteId=null; if(next) editNote(next);
});
$('toast-save-cancel').addEventListener('click',()=>{ $('save-confirm-toast-overlay').classList.remove('show'); State.pendingNoteId=null; });
$('delete-toast-overlay').addEventListener('click',e=>{ if(e.target!==$('delete-toast-overlay'))return; State.deleteTargetId=null;State.deletePermanent=false;$('delete-toast-overlay').classList.remove('show'); });
$('save-confirm-toast-overlay').addEventListener('click',e=>{ if(e.target!==$('save-confirm-toast-overlay'))return; $('save-confirm-toast-overlay').classList.remove('show');State.pendingNoteId=null; });


/* ══ v1.2: ŞABLON ══ */
Const.TEMPLATES_V2 = {
    daily: {
        title: () => {
            const d = new Date();
            return 'Günlük Not — ' + d.toLocaleDateString(_notedLocale(), {day:'2-digit',month:'long',year:'numeric'});
        },
        content: '<h2>Bugün Ne Yaptım?</h2><p><br></p><h2>Yarın Ne Yapacağım?</h2><p><br></p><h2>Notlar</h2><p><br></p>'
    },
    meeting: {
        title: () => {
            const d = new Date();
            return 'Toplantı — ' + d.toLocaleDateString(_notedLocale(), {day:'2-digit',month:'long',year:'numeric'});
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
    if (typeof window._inflateCodeBlocks === 'function') window._inflateCodeBlocks(DOM.$content);
    EditorState._snapTitle = '';
    updateFooterVisibility();
    /* innerHTML atamasi native 'input' olayi FIRLATMAZ (yalnizca kullanici yazimi/execCommand
       fırlatır) — buildTocPanel()'in dinleyicisi bu yuzden burada kendiliginden tetiklenmez,
       elle cagirmak gerekiyor (bkz. why-buildtocpanel-needs-explicit-calls-for-programmatic-inserts). */
    if (typeof buildTocPanel === 'function') buildTocPanel();
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
        const n = eId ? State.notes.find(x => String(x.id) === String(eId)) : null;
        if (!n) { alert(NotedI18n.t('msg.printopenfirst')); return; }
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
<div class="meta">${n.updatedAt ? new Date(n.updatedAt).toLocaleDateString(_notedLocale(),{day:'2-digit',month:'long',year:'numeric'}) : ''}</div>
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
    State.notes.push({
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
    /* v1.16.15: HTML/Markdown dışa aktarma artık kaydedilmemiş notlarda da (canlı editör
       durumundan) çalışıyor — bu yüzden düğmeler artık yalnızca editNote()'ta (kayıtlı not
       açılışında) değil, footer'ın geri kalanıyla AYNI kriterle (başlık var mı) her yerde
       tutarlı şekilde etkinleşiyor. Bu fonksiyon zaten her içerik/başlık değişiminde çağrılıyor
       (input dinleyicileri, editNote, resetEditor, applyTemplate, undo/redo, grid'ler, AI…). */
    if (DOM.$exportMdBtn) DOM.$exportMdBtn.toggleAttribute('disabled', !hasTitle);
    const _expHtmlBtn3 = document.getElementById('export-html-btn');
    if (_expHtmlBtn3) _expHtmlBtn3.toggleAttribute('disabled', !hasTitle);
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


