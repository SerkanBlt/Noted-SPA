/* ════════════════════════════════════════════════════════════════════
   NOTED GRID SİSTEMİ — Panel · Tablo · Kolon
   Tek <table class="noted-grid grid-{type}"> elementi
   ════════════════════════════════════════════════════════════════════ */

/**
 * createGrid(type, cols, rows)
 *   type : 'panel' | 'table' | 'column'
 *   cols : sütun sayısı (varsayılan 3)
 *   rows : satır sayısı — sadece table (varsayılan 3, panel 1 içerik satırı)
 *   colWidths: [px, px, ...] — kaydedilmiş genişlikler (isteğe bağlı)
 */
/* Eski notlardaki tablo hücrelerine ng-v-wrap ekler (wrapper olmadan kaydedilmiş notlar) */
function _upgradeGridWraps(root) {
    root.querySelectorAll('.noted-grid tbody td').forEach(td => {
        const cell = td.querySelector('.ng-cell');
        if (cell && cell.parentElement === td) {
            const w = document.createElement('div'); w.className = 'ng-v-wrap';
            td.insertBefore(w, cell); w.appendChild(cell);
        }
    });
    root.querySelectorAll('.noted-grid thead th').forEach(th => {
        const title = th.querySelector('.ng-title');
        if (title && title.parentElement === th) {
            const w = document.createElement('div'); w.className = 'ng-v-wrap';
            th.insertBefore(w, title); w.appendChild(title);
        }
    });
    /* Panel: mevcut notlarda ng-panel-frame yoksa ekle */
    root.querySelectorAll('.ng-wrap-panel').forEach(wrap => {
        const tbl = wrap.querySelector(':scope > table.noted-grid.grid-panel');
        if (tbl) {
            const frame = document.createElement('div');
            frame.className = 'ng-panel-frame';
            wrap.insertBefore(frame, tbl);
            frame.appendChild(tbl);
        }
    });
    /* Tablo/Kolon: mevcut notlarda ng-table-scroll yoksa ekle — bkz. why-grid-wide-scrolls-in-own-wrapper */
    root.querySelectorAll('.ng-wrap-table, .ng-wrap-column').forEach(wrap => {
        const tbl = wrap.querySelector(':scope > table.noted-grid');
        if (tbl) {
            const scroll = document.createElement('div');
            scroll.className = 'ng-table-scroll';
            wrap.insertBefore(scroll, tbl);
            scroll.appendChild(tbl);
        }
    });
    /* Panel: mevcut panellere data-col + col-active focus handler ekle */
    root.querySelectorAll('.noted-grid.grid-panel').forEach(table => {
        if (table.dataset.colFocusBound) return;
        table.dataset.colFocusBound = '1';
        table.querySelectorAll('thead tr th').forEach((th, i) => {
            th.dataset.col = th.dataset.col || String(i);
            const title = th.querySelector('.ng-title');
            if (title) title.addEventListener('focus', () => _setPanelColumnActive(table, i));
        });
        table.querySelectorAll('tbody tr').forEach(tr => {
            [...tr.children].forEach((td, i) => {
                td.dataset.col = td.dataset.col || String(i);
                const cell = td.querySelector('.ng-cell');
                if (cell) cell.addEventListener('focus', () => _setPanelColumnActive(table, i));
            });
        });
    });
}

function _setPanelColumnActive(table, colIdx) {
    table.querySelectorAll('thead tr th[data-col], tbody tr td[data-col]').forEach(el => {
        el.classList.toggle('col-active', parseInt(el.dataset.col) === colIdx);
    });
}

function createGrid(type, cols, rows, colWidths) {
    cols = cols || 3;
    rows = rows || (type === 'table' ? 3 : 1);

    /* ng-wrap: toolbar ve table'ı birlikte sarar */
    const wrap = document.createElement('div');
    wrap.className = 'ng-wrap ng-wrap-' + type;
    wrap.dataset.gridType = type;

    const table = document.createElement('table');
    table.className = 'noted-grid grid-' + type;
    table.contentEditable = 'false';
    table.dataset.gridType = type;
    table.dataset.cols = String(cols);

    /* colgroup — genişlik yönetimi */
    const colgroup = document.createElement('colgroup');
    for (let c = 0; c < cols; c++) {
        const col = document.createElement('col');
        if (colWidths && colWidths[c]) col.style.width = colWidths[c] + 'px';
        colgroup.appendChild(col);
    }
    table.appendChild(colgroup);

    /* thead: panel ve tablo için başlık, kolon için başlık satırı (resize için) */
    const thead = document.createElement('thead');
    const hrow  = document.createElement('tr');
    for (let c = 0; c < cols; c++) {
        const th = document.createElement('th');
        th.style.position = 'relative';
        if (type === 'panel' || type === 'table') {
            const title = document.createElement('div');
            title.className = 'ng-title';
            title.contentEditable = 'true';
            title.spellcheck = false;
            title.dataset.ph = type === 'table' ? 'Başlık ' + (c+1) : 'Panel ' + (c+1);
            title.addEventListener('keydown', e => { if (e.key==='Enter'){e.preventDefault();title.blur();} });
            title.addEventListener('mousedown', e => e.stopPropagation());
            title.addEventListener('focus', () => { EditorState._activeEditTarget = title; _saveToolbarSel(); if (type === 'panel') _setPanelColumnActive(table, c); });
            if (type === 'panel') th.dataset.col = String(c);
            const thWrap = document.createElement('div');
            thWrap.className = 'ng-v-wrap';
            thWrap.appendChild(title);
            thWrap.addEventListener('click', e => { if (!title.contains(e.target) && e.target !== title) title.focus(); });
            th.appendChild(thWrap);
        } else {
            /* Kolon: başlık hücresi görünmez ama resize için var */
            th.className = 'ng-col-header';
            th.style.padding = '0'; th.style.height = '0'; th.style.overflow = 'hidden';
            const lbl = document.createElement('div');
            lbl.className = 'ng-title';
            lbl.contentEditable = 'true';
            lbl.spellcheck = false;
            lbl.dataset.ph = 'Sütun ' + (c+1);
            lbl.style.minHeight = '0';
            lbl.addEventListener('mousedown', e => e.stopPropagation());
            lbl.addEventListener('focus', () => { EditorState._activeEditTarget = lbl; });
            th.appendChild(lbl);
        }
        /* Resize handle son sütun hariç tüm tiplerde */
        if (c < cols - 1) _appendResizeHandle(th, table, c);
        hrow.appendChild(th);
    }
    thead.appendChild(hrow);
    table.appendChild(thead);
    if (type === 'column') thead.style.display = 'none'; /* Kolon'da gizle ama resize çalışsın */

    /* tbody — içerik satırları */
    const tbody = document.createElement('tbody');
    const contentRows = (type === 'panel') ? 1 : (type === 'column') ? 1 : rows - 1;
    for (let r = 0; r < contentRows; r++) {
        const tr = document.createElement('tr');
        for (let c = 0; c < cols; c++) {
            const td = document.createElement('td');
            td.style.position = 'relative';
            const cell = document.createElement('div');
            cell.className = 'ng-cell';
            cell.contentEditable = 'true';
            cell.spellcheck = false;
            cell.dataset.ph = type === 'column' ? ('Sütun ' + (c+1) + '…') : '…';
            cell.addEventListener('focus', () => { EditorState._activeEditTarget = cell; setTimeout(_saveToolbarSel, 0); if (type === 'panel') _setPanelColumnActive(table, c); });
            if (type === 'panel') td.dataset.col = String(c);
            const vWrap = document.createElement('div');
            vWrap.className = 'ng-v-wrap';
            vWrap.appendChild(cell);
            /* Hücre boş alanına tıklanınca ng-cell'e focus ilet */
            vWrap.addEventListener('click', e => { if (!cell.contains(e.target) && e.target !== cell) cell.focus(); });
            td.appendChild(vWrap);
            /* Resize handle: tüm tiplerde (kolon dahil) */
            if (c < cols - 1) _appendResizeHandle(td, table, c);
            tr.appendChild(td);
        }
        tbody.appendChild(tr);
    }
    table.appendChild(tbody);

    /* Toolbar: wrap'ın içinde, table'ın üstünde */
    wrap.appendChild(_createGridToolbar(wrap, table));
    if (type === 'panel') {
        const frame = document.createElement('div');
        frame.className = 'ng-panel-frame';
        frame.appendChild(table);
        wrap.appendChild(frame);
    } else {
        /* ng-table-scroll: cok kolon eklenince (60px taban genislik asilinca) tablo kendi
           genisligini asip editorun tamamini yatay kaydirilabilir yapiyordu — artik yalnizca
           bu sarmalayici kaydiriliyor. bkz. why-grid-wide-scrolls-in-own-wrapper. */
        const scroll = document.createElement('div');
        scroll.className = 'ng-table-scroll';
        scroll.appendChild(table);
        wrap.appendChild(scroll);
    }

    _bindGridResize(table);
    return wrap; /* wrap döndür */
}


