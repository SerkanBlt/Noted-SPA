/* ══ v1.6: HATIRLATICI ══ */
function updateReminderBtn(reminders, reminderNote) {
    editorReminders    = Array.isArray(reminders) ? reminders : [];
    editorReminderNote = reminderNote || '';
    if (!DOM.$reminderBtn) return;
    DOM.$reminderBtn.classList.remove('has-reminder', 'overdue');
    const active = editorReminders.filter(r => r && r.at && !r.fired);
    if (active.length > 0) {
        const overdue = active.some(r => r.at <= Date.now());
        DOM.$reminderBtn.classList.add(overdue ? 'overdue' : 'has-reminder');
        const next = active.slice().sort((a, b) => a.at - b.at)[0];
        const d = new Date(next.at);
        DOM.$reminderBtn.title = 'Hatırlatıcı (' + active.length + '): '
            + d.toLocaleDateString('tr-TR', {day:'2-digit',month:'long',year:'numeric'})
            + ' ' + d.toLocaleTimeString('tr-TR', {hour:'2-digit',minute:'2-digit'});
    } else {
        DOM.$reminderBtn.title = 'Hatırlatıcı Kur';
    }
}

function _buildRpItem(r) {
    const pad = x => String(x).padStart(2, '0');
    const base = r && r.at ? new Date(r.at) : new Date(Date.now() + 60*60*1000);
    const dateVal = base.getFullYear() + '-' + pad(base.getMonth()+1) + '-' + pad(base.getDate());
    const timeVal = pad(base.getHours()) + ':' + pad(base.getMinutes());
    const div = document.createElement('div');
    div.className = 'rp-item';
    div.innerHTML =
        '<div class="rp-item-hdr">' +
            '<i class="fas fa-bell rp-item-ico"></i>' +
            '<input type="text" class="rp-item-title" placeholder="Başlık…">' +
            '<button class="rp-item-del" title="Bu hatırlatıcıyı kaldır"><i class="fas fa-times"></i></button>' +
        '</div>' +
        '<div class="rp-item-dt">' +
            '<span class="rp-dt-ico"><i class="fas fa-calendar-alt"></i></span>' +
            '<input type="date" class="rp-date">' +
            '<input type="time" class="rp-time">' +
        '</div>' +
        '<textarea class="rp-item-note" placeholder="Not… (opsiyonel)" rows="2"></textarea>';
    div.querySelector('.rp-item-title').value = (r && r.title) || '';
    div.querySelector('.rp-date').value = dateVal;
    div.querySelector('.rp-time').value = timeVal;
    div.querySelector('.rp-item-note').value = (r && r.note) || '';
    div.querySelector('.rp-item-del').addEventListener('click', () => div.remove());
    return div;
}

function openReminderPopup() {
    if (!DOM.$reminderPopup || !DOM.$reminderBtn) return;
    const list = $('reminder-list');
    if (list) {
        list.innerHTML = '';
        const rows = editorReminders.length > 0 ? editorReminders : [null];
        rows.forEach(r => list.appendChild(_buildRpItem(r)));
    }
    DOM.$reminderPopup.classList.add('show');
    const r = DOM.$reminderBtn.getBoundingClientRect();
    const popW = DOM.$reminderPopup.offsetWidth  || 300;
    const popH = DOM.$reminderPopup.offsetHeight || 340;
    let top  = r.top - popH - 8;
    let left = r.right + 8;
    if (top < 8) top = r.bottom + 8;
    if (left + popW > window.innerWidth - 8) left = r.left - popW - 8;
    if (left < 8) left = 8;
    DOM.$reminderPopup.style.top  = top + 'px';
    DOM.$reminderPopup.style.left = left + 'px';
}
function closeReminderPopup() {
    if (DOM.$reminderPopup) DOM.$reminderPopup.classList.remove('show');
    window._fpReminderContext = null;
}
window._fpOpenReminderForNote = function(noteId, anchorEl) {
    if (!DOM.$reminderPopup || !anchorEl) return;
    const n = notes.find(x => String(x.id) === String(noteId));
    const _rems = n ? (n.reminders || (n.reminder ? [n.reminder] : [])) : [];
    editorReminders    = _rems.slice();
    editorReminderNote = n ? (n.reminderNote || '') : '';
    window._fpReminderContext = noteId;
    const list = $('reminder-list');
    if (list) {
        list.innerHTML = '';
        const rows = editorReminders.length > 0 ? editorReminders : [null];
        rows.forEach(r => list.appendChild(_buildRpItem(r)));
    }
    DOM.$reminderPopup.classList.add('show');
    const r = anchorEl.getBoundingClientRect();
    const popW = DOM.$reminderPopup.offsetWidth  || 300;
    const popH = DOM.$reminderPopup.offsetHeight || 340;
    let top  = r.top - popH - 8, left = r.right + 8;
    if (top < 8) top = r.bottom + 8;
    if (left + popW > window.innerWidth - 8) left = r.left - popW - 8;
    if (left < 8) left = 8;
    DOM.$reminderPopup.style.top  = top + 'px';
    DOM.$reminderPopup.style.left = left + 'px';
};
function saveReminderFromPopup() {
    const list = $('reminder-list');
    const reminders = [];
    if (list) {
        list.querySelectorAll('.rp-item').forEach(item => {
            const dateEl = item.querySelector('.rp-date');
            const timeEl = item.querySelector('.rp-time');
            if (!dateEl || !dateEl.value) return;
            const dt = new Date(dateEl.value + 'T' + (timeEl && timeEl.value ? timeEl.value : '09:00') + ':00');
            if (isNaN(dt.getTime())) return;
            const title = (item.querySelector('.rp-item-title') || {}).value || '';
            const note  = (item.querySelector('.rp-item-note')  || {}).value || '';
            reminders.push({ at: dt.getTime(), fired: false, title: title.trim(), note: note.trim() });
        });
    }
    updateReminderBtn(reminders, '');
    persistReminderIfEditing();
    closeReminderPopup();
}
function clearReminderFromPopup() {
    updateReminderBtn([], '');
    persistReminderIfEditing();
    closeReminderPopup();
}
function persistReminderIfEditing() {
    const fpCtx = window._fpReminderContext;
    if (fpCtx) window._fpReminderContext = null;
    const eId = fpCtx || DOM.$editId.value;
    if (!eId) return;
    const idx = notes.findIndex(n => String(n.id) === String(eId));
    if (idx === -1) return;
    notes[idx] = { ...notes[idx], reminders: editorReminders, reminderNote: editorReminderNote, reminder: null, updatedAt: notes[idx].updatedAt };
    saveNotes();
    if (!fpCtx) render();
    if (typeof window._fpSyncFooter === 'function') window._fpSyncFooter();
}

/* reminder-add-btn dinleyicisi — popup açıkken çalışır */
document.addEventListener('click', function(e) {
    if (e.target.closest('#reminder-add-btn')) {
        const list = $('reminder-list');
        if (list) list.prepend(_buildRpItem(null));
    }
});
function formatReminderShort(at) {
    const d = new Date(at);
    const today = new Date();
    const sameDay = d.toDateString() === today.toDateString();
    const time = d.toLocaleTimeString('tr-TR', {hour:'2-digit',minute:'2-digit'});
    return sameDay ? ('Bugün ' + time) : (d.toLocaleDateString('tr-TR',{day:'2-digit',month:'short'}) + ' ' + time);
}
function showReminderToast(note, reminder) {
    if (!DOM.$reminderToastOverlay) return;
    const t = document.createElement('div');
    t.className = 'reminder-toast';
    const r = reminder || {};
    const heading = esc(r.title || r.reminderTitle || (note && note.title) || 'Başlıksız not');
    const noteText = (r && (r.note || r.reminderNote)) || (note && note.reminderNote) || '';
    const sub = noteText ? '<span style="display:block;margin-top:3px;opacity:.8;font-size:.82em">' + esc(noteText) + '</span>' : '';
    t.innerHTML = '<b><i class="fas fa-bell"></i> ' + heading + '</b>' + sub;
    function _dismiss() {
        if (!t.parentNode || t.classList.contains('toast-out')) return;
        t.classList.add('toast-out');
        setTimeout(() => { if (t.parentNode) t.remove(); }, 480);
    }
    if (note) t.addEventListener('click', () => { handleEditNoteRequest(note.id); _dismiss(); });
    DOM.$reminderToastOverlay.appendChild(t);
    setTimeout(_dismiss, 8000);
}
function checkReminders() {
    if (!Array.isArray(notes)) return;
    const now = Date.now();
    let changed = false;
    notes.forEach(n => {
        /* New multi-reminder array */
        const rems = n.reminders || [];
        rems.forEach(r => {
            if (r && r.at && !r.fired && r.at <= now) {
                r.fired = true; changed = true;
                showReminderToast(n, r);
                if (String(DOM.$editId.value) === String(n.id)) updateReminderBtn(n.reminders, n.reminderNote || '');
            }
        });
        /* Legacy single reminder */
        if (!n.reminders && n.reminder && n.reminder.at && !n.reminder.fired && n.reminder.at <= now) {
            n.reminder.fired = true; changed = true;
            showReminderToast(n, n.reminder);
            if (String(DOM.$editId.value) === String(n.id)) updateReminderBtn([], '');
        }
    });
    if (changed) { saveNotes(); render(); }
}

/* ══ v1.6: MARKDOWN DIŞA AKTARMA ══ */
function htmlToMarkdown(html) {
    const root = document.createElement('div');
    root.innerHTML = sanitize(html);
    function inline(node) {
        let out = '';
        node.childNodes.forEach(c => {
            if (c.nodeType === 3) { out += c.textContent; return; }
            if (c.nodeType !== 1) return;
            const tag = c.tagName.toLowerCase();
            const inner = inline(c);
            if (tag === 'strong' || tag === 'b') out += '**' + inner + '**';
            else if (tag === 'em' || tag === 'i') out += '_' + inner + '_';
            else if (tag === 'u') out += inner;
            else if (tag === 's' || tag === 'strike' || tag === 'del') out += '~~' + inner + '~~';
            else if (tag === 'code') out += '`' + inner + '`';
            else if (tag === 'mark') out += '==' + inner + '==';
            else if (tag === 'a') { const href = c.getAttribute('href') || ''; out += '[' + inner + '](' + href + ')'; }
            else if (tag === 'br') out += '\n';
            else out += inner;
        });
        return out;
    }
    function block(node, lines) {
        Array.from(node.children).forEach(el => {
            const tag = el.tagName.toLowerCase();
            if (tag === 'h2') lines.push('## ' + inline(el).trim());
            else if (tag === 'h3') lines.push('### ' + inline(el).trim());
            else if (tag === 'blockquote') lines.push('> ' + inline(el).trim());
            else if (tag === 'pre') lines.push('```\n' + el.textContent.replace(/\n+$/,'') + '\n```');
            else if (tag === 'ul') Array.from(el.children).forEach(li => { if (li.classList && li.classList.contains('todo-item')) { lines.push((li.dataset.checked === 'true' ? '- [x] ' : '- [ ] ') + inline(li).trim()); } else lines.push('- ' + inline(li).trim()); });
            else if (tag === 'ol') Array.from(el.children).forEach((li, i) => lines.push((i+1) + '. ' + inline(li).trim()));
            else if (tag === 'p' || tag === 'div') { const t = inline(el).trim(); if (t) lines.push(t); }
            else { const t = inline(el).trim(); if (t) lines.push(t); }
        });
    }
    const lines = [];
    block(root, lines);
    return lines.join('\n\n');
}
function exportNoteAsMarkdown(noteId) {
    const n = notes.find(x => String(x.id) === String(noteId));
    if (!n) return;
    const dateStr = n.updatedAt ? new Date(n.updatedAt).toLocaleDateString('tr-TR', {day:'2-digit',month:'long',year:'numeric'}) : '';
    const tags = (n.tags && n.tags.length) ? n.tags.map(t => '#'+t).join(' ') : '';
    const md = '# ' + n.title + '\n\n'
        + (dateStr ? '_' + dateStr + (tags ? ' · ' + tags : '') + '_\n\n' : '')
        + htmlToMarkdown(n.content)
        + '\n\n---\n_Noted uygulamasından dışa aktarıldı._\n';
    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = n.title.replace(/[\\\/:*?"<>|]/g, '-').slice(0, 60) + '.md';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

function updateColorLabelBtn(key) {
    editorColorLabel = key;
    const cl = Const.COLOR_LABELS.find(c => c.key === key);
    DOM.$clBtn.style.color = cl ? cl.hex : 'var(--text-muted)';
    DOM.$clBtn.style.borderColor = cl ? cl.hex : 'var(--border)';
    /* Rozet satırlarını aktif olarak işaretle */
    const popup = $('color-label-popup');
    if (popup) {
        popup.querySelectorAll('.cl-badge-row').forEach(row => {
            const rowKey = row.dataset.cl || null;
            const isActive = (key === null && !rowKey) || (rowKey === key);
            row.classList.toggle('active', isActive);
        });
    }
}

document.addEventListener('click', () => {
    $('color-label-popup').classList.remove('open');
});

DOM.$clBtn.addEventListener('click', e => {
    e.stopPropagation();
    const popup = $('color-label-popup');
    const rect  = DOM.$clBtn.getBoundingClientRect();
    let top  = rect.bottom + 4;
    let left = rect.left;
    if (left + 210 > window.innerWidth) left = window.innerWidth - 215;
    if (top + 230 > window.innerHeight)  top  = rect.top - 234;
    popup.style.top  = top  + 'px';
    popup.style.left = left + 'px';
    popup.classList.toggle('open');
});

/* ══ TOOLBAR ══ */
function insertEmptyParaAfter(el) {
    const p = document.createElement('p');
    p.appendChild(document.createElement('br'));
    el.nextSibling ? el.parentNode.insertBefore(p, el.nextSibling) : el.parentNode.appendChild(p);
    const r = document.createRange();
    r.setStart(p, 0); r.collapse(true);
    const s = window.getSelection();
    s.removeAllRanges(); s.addRange(r);
}

function insertEmptyParaBefore(el) {
    /* el DOM.$content'in (veya panel içeriğinin) ilk child'ıysa önüne boş paragraf ekle */
    const prev = el.previousElementSibling;
    if (!prev || (prev.nodeType === 1 && prev === el)) return; /* zaten var */
    const p = document.createElement('p');
    p.appendChild(document.createElement('br'));
    el.parentNode.insertBefore(p, el);
}

/* Aktif editör alanını takip et — panel içi formatlamada doğru alana uygulansın */
let _activeEditTarget = DOM.$content;
DOM.$content.addEventListener('focus', () => { _activeEditTarget = DOM.$content; });
document.addEventListener('focusin', e => {
    if (e.target.classList.contains('col-panel-content') ||
        e.target.classList.contains('layout-col') ||
        e.target.id === 'fp-content') {
        _activeEditTarget = e.target;
        _savedToolbarSel = null;
    }
}, true);
/* Float panel'de imleç var mı — kısayol / toolbar guard'ları için */
function _fpFocused() { return _activeEditTarget && _activeEditTarget.id === 'fp-content'; }

/* Toolbar tıklanmadan önce aktif selection'ı kaydet */
let _savedToolbarSel = null;

function _saveToolbarSel() {
    const sel = window.getSelection();
    if (!sel || !sel.rangeCount) return;
    const et = _activeEditTarget || DOM.$content;
    /* Seçimin gerçekten title veya editable alandan geldiğini doğrula */
    if (et.contains(sel.anchorNode)) {
        _savedToolbarSel = { et, range: sel.getRangeAt(0).cloneRange() };
    }
}

function _restoreToolbarSel() {
    /* _savedToolbarSel selectionchange'te debounce'lu (RAF/setTimeout) güncelleniyor.
       Toolbar butonuna seçimden hemen sonra tıklanırsa debounce henüz çalışmamış olabilir —
       _savedToolbarSel eski/boş kalır, restore de o eski range'i uygulayıp canlı seçimi
       (asıl doğru olanı) ezer, format komutu hiçbir şeye uygulanmamış gibi olur.
       Restore etmeden önce senkron bir _saveToolbarSel() çağrısı, mousedown anındaki
       canlı seçim hâlâ geçerliyse onu hemen yakalayıp bu yarışı ortadan kaldırır. */
    _saveToolbarSel();
    if (!_savedToolbarSel) return;
    const { et, range } = _savedToolbarSel;
    et.focus();
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
}

/* Seçim veya cursor değiştiğinde kaydet — throttled */
let _selChangePending = false;
document.addEventListener('selectionchange', () => {
    if (_selChangePending) return;
    _selChangePending = true;
    requestAnimationFrame(() => {
        _selChangePending = false;
        const sel = window.getSelection();
        if (!sel || !sel.rangeCount) return;
        const et = _activeEditTarget || DOM.$content;
        if (et && sel.anchorNode && et.contains(sel.anchorNode)) {
            _savedToolbarSel = { et, range: sel.getRangeAt(0).cloneRange() };
        }
    });
});

$('toolbar').addEventListener('mousedown', e => {
    const btn = e.target.closest('.tb');
    if (!btn) return;
    e.preventDefault();
    /* Selection kayıplıysa restore et */
    _restoreToolbarSel();
    if (btn.id === 'tb-fsize-dec' || btn.id === 'tb-fsize-inc') {
        /* Font boyutu — Bold ile aynı mekanizma: e.preventDefault() zaten yapıldı */
        _fsizeApplying = true;
        const sz = getCurrentFontSize();
        const newSz = btn.id === 'tb-fsize-dec' ? Math.max(8, sz - 2) : Math.min(96, sz + 2);
        applyInlineStyle('fontSize', newSz + 'px');
        $('tb-fsize-val').textContent = newSz;
        clearTimeout(toolbarHideTimer); DOM.$toolbar.classList.add('tb-active');
        requestAnimationFrame(() => { _fsizeApplying = false; });
        return;
    }
    if      (btn.dataset.cmd)   document.execCommand(btn.dataset.cmd, false, null);
    else if (btn.dataset.block) {
        document.execCommand('formatBlock', false, btn.dataset.block);
        if (btn.dataset.block === 'blockquote') {
            const s = window.getSelection();
            if (s && s.rangeCount) {
                let node = s.getRangeAt(0).startContainer;
                while (node && node !== _activeEditTarget && node !== DOM.$content) {
                    if (node.nodeName === 'BLOCKQUOTE') { insertEmptyParaAfter(node); break; }
                    node = node.parentNode;
                }
            }
        }
    }
    else if (btn.dataset.list)    document.execCommand(btn.dataset.list === 'ul' ? 'insertUnorderedList' : 'insertOrderedList', false, null);
    else if (btn.dataset.special) {
        if (btn.dataset.special === 'bgcolor') {
            const popup = $('bg-color-popup');
            const rect  = btn.getBoundingClientRect();
            let top  = rect.bottom + 4, left = rect.right - 180;
            if (left < 4) left = 4;
            if (top + 170 > window.innerHeight) top = rect.top - 174;
            const willOpen = !popup.classList.contains('open');
            /* v1.10 güncelleme: iki renk kataloğu aynı anda alt alta açık kalmasın */
            $('color-popup').classList.remove('open');
            popup.style.top = top + 'px'; popup.style.left = left + 'px';
            popup.classList.toggle('open', willOpen);
        } else if (btn.dataset.special === 'color') {
            const popup = $('color-popup');
            const rect  = btn.getBoundingClientRect();
            let top  = rect.bottom + 4, left = rect.right - 180;
            if (left < 4) left = 4;
            if (top + 170 > window.innerHeight) top = rect.top - 174;
            const willOpen = !popup.classList.contains('open');
            /* v1.10 güncelleme: iki renk kataloğu aynı anda alt alta açık kalmasın */
            $('bg-color-popup').classList.remove('open');
            popup.style.top = top + 'px'; popup.style.left = left + 'px';
            popup.classList.toggle('open', willOpen);
        } else if (btn.dataset.special === 'table') {
            _saveToolbarSel();
            const popup = $('table-popup');
            const rect  = btn.getBoundingClientRect();
            let top  = rect.bottom + 6;
            let left = rect.left;
            const popW = 8 * 22 + 7 * 3 + 20; /* 8 cols × 22px + gaps + padding */
            if (left + popW > window.innerWidth - 4) left = window.innerWidth - popW - 4;
            if (top + 240 > window.innerHeight) top = rect.top - 244;
            popup.style.top  = top + 'px';
            popup.style.left = left + 'px';
            popup.classList.toggle('open', !popup.classList.contains('open'));
        } else if (btn.dataset.special === 'ai-action') {
            _saveToolbarSel();
            const popup = $('ai-action-popup');
            const rect  = btn.getBoundingClientRect();
            let top  = rect.bottom + 4;
            let left = rect.left;
            if (left + 140 > window.innerWidth - 4) left = window.innerWidth - 144;
            if (top + 180 > window.innerHeight) top = rect.top - 184;
            popup.style.top  = top  + 'px';
            popup.style.left = left + 'px';
            popup.classList.toggle('open', !popup.classList.contains('open'));
        } else {
            runSpecial(btn.dataset.special);
        }
    }
    updateToolbarState();
});

function _tbAiNotif(anchorEl, msg) {
    const n = document.createElement('div');
    n.className = 'tb-ai-notif';
    n.textContent = msg;
    document.body.appendChild(n);
    const r = anchorEl && anchorEl.getBoundingClientRect ? anchorEl.getBoundingClientRect() : { bottom: 60, left: 8 };
    n.style.top  = (r.bottom + 6) + 'px';
    n.style.left = Math.max(4, r.left - 60) + 'px';
    requestAnimationFrame(() => n.classList.add('show'));
    setTimeout(() => {
        n.classList.remove('show');
        setTimeout(() => n.remove(), 220);
    }, 3200);
}

function _showAiGutterInd(savedRange) {
    const rangeRect   = savedRange.getBoundingClientRect();
    const contentRect = DOM.$content.getBoundingClientRect();
    const el = document.createElement('div');
    el.className = 'ai-gutter-ind';
    el.innerHTML = '<i class="fas fa-spinner"></i>';
    el.style.top  = (rangeRect.top + rangeRect.height / 2 - 9) + 'px';
    el.style.left = (contentRect.left + 4) + 'px';
    document.body.appendChild(el);
    requestAnimationFrame(() => el.classList.add('show'));
    return {
        success() {
            el.innerHTML = '<i class="fas fa-check"></i>';
            el.classList.add('ai-gutter-ok');
            setTimeout(() => {
                el.style.transition = 'opacity .3s, transform .3s';
                el.style.opacity    = '0';
                el.style.transform  = 'scale(.6)';
                setTimeout(() => el.remove(), 320);
            }, 1400);
        },
        error() {
            el.style.opacity   = '0';
            el.style.transform = 'scale(.6)';
            setTimeout(() => el.remove(), 220);
        }
    };
}

/* ── Not içi AI eylem popup ── */
(function initAiActionPopup() {
    const popup     = $('ai-action-popup');
    const tonePop   = $('ai-tone-popup');
    if (!popup) return;

    const TONE_LABELS = { professional:'Profesyonel', friendly:'Samimi', informative:'Bilgilendirici', creative:'Yaratıcı' };
    function _updateToneBadge() {
        const cur   = getAiCfg().tone || 'informative';
        const badge = popup.querySelector('.ai-tone-name');
        if (badge) badge.textContent = TONE_LABELS[cur] || 'Bilgilendirici';
        if (tonePop) {
            tonePop.querySelectorAll('.ai-act-item[data-ai-tone]').forEach(el => {
                el.classList.toggle('ai-tone-active', el.dataset.aiTone === cur);
            });
        }
    }
    _updateToneBadge();

    /* Ton popup konumlama */
    function _openTonePopup(rectOrEl) {
        if (!tonePop) return;
        _updateToneBadge();
        const r = (rectOrEl && typeof rectOrEl.getBoundingClientRect === 'function')
            ? rectOrEl.getBoundingClientRect() : rectOrEl;
        let top  = r.top;
        let left = r.right + 4;
        if (left + 170 > window.innerWidth - 4) left = r.left - 174;
        if (top  + 160 > window.innerHeight)    top  = window.innerHeight - 164;
        tonePop.style.top  = top  + 'px';
        tonePop.style.left = left + 'px';
        tonePop.classList.add('open');
    }

    /* Hover flyout */
    let _toneCloseTimer;
    const _toneBtn = popup.querySelector('[data-ai-action="tone"]');
    if (_toneBtn && tonePop) {
        _toneBtn.addEventListener('mouseenter', () => { clearTimeout(_toneCloseTimer); _openTonePopup(_toneBtn); });
        _toneBtn.addEventListener('mouseleave', () => { _toneCloseTimer = setTimeout(() => tonePop.classList.remove('open'), 150); });
        tonePop.addEventListener('mouseenter', () => clearTimeout(_toneCloseTimer));
        tonePop.addEventListener('mouseleave', () => { _toneCloseTimer = setTimeout(() => tonePop.classList.remove('open'), 150); });
        _toneBtn.addEventListener('touchstart', e => {
            e.preventDefault();
            if (tonePop.classList.contains('open')) tonePop.classList.remove('open');
            else _openTonePopup(_toneBtn);
        }, { passive: false });
    }

    /* ── AI akışı: seçili metne eylem uygula ve sonucu ekle ── */
    function _runAiFlow(action, selectedText, savedRange, savedEt) {
        const aiBtn = $('tb-ai-btn');
        const ind   = _showAiGutterInd(savedRange);
        if (aiBtn) aiBtn.classList.add('tb-ai-busy');

        if (typeof window._inlineAI !== 'function') {
            if (aiBtn) aiBtn.classList.remove('tb-ai-busy');
            ind.error();
            _tbAiNotif(aiBtn, '⚠️ AI paneli henüz yüklenmedi.');
            return;
        }
        const useMd = getAiCfg().md !== false;

        window._inlineAI(action, selectedText, (result, modelName) => {
            if (aiBtn) aiBtn.classList.remove('tb-ai-busy');
            if (!result) { ind.error(); return; }
            _aiInserting = true;
            setTimeout(() => { _aiInserting = false; }, 120);
            savedEt.focus();
            const s = window.getSelection();
            const mdHtml = typeof window._mdToHtml === 'function'
                ? window._mdToHtml(result, useMd)
                : result.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/\n/g,'<br>');

            const _getTopBlock = node => {
                let n = node && node.nodeType === 3 ? node.parentElement : node;
                while (n && n.parentElement !== savedEt) n = n.parentElement;
                return (n && n !== savedEt) ? n : null;
            };
            const endBlock = _getTopBlock(savedRange.endContainer);
            const wrapper  = document.createElement('div');
            wrapper.className = 'ai-block';
            wrapper.setAttribute('data-generated-by', 'ai');
            if (modelName) wrapper.setAttribute('data-model', modelName);
            wrapper.innerHTML = mdHtml;

            if (endBlock) {
                const tailRange = document.createRange();
                try {
                    tailRange.setStart(savedRange.endContainer, savedRange.endOffset);
                    tailRange.setEnd(endBlock, endBlock.childNodes.length);
                } catch(_) { tailRange.collapse(true); }
                const tailFrag = tailRange.extractContents();
                const hasTail  = tailFrag.textContent.trim() !== '';
                savedEt.insertBefore(wrapper, endBlock.nextSibling || null);
                if (hasTail) {
                    const tailPara = document.createElement('p');
                    tailPara.appendChild(tailFrag);
                    savedEt.insertBefore(tailPara, wrapper.nextSibling || null);
                }
            } else {
                savedEt.appendChild(wrapper);
            }

            let gridsRestored = false;
            let lastInserted = wrapper;
            Array.from(wrapper.querySelectorAll('.ng-wrap')).forEach(wrap => {
                wrapper.parentNode.insertBefore(wrap, lastInserted.nextSibling);
                const p = document.createElement('p'); p.innerHTML = '<br>';
                wrapper.parentNode.insertBefore(p, wrap.nextSibling);
                lastInserted = p;
                gridsRestored = true;
            });
            if (wrapper.innerHTML.trim() === '' || (wrapper.children.length === 0 && !wrapper.textContent.trim())) {
                wrapper.remove();
            }

            const cr = document.createRange();
            cr.setStartAfter(lastInserted.parentNode ? lastInserted : (savedEt.lastChild || savedEt)); cr.collapse(true);
            s.removeAllRanges(); s.addRange(cr);
            DOM.$content.dispatchEvent(new Event('input', { bubbles: true }));
            /* ng-wrap içeriyorsa toolbar + resize handle'ları bağla */
            if (gridsRestored && typeof _restoreGrids === 'function') _restoreGrids();
            ind.success();
        }, errMsg => {
            if (aiBtn) aiBtn.classList.remove('tb-ai-busy');
            ind.error();
            _tbAiNotif(aiBtn, '⚠️ ' + errMsg);
        });
    }

    /* Seçili metni al ve AI akışını başlat — Alt+A için dışa açık */
    function _execAiAction(action) {
        const sel = window.getSelection();
        const selectedText = sel ? sel.toString().trim() : '';
        if (!selectedText) return;
        const savedRange = sel.getRangeAt(0).cloneRange();
        const savedEt    = _activeEditTarget || DOM.$content;
        _runAiFlow(action, selectedText, savedRange, savedEt);
    }
    window._execInlineAI = _execAiAction;

    /* ── Ana popup: eylem seçimi ── */
    popup.addEventListener('mousedown', e => {
        const item = e.target.closest('.ai-act-item');
        if (!item) return;
        e.preventDefault();

        if (item.dataset.aiAction === 'tone') {
            if (!tonePop) { popup.classList.remove('open'); return; }
            const savedRect = item.getBoundingClientRect();
            popup.classList.remove('open');
            _openTonePopup(savedRect);
            return;
        }

        popup.classList.remove('open');
        tonePop && tonePop.classList.remove('open');
        _restoreToolbarSel();
        _execAiAction(item.dataset.aiAction);
    });

    /* ── Ton seçici popup ── */
    if (tonePop) {
        tonePop.addEventListener('mousedown', e => {
            const item = e.target.closest('.ai-act-item[data-ai-tone]');
            if (!item) return;
            e.preventDefault();
            patchAiCfg({tone: item.dataset.aiTone});
            tonePop.classList.remove('open');
            _updateToneBadge();
        });
    }

    document.addEventListener('click', e => {
        if (popup.classList.contains('open') &&
            !popup.contains(e.target) && !e.target.closest('#tb-ai-btn')) {
            popup.classList.remove('open');
        }
        if (tonePop && tonePop.classList.contains('open') &&
            !tonePop.contains(e.target)) {
            tonePop.classList.remove('open');
        }
    });
})();

/* ── Alt+A kısayolu — varsayılan AI eylemi ── */
document.addEventListener('keydown', e => {
    if (!e.altKey || (e.key !== 'a' && e.key !== 'A')) return;
    if (typeof window._execInlineAI !== 'function') return;
    const sel = window.getSelection();
    if (!sel || !sel.toString().trim()) return;
    e.preventDefault();
    window._execInlineAI(getAiCfg().action || 'expand');
});

/* ══ TODO KLAVYE YÖNETİMİ ══ */
/* DOM.$content + panel içerikleri için ortak handler — capture phase */
document.addEventListener('keydown', function todoKeydown(e) {
    if (e.key !== 'Enter' && e.key !== 'Backspace' && e.key !== 'Delete') return;
    const sel = window.getSelection();
    if (!sel || !sel.rangeCount) return;
    const anc  = sel.anchorNode;
    const node = anc.nodeType === 3 ? anc.parentElement : anc;
    if (!node) return;
    const li = node.closest && (node.closest('.todo-item') || node.closest('.todo-list > li'));
    if (!li) return;
    /* todo-item değilse şimdi upgrade et */
    if (!li.classList.contains('todo-item') && li.closest('.todo-list')) {
        li.classList.add('todo-item');
        li.dataset.checked = 'false';
        if (!li.querySelector('.todo-mark')) {
            const mark = document.createElement('span');
            mark.className = 'todo-mark'; mark.contentEditable = 'false';
            li.insertBefore(mark, li.firstChild);
        }
        if (!li.querySelector('.todo-text')) {
            const textW = document.createElement('span');
            textW.className = 'todo-text';
            const children = [...li.childNodes].filter(n => !n.classList?.contains('todo-mark'));
            children.forEach(c => textW.appendChild(c));
            li.appendChild(textW);
        }
    }

    if (e.key === 'Enter' && !e.shiftKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        const range = sel.getRangeAt(0);
        const textSpan = li.querySelector('.todo-text');

        /* Satır boşsa → listeden çık */
        const textContent = textSpan ? textSpan.textContent.trim() : li.textContent.trim();
        if (!textContent) {
            const ul = li.closest('.todo-list');
            const et = li.closest('.col-panel-content, .layout-col, .ng-cell') || DOM.$content;
            const p  = document.createElement('p'); p.innerHTML = '<br>';
            ul.parentNode.insertBefore(p, ul.nextSibling);
            li.remove();
            if (!ul.querySelector('.todo-item')) ul.remove();
            const r2 = document.createRange(); r2.setStart(p, 0); r2.collapse(true);
            sel.removeAllRanges(); sel.addRange(r2);
            et.focus();
            return;
        }

        /* Cursor'dan sonraki içeriği yeni satıra taşı */
        let afterHtml = '';
        if (textSpan && textSpan.contains(range.startContainer)) {
            const afterRange = document.createRange();
            afterRange.setStart(range.startContainer, range.startOffset);
            afterRange.setEndAfter(textSpan.lastChild || textSpan);
            try {
                const frag = afterRange.extractContents();
                afterHtml = frag.textContent ? frag.innerHTML : '';
            } catch (_) {}
        }

        const newLi = makeTodoLi(afterHtml || '');
        li.parentNode.insertBefore(newLi, li.nextSibling);
        focusTodoLi(newLi);
        
        return;
    }

    if (e.key === 'Backspace' && sel.isCollapsed) {
        const textSpan = li.querySelector('.todo-text');
        if (!textSpan) return;

        /* Cursor todo-text'in en başında mı? */
        let atStart = false;
        if (anc === textSpan && sel.anchorOffset === 0) {
            atStart = true;
        } else if (textSpan.contains(anc)) {
            /* textSpan içinde cursor'dan önceki tüm içerik boş mu? */
            const r = document.createRange();
            r.setStart(textSpan, 0);
            r.setEnd(anc, sel.anchorOffset);
            atStart = r.toString() === '';
        }
        /* cursor li'nin kendisinde (mark ile text arasında) → başta say */
        if (!atStart && anc === li) atStart = sel.anchorOffset <= 1;

        if (atStart) {
            e.preventDefault();
            const ul = li.closest('.todo-list');
            const et = li.closest('.col-panel-content, .layout-col, .ng-cell') || DOM.$content;
            const prevLi = li.previousElementSibling;

            if (prevLi && prevLi.classList.contains('todo-item')) {
                /* Önceki todo satırının sonuna birleştir */
                const prevText = prevLi.querySelector('.todo-text');
                if (prevText) {
                    const thisHtml = textSpan.innerHTML;
                    const r = document.createRange();
                    r.selectNodeContents(prevText);
                    r.collapse(false);
                    sel.removeAllRanges(); sel.addRange(r);
                    if (thisHtml && thisHtml !== '<br>') {
                        document.execCommand('insertHTML', false, thisHtml);
                    }
                    li.remove();
                    if (!ul.querySelector('.todo-item')) ul.remove();
                }
            } else {
                /* Bu listedeki ilk satır — düz paragrafa dönüştür, önceki bloğun sonuna git */
                const textHtml = textSpan.innerHTML || '';
                const p = document.createElement('p');
                p.innerHTML = textHtml || '<br>';

                /* ul'den önceki element varsa oraya ekle, yoksa ul öncesine */
                const prevNode = ul.previousSibling;
                if (prevNode && prevNode.nodeType === Node.ELEMENT_NODE && prevNode !== li) {
                    /* Önceki paragrafın sonuna birleştir */
                    const r = document.createRange();
                    r.selectNodeContents(prevNode);
                    r.collapse(false);
                    sel.removeAllRanges(); sel.addRange(r);
                    if (textHtml && textHtml !== '<br>') {
                        document.execCommand('insertHTML', false, textHtml);
                    }
                    li.remove();
                    if (!ul.querySelector('.todo-item')) ul.remove();
                } else {
                    ul.parentNode.insertBefore(p, ul);
                    li.remove();
                    if (!ul.querySelector('.todo-item')) ul.remove();
                    const r = document.createRange();
                    const fc = p.firstChild;
                    if (fc) { r.setStart(fc, 0); } else { r.setStart(p, 0); }
                    r.collapse(true);
                    sel.removeAllRanges(); sel.addRange(r);
                    et.focus();
                }
            }
            return;
        }
    }

    if (e.key === 'Delete' && sel.isCollapsed) {
        const textSpan = li.querySelector('.todo-text');

        /* Boş li başında → sil engelleme */
        if (anc === li && sel.anchorOffset === 0 && !li.textContent.trim()) {
            e.preventDefault();
            return;
        }

        /* Cursor todo-text sonunda mı? → sonraki todo ile birleştir */
        if (textSpan && (anc === textSpan || textSpan.contains(anc))) {
            const endRange = document.createRange();
            endRange.selectNodeContents(textSpan);
            endRange.collapse(false);
            const curRange = document.createRange();
            curRange.setStart(anc, sel.anchorOffset);
            curRange.collapse(true);
            if (curRange.compareBoundaryPoints(Range.START_TO_START, endRange) >= 0) {
                e.preventDefault();
                const nextLi = li.nextElementSibling;
                if (nextLi && nextLi.classList.contains('todo-item')) {
                    const nextText = nextLi.querySelector('.todo-text');
                    if (nextText) {
                        const nextHtml = nextText.innerHTML;
                        if (nextHtml && nextHtml !== '<br>') {
                            document.execCommand('insertHTML', false, nextHtml);
                        }
                        nextLi.remove();
                        const ul2 = li.closest('.todo-list');
                        if (ul2 && !ul2.querySelector('.todo-item')) ul2.remove();
                    }
                }
            }
        }
    }
}, true);


function makeTodoLi(html2, style2) {
    const li = document.createElement('li');
    li.className = 'todo-item'; li.dataset.checked = 'false';
    /* Checkbox marker */
    const mark = document.createElement('span');
    mark.className = 'todo-mark'; mark.contentEditable = 'false';
    li.appendChild(mark);
    /* Metin alanı */
    const text = document.createElement('span');
    text.className = 'todo-text';
    if (style2) text.setAttribute('style', style2);
    text.innerHTML = html2 || '<br>';
    li.appendChild(text);
    return li;
}

function focusTodoLi(li) {
    requestAnimationFrame(() => {
        const text = li.querySelector('.todo-text');
        const target = text || li;
        const r = document.createRange();
        r.setStart(target, 0); r.collapse(true);
        const s = window.getSelection(); s.removeAllRanges(); s.addRange(r);
    });
}

function runSpecial(type) {
    const _et = _activeEditTarget || DOM.$content;
    const sel = window.getSelection();
    const range = sel && sel.rangeCount ? sel.getRangeAt(0) : null;
    if (type === 'icode') {
        const code = document.createElement('code');
        if (range && !range.collapsed) code.appendChild(range.extractContents()); else code.textContent = 'kod';
        if (range) {
            range.insertNode(code);
            const space = document.createTextNode(' ');
            code.parentNode.insertBefore(space, code.nextSibling);
            range.setStartAfter(space); range.collapse(true);
            sel.removeAllRanges(); sel.addRange(range);
        }
    } else if (type === 'badge') {
        const badge = document.createElement('span');
        badge.className = 'badge';
        if (range && !range.collapsed) {
            badge.appendChild(range.extractContents());
            if (badge.firstChild?.nodeType === 3) badge.firstChild.textContent = badge.firstChild.textContent.trimStart();
            if (badge.lastChild?.nodeType  === 3) badge.lastChild.textContent  = badge.lastChild.textContent.trimEnd();
        } else { badge.textContent = 'rozet'; }
        if (range) {
            range.deleteContents();
            range.insertNode(badge);
            /* Rozetten sonra yazılabilir boşluk metin düğümü ekle */
            const space = document.createTextNode('\u00a0');
            badge.parentNode.insertBefore(space, badge.nextSibling);
            /* Cursor'u bu metin düğümünün sonuna koy */
            const newRange = document.createRange();
            newRange.setStart(space, space.length);
            newRange.collapse(true);
            sel.removeAllRanges(); sel.addRange(newRange);
        }
    } else if (type === 'cblock') {
        const pre = document.createElement('pre'), code = document.createElement('code');
        if (range && !range.collapsed) code.appendChild(range.extractContents()); else code.textContent = 'kod buraya';
        pre.appendChild(code);
        if (range) {
            range.deleteContents(); range.insertNode(pre);
            /* En başta veya hemen öncesi blok element ise üste boş satır ekle */
            const prev = pre.previousElementSibling;
            if (!prev || prev.tagName === 'PRE' || prev.tagName === 'BLOCKQUOTE') {
                const pBefore = document.createElement('p'); pBefore.innerHTML = '<br>';
                pre.parentNode.insertBefore(pBefore, pre);
            }
            insertEmptyParaAfter(pre);
        }
    } else if (type === 'todo') {
        const s2 = window.getSelection(), r2 = s2 && s2.rangeCount ? s2.getRangeAt(0) : null;
        if (!r2) return;
        const anc = r2.startContainer, node = anc.nodeType === 3 ? anc.parentElement : anc;
        if (node.closest && node.closest('.todo-item')) {
            const ul2 = node.closest('.todo-list');
            const p2  = document.createElement('p'); p2.appendChild(document.createElement('br'));
            ul2.parentNode.insertBefore(p2, ul2.nextSibling);
            const nr2 = document.createRange(); nr2.setStart(p2,0); nr2.collapse(true);
            s2.removeAllRanges(); s2.addRange(nr2);
        } else {
            let block = node;
            /* v1.9 güncelleme (2. tur): seçim doğrudan #content üzerindeyse (örn. ilk satırdaki
               metin başka yere taşınınca) eski döngü #content dışına çıkıp yanlış öğeyi hedefliyordu;
               artık güvenli şekilde ilk bloğa düşülür / gerekirse boş bir paragraf oluşturulur */
            if (block === _et || !_et.contains(block)) {
                if (!_et.firstElementChild) {
                    const p0 = document.createElement('p'); p0.appendChild(document.createElement('br'));
                    _et.appendChild(p0);
                }
                block = _et.firstElementChild;
            } else {
                while (block.parentElement && block.parentElement !== _et) block = block.parentElement;
            }
            const blockHTML = block.innerHTML || '';
            const blockStyle = (block.getAttribute && block.getAttribute('style')) || '';
            const ul2 = document.createElement('ul'); ul2.className = 'todo-list';
            const li2 = makeTodoLi(blockHTML, blockStyle); ul2.appendChild(li2);
            block.parentNode.replaceChild(ul2, block);
            insertEmptyParaAfter(ul2); focusTodoLi(li2);
            
        }
    } else if (type === 'link') {
        const savedSel = window.getSelection();
        const savedRange2 = savedSel && savedSel.rangeCount ? savedSel.getRangeAt(0).cloneRange() : null;
        const SCHEMES = ['https://','http://','mailto:','tel:','ftp://','file://'];
        const overlay = document.createElement('div');
        overlay.className = 'link-dialog-overlay';
        overlay.innerHTML = `<div class="link-dialog" role="dialog" aria-modal="true" aria-label="Bağlantı ekle">
            <h4><i class="fas fa-link" style="margin-right:6px"></i>Bağlantı Ekle</h4>
            <div class="link-input-row">
                <select class="link-scheme-select" id="ld-scheme">${SCHEMES.map(s=>`<option value="${s}">${s}</option>`).join('')}</select>
                <input class="link-url-input" id="ld-url" type="text" placeholder="example.com/sayfa" autocomplete="off" spellcheck="false">
            </div>
            <div class="link-dialog-actions">
                <button class="ldbtn-cancel" id="ld-cancel">İptal</button>
                <button class="ldbtn-ok" id="ld-ok">Ekle</button>
            </div></div>`;
        document.body.appendChild(overlay);
        const schemeEl = overlay.querySelector('#ld-scheme'), urlEl = overlay.querySelector('#ld-url');
        urlEl.addEventListener('input', () => {
            const has = SCHEMES.some(s => urlEl.value.startsWith(s));
            schemeEl.style.opacity = has ? '.4' : '1'; schemeEl.style.pointerEvents = has ? 'none' : 'auto';
        });
        function applyLink() {
            let raw = urlEl.value.trim(); if (!raw) { closeDialog(); return; }
            const has = SCHEMES.some(s => raw.startsWith(s));
            const url = has ? raw : schemeEl.value + raw;
            if (savedRange2) { const s = window.getSelection(); s.removeAllRanges(); s.addRange(savedRange2); }
            (_activeEditTarget || DOM.$content).focus();
            document.execCommand('createLink', false, url);
            document.querySelectorAll(`a[href="${url}"]`).forEach(a => { a.target='_blank'; a.rel='noopener noreferrer'; });
            closeDialog();
        }
        function closeDialog() { document.body.removeChild(overlay); }
        overlay.querySelector('#ld-ok').addEventListener('click', applyLink);
        overlay.querySelector('#ld-cancel').addEventListener('click', closeDialog);
        overlay.addEventListener('click', e => { if (e.target === overlay) closeDialog(); });
        urlEl.addEventListener('keydown', e => {
            if (e.key === 'Enter')  { e.preventDefault(); applyLink(); }
            if (e.key === 'Escape') { e.preventDefault(); closeDialog(); }
        });
        requestAnimationFrame(() => urlEl.focus());
    } else if (type === 'columns') {
        const dropdown = $('tb-col-dropdown');
        const btn = $('tb-col-btn');
        if (dropdown && btn) {
            const existingCols = getColCount();
            dropdown.querySelectorAll('.tb-col-item').forEach(it => {
                it.classList.toggle('active', parseInt(it.dataset.cols) === existingCols);
            });
            const r = btn.getBoundingClientRect();
            dropdown.style.left = r.left + 'px';
            dropdown.style.top  = (r.bottom + 4) + 'px';
            dropdown.classList.toggle('open', !dropdown.classList.contains('open'));
        } else {
            applyGridPanel(3);
        }
        return;
    } else if (type === 'layout') {
        const dropdown = $('tb-layout-dropdown');
        const btn = $('tb-layout-btn');
        if (dropdown && btn) {
            const activeBlk = getActiveLayoutBlock();
            const existingCols = activeBlk ? parseInt(activeBlk.dataset.cols || '1') : 1;
            dropdown.querySelectorAll('.tb-col-item').forEach(it => {
                it.classList.toggle('active', parseInt(it.dataset.cols) === existingCols);
            });
            const r = btn.getBoundingClientRect();
            dropdown.style.left = r.left + 'px';
            dropdown.style.top  = (r.bottom + 4) + 'px';
            dropdown.classList.toggle('open', !dropdown.classList.contains('open'));
        } else {
            applyGridColumn(3);
        }
        return;
    }
}

function updateToolbarState() {
    document.querySelectorAll('.tb[data-cmd]').forEach(btn => {
        try { btn.classList.toggle('active', document.queryCommandState(btn.dataset.cmd)); } catch(e) {}
    });
    /* Aktif kolon butonunu işaretle */
    const colBtn = $('tb-col-btn');
    if (colBtn) {
        colBtn.classList.toggle('active', getColCount() > 1);
    }
    const layoutBtn = $('tb-layout-btn');
    if (layoutBtn) {
        layoutBtn.classList.toggle('active', !!getActiveLayoutBlock());
    }
}

/* ══ PANEL BLOĞU SİSTEMİ ══ */

/* col-block DOM elemanı oluştur */
/* Panel içi sürükle-bırak */
/* Tek bir col-panel DOM elementi oluştur (createColBlock yardımcısı) */
/* "+" butonunu header hariç içerik alanının ortasına konumlandır */
/* col-block içindeki resize handle'lara sürükle-bırak genişlik bağla */
/* layout-block içindeki resize handle'lara sürükle-bırak genişlik bağla */
/* İmlecin içinde olduğu col-block'u bul */
/* Toolbar kolon butonunu güncelle */
function getColCount() {
    const blk = getActiveColBlock();
    return blk ? parseInt(blk.dataset.cols || '1') : 1;
}

/* Mevcut bloğun kolon sayısını değiştir VEYA yeni blok ekle */
/* ══ SAYFA DÜZENİ KOLON SİSTEMİ ══ */

(function initLayoutDropdown() {
    const dropdown = $('tb-layout-dropdown');
    if (!dropdown) return;

    dropdown.addEventListener('click', e => {
        const item = e.target.closest('.tb-col-item');
        if (!item) return;
        const cols = parseInt(item.dataset.cols);
        dropdown.classList.remove('open');
        applyGridColumn(cols);
        updateToolbarState();
    });

    document.addEventListener('click', e => {
        if (!dropdown.classList.contains('open')) return;
        if (e.target.closest('#tb-layout-btn') || dropdown.contains(e.target)) return;
        dropdown.classList.remove('open');
    });
})();

/* Kolon dropdown listener */
(function initColDropdown() {
    const dropdown = $('tb-col-dropdown');
    if (!dropdown) return;

    dropdown.addEventListener('click', e => {
        const item = e.target.closest('.tb-col-item');
        if (!item) return;
        const cols = parseInt(item.dataset.cols);
        dropdown.classList.remove('open');
        applyGridPanel(cols);
        updateToolbarState();
    });

    document.addEventListener('click', e => {
        if (!dropdown.classList.contains('open')) return;
        if (e.target.closest('#tb-col-btn') || dropdown.contains(e.target)) return;
        dropdown.classList.remove('open');
    });
})();

DOM.$content.addEventListener('keydown', e => {
    if (e.ctrlKey && e.key === 'Enter') { e.preventDefault(); saveNote(); return; }
    if (e.key === 'Tab') {
        /* ng-cell veya ng-title içindeyse tablo navigasyonu üstlendi */
        const inGrid = document.activeElement && document.activeElement.closest('.ng-cell, .ng-title');
        if (inGrid && inGrid.closest('.noted-grid.grid-table')) return;
        e.preventDefault(); document.execCommand('insertText', false, '    '); return;
    }
});

/* Enter ile blok elementi aşağı kaydır — tüm editör alanları için */
document.addEventListener('keydown', e => {
    if (e.key !== 'Enter' || e.shiftKey || e.ctrlKey || e.altKey) return;
    const sel = window.getSelection();
    if (!sel || !sel.rangeCount || !sel.isCollapsed) return;
    const node = sel.anchorNode;
    if (!node) return;
    const el = node.nodeType === 3 ? node.parentElement : node;
    if (!el) return;

    /* Editör alanını bul */
    const container = el.closest('#content, .col-panel-content, .layout-col');
    if (!container) return;

    /* Cursor container'ın başında mı? — en üst blok elementte mi? */
    const range = sel.getRangeAt(0);
    const BLOCK_TAGS = new Set(['PRE','BLOCKQUOTE','UL','OL','H2','H3','H4','TABLE','HR']);

    /* Cursor'un container'daki en üst parent elementini bul */
    let topEl = el;
    while (topEl.parentElement && topEl.parentElement !== container) topEl = topEl.parentElement;

    /* Bu element container'ın ilk elementi mi? */
    if (!topEl || topEl.parentElement !== container) return;

    /* topEl blok türünde mi veya col-block/layout-block mi? */
    const isBlock = BLOCK_TAGS.has(topEl.tagName) ||
        topEl.classList.contains('col-block') ||
        topEl.classList.contains('layout-block') ||
        topEl.classList.contains('todo-list');
    if (!isBlock) return;

    /* topEl container'ın ilk child'ı mı? */
    if (container.firstElementChild !== topEl) return;

    /* Cursor bu elementin en başında mı? */
    const testRange = document.createRange();
    testRange.setStart(container, 0);
    testRange.setEnd(range.startContainer, range.startOffset);
    if (testRange.toString().trim() !== '') return;

    /* Koşullar sağlandı: öne boş paragraf ekle */
    e.preventDefault();
    const p = document.createElement('p'); p.innerHTML = '<br>';
    container.insertBefore(p, topEl);
    /* Cursor boş paragrafta kalsın */
    const r = document.createRange(); r.setStart(p, 0); r.collapse(true);
    sel.removeAllRanges(); sel.addRange(r);
}, true);

/* ══ TOOLBAR KONUMLANDIRMA ══ */
DOM.$toolbar = $('toolbar');
let toolbarHideTimer = null, toolbarDragged = false, _fsizeApplying = false;

/* Seçimin hangi editör alanında olduğunu döndür: #content veya panel */
function getActiveEditorArea(sel) {
    if (!sel || !sel.anchorNode) return null;
    const node = sel.anchorNode;
    if (DOM.$content.contains(node)) return DOM.$content;
    const fpContent = document.getElementById('fp-content');
    if (fpContent && fpContent.contains(node)) return fpContent;
    const panelCe = node.nodeType === 3
        ? node.parentElement && node.parentElement.closest('.col-panel-content, .col-panel-title, .layout-col')
        : (node.closest && node.closest('.col-panel-content, .col-panel-title, .layout-col'));
    if (panelCe) return panelCe;
    return null;
}

function positionToolbar() {
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed || !getActiveEditorArea(sel)) { scheduleHideToolbar(); return; }
    const rect = sel.getRangeAt(0).getBoundingClientRect();
    if (!rect.width && !rect.height) { scheduleHideToolbar(); return; }
    if (!toolbarDragged) {
        const tbW=(DOM.$toolbar.offsetWidth||248), tbH=(DOM.$toolbar.offsetHeight||80), margin=8;
        let top=rect.top-tbH-margin, left=rect.left+(rect.width-tbW)/2;
        if (top < margin) top = rect.bottom + margin;
        if (left < margin) left = margin;
        if (left + tbW > window.innerWidth - margin) left = window.innerWidth - tbW - margin;
        DOM.$toolbar.style.top=top+'px'; DOM.$toolbar.style.left=left+'px';
    }
    clearTimeout(toolbarHideTimer);
    DOM.$toolbar.classList.add('tb-active');
    updateToolbarState();
}
function scheduleHideToolbar(delay=300) {
    clearTimeout(toolbarHideTimer);
    toolbarHideTimer = setTimeout(() => { DOM.$toolbar.classList.remove('tb-active'); toolbarDragged = false; }, delay);
}
document.addEventListener('selectionchange', () => {
    if (_fsizeApplying) return;
    const sel = window.getSelection();
    const colDrop = $('tb-col-dropdown');
    if (colDrop && colDrop.classList.contains('open')) return;
    if (sel && !sel.isCollapsed && getActiveEditorArea(sel)) positionToolbar();
    else scheduleHideToolbar();
});
DOM.$toolbar.addEventListener('mouseenter', () => {
    clearTimeout(toolbarHideTimer);
    /* Kolon dropdown açıkken toolbar’un üzerinden çıkılsa bile gizleme */
    const colDrop = $('tb-col-dropdown');
    if (colDrop && colDrop.classList.contains('open')) clearTimeout(toolbarHideTimer);
});
DOM.$toolbar.addEventListener('mouseleave', () => scheduleHideToolbar(1500));

/* Sürükleme */
(function() {
    let dragging=false, startX, startY, origLeft, origTop;
    const handle = $('toolbar-drag');
    handle.addEventListener('mousedown', e => {
        if (e.button !== 0) return; e.preventDefault();
        dragging=true; startX=e.clientX; startY=e.clientY;
        origLeft=parseInt(DOM.$toolbar.style.left)||0; origTop=parseInt(DOM.$toolbar.style.top)||0;
        DOM.$toolbar.classList.add('dragging');
        document.addEventListener('mousemove', onMove); document.addEventListener('mouseup', onUp);
    });
    function onMove(e) {
        if (!dragging) return;
        const tbW=DOM.$toolbar.offsetWidth, tbH=DOM.$toolbar.offsetHeight;
        let l=origLeft+(e.clientX-startX), t=origTop+(e.clientY-startY);
        l=Math.max(8,Math.min(l,window.innerWidth-tbW-8)); t=Math.max(8,Math.min(t,window.innerHeight-tbH-8));
        DOM.$toolbar.style.left=l+'px'; DOM.$toolbar.style.top=t+'px'; toolbarDragged=true;
    }
    function onUp() {
        dragging=false; DOM.$toolbar.classList.remove('dragging');
        document.removeEventListener('mousemove',onMove); document.removeEventListener('mouseup',onUp);
    }
})();

/* ══ GROUP PICKER ══ */
function openPicker(targetEl, noteId) {
    activePickerId = noteId;
    const rect=targetEl.getBoundingClientRect();
    let top=rect.bottom+5, left=rect.left;
    if (left+234>window.innerWidth) left=window.innerWidth-238;
    if (top+260>window.innerHeight) top=rect.top-262;
    DOM.$picker.style.top=top+'px'; DOM.$picker.style.left=left+'px';
    if (DOM.$picker.classList.contains('open') && DOM.$picker._forId===noteId) { DOM.$picker.classList.remove('open'); return; }
    DOM.$picker._forId=noteId; DOM.$picker.classList.add('open'); buildPickerList();
}
DOM.$editorBadge.addEventListener('click', e => { e.stopPropagation(); openPicker(e.currentTarget, null); });
function buildPickerList() {
    const gs=[...(new Set(notes.map(n=>n.group)))].sort();
    if (!gs.includes('Genel')) gs.unshift('Genel');
    DOM.$gpList.innerHTML='';
    gs.forEach(g => {
        const div=document.createElement('div'); div.className='gp-item'; div.textContent=g;
        div.addEventListener('mousedown', e => { e.preventDefault(); e.stopPropagation(); applyGroup(g); });
        DOM.$gpList.appendChild(div);
    });
}
function applyGroup(gName) {
    DOM.$picker.classList.remove('open');
    if (activePickerId !== null) {
        const n=notes.find(x=>String(x.id)===String(activePickerId));
        if (n) { n.group=gName; saveNotes(); }
        /* Float editör rozeti güncelle */
        const _fpBadge = document.getElementById('fp-badge-text');
        if (_fpBadge && typeof window._fpGetCurrentNoteId === 'function' &&
            String(window._fpGetCurrentNoteId()) === String(activePickerId)) {
            _fpBadge.textContent = gName;
            const _fpBadgeEl = document.getElementById('fp-editor-badge');
            if (_fpBadgeEl) { const c = getColor(gName); _fpBadgeEl.style.color = c.main; _fpBadgeEl.style.backgroundColor = c.bg; }
        }
        activePickerId=null;
    } else {
        editorGroup=gName;
        /* Not açıksa grubu hemen kaydet (float editördeki gibi anlık) */
        const _editId = DOM.$editId.value;
        if (_editId) {
            const _n = notes.find(x => String(x.id) === String(_editId));
            if (_n) { _n.group = gName; saveNotes(); }
        }
    }
    /* Ana editör badge'ini güncelle */
    DOM.$badgeText.textContent = editorGroup;
    render();
}
$('ng-btn').addEventListener('mousedown', e => {
    e.preventDefault(); e.stopPropagation();
    const val=$('ng-input').value.trim(); if (val) { applyGroup(val); $('ng-input').value=''; }
});
$('ng-input').addEventListener('keydown', e => {
    e.stopPropagation();
    if (e.key==='Enter') { const v=e.target.value.trim(); if (v) { applyGroup(v); e.target.value=''; } }
});
DOM.$picker.addEventListener('click', e => e.stopPropagation());

/* ══ CRUD ══ */

/* ══ NOT KİLİTLEME ══ */
let _editorLocked = false;

function setEditorLocked(locked) {
    _editorLocked = locked;
    const btn = $('lock-btn');
    const editor = DOM.$editor;
    if (locked) {
        editor.classList.add('editor-locked');
        DOM.$content.contentEditable = 'false';
        DOM.$title.readOnly = true;
        editor.querySelectorAll('.ng-cell,.ng-title,.col-panel-content,.col-panel-title,.layout-col').forEach(el => { el.contentEditable = 'false'; });
        if (btn) { btn.classList.add('locked'); btn.title = 'Kilidi Aç'; btn.innerHTML = '<i class="fas fa-lock"></i>'; }
    } else {
        editor.classList.remove('editor-locked');
        DOM.$content.contentEditable = 'true';
        DOM.$title.readOnly = false;
        editor.querySelectorAll('.ng-cell,.ng-title,.col-panel-content,.col-panel-title,.layout-col').forEach(el => { el.contentEditable = 'true'; });
        if (btn) { btn.classList.remove('locked'); btn.title = 'Notu Kilitle'; btn.innerHTML = '<i class="fas fa-lock-open"></i>'; }
    }
}

(function initLockBtn() {
    const btn = $('lock-btn');
    if (!btn) return;
    btn.addEventListener('click', function() {
        /* Kilitleme editörde aktif not varsa çalışır */
        if (!DOM.$editId.value) return;
        setEditorLocked(!_editorLocked);
        /* Kilit durumunu not verisine kaydet */
        const idx = notes.findIndex(n => String(n.id) === String(DOM.$editId.value));
        if (idx !== -1) { notes[idx].locked = _editorLocked; saveNotes(); }
    });
})();

function saveNote() {
    const title   = DOM.$title.value.trim();
    /* ng-toolbar kaldır/geri-koy döngüsü childList mutation'ı tetikler —
       undo stack'i kirletmemesi için observer'ı kilitle */
    if (typeof window._undoLockForSave === 'function') window._undoLockForSave();
    /* ng-toolbar ve ng-block-del gibi UI elementlerini geçici olarak kaldır */
    const _tmpRemoved = [];
    DOM.$content.querySelectorAll('.ng-toolbar, .ng-add-col').forEach(el => {
        _tmpRemoved.push({ parent: el.parentNode, next: el.nextSibling, el });
        el.remove();
    });
    const rawHtml = DOM.$content.innerHTML;
    /* UI elementlerini geri koy */
    _tmpRemoved.forEach(({ parent, next, el }) => {
        if (next) parent.insertBefore(el, next);
        else parent.appendChild(el);
    });
    const eId     = DOM.$editId.value;
    /* Başlık zorunlu — içerik olmadan da kaydedilebilir */
    if (!title) {
        DOM.$title.focus();
        DOM.$title.style.outline = '2px solid var(--danger)';
        setTimeout(() => { DOM.$title.style.outline = ''; }, 1200);
        return;
    }
    /* v1.3: elle yazılan [[Not Adı]] dizgilerini wiki-bağlantıya çevir */
    const content = normalizeHtml(sanitize(convertWikiSyntax(rawHtml)));
    /* v1.1: etiketleri parse et */
    const tags = parseTagsFromContent(rawHtml);
    if (eId) {
        const idx=notes.findIndex(n=>n.id==eId);
        if (idx!==-1) notes[idx]={
            ...notes[idx], title, content, contentMd: htmlToMd(content), group:editorGroup,
            pinned: editorPinned,
            colorLabel: editorColorLabel,
            tags,
            reminders: editorReminders, reminderNote: editorReminderNote, reminder: null,
            updatedAt:Date.now()
        };
    } else {
        notes.push({
            id:genId(), title, content, contentMd: htmlToMd(content), group:editorGroup,
            pinned: editorPinned,
            colorLabel: editorColorLabel,
            tags,
            reminders: editorReminders, reminderNote: editorReminderNote, reminder: null,
            createdAt:Date.now(), updatedAt:Date.now()
        });
    }
    resetEditor(); saveNotes(); render();
}

$('save-btn').addEventListener('click', () => {
    const btn = $('save-btn');
    if (btn) { btn.classList.remove('saved'); btn.classList.add('saving'); }
    setTimeout(() => {
        saveNote();
        if (btn) {
            btn.classList.remove('saving');
            btn.classList.add('saved');
            setTimeout(() => btn.classList.remove('saved'), 600);
        }
    }, 350);
});
DOM.$cancelBtn.addEventListener('click', () => { resetEditor(); render(); });
$('cancel-btn-hm') && $('cancel-btn-hm').addEventListener('click', () => { resetEditor(); render(); });
/* Editor close button in header */
$('editor-close-btn') && $('editor-close-btn').addEventListener('click', () => { resetEditor(); render(); });
/* Sağa Yerleştir — saves current note, resets main editor, opens note in float panel */
$('editor-to-fp-btn') && $('editor-to-fp-btn').addEventListener('click', () => {
    const noteId = DOM.$editId.value;
    if (!noteId) return;
    if (DOM.$title.value.trim()) saveNote(); /* saveNote calls resetEditor+render internally */
    else { resetEditor(); render(); }
    if (typeof window._fpLoadNoteFromMain === 'function') window._fpLoadNoteFromMain(noteId);
});
$('edit-del-btn').addEventListener('click', () => { const eId=DOM.$editId.value; if(!eId) return; delNote(eId); });

function delNote(id) {
    const note=notes.find(x=>String(x.id)===String(id)); if (!note) return;
    deleteTargetId=String(note.id); deletePermanent=(note.group===Const.TRASH_GROUP);
    $('delete-toast').querySelector('.toast-text').textContent=deletePermanent
        ?'Not kalıcı olarak silinsin mi?':'Not çöp kutusuna taşınsın mı?';
    $('delete-toast-overlay').classList.add('show');
}
$('toast-no').addEventListener('click', () => {
    deleteTargetId=null; deletePermanent=false; $('delete-toast-overlay').classList.remove('show');
});
$('toast-yes').addEventListener('click', () => {
    if (!deleteTargetId) return;
    const idx=notes.findIndex(x=>String(x.id)===deleteTargetId);
    if (idx!==-1) {
        if (deletePermanent) { notes.splice(idx,1); }
        else {
            notes[idx].group=Const.TRASH_GROUP; notes[idx].updatedAt=Date.now();
            if (!openGroups.includes(Const.TRASH_GROUP)) {
                openGroups.push(Const.TRASH_GROUP);
                patchContentCfg({groups: openGroups});
            }
        }
        if (String(DOM.$editId.value)===deleteTargetId) resetEditor();
        if (typeof window._fpGetCurrentNoteId === 'function' && String(window._fpGetCurrentNoteId()) === deleteTargetId && typeof window._fpClose === 'function') window._fpClose();
    }
    deleteTargetId=null; deletePermanent=false; $('delete-toast-overlay').classList.remove('show');
    saveNotes();
    if (filterGroup!=='all' && !notes.some(x=>x.group===filterGroup)) { filterGroup='all'; applyGroupFilterColor(); }
    if (filterTag  !=='all' && !notes.some(x=>(x.tags||[]).includes(filterTag))) { filterTag='all'; applyTagFilterStyle(); }
    render();
});