/* Tablo sağ üst köşe toolbar'ı oluştur — tipe göre farklı butonlar */
function _createGridToolbar(wrap, table) {
    const type = table ? table.dataset.gridType : (wrap ? wrap.dataset.gridType : 'table');
    const bar = document.createElement('div');
    bar.className = 'ng-toolbar';
    bar.contentEditable = 'false';

    function makeBtn(icon, label, cls, onClick) {
        const btn = document.createElement('button');
        btn.className = 'ng-toolbar-btn' + (cls ? ' ' + cls : '');
        btn.title = label;
        btn.innerHTML = '<i class="fas ' + icon + '"></i>';
        btn.addEventListener('mousedown', e => {
            e.preventDefault(); /* focus kaybını önle */
            /* mousedown: focus henüz kaybolmadı → hücreyi kaydet */
            const tbl = getTable();
            if (tbl) {
                const focused = document.activeElement;
                const inCell = focused && (focused.closest('.ng-cell, .ng-title'));
                if (inCell && tbl.contains(inCell)) {
                    window._lastGridCell = inCell.closest('td, th');
                }
            }
        });
        btn.addEventListener('click', e => { e.stopPropagation(); onClick(); });
        return btn;
    }

    function getTable() { return table || wrap.querySelector('.noted-grid'); }
    function getWrap()  { return wrap  || getTable().parentElement; }

    function deleteBlock() {
        const w = getWrap();
        /* Bu araç çubuğu hem ana editörde hem float panelde kullanılabiliyor — DOM.$content
           yerine bloğun GERÇEK sahibi contentEditable'ı bul (silmeden önce, node DOM'dan
           kopmadan). Sentetik 'input' event'i her iki editörün de kendi kirli-işaret/otomatik
           kaydet mekanizmasını (ana: _bindDirtyListeners + MutationObserver; float: fpContent
           input debounce) doğru şekilde tetikler. */
        const owner = w.closest('[contenteditable="true"]') || DOM.$content;
        const p = document.createElement('p'); p.innerHTML = '<br>';
        w.parentNode.insertBefore(p, w); w.remove();
        const r = document.createRange(); r.setStart(p,0); r.collapse(true);
        const s = window.getSelection(); s.removeAllRanges(); s.addRange(r);
        owner.focus();
        owner.dispatchEvent(new Event('input', { bubbles: true }));
        updateFooterVisibility();
    }

    function equalizeWidths() {
        const tbl = getTable(); if (!tbl) return;
        const cgCols = [...tbl.querySelectorAll('colgroup col')];
        if (!cgCols.length) return;
        const tableW = tbl.getBoundingClientRect().width; if (!tableW) return;
        const n = cgCols.length, w = Math.floor(tableW / n);
        cgCols.forEach((col, i) => { col.style.width = (i === n - 1 ? tableW - w * (n - 1) : w) + 'px'; });
        (tbl.closest('[contenteditable="true"]') || DOM.$content).dispatchEvent(new Event('input', { bubbles: true }));
    }

    if (type === 'table') {
        bar.appendChild(makeBtn('fa-table-columns',  'Sütun Ekle',             '', () => _gridAddCol(getTable())));
        bar.appendChild(makeBtn('fa-plus',           'Satır Ekle',             '', () => _gridAddRow(getTable())));
        bar.appendChild(makeBtn('fa-arrow-up',       'Seçili Satırı Üste Taşı','', () => _gridMoveRow(getTable(), -1)));
        bar.appendChild(makeBtn('fa-arrow-down',     'Seçili Satırı Alta Taşı','', () => _gridMoveRow(getTable(),  1)));
        bar.appendChild(makeBtn('fa-arrow-left',     'Seçili Kolonu Sola Taşı','', () => _gridMoveCol(getTable(), -1)));
        bar.appendChild(makeBtn('fa-arrow-right',    'Seçili Kolonu Sağa Taşı','', () => _gridMoveCol(getTable(),  1)));
        bar.appendChild(makeBtn('fa-align-left',     'Hücre Hizalama',         '', () => {
            const pop  = _getOrCreateAlignPopup();
            EditorState._ngAlignTable = getTable();
            _updateAlignActive();
            if (pop.classList.contains('open')) { pop.classList.remove('open'); return; }
            const alignBtn = bar.querySelector('[title="Hücre Hizalama"]');
            const rect = alignBtn ? alignBtn.getBoundingClientRect() : bar.getBoundingClientRect();
            const popW = 104, popH = 108;
            pop.style.left = Math.min(rect.left, window.innerWidth  - popW - 8) + 'px';
            pop.style.top  = (rect.bottom + popH > window.innerHeight ? rect.top - popH - 4 : rect.bottom + 4) + 'px';
            pop.classList.add('open');
        }));
        bar.appendChild(makeBtn('fa-arrows-left-right', 'Genişlikleri Eşitle',  '', equalizeWidths));
        bar.appendChild(makeBtn('fa-minus',          'Seçili Satırı Sil',  'danger', () => _gridDeleteRow(getTable())));
        bar.appendChild(makeBtn('fa-table-columns',  'Seçili Kolonu Sil',  'danger', () => _gridDeleteCol(getTable())));
        bar.appendChild(makeBtn('fa-trash',          'Bloğu Sil',          'danger', deleteBlock));
    } else if (type === 'panel') {
        bar.appendChild(makeBtn('fa-table-columns',  'Panel Ekle',             '', () => _gridAddCol(getTable())));
        bar.appendChild(makeBtn('fa-plus',           'Satır Ekle',             '', () => _gridAddRow(getTable())));
        bar.appendChild(makeBtn('fa-arrows-left-right', 'Genişlikleri Eşitle', '', equalizeWidths));
        bar.appendChild(makeBtn('fa-minus',          'Seçili Satırı Sil',  'danger', () => _gridDeleteRow(getTable())));
        bar.appendChild(makeBtn('fa-table-columns',  'Seçili Kolonu Sil',  'danger', () => _gridDeleteCol(getTable())));
        bar.appendChild(makeBtn('fa-trash',          'Bloğu Sil',          'danger', deleteBlock));
    } else if (type === 'column') {
        bar.appendChild(makeBtn('fa-table-columns',  'Kolon Ekle',             '', () => _gridAddCol(getTable())));
        bar.appendChild(makeBtn('fa-arrows-left-right', 'Genişlikleri Eşitle', '', equalizeWidths));
        bar.appendChild(makeBtn('fa-table-columns',  'Seçili Kolonu Sil',  'danger', () => _gridDeleteCol(getTable())));
        bar.appendChild(makeBtn('fa-trash',          'Bloğu Sil',          'danger', deleteBlock));
    }

    return bar;
}

/* Grid hücre/satır/kolon eylemleri hem ana editörde hem float panelde çalışabiliyor.
   DOM.$content'e asla güvenilmez: bunlar toolbar mousedown (odak kaybı önlenir, yeni focus
   event'i üretilmez) veya klavye kısayoluyla tetiklenebilir; ikisinde de DOM.$content
   tıklama anında GÜNCEL olmayabilir. Elementin gerçek sahibi contentEditable'dan bulunur,
   sentetik 'input' event'i ana editörün kendi dirty-listener'ini (js/03) veya float
   panelin kendi 1.2sn debounce'unu (js/float-panel.js) doğru şekilde tetikler. */
function _gridMarkDirty(el) {
    const owner = (el && el.closest && el.closest('[contenteditable="true"]')) || DOM.$content;
    owner.dispatchEvent(new Event('input', { bubbles: true }));
}

/* Tablo/panele satır ekle */

/* Seçili satırı sil */
function _gridDeleteRow(table) {
    let td = window._lastGridCell || null;
    if (!td || !table.contains(td)) {
        const checkEl = (EditorState._savedToolbarSel && EditorState._savedToolbarSel.et) || document.activeElement;
        td = checkEl ? checkEl.closest('td, th') : null;
    }
    if (!td || !table.contains(td)) {
        const f = table.querySelector(':focus');
        td = f ? f.closest('td, th') : null;
    }
    if (!td || !table.contains(td)) { _showSnack(NotedI18n.t('msg.clickcellfirst'), 'warn'); return; }
    const tr = td.closest('tr');
    if (!tr) return;
    if (tr.parentElement.tagName === 'THEAD') { _showSnack(NotedI18n.t('msg.headerrowundeletable'), 'warn'); return; }
    const rows = [...(table.querySelector('tbody')||{querySelectorAll:()=>[]}).querySelectorAll('tr')];
    if (rows.length <= 1) { _showSnack(NotedI18n.t('msg.lastrowundeletable'), 'warn'); return; }
    tr.remove(); _gridMarkDirty(table); updateFooterVisibility();
}

/* Seçili kolonu sil */
function _gridDeleteCol(table) {
    let td = window._lastGridCell || null;
    if (!td || !table.contains(td)) {
        const checkEl = (EditorState._savedToolbarSel && EditorState._savedToolbarSel.et) || document.activeElement;
        td = checkEl ? checkEl.closest('td, th') : null;
    }
    if (!td || !table.contains(td)) {
        const f = table.querySelector(':focus');
        td = f ? f.closest('td, th') : null;
    }
    if (!td || !table.contains(td)) { _showSnack(NotedI18n.t('msg.clickcellfirst'), 'warn'); return; }
    const tr = td.closest('tr');
    const colIdx = [...tr.children].indexOf(td);
    if (colIdx < 0) return;
    const cols = [...table.querySelectorAll('col')];
    if (cols.length <= 1) { _showSnack(NotedI18n.t('msg.lastcolundeletable'), 'warn'); return; }
    if (cols[colIdx]) cols[colIdx].remove();
    table.querySelectorAll('thead tr, tbody tr').forEach(row => {
        const cells = [...row.children];
        if (cells[colIdx]) cells[colIdx].remove();
    });
    table.dataset.cols = String(Math.max(1, parseInt(table.dataset.cols || 3) - 1));
    _bindGridResize(table); _gridMarkDirty(table); updateFooterVisibility();
}

function _gridAddRow(table) {
    const cols = parseInt(table.dataset.cols) || 3;
    const isPanel = table.dataset.gridType === 'panel';
    const tbody = table.querySelector('tbody');
    if (!tbody) return;
    const tr = document.createElement('tr');
    for (let c = 0; c < cols; c++) {
        const td = document.createElement('td');
        td.style.position = 'relative';
        if (isPanel) td.dataset.col = String(c);
        const div = document.createElement('div');
        div.className = 'ng-cell'; div.contentEditable = 'true';
        div.spellcheck = false; div.dataset.ph = '…';
        div.addEventListener('focus', () => { EditorState._activeEditTarget = div; setTimeout(_saveToolbarSel, 0); if (isPanel) _setPanelColumnActive(table, c); });
        const rWrap = document.createElement('div'); rWrap.className = 'ng-v-wrap'; rWrap.appendChild(div);
        rWrap.addEventListener('click', e => { if (!div.contains(e.target) && e.target !== div) div.focus(); });
        td.appendChild(rWrap);
        if (c < cols - 1 && table.dataset.gridType !== 'column') _appendResizeHandle(td, table, c);
        tr.appendChild(td);
    }
    tbody.appendChild(tr);
    _bindGridResize(table);
    tr.querySelector('.ng-cell').focus();
    _gridMarkDirty(table); updateFooterVisibility();
}

/* Resize handle DOM'a ekle */
function _appendResizeHandle(cell, table, colIdx) {
    const handle = document.createElement('div');
    handle.className = 'ng-resize';
    handle.contentEditable = 'false';
    handle.dataset.col = colIdx;
    handle.addEventListener('mousedown', e => _startGridResize(e, table, colIdx));
    cell.appendChild(handle);
}

/* Sütun genişliğini col elementinden oku */
function _getColWidth(table, colIdx) {
    const col = table.querySelectorAll('col')[colIdx];
    if (!col) return null;
    const w = parseFloat(col.style.width);
    return isNaN(w) ? null : w;
}

/* Resize başlat */
function _startGridResize(e, table, colIdx) {
    e.preventDefault();
    const handle = e.currentTarget;
    handle.classList.add('resizing');

    const cols = [...table.querySelectorAll('col')];
    const leftCol  = cols[colIdx];
    const rightCol = cols[colIdx + 1];
    if (!leftCol || !rightCol) { handle.classList.remove('resizing'); return; }

    const gridType = table.dataset.gridType;
    const rowSel = gridType === 'column' ? 'tbody tr:first-child td' : 'thead tr:first-child th';
    const rowCells = [...table.querySelectorAll(rowSel)];
    cols.forEach((col, i) => {
        if (!col.style.width && rowCells[i]) {
            col.style.width = rowCells[i].getBoundingClientRect().width + 'px';
        }
    });

    const leftCell  = rowCells[colIdx];
    const rightCell = rowCells[colIdx + 1];
    if (!leftCell || !rightCell) { handle.classList.remove('resizing'); return; }

    const startX  = e.clientX;
    const startLW = parseFloat(leftCol.style.width)  || leftCell.getBoundingClientRect().width;
    const startRW = parseFloat(rightCol.style.width) || rightCell.getBoundingClientRect().width;
    const totalW  = startLW + startRW;

    function onMove(ev) {
        const delta = ev.clientX - startX;
        const newL  = Math.max(40, Math.min(totalW - 40, startLW + delta));
        const newR  = totalW - newL;
        leftCol.style.width  = newL + 'px';
        rightCol.style.width = newR + 'px';
    }
    startPointerDrag(onMove, function onUp() {
        handle.classList.remove('resizing');
        _gridMarkDirty(table); updateFooterVisibility();
    });
}

/* Yeni sütun ekle — son sütunun yarısı kadar */
function _gridAddCol(table) {
    const cg = table.querySelector('colgroup');
    if (!cg) return;
    const existCols = [...cg.querySelectorAll('col')];
    const colCount = existCols.length;
    const colIdx = colCount; /* yeni kolonun index'i */

    /* Son kolonu ikiye böl: son col ve yeni col eşit px alır */
    const lastCol = existCols[colCount - 1];
    let lastW = lastCol ? parseFloat(lastCol.style.width) : 0;
    if (!lastW || lastW <= 0) {
        /* width set edilmemişse mevcut render genişliğini ölç */
        const firstRow = table.querySelector('thead tr, tbody tr');
        const lastCell = firstRow ? firstRow.cells[colCount - 1] : null;
        lastW = lastCell ? lastCell.getBoundingClientRect().width : 120;
    }
    const half = Math.max(60, lastW / 2);
    if (lastCol) lastCol.style.width = half + 'px';
    const newCol = document.createElement('col');
    newCol.style.width = half + 'px';
    cg.appendChild(newCol);

    /* thead / tbody satırlarına yeni hücre ekle */
    table.querySelectorAll('thead tr, tbody tr').forEach(tr => {
        const isHeader = tr.parentElement.tagName === 'THEAD';
        const cell = document.createElement(isHeader ? 'th' : 'td');
        cell.style.position = 'relative';
        if (isHeader) {
            const title = document.createElement('div');
            title.className = 'ng-title';
            title.contentEditable = 'true';
            title.spellcheck = false;
            title.dataset.ph = table.dataset.gridType === 'table' ? 'Başlık ' + (colIdx+1) : 'Panel ' + (colIdx+1);
            title.addEventListener('keydown', e => { if(e.key==='Enter'){e.preventDefault();title.blur();} });
            title.addEventListener('mousedown', e => e.stopPropagation());
            title.addEventListener('focus', () => { EditorState._activeEditTarget = title; _saveToolbarSel(); });
            const acWrap = document.createElement('div'); acWrap.className = 'ng-v-wrap'; acWrap.appendChild(title);
            cell.appendChild(acWrap);
            /* önceki son hücreye resize handle ekle */
            const prevCell = tr.lastElementChild;
            if (prevCell) _appendResizeHandle(prevCell, table, colIdx - 1);
        } else {
            const div = document.createElement('div');
            div.className = 'ng-cell';
            div.contentEditable = 'true';
            div.spellcheck = false;
            div.dataset.ph = table.dataset.gridType === 'column' ? 'Sütun '+(colIdx+1)+'…' : '…';
            div.addEventListener('focus', () => { EditorState._activeEditTarget = div; setTimeout(_saveToolbarSel, 0); });
            const acWrap2 = document.createElement('div'); acWrap2.className = 'ng-v-wrap'; acWrap2.appendChild(div);
            cell.appendChild(acWrap2);
            const prevCell = tr.lastElementChild;
            if (prevCell) _appendResizeHandle(prevCell, table, colIdx - 1);
        }
        tr.appendChild(cell);
    });

    table.dataset.cols = colIdx + 1;
    _bindGridResize(table);

    const newFirst = table.querySelector('thead tr:last-child th:last-child .ng-title, tbody tr:first-child td:last-child .ng-cell');
    if (newFirst) requestAnimationFrame(() => newFirst.focus());
    _gridMarkDirty(table); updateFooterVisibility();
}

/* Resize handle'larını yenile — kolon index'ini data-col'dan değil DOM pozisyonundan okur */
function _bindGridResize(table) {
    table.querySelectorAll('.ng-resize').forEach(h => {
        const cell = h.closest('td, th');
        const row  = cell ? cell.closest('tr') : null;
        const actualIdx = (row && cell) ? [...row.children].indexOf(cell) : parseInt(h.dataset.col || '0');
        const fresh = h.cloneNode(true);
        fresh.dataset.col = actualIdx;
        fresh.addEventListener('pointerdown', e => _startGridResize(e, table, actualIdx));
        h.parentNode.replaceChild(fresh, h);
    });
}


/* İmlecin bulunduğu satırı yukarı/aşağı taşı */
function _gridMoveRow(table, dir) {
    const active = document.activeElement;
    const td = active ? active.closest('td') : null;
    const tr = td ? td.closest('tr') : null;
    if (!tr || tr.parentElement.tagName !== 'TBODY') return;
    const tbody = tr.parentElement;
    const rows = [...tbody.querySelectorAll('tr')];
    const idx = rows.indexOf(tr);
    const targetIdx = idx + dir;
    if (targetIdx < 0 || targetIdx >= rows.length) return;
    if (dir === -1) tbody.insertBefore(tr, rows[targetIdx]);
    else tbody.insertBefore(rows[targetIdx], tr);
    active.focus(); _gridMarkDirty(table); updateFooterVisibility();
}

/* İmlecin bulunduğu kolonu sola/sağa taşı */
function _gridMoveCol(table, dir) {
    const active = document.activeElement;
    const td = active ? active.closest('td, th') : null;
    if (!td) return;
    const tr = td.closest('tr');
    const allCells = tr ? [...tr.querySelectorAll('td, th')] : [];
    const colIdx = allCells.indexOf(td);
    if (colIdx === -1) return;
    const targetIdx = colIdx + dir;
    if (targetIdx < 0 || targetIdx >= allCells.length) return;

    /* Her satırda aynı kolon indexindeki hücreyi taşı */
    table.querySelectorAll('tr').forEach(row => {
        const cells = [...row.querySelectorAll('td, th')];
        if (cells[colIdx] && cells[targetIdx]) {
            if (dir === -1) row.insertBefore(cells[colIdx], cells[targetIdx]);
            else row.insertBefore(cells[targetIdx], cells[colIdx]);
        }
    });

    /* colgroup'u da taşı */
    const cols = [...table.querySelectorAll('col')];
    const colgroup = table.querySelector('colgroup');
    if (colgroup && cols[colIdx] && cols[targetIdx]) {
        if (dir === -1) colgroup.insertBefore(cols[colIdx], cols[targetIdx]);
        else colgroup.insertBefore(cols[targetIdx], cols[colIdx]);
    }

    _bindGridResize(table);
    active.focus(); _gridMarkDirty(table); updateFooterVisibility();
}

/* ── Hizalama popup ── */
EditorState._ngAlignPopup = null;
EditorState._ngAlignTable = null;

function _alignSvg(v, h) {
    const bx = {left:3, center:5, right:7}[h];
    const by = {top:3, middle:7, bottom:10}[v];
    return `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="1" y="1" width="14" height="14" stroke="currentColor" stroke-width="1.2"/><rect x="${bx}" y="${by}" width="6" height="3" fill="currentColor"/></svg>`;
}

function _getOrCreateAlignPopup() {
    if (EditorState._ngAlignPopup) return EditorState._ngAlignPopup;
    const pop = document.createElement('div');
    pop.className = 'ng-align-popup';
    [['top','left'],['top','center'],['top','right'],
     ['middle','left'],['middle','center'],['middle','right'],
     ['bottom','left'],['bottom','center'],['bottom','right']
    ].forEach(([v, h]) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'ng-align-btn';
        btn.dataset.valign = v;
        btn.dataset.halign = h;
        const vL = v==='top'?_t('align.top','Üst'):v==='middle'?_t('align.middle','Orta'):_t('align.bottom','Alt');
        const hL = h==='left'?_t('align.left','Sol'):h==='center'?_t('align.center','Ortala'):_t('align.right','Sağ');
        btn.title = `${vL} ${hL}`;
        btn.innerHTML = _alignSvg(v, h);
        btn.addEventListener('mousedown', e => e.preventDefault());
        btn.addEventListener('click', () => {
            if (!EditorState._ngAlignTable) return;
            _gridSetColAlign(EditorState._ngAlignTable, v, h);
            _updateAlignActive();
        });
        pop.appendChild(btn);
    });
    document.body.appendChild(pop);
    document.addEventListener('mousedown', e => {
        if (pop.classList.contains('open') && !pop.contains(e.target)) pop.classList.remove('open');
    });
    EditorState._ngAlignPopup = pop;
    return pop;
}

function _updateAlignActive() {
    if (!EditorState._ngAlignPopup || !EditorState._ngAlignTable) return;
    let cell = window._lastGridCell || null;
    if (!cell || !EditorState._ngAlignTable.contains(cell)) {
        const et = (EditorState._savedToolbarSel && EditorState._savedToolbarSel.et) || document.activeElement;
        cell = et ? et.closest('td, th') : null;
    }
    const tr      = cell && EditorState._ngAlignTable.contains(cell) ? cell.closest('tr') : null;
    const colIdx  = tr ? [...tr.children].indexOf(cell) : 0;
    const isTable = EditorState._ngAlignTable.dataset.gridType === 'table';
    const firstTr = EditorState._ngAlignTable.querySelector('tbody tr');
    const td      = firstTr ? firstTr.children[colIdx] : null;
    const curV    = (td && td.dataset.valign)  || (isTable ? 'middle' : 'top');
    const curH    = (td && td.dataset.halign)  || 'left';
    EditorState._ngAlignPopup.querySelectorAll('.ng-align-btn').forEach(btn =>
        btn.classList.toggle('ng-align-active', btn.dataset.valign === curV && btn.dataset.halign === curH)
    );
}

function _gridSetColAlign(table, valign, halign) {
    let cell = window._lastGridCell || null;
    if (!cell || !table.contains(cell)) {
        const et = (EditorState._savedToolbarSel && EditorState._savedToolbarSel.et) || document.activeElement;
        cell = et ? et.closest('td, th') : null;
    }
    if (!cell || !table.contains(cell)) {
        const f = table.querySelector(':focus');
        cell = f ? f.closest('td, th') : null;
    }
    const tr     = cell ? cell.closest('tr') : null;
    const colIdx = tr ? [...tr.children].indexOf(cell) : -1;
    const apply  = td => {
        td.dataset.valign = valign;
        if (halign === 'left') delete td.dataset.halign; else td.dataset.halign = halign;
    };
    const applyThHalign = th => {
        if (halign === 'left') delete th.dataset.halign; else th.dataset.halign = halign;
    };
    const headRow = table.querySelector('thead tr');
    if (colIdx < 0) {
        table.querySelectorAll('tbody td').forEach(apply);
        if (headRow) [...headRow.children].forEach(applyThHalign);
    } else {
        table.querySelectorAll('tbody tr').forEach(row => { if (row.children[colIdx]) apply(row.children[colIdx]); });
        if (headRow && headRow.children[colIdx]) applyThHalign(headRow.children[colIdx]);
    }
    _markDirty();
}

/* _positionGridAddBtn kaldırıldı — toolbar üstlendi */

/* ── Cursor'un olduğu DOM.$content satırından sonrasına grid ekle ── */
function _insertGridAfterCursor(wrap) {
    const sr  = EditorState._savedToolbarSel ? EditorState._savedToolbarSel.range : null;
    const sel = window.getSelection();
    let node  = sr ? sr.startContainer : (sel&&sel.rangeCount ? sel.getRangeAt(0).startContainer : null);
    if (node && node.nodeType === 3) node = node.parentElement;
    while (node && node.parentElement !== DOM.$content) node = node.parentElement;
    if (node && node.nextSibling) DOM.$content.insertBefore(wrap, node.nextSibling);
    else DOM.$content.appendChild(wrap);
    const exitP = document.createElement('p'); exitP.innerHTML = '<br>';
    wrap.parentNode.insertBefore(exitP, wrap.nextSibling);
    const table = wrap.querySelector ? wrap.querySelector('.noted-grid') : wrap;
    const firstCell = table ? table.querySelector('.ng-title, .ng-cell') : null;
    if (firstCell) requestAnimationFrame(() => firstCell.focus());
    _markDirty(); updateFooterVisibility();
}

/* ── STB handleStb güncelleme ── */
function applyGridPanel(cols)  { const t = createGrid('panel',  cols||3, 1); _insertGridAfterCursor(t); }
function applyGridColumn(cols) { const t = createGrid('column', cols||3, 1); _insertGridAfterCursor(t); }
function applyGridTable(cols, rows) { const t = createGrid('table', cols||3, rows||3); _insertGridAfterCursor(t); }

/* ── Satır Bookmark ── */
function applyBookmark() {
    const sr  = EditorState._savedToolbarSel ? EditorState._savedToolbarSel.range : null;
    const sel = window.getSelection();
    let node  = sr ? sr.startContainer : (sel && sel.rangeCount ? sel.getRangeAt(0).startContainer : null);
    if (!node) return;
    if (node.nodeType === 3) node = node.parentElement;

    /* Aktif kök: fp-content içindeyse fp-content, değilse DOM.$content */
    const fpEl = document.getElementById('fp-content');
    const root = (fpEl && fpEl.contains(node)) ? fpEl : DOM.$content;

    let block = null;
    let cur = node;
    while (cur && cur !== root) {
        if (cur.tagName === 'TR') { block = cur; break; }
        if (cur.tagName === 'LI' && cur.classList.contains('todo-item')) { block = cur; break; }
        const par = cur.parentElement;
        if (!par) break;
        if (par.classList && (par.classList.contains('col-panel-content') || par.classList.contains('layout-col'))) {
            block = cur; break;
        }
        if (par === root) { block = cur; break; }
        cur = par;
    }
    if (!block) return;
    if (block.hasAttribute('data-bookmark')) block.removeAttribute('data-bookmark');
    else block.setAttribute('data-bookmark', '1');
    _markDirty();
}

/* ══ ŞEKİL OVERLAY SİSTEMİ ══ */

Const._SHAPE_PATHS = {
    rect:    (s,f) => `<rect x="2" y="2" width="296" height="196" rx="0" stroke="${s}" fill="${f}" stroke-width="3"/>`,
    rounded: (s,f) => `<rect x="2" y="2" width="296" height="196" rx="24" stroke="${s}" fill="${f}" stroke-width="3"/>`,
    circle:  (s,f) => `<ellipse cx="150" cy="100" rx="148" ry="98" stroke="${s}" fill="${f}" stroke-width="3"/>`,
    diamond: (s,f) => `<polygon points="150,2 298,100 150,198 2,100" stroke="${s}" fill="${f}" stroke-width="3"/>`,
    arrow:   (s,f) => `<polygon points="2,65 200,65 200,20 298,100 200,180 200,135 2,135" stroke="${s}" fill="${f}" stroke-width="3"/>`,
    star:    (s,f) => `<polygon points="150,10 174,73 240,76 188,117 206,182 150,145 94,182 112,117 60,76 126,73" stroke="${s}" fill="${f}" stroke-width="3"/>`,
};

function _shapeCalcFill(stroke, fillMode) {
    if (fillMode === 'solid') return stroke;
    if (fillMode === 'semi')  return stroke + '40';
    return 'none';
}

function _buildShapeSvg(shapeId, stroke, fillMode) {
    const fn = Const._SHAPE_PATHS[shapeId] || Const._SHAPE_PATHS.rect;
    const fill = _shapeCalcFill(stroke, fillMode);
    return `<svg viewBox="0 0 300 200" width="100%" height="100%" preserveAspectRatio="none">${fn(stroke, fill)}</svg>`;
}

function _updateShapeSvg(el) {
    const stroke   = el.dataset.stroke   || '#1e90ff';
    const fillMode = el.dataset.fillMode || 'none';
    const fill = _shapeCalcFill(stroke, fillMode);
    const path = el.querySelector('rect,ellipse,polygon');
    if (!path) return;
    path.setAttribute('stroke', stroke);
    path.setAttribute('fill', fill);
}

function _applyShapeStyles(el) {
    el.style.position = 'absolute';
    el.style.left     = (+el.dataset.sx || 20)  + 'px';
    el.style.top      = (+el.dataset.sy || 20)  + 'px';
    el.style.width    = (+el.dataset.sw || 220) + 'px';
    el.style.height   = (+el.dataset.sh || 130) + 'px';
    el.style.zIndex   = '10';
    el.style.cursor   = 'move';
    el.style.userSelect = 'none';
    el.style.boxSizing  = 'border-box';
    const rot = +el.dataset.rotate || 0;
    el.style.transform = rot ? `rotate(${rot}deg)` : '';
    _updateShapeSvg(el);
}

function _deselectShape(el) {
    el.classList.remove('shape-selected');
    el.querySelector('.shape-resize-handle')?.remove();
    el.querySelector('.shape-rotate-handle')?.remove();
    el.querySelector('.shape-toolbar')?.remove();
}

function _cleanShapeControls() {
    DOM.$content.querySelectorAll('.note-shape-overlay.shape-selected').forEach(_deselectShape);
}

/* Yuvarlatılmış köşeleri şekil boyutuna göre güncelle — sabit görsel radüs */
function _updateRoundedCorners(el) {
    if (el.dataset.shape !== 'rounded') return;
    const sw = +el.dataset.sw || 220, sh = +el.dataset.sh || 130;
    const R = 12; /* hedef görsel köşe radüsü (CSS px) */
    const rect = el.querySelector('rect');
    if (rect) {
        rect.setAttribute('rx', Math.round(R * 300 / sw));
        rect.setAttribute('ry', Math.round(R * 200 / sh));
    }
}

/* Metin katmanını ekle — yoksa yeni oluştur */
function _ensureShapeText(el) {
    if (el.querySelector('.shape-text-wrap')) return;
    const wrap = document.createElement('div');
    wrap.className = 'shape-text-wrap';
    const txt = document.createElement('div');
    txt.className = 'shape-text';
    txt.contentEditable = 'true';
    wrap.appendChild(txt);
    el.appendChild(wrap);
}

function _buildShapeToolbar(el) {
    const tb = document.createElement('div');
    tb.className = 'shape-toolbar';
    tb.addEventListener('mousedown', e => { e.stopPropagation(); e.preventDefault(); });

    /* Renk seçici */
    const colorInput = document.createElement('input');
    colorInput.type = 'color'; colorInput.className = 'shape-color-swatch';
    colorInput.title = _t('shape.color', 'Renk'); colorInput.value = el.dataset.stroke || '#1e90ff';
    colorInput.addEventListener('input', () => { el.dataset.stroke = colorInput.value; _updateShapeSvg(el); _markDirty(); });
    tb.appendChild(colorInput);
    const s1 = document.createElement('div'); s1.className = 'shape-tb-sep'; tb.appendChild(s1);

    /* Dolgu */
    [['none','□','shape.filltransparent','Transparan'],['semi','◧','shape.fillsemi','Yarı Saydam'],['solid','■','shape.fillsolid','Dolu']].forEach(([mode,lbl,titleKey,titleFallback]) => {
        const btn = document.createElement('button');
        btn.className = 'shape-tb-btn' + (el.dataset.fillMode === mode ? ' active' : '');
        btn.textContent = lbl; btn.title = _t(titleKey, titleFallback);
        btn.addEventListener('click', () => {
            el.dataset.fillMode = mode; _updateShapeSvg(el);
            tb.querySelectorAll('.shape-tb-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active'); _markDirty();
        });
        tb.appendChild(btn);
    });
    const s2 = document.createElement('div'); s2.className = 'shape-tb-sep'; tb.appendChild(s2);

    /* Boyut göstergesi */
    const sizeHint = document.createElement('span');
    sizeHint.style.cssText = 'font-size:.72rem;color:var(--text-muted);padding:0 4px;min-width:56px;text-align:center;';
    function _refreshSize() { sizeHint.textContent = (+el.dataset.sw||220) + '×' + (+el.dataset.sh||130); }
    _refreshSize(); tb.appendChild(sizeHint);
    const s3 = document.createElement('div'); s3.className = 'shape-tb-sep'; tb.appendChild(s3);

    /* Sil */
    const delBtn = document.createElement('button');
    delBtn.className = 'shape-tb-btn'; delBtn.innerHTML = '<i class="fas fa-trash"></i>'; delBtn.title = _t('shape.delete', 'Şekli Sil');
    delBtn.addEventListener('click', () => { el.remove(); _markDirty(); });
    tb.appendChild(delBtn);

    el._shapeRefreshSize = _refreshSize;
    return tb;
}

function _selectShape(el) {
    DOM.$content.querySelectorAll('.note-shape-overlay.shape-selected').forEach(s => { if (s !== el) _deselectShape(s); });
    if (el.classList.contains('shape-selected')) return;
    el.classList.add('shape-selected');

    /* Döndürme kolu */
    const rotH = document.createElement('div');
    rotH.className = 'shape-rotate-handle'; rotH.title = _t('shape.rotate', 'Döndür');
    rotH.innerHTML = '<i class="fas fa-rotate"></i>';
    rotH.addEventListener('pointerdown', function(e) {
        e.preventDefault(); e.stopPropagation();
        const sw = +el.dataset.sw || 220, sh = +el.dataset.sh || 130;
        const cRect = DOM.$content.getBoundingClientRect();
        const cx = cRect.left + (+el.dataset.sx || 0) + sw / 2;
        const cy = cRect.top  - (DOM.$content.scrollTop || 0) + (+el.dataset.sy || 0) + sh / 2;
        const startMouseAngle = Math.atan2(e.clientY - cy, e.clientX - cx) * 180 / Math.PI;
        const startRotate = +el.dataset.rotate || 0;
        function onMove(ev) {
            const a = Math.atan2(ev.clientY - cy, ev.clientX - cx) * 180 / Math.PI;
            const angle = Math.round(startRotate + (a - startMouseAngle));
            el.dataset.rotate = angle;
            el.style.transform = `rotate(${angle}deg)`;
        }
        startPointerDrag(onMove, _markDirty);
    });
    el.appendChild(rotH);

    /* Resize kolu */
    const rh = document.createElement('div');
    rh.className = 'shape-resize-handle';
    rh.addEventListener('pointerdown', function(e) {
        e.preventDefault(); e.stopPropagation();
        const startX = e.clientX, startY = e.clientY;
        const startW = +el.dataset.sw || 220, startH = +el.dataset.sh || 130;
        function onMove(ev) {
            const nw = Math.max(60, startW + (ev.clientX - startX));
            const nh = Math.max(40, startH + (ev.clientY - startY));
            el.dataset.sw = Math.round(nw); el.dataset.sh = Math.round(nh);
            el.style.width = nw + 'px'; el.style.height = nh + 'px';
            _updateRoundedCorners(el);
            if (el._shapeRefreshSize) el._shapeRefreshSize();
        }
        startPointerDrag(onMove, _markDirty);
    });
    el.appendChild(rh);
    el.appendChild(_buildShapeToolbar(el));
}

function _makeShapeInteractive(el) {
    el.addEventListener('pointerdown', function(e) {
        /* Kontroller veya metin alanına tıklama → sürükleme başlatma */
        if (e.target.classList.contains('shape-resize-handle')) return;
        if (e.target.classList.contains('shape-rotate-handle') || e.target.closest('.shape-rotate-handle')) return;
        if (e.target.closest('.shape-toolbar')) return;
        if (e.target.closest('.shape-text-wrap')) {
            /* Sadece seç, taşıma */
            _selectShape(el);
            return;
        }
        e.preventDefault(); e.stopPropagation();
        _selectShape(el);
        const startX = e.clientX, startY = e.clientY;
        const startL = +el.dataset.sx || 0, startT = +el.dataset.sy || 0;
        let moved = false;
        function onMove(ev) {
            moved = true;
            const nl = Math.max(0, startL + (ev.clientX - startX));
            const nt = Math.max(0, startT + (ev.clientY - startY));
            el.dataset.sx = Math.round(nl); el.dataset.sy = Math.round(nt);
            el.style.left = nl + 'px'; el.style.top = nt + 'px';
        }
        startPointerDrag(onMove, function onUp() {
            if (moved) _markDirty();
        });
    });
}

function initShapeOverlays(root) {
    root = root || DOM.$content;
    root.querySelectorAll('.note-shape-overlay').forEach(el => {
        _applyShapeStyles(el);
        _ensureShapeText(el);
        _updateRoundedCorners(el);
        _makeShapeInteractive(el);
    });
}

/* Şekil dışına tıklayınca seçimi kaldır */
document.addEventListener('mousedown', function(e) {
    if (!e.target.closest('.note-shape-overlay')) _cleanShapeControls();
});

function insertShapeOverlay(shapeId) {
    const scrollTop = DOM.$content.scrollTop || 0;
    const stroke = '#1e90ff', fillMode = 'none';
    const sw = 220, sh = 130;

    const el = document.createElement('div');
    el.className    = 'note-shape-overlay';
    el.contentEditable = 'false';
    el.dataset.shape    = shapeId;
    el.dataset.sx       = 44;
    el.dataset.sy       = Math.max(10, scrollTop + 20);
    el.dataset.sw       = sw;
    el.dataset.sh       = sh;
    el.dataset.stroke   = stroke;
    el.dataset.fillMode = fillMode;
    el.dataset.rotate   = 0;
    el.innerHTML = _buildShapeSvg(shapeId, stroke, fillMode);

    /* Metin katmanı */
    const wrap = document.createElement('div'); wrap.className = 'shape-text-wrap';
    const txt  = document.createElement('div'); txt.className  = 'shape-text'; txt.contentEditable = 'true';
    wrap.appendChild(txt); el.appendChild(wrap);

    DOM.$content.appendChild(el);
    _applyShapeStyles(el);
    _updateRoundedCorners(el);
    _makeShapeInteractive(el);
    _selectShape(el);
    _markDirty();
}

/* ── Tab ile hücre gezinmesi ── */
document.addEventListener('keydown', function ngTabNav(e) {
    if (e.key !== 'Tab') return;
    const active = document.activeElement;
    if (!active) return;
    const cell = active.closest('.ng-cell, .ng-title');
    if (!cell) return;
    const table = active.closest('.noted-grid');
    if (!table) return;
    /* Sadece grid-table tipinde Tab hücre geçişi yapar */
    if (table.dataset.gridType !== 'table') return;
    e.preventDefault();

    /* Satır bazlı Tab: sağdaki hücre → yoksa alt satır başı */
    const td = cell.closest('td, th');
    const tr = td ? td.closest('tr') : null;
    if (!tr) return;

    if (!e.shiftKey) {
        /* Aynı satırda sonraki td/th var mı? */
        const nextTd = td.nextElementSibling
            ? td.nextElementSibling.querySelector('.ng-cell, .ng-title')
            : null;
        if (nextTd) { nextTd.focus(); return; }

        /* Son kolon: alt satırın ilk hücresi */
        const nextTr = tr.nextElementSibling ||
            (tr.parentElement.tagName === 'THEAD'
                ? table.querySelector('tbody tr')
                : null);
        if (nextTr) {
            const firstCell = nextTr.querySelector('.ng-cell, .ng-title');
            if (firstCell) { firstCell.focus(); return; }
        }

        /* Son hücreden Tab → yeni satır (table ve panel tipinde) */
        if (table.dataset.gridType === 'table' || table.dataset.gridType === 'panel') {
            const cols = parseInt(table.dataset.cols) || 3;
            const tbody = table.querySelector('tbody');
            if (!tbody) return;
            const newTr = document.createElement('tr');
            for (let c = 0; c < cols; c++) {
                const newTd = document.createElement('td');
                newTd.style.position = 'relative';
                const div = document.createElement('div');
                div.className = 'ng-cell'; div.contentEditable = 'true';
                div.spellcheck = false; div.dataset.ph = '…';
                const tabWrap = document.createElement('div'); tabWrap.className = 'ng-v-wrap'; tabWrap.appendChild(div);
                newTd.appendChild(tabWrap);
                if (c < cols - 1 && table.dataset.gridType !== 'column') _appendResizeHandle(newTd, table, c);
                newTr.appendChild(newTd);
            }
            tbody.appendChild(newTr);
            _bindGridResize(table);
            newTr.querySelector('.ng-cell').focus();
            _markDirty();
        }
    } else {
        /* Shift+Tab: sol hücre → yoksa önceki satırın son hücresi */
        const prevTd = td.previousElementSibling
            ? td.previousElementSibling.querySelector('.ng-cell, .ng-title')
            : null;
        if (prevTd) { prevTd.focus(); return; }
        const prevTr = tr.previousElementSibling ||
            (tr.parentElement.tagName === 'TBODY'
                ? table.querySelector('thead tr:last-child')
                : null);
        if (prevTr) {
            const cells = prevTr.querySelectorAll('.ng-cell, .ng-title');
            if (cells.length) { cells[cells.length - 1].focus(); return; }
        }
    }
}, true);

/* ── editNote restore: noted-grid tablolarını yenile ──
   root: hangi contentEditable üzerinde çalışılacağı — varsayılan DOM.$content (ana editör),
   float panel için fpContent geçilir (bkz. why-restoregrids-shapes-accept-root). */
function _restoreGrids(root) {
    root = root || DOM.$content;
    root.querySelectorAll('.ng-wrap').forEach(wrap => {
        const table = wrap.querySelector('.noted-grid');
        if (!table) return;
        /* data-gridType sync: dataset'ten veya class'tan çıkar */
        let gType = table.dataset.gridType || wrap.dataset.gridType;
        if (!gType) {
            /* class bazlı fallback: ng-wrap-panel, ng-wrap-table, ng-wrap-column */
            const wClass = [...wrap.classList].find(c => c.startsWith('ng-wrap-'));
            if (wClass) gType = wClass.replace('ng-wrap-', '');
            const tClass = [...table.classList].find(c => c.startsWith('grid-'));
            if (tClass) gType = tClass.replace('grid-', '');
        }
        if (gType) { wrap.dataset.gridType = gType; table.dataset.gridType = gType; }
        let tb = wrap.querySelector('.ng-toolbar');
        if (tb) tb.remove();
        wrap.insertBefore(_createGridToolbar(wrap, table), wrap.firstChild);
        /* Resize handle'larını yenile */
        _bindGridResize(table);
        const isPanelType = gType === 'panel';
        table.querySelectorAll('.ng-title').forEach(title => {
            const fresh = title.cloneNode(true);
            fresh.addEventListener('keydown', e => { if(e.key==='Enter'){e.preventDefault();fresh.blur();} });
            fresh.addEventListener('mousedown', e => e.stopPropagation());
            fresh.addEventListener('focus', () => {
                EditorState._activeEditTarget = fresh; _saveToolbarSel();
                if (isPanelType) { const th = fresh.closest('th'); if (th) _setPanelColumnActive(table, parseInt(th.dataset.col || '0')); }
            });
            title.parentNode.replaceChild(fresh, title);
        });
        /* ng-cell listener'larını yenile */
        table.querySelectorAll('.ng-cell').forEach(cell => {
            cell.contentEditable = 'true';
            const fresh = cell.cloneNode(true);
            fresh.addEventListener('focus', () => {
                EditorState._activeEditTarget = fresh; setTimeout(_saveToolbarSel, 0);
                if (isPanelType) { const td = fresh.closest('td'); if (td) _setPanelColumnActive(table, parseInt(td.dataset.col || '0')); }
            });
            cell.parentNode.replaceChild(fresh, cell);
        });

    });

    /* Callout sil butonlarını yenile */
    root.querySelectorAll('.callout').forEach(callout => {
        let btn = callout.querySelector('.callout-del');
        if (!btn) {
            btn = document.createElement('button');
            btn.className = 'callout-del';
            btn.title = _t('callout.deleteblock', 'Vurgu bloğunu sil');
            btn.innerHTML = '<i class="fas fa-times"></i>';
            btn.contentEditable = 'false';
            callout.appendChild(btn);
        }
        const fresh = btn.cloneNode(true);
        fresh.addEventListener('mousedown', e => e.preventDefault());
        fresh.addEventListener('click', e => {
            e.stopPropagation();
            const p = document.createElement('p'); p.innerHTML = '<br>';
            if (callout.parentNode) { callout.parentNode.insertBefore(p, callout); callout.remove(); }
            const r = document.createRange(); r.setStart(p,0); r.collapse(true);
            const s = window.getSelection(); s.removeAllRanges(); s.addRange(r);
            root.focus(); _markDirty(); updateFooterVisibility();
        });
        btn.parentNode.replaceChild(fresh, btn);
    });

    /* Eski col-block ve layout-block'ları migrate et */
    root.querySelectorAll('.col-block').forEach(blk => {
        const cols = blk.querySelectorAll('.col-panel').length || 2;
        const wrap = createGrid('panel', cols, 1);
        const grid = wrap.querySelector('.noted-grid');
        /* Panel içeriklerini kopyala */
        blk.querySelectorAll('.col-panel').forEach((panel, ci) => {
            const titleSrc = panel.querySelector('.col-panel-title');
            const contentSrc = panel.querySelector('.col-panel-content');
            const th = grid.querySelectorAll('thead th')[ci];
            const td = grid.querySelectorAll('tbody td')[ci];
            if (th && titleSrc) th.querySelector('.ng-title').textContent = titleSrc.textContent;
            if (td && contentSrc) td.querySelector('.ng-cell').innerHTML = contentSrc.innerHTML;
        });
        blk.parentNode.replaceChild(wrap, blk);
    });
    root.querySelectorAll('.layout-block').forEach(blk => {
        const cols = blk.querySelectorAll('.layout-col').length || 2;
        const wrap2 = createGrid('column', cols, 1);
        const grid2 = wrap2.querySelector('.noted-grid');
        blk.querySelectorAll('.layout-col').forEach((col, ci) => {
            const td = grid2.querySelectorAll('tbody td')[ci];
            if (td) td.querySelector('.ng-cell').innerHTML = col.innerHTML;
        });
        blk.parentNode.replaceChild(wrap2, blk);
    });
}

/* Tablo satır seçimi — birleşik handler (Shift: range, Ctrl/Meta: toggle) */
document.addEventListener('click', function tableRowSelect(e) {
    if (!e.shiftKey && !e.ctrlKey && !e.metaKey) return;
    const td = e.target.closest('td');
    if (!td) return;
    const table = td.closest('.noted-grid.grid-table');
    if (!table) return;
    const tr = td.closest('tr');
    if (!tr || tr.parentElement.tagName !== 'TBODY') return;
    e.preventDefault();
    if (e.shiftKey) {
        /* Range seçim: lastSel → tr arası tüm satırları seç */
        const lastSel = table.querySelector('.ng-row-selected');
        if (!lastSel) {
            tr.classList.add('row-selected');
            tr.classList.add('ng-row-selected');
            return;
        }
        const rows = [...table.querySelectorAll('tbody tr')];
        const i1 = rows.indexOf(lastSel);
        const i2 = rows.indexOf(tr);
        const [from, to] = i1 < i2 ? [i1, i2] : [i2, i1];
        rows.forEach((r, i) => {
            if (i >= from && i <= to) {
                r.classList.add('row-selected');
                r.classList.add('ng-row-selected');
            }
        });
    } else {
        /* Ctrl/Meta: tek satır toggle */
        tr.classList.toggle('row-selected');
        tr.classList.toggle('ng-row-selected');
    }
}, true);
/* Shift/Ctrl olmayan tıklamalarda seçimleri kaldır */
document.addEventListener('click', function clearRowSel(e) {
    if (e.shiftKey || e.ctrlKey || e.metaKey) return;
    document.querySelectorAll('.row-selected, .ng-row-selected').forEach(r => {
        r.classList.remove('row-selected');
        r.classList.remove('ng-row-selected');
    });
});
/* ESC ile seçimi temizle */
document.addEventListener('keydown', function clearRowSelKey(e) {
    if (e.key !== 'Escape') return;
    document.querySelectorAll('.row-selected, .ng-row-selected').forEach(r => {
        r.classList.remove('row-selected');
        r.classList.remove('ng-row-selected');
    });
});

/* ══ BİÇİM KOPYALAYICI ══ */
(function() {
    let _paintFormat = null; /* { fontFamily, fontSize, color, backgroundColor } */
    window._sharedPaintFormat = null;
    const btn = $('tb-format-painter');
    const pasteBtn = $('tb-format-paste'); /* painter içinden erişim için */
    if (!btn) return;

    /* Toolbar güncellenince etkin/pasif yap */
    function updatePainterBtn() {
        const sel = window.getSelection();
        const hasSelection = sel && !sel.isCollapsed;
        btn.classList.toggle('inactive', !hasSelection && !_paintFormat);
    }
    document.addEventListener('selectionchange', updatePainterBtn);

    /* Toolbar mousedown handler'ına format-painter special eklenecek */
    /* Aşağıda el ile işliyoruz */
    btn.addEventListener('mousedown', e => e.preventDefault());
    btn.addEventListener('click', function(e) {
        e.stopPropagation();
        /* Seçim yoksa çık */
        const sel = window.getSelection();
        const savedRange = EditorState._savedToolbarSel ? EditorState._savedToolbarSel.range : null;
        if (!savedRange && (!sel || sel.isCollapsed)) return;

        /* Anchor element'i bul */
        const anchor = savedRange ? savedRange.startContainer : sel.anchorNode;
        const anchorEl = anchor ? (anchor.nodeType === 3 ? anchor.parentElement : anchor) : null;
        const fmt = { fontFamily:'', fontSize:'', color:'', backgroundColor:'', fontWeight:'', fontStyle:'', textDecoration:'' };
        if (anchorEl && anchorEl !== document.body) {
            const cs = window.getComputedStyle(anchorEl);
            fmt.fontFamily = cs.fontFamily || '';
            fmt.fontSize   = cs.fontSize   || '';
            fmt.fontWeight = cs.fontWeight || '';
            fmt.fontStyle  = cs.fontStyle  || '';

            /* color: getComputedStyle HER ZAMAN somut bir deger döner (tema varsayılanını
               bile) — backgroundColor'daki gibi yalnızca ATALARDAN birinde AÇIKÇA inline
               style.color varsa kopyala, yoksa boş bırak. Aksi halde açık temada rengi hiç
               değiştirilmemiş (yalnızca tema varsayılanını miras alan) bir metin kopyalanıp
               koyu temaya yapıştırılınca koyu-üzerine-koyu okunmaz hale geliyordu — boş
               bırakınca yapıştırılan span color'suz kalıp hedefin tema rengini miras alıyor. */
            let cNode = anchorEl;
            while (cNode && cNode !== DOM.$content && cNode !== document.body) {
                if (cNode.style && cNode.style.color) { fmt.color = cNode.style.color; break; }
                cNode = cNode.parentElement;
            }

            let n = anchorEl;
            while (n && n !== DOM.$content && n !== document.body) {
                if (n.style && n.style.backgroundColor &&
                    n.style.backgroundColor !== 'rgba(0, 0, 0, 0)' &&
                    n.style.backgroundColor !== 'transparent') {
                    fmt.backgroundColor = n.style.backgroundColor;
                    break;
                }
                n = n.parentElement;
            }

            const tdSet = new Set();
            n = anchorEl;
            while (n && n !== DOM.$content && n !== document.body) {
                if (n.style && n.style.textDecoration) {
                    n.style.textDecoration.split(/\s+/).forEach(v => v && tdSet.add(v));
                }
                const tag = n.tagName;
                if (tag === 'U') tdSet.add('underline');
                if (tag === 'S' || tag === 'STRIKE' || tag === 'DEL') tdSet.add('line-through');
                n = n.parentElement;
            }
            fmt.textDecoration = [...tdSet].join(' ');
        }
        _paintFormat = fmt;
        window._sharedPaintFormat = fmt;
        /* Flash bildirim */
        btn.classList.add('active');
        setTimeout(() => btn.classList.remove('active'), 800);
        /* paste butonunu aktif et */
        pasteBtn.classList.remove('inactive');
    });
})();

/* Ok tuşları ile tablo hücre geçişi — sadece grid-table */
document.addEventListener('keydown', function ngArrowNav(e) {
    const KEYS = { ArrowLeft:37, ArrowRight:39, ArrowUp:38, ArrowDown:40 };
    if (!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key)) return;
    const active = document.activeElement;
    if (!active) return;
    const cell = active.closest('.ng-cell, .ng-title');
    if (!cell) return;
    const table = active.closest('.noted-grid');
    /* Tüm grid tiplerinde ok navigasyonu */
    if (!table) return;

    const td = cell.closest('td, th');
    const tr = td ? td.closest('tr') : null;
    if (!td || !tr) return;

    const sel = window.getSelection();
    if (!sel || !sel.rangeCount) return;
    const range = sel.getRangeAt(0);

    /* Hücredeki tüm metin düğümleri ve satır bilgisi */
    function getCellText() { return cell.textContent || ''; }
    function isAtStart() {
        /* Boş hücre → her zaman başta */
        if (!cell.textContent) return true;
        if (range.startContainer === cell && range.startOffset === 0) return true;
        if (range.startContainer.nodeType === 3 && range.startOffset === 0) {
            /* İlk text düğümü mü? */
            let n = range.startContainer;
            while (n.previousSibling) { n = n.previousSibling; if (n.textContent) return false; }
            return true;
        }
        return false;
    }
    function isAtEnd() {
        /* Boş hücre → her zaman sonda */
        if (!cell.textContent.trim()) return true;
        /* Text node'daysa: son text node ve offset = length */
        if (range.startContainer.nodeType === 3) {
            /* Sonraki kardeşlerde metin var mı? */
            let n = range.startContainer;
            if (range.startOffset < n.length) return false;
            while (n.nextSibling) {
                n = n.nextSibling;
                if (n.textContent) return false;
            }
            return true;
        }
        /* Element node'daysa: tüm child'lardan sonra mı? */
        if (range.startContainer === cell) {
            return range.startOffset >= cell.childNodes.length;
        }
        return false;
    }
    function getLineInfo() {
        /* İmlecin hücre içindeki dikey pozisyonu */
        const rects = range.getClientRects();
        if (!rects.length) return { first:true, last:true };
        const cellRect = cell.getBoundingClientRect();
        const cursorTop = rects[0].top;
        const lineH = parseFloat(window.getComputedStyle(cell).lineHeight) || 20;
        const first = (cursorTop - cellRect.top) < lineH;
        const last  = (cellRect.bottom - rects[0].bottom) < lineH;
        return { first, last };
    }

    function focusCell(c) {
        if (!c) return false;
        const target = c.querySelector('.ng-cell, .ng-title');
        if (!target) return false;
        target.focus();
        /* Her zaman imleç başa: focus olsa bile range yenile */
        setTimeout(() => {
            const r2 = document.createRange();
            r2.setStart(target, 0); r2.collapse(true);
            const s2 = window.getSelection();
            if (s2) { s2.removeAllRanges(); s2.addRange(r2); }
        }, 0);
        return true;
    }
    function focusCellEnd(c) {
        if (!c) return false;
        const target = c.querySelector('.ng-cell, .ng-title');
        if (!target) return false;
        target.focus();
        setTimeout(() => {
            const r2 = document.createRange();
            r2.selectNodeContents(target); r2.collapse(false);
            const s2 = window.getSelection();
            if (s2) { s2.removeAllRanges(); s2.addRange(r2); }
        }, 0);
        return true;
    }

    /* Tüm th/td'leri sıralı dizi */
    const allCells = [...table.querySelectorAll('thead tr, tbody tr')].flatMap(r => [...r.children]);
    const tdIdx = allCells.indexOf(td);

    if (e.key === 'ArrowLeft') {
        if (!isAtStart()) return;
        e.preventDefault();
        if (tdIdx > 0) focusCellEnd(allCells[tdIdx - 1]);
    } else if (e.key === 'ArrowRight') {
        if (!isAtEnd()) return;
        e.preventDefault();
        if (tdIdx < allCells.length - 1) focusCell(allCells[tdIdx + 1]);
    } else if (e.key === 'ArrowUp') {
        const { first } = getLineInfo();
        if (!first) return;
        e.preventDefault();
        /* Aynı kolon indexinde üst satırın hücresi */
        const cells = [...tr.children];
        const colIdx = cells.indexOf(td);
        const prevTr = tr.previousElementSibling ||
            (tr.parentElement.tagName === 'TBODY' ? table.querySelector('thead tr:last-child') : null);
        if (prevTr) {
            const prevCells = [...prevTr.children];
            if (prevCells[colIdx]) focusCellEnd(prevCells[colIdx]);
        }
    } else if (e.key === 'ArrowDown') {
        const { last } = getLineInfo();
        if (!last) return;
        e.preventDefault();
        const cells = [...tr.children];
        const colIdx = cells.indexOf(td);
        const nextTr = tr.nextElementSibling ||
            (tr.parentElement.tagName === 'THEAD' ? table.querySelector('tbody tr') : null);
        if (nextTr) {
            const nextCells = [...nextTr.children];
            if (nextCells[colIdx]) focusCell(nextCells[colIdx]);
        }
    }
}, true);

/* Format Paste: kopyalanmış biçimi seçime uygula */
(function() {
    const pasteBtn = $('tb-format-paste');
    if (!pasteBtn) return;
    function updatePasteBtn() {
        const hasPaint = !!window._sharedPaintFormat;
        const sel = window.getSelection();
        const hasSel = sel && !sel.isCollapsed;
        pasteBtn.classList.toggle('inactive', !(hasPaint && hasSel));
    }
    document.addEventListener('selectionchange', updatePasteBtn);
    pasteBtn.addEventListener('mousedown', e => e.preventDefault());
    pasteBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        const fmt = window._sharedPaintFormat;
        if (!fmt || (!fmt.fontFamily && !fmt.fontSize && !fmt.color && !fmt.backgroundColor)) {
            _showSnack(NotedI18n.t('msg.copyformatfirst')); return;
        }
        /* Mevcut seçimi kullan — restore ETME (farklı metin seçilmiş olabilir) */
        const sel = window.getSelection();
        if (!sel || !sel.rangeCount || sel.isCollapsed) {
            _showSnack(NotedI18n.t('msg.selecttextforformat')); return;
        }
        const range = sel.getRangeAt(0);
        const span = document.createElement('span');
        if (fmt.fontFamily)      span.style.fontFamily      = fmt.fontFamily;
        if (fmt.fontSize)        span.style.fontSize        = fmt.fontSize;
        if (fmt.color)           span.style.color           = fmt.color;
        if (fmt.backgroundColor && fmt.backgroundColor !== 'rgba(0, 0, 0, 0)')
            span.style.backgroundColor = fmt.backgroundColor;
        if (fmt.fontWeight && fmt.fontWeight !== '400' && fmt.fontWeight !== 'normal')
            span.style.fontWeight = fmt.fontWeight;
        if (fmt.fontStyle && fmt.fontStyle !== 'normal')
            span.style.fontStyle = fmt.fontStyle;
        if (fmt.textDecoration && fmt.textDecoration !== 'none')
            span.style.textDecoration = fmt.textDecoration;
        try { range.surroundContents(span); }
        catch { const frag = range.extractContents(); span.appendChild(frag); range.insertNode(span); }
        _markDirty();
    });
})();

