/* ══ AI CHAT PANEL ══ */
(function() {
    const panel    = document.getElementById('ai-chat-panel');
    const overlay  = document.getElementById('ai-chat-overlay');
    const openBtn  = document.getElementById('ai-chat-btn');
    const closeBtn = document.getElementById('ai-close-btn');
    const newBtn   = document.getElementById('ai-new-btn');
    const msgs     = document.getElementById('ai-msgs');
    const welcome  = document.getElementById('ai-welcome');
    const input    = document.getElementById('ai-input');
    const sendBtn  = document.getElementById('ai-send');

    let _open = false, _busy = false, _abort = null, _history = [], _attachments = [], _modelHealth = {};
    const _isFileProtocol = location.protocol === 'file:';
    const _onLocalhost    = ['localhost', '127.0.0.1'].includes(location.hostname);

    /* file:// uyarı şeridini göster */
    const fileWarn = document.getElementById('ai-file-warn');
    if (fileWarn && _isFileProtocol) fileWarn.style.display = 'flex';

    /* ── Panel genişlik — sürükle & bırak ── */
    const AI_W_MIN  = 280;
    const AI_W_MAX  = () => Math.min(860, Math.round(window.innerWidth * 0.85));
    const resizeHandle = document.getElementById('ai-panel-resize-handle');

    const _updateFullscreen = () => {
        panel.classList.toggle('ai-fullscreen', panel.offsetWidth >= window.innerWidth - 1);
    };

    (function _initPanelWidth() {
        if (window.innerWidth <= 600) return;
        const saved = getUiCfg().aiPanelW || 0;
        if (saved >= AI_W_MIN) panel.style.width = saved + 'px';
        _updateFullscreen();
    })();

    window.addEventListener('resize', () => {
        if (window.innerWidth <= 600) { panel.style.width = ''; return; }
        _updateFullscreen();
    });

    if (resizeHandle) {
        const _applyW = clientX => {
            const w = Math.min(AI_W_MAX(), Math.max(AI_W_MIN, window.innerWidth - clientX));
            panel.style.width = w + 'px';
            _updateFullscreen();
            return w;
        };
        const _startResize = () => {
            panel.classList.add('resizing');
            document.body.classList.add('ai-resizing');
        };
        const _endResize = w => {
            patchUiCfg({ aiPanelW: w });
            panel.classList.remove('resizing');
            document.body.classList.remove('ai-resizing');
        };

        resizeHandle.addEventListener('pointerdown', e => {
            e.preventDefault();
            _startResize();
            startPointerDrag(ev => _applyW(ev.clientX), ev => _endResize(_applyW(ev.clientX)));
        });

    }

    /* ── Aç / kapat ── */
    function open() {
        _open = true;
        panel.classList.add('open'); overlay.classList.add('open');
        panel.removeAttribute('aria-hidden');
        document.body.style.overflow = 'hidden';
        _updateConnStatus();
        setTimeout(() => input.focus(), 320);
    }
    function close() {
        _open = false;
        panel.classList.remove('open'); overlay.classList.remove('open');
        panel.setAttribute('aria-hidden', 'true');
        if (!document.querySelector('#todo-panel-overlay.open')) document.body.style.overflow = '';
    }

    /* ── Yeni sohbet ── */
    function newChat() {
        msgs.innerHTML = '';
        msgs.appendChild(welcome);
        welcome.style.display = '';
        input.value = ''; resize();
        _history = [];
    }

    /* ── Yardımcılar ── */
    function now() {
        return new Date().toLocaleTimeString(_notedLocale(), { hour:'2-digit', minute:'2-digit' });
    }
    function resize() {
        input.style.height = 'auto';
        input.style.height = Math.min(input.scrollHeight, 130) + 'px';
    }
    function scrollDown() {
        msgs.scrollTo({ top: msgs.scrollHeight, behavior: 'smooth' });
    }

    /* ── Mesaj ekle ── */
    function addUser(text) {
        welcome.style.display = 'none';
        const d = document.createElement('div');
        d.className = 'ai-msg user';
        d.dataset.userText = text;
        d.innerHTML = `<div class="ai-bubble">${esc(text).replace(/\n/g,'<br>')}</div>
            <div class="ai-user-foot">
                <span class="ai-msg-time">${now()}</span>
                <div class="ai-msg-acts">
                    <button class="ai-act-btn" data-act="edit"   title="Değiştir"><i class="fas fa-pencil"></i></button>
                    <button class="ai-act-btn" data-act="copy"   title="Kopyala"><i class="fas fa-copy"></i></button>
                    <button class="ai-act-btn" data-act="resend" title="Yenile"><i class="fas fa-rotate-right"></i></button>
                </div>
            </div>`;
        msgs.appendChild(d); scrollDown();
    }

    function showTyping() {
        const d = document.createElement('div');
        d.className = 'ai-msg bot'; d.id = 'ai-typing-row';
        d.innerHTML = `<div class="ai-bot-row">
            <div class="ai-bot-av"><i class="fas fa-wand-magic-sparkles"></i></div>
            <div class="ai-typing"><span></span><span></span><span></span></div>
        </div>`;
        msgs.appendChild(d); scrollDown(); return d;
    }

    function _buildTokenChips(usage, remaining, limit) {
        const fmt  = n => (n != null && n >= 0) ? Number(n).toLocaleString(_notedLocale()) : '–';
        const pct  = (remaining >= 0 && limit > 0) ? remaining / limit : 1;
        const warn = pct < 0.2 && remaining >= 0;
        const remChip = remaining >= 0
            ? `<span class="ai-tok-chip${warn ? ' ai-tok-warn' : ''}">⚡${fmt(remaining)}${limit > 0 ? `/${fmt(limit)}` : ''}</span>`
            : '';
        if (!usage) return remChip; /* sadece rate-limit chip'i göster */
        return `<span class="ai-tok-chip">↑${fmt(usage.prompt_tokens)}</span>` +
               `<span class="ai-tok-chip">↓${fmt(usage.completion_tokens)}</span>` +
               `<span class="ai-tok-chip">∑${fmt(usage.total_tokens)}</span>` +
               remChip;
    }

    /* <think>…</think> bloğunu ayır — hem inline tag hem reasoning_content alanı */
    function _extractThinking(text, reasoningContent) {
        let thinking = (reasoningContent || '').trim();
        let reply    = text;
        if (!thinking) {
            const m = text.match(/^<think>([\s\S]*?)<\/think>\s*/);
            if (m) { thinking = m[1].trim(); reply = text.slice(m[0].length).trim(); }
        }
        return { thinking, reply };
    }

    function _shortModel(id) {
        return (id || '').replace(/-(versatile|instruct|preview[\w-]*)$/i,'').replace(/-\d{8}$/,'');
    }

    function addBot(text, thinking, tokenInfo, userText, modelId) {
        const el = document.getElementById('ai-typing-row');
        if (el) el.remove();
        const d = document.createElement('div');
        d.className = 'ai-msg bot';
        if (userText) d.dataset.userText = userText;
        const thinkHtml = thinking
            ? `<details class="ai-think">
                <summary><span class="ai-think-arrow">▶</span> Düşünme süreci</summary>
                <div class="ai-think-body">${esc(thinking)}</div>
               </details>`
            : '';
        const tokChips = tokenInfo ? _buildTokenChips(tokenInfo.usage, tokenInfo.remaining, tokenInfo.limit) : '';
        const modelChip = modelId ? `<span class="ai-tok-chip ai-model-chip" title="${esc(modelId)}">${esc(_shortModel(modelId))}</span>` : '';
        const topHtml = (modelChip || tokChips) ? `<div class="ai-tok-top"><div class="ai-tok-chips">${modelChip}${tokChips}</div></div>` : '';
        d.innerHTML = `${topHtml}
        <div class="ai-bot-row">
            <div class="ai-bot-av"><i class="fas fa-wand-magic-sparkles"></i></div>
            <div class="ai-bubble">${thinkHtml}${mdToHtml(text)}</div>
        </div>
        <div class="ai-msg-foot">
            <span class="ai-msg-time">${now()}</span>
            <div class="ai-msg-acts">
                <button class="ai-act-btn" data-act="regen"  title="Yenile"><i class="fas fa-rotate-right"></i></button>
                <button class="ai-act-btn" data-act="insert" title="Editöre Ekle"><i class="fas fa-file-import"></i></button>
            </div>
        </div>`;
        msgs.appendChild(d); scrollDown();
    }

    /* ── Basit Markdown → HTML ── */
    function mdToHtml(t, applyMd) {
        if (applyMd === undefined) applyMd = true;
        
        t = t.replace(/\r\n?/g, '\n');

        /* Pre-pass: Otomatik Not Bağlantıları (Auto-linking) */
        if (applyMd && typeof State.notes !== 'undefined' && Array.isArray(State.notes) && State.notes.length > 0) {
            const validTitles = [...State.notes].filter(n => n.title && n.title.length > 2).sort((a, b) => b.title.length - a.title.length);
            if (validTitles.length > 0) {
                const escapedTitles = validTitles.map(n => n.title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
                /* Word boundary benzeri kontrol: Başında ve sonunda kelime ayırıcıları veya dize sonu olmalı */
                const rx = new RegExp('(^|[\\s.,;:!?()>\\-])(' + escapedTitles.join('|') + ')(?=$|[\\s.,;:!?()<\\-])', 'gi');
                
                const _wls = [], _cbs = [], _mls = [];
                t = t.replace(/\[\[([^\]]+)\]\]/g, m => { _wls.push(m); return `WL${_wls.length-1}`; });
                t = t.replace(/```[\s\S]*?```/g, m => { _cbs.push(m); return `CB${_cbs.length-1}`; });
                t = t.replace(/`[^`]+`/g, m => { _cbs.push(m); return `CB${_cbs.length-1}`; });
                t = t.replace(/\[([^\]]+)\]\([^)]+\)/g, m => { _mls.push(m); return `ML${_mls.length-1}`; });

                t = t.replace(rx, (m, p1, p2) => p1 + '[[' + p2 + ']]');

                t = t.replace(/ML(\d+)/g, (_, i) => _mls[+i]);
                t = t.replace(/CB(\d+)/g, (_, i) => _cbs[+i]);
                t = t.replace(/WL(\d+)/g, (_, i) => _wls[+i]);
            }
        }


        /* Pre-pass: HTML tablolarını Markdown tablosuna çevir */
        t = t.replace(/<table[\s\S]*?<\/table>/gi, m => {
            const tmp = document.createElement('div');
            tmp.innerHTML = m;
            const table = tmp.querySelector('table');
            if (!table) return m;
            const rows = [];
            table.querySelectorAll('tr').forEach(tr => {
                const cells = [];
                tr.querySelectorAll('th, td').forEach(td => {
                    cells.push(td.textContent.trim().replace(/\n/g, ' ').replace(/\|/g, '-'));
                });
                if (cells.length > 0) rows.push(cells);
            });
            if (rows.length < 1) return m;
            const cols = rows[0].length;
            let mdStr = '\n\n';
            mdStr += '| ' + rows[0].join(' | ') + ' |\n';
            mdStr += '|' + Array(cols).fill('---').join('|') + '|\n';
            for (let i = 1; i < rows.length; i++) {
                const padded = [...rows[i]];
                while (padded.length < cols) padded.push('');
                mdStr += '| ' + padded.slice(0, cols).join(' | ') + ' |\n';
            }
            mdStr += '\n\n';
            return mdStr;
        });

        /* ── Pre-pass: separator'sız tablolara | --- | satırı ekle ── */
        t = t.replace(/^(\|[^\n]+\|\n)((?:\|[^\n]+\|\n?){2,})/gm, (m, first, rest) => {
            if (/^\|[ \t:|-]+\|/m.test(m)) return m;   /* zaten separator var */
            const count = (first.match(/\|/g) || []).length - 1;
            const sep = '| ' + Array(Math.max(1, count)).fill('---').join(' | ') + ' |\n';
            return first + sep + rest;
        });

        /* ── Pre-pass: markdown tabloları HTML'e çevir (her zaman, applyMd'den bağımsız) ── */
        const _tbls = [];
        const _ec   = s => s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
        t = t.replace(
            /^([ \t]*\|?[^\n]*\|[^\n]*\n[ \t]*\|?[ \t]*:?-[-: |]*-:?[ \t]*\|?[ \t]*\n(?:[ \t]*\|?[^\n]*\|[^\n]*\n?)*)/gm,
            m => {
                const rows = m.trim().split('\n').filter(r => /\|/.test(r));
                if (rows.length < 3) return m;
                const applyInline = c => c
                    .replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>')
                    .replace(/\*(.+?)\*/g,'<em>$1</em>')
                    .replace(/`([^`]+)`/g,'<code>$1</code>')
                    .replace(/\[\[([^\]]{1,120})\]\]/g, (_, esc_title) => {
                        const raw = esc_title.replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>');
                        const note = typeof findNoteByTitle === 'function' ? findNoteByTitle(raw) : null;
                        const cls  = note ? 'wikilink' : 'wikilink broken';
                        const id   = note ? ` data-note-id="${note.id}"` : '';
                        return `<a class="${cls}" href="#"${id}><i class="fas fa-link"></i>${esc_title}</a>`;
                    });
                /* Leading/trailing | olmayan satırları da destekle */
                const parseCells = r => {
                    let s = r.trim();
                    if (s.startsWith('|')) s = s.slice(1);
                    if (s.endsWith('|')) s = s.slice(0, -1);
                    return s.split('|').map(c => applyInline(_ec(c.trim())));
                };
                const heads = parseCells(rows[0]);
                const cols  = heads.length;
                /* colgroup */
                const cg = `<colgroup>${heads.map(() => '<col>').join('')}</colgroup>`;
                /* thead — resize handle son sütun hariç */
                const thCells = heads.map((h, i) => {
                    const rh = i < cols-1 ? `<div class="ng-resize" contenteditable="false" data-col="${i}"></div>` : '';
                    return `<th style="position:relative"><div class="ng-v-wrap"><div class="ng-title" contenteditable="true" spellcheck="false" data-ph="Başlık ${i+1}">${h}</div></div>${rh}</th>`;
                }).join('');
                /* tbody */
                const trs = rows.slice(2).map(r => {
                    const cs = parseCells(r);
                    const tds = heads.map((_, i) => {
                        const rh = i < cols-1 ? `<div class="ng-resize" contenteditable="false" data-col="${i}"></div>` : '';
                        return `<td style="position:relative"><div class="ng-v-wrap"><div class="ng-cell" contenteditable="true" spellcheck="false" data-ph="…">${cs[i] || ''}</div></div>${rh}</td>`;
                    }).join('');
                    return `<tr>${tds}</tr>`;
                }).join('');
                const tbl  = `<table class="noted-grid grid-table" data-grid-type="table" data-cols="${cols}" contenteditable="false">${cg}<thead><tr>${thCells}</tr></thead><tbody>${trs}</tbody></table>`;
                _tbls.push(`<div class="ng-wrap ng-wrap-table" data-grid-type="table">${tbl}</div>`);
                return `�${_tbls.length-1}�`;
            }
        );
        /* Loose list → tight list: liste öğeleri arasındaki boş satırları sil */
        if (applyMd) t = t.replace(/(^[ \t]*[-*+]\s.+)\n\n(?=[ \t]*[-*+]\s)/gm, '$1\n');
        const e = t.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
        /* Tablo placeholder'larını her zaman geri yükle (applyMd'den bağımsız) */
        const _rt = s => s
            .replace(/<p>\s*�(\d+)�\s*<\/p>/g, (_, i) => _tbls[+i] || '')
            .replace(/�(\d+)�/g, (_, i) => _tbls[+i] || '');
        if (!applyMd) return _rt(e.replace(/\n/g,'<br>'));
        return _rt(e
            .replace(/```[\w]*\n?([\s\S]*?)```/g,'<pre><code>$1</code></pre>')
            .replace(/`([^`]+)`/g,'<code>$1</code>')
            .replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>')
            .replace(/\*(.+?)\*/g,'<em>$1</em>')
            .replace(/^####\s(.+)$/gm,'<h4>$1</h4>')
            .replace(/^###\s(.+)$/gm,'<h4>$1</h4>')
            .replace(/^##\s(.+)$/gm,'<h3>$1</h3>')
            .replace(/^#\s(.+)$/gm,'<h3>$1</h3>')
            .replace(/^-{3,}$/gm,'<hr>')
            .replace(/^&gt;\s?(.+)$/gm,'<blockquote>$1</blockquote>')
            .replace(/^\d+\.\s(.+)$/gm,'<xli>$1</xli>')
            .replace(/^[-*+]\s(.+)$/gm,'<li>$1</li>')
            .replace(/^([A-ZÇĞİÖŞÜa-zçğışöşü][^\n:]{0,49}):\s(?=\S)/gm,'<strong>$1:</strong> ')
            .replace(/(<li>[\s\S]*<\/li>)/g,'<ul>$1</ul>')
            .replace(/(<xli>[\s\S]*<\/xli>)/g, m =>
                '<ol>' + m.replace(/<xli>/g,'<li>').replace(/<\/xli>/g,'</li>') + '</ol>')
            .replace(/(<\/?(?:ul|ol|li)>)\n/g, '$1')
            .replace(/\n\n/g,'</p><p>')
            .replace(/\n/g,'<br>')
            .replace(/^(?!<[hupbolx])(.+)$/gm,(m,p)=>p.trim()?`<p>${p}</p>`:m)
            .replace(/<p>\s*<\/p>/g,'')
            .replace(/\[\[([^\]]{1,120})\]\]/g, (_, esc_title) => {
                const raw = esc_title.replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>');
                const note = findNoteByTitle(raw);
                const cls  = note ? 'wikilink' : 'wikilink broken';
                const id   = note ? ` data-note-id="${note.id}"` : '';
                return `<a class="${cls}" href="#"${id}><i class="fas fa-link"></i>${esc_title}</a>`;
            })
        );
    }

    /* ── AI paneldeki .wikilink tıklama + hover — mevcut wl-preview sistemi kullan ── */
    msgs.addEventListener('click', e => {
        const a = e.target.closest('.wikilink[data-note-id]');
        if (!a) return;
        e.preventDefault();
        e.stopPropagation();
        if (typeof hideWlPreview === 'function') hideWlPreview();
        editNote(a.dataset.noteId);
    });

    msgs.addEventListener('mouseover', e => {
        const a = e.target.closest('.wikilink[data-note-id]');
        if (a && typeof scheduleWlPreview === 'function') scheduleWlPreview(a);
    });

    msgs.addEventListener('mouseout', e => {
        const a = e.target.closest('.wikilink[data-note-id]');
        if (a && !a.contains(e.relatedTarget) && typeof scheduleHideWlPreview === 'function') {
            scheduleHideWlPreview();
        }
    });


    /* ── Türkçe gövde normalleştirme (basit sonek soyma) ── */
    function _trNorm(word) {
        const w = word.toLowerCase()
            .replace(/[âàáä]/g,'a').replace(/[êèéë]/g,'e')
            .replace(/[îìíï]/g,'i').replace(/[ôòóö]/g,'o')
            .replace(/[ûùúü]/g,'u');
        /* Çoğul ve durum ekleri — uzundan kısaya sıralı */
        const suffixes = [
            'larından','lerinden','larında','lerinde','larıyla','leriyle',
            'larına','lerine','larını','lerini','lardan','lerden',
            'larda','lerde','larca','lerce','ların','lerin',
            'larım','lerim','lara','lere','ları','leri',
            'lar','ler',
            'ndan','nden','ndan','ndaki','ndeki',
            'ından','inden','undan','ünden',
            'daki','deki','taki','teki',
            'dan','den','tan','ten',
            'nın','nin','nun','nün',
            'ının','inin','unun','ünün',
            'da','de','ta','te',
            'na','ne','ya','ye',
            'ım','im','um','üm',
            'ın','in','un','ün',
            'ıyla','iyle','uyla','üyle',
            'la','le',
            'yı','yi','yu','yü',
            'ı','i','u','ü','a','e',
        ];
        for (const s of suffixes) {
            if (w.length > s.length + 2 && w.endsWith(s)) {
                return w.slice(0, w.length - s.length);
            }
        }
        return w;
    }

    /* ── Koleksiyon meta özeti (her sorguda gönderilir, küçük ve sabit) ── */
    function _buildMeta() {
        if (typeof State.notes === 'undefined' || !State.notes.length) return '';
        const pool = State.notes.filter(n => n.group !== 'Çöp Kutusu');
        if (!pool.length) return '';

        const groupMap = {};
        pool.forEach(n => { const g = n.group || 'Genel'; groupMap[g] = (groupMap[g] || 0) + 1; });
        const groupLine = Object.entries(groupMap)
            .sort((a, b) => b[1] - a[1])
            .map(([g, c]) => `${g} (${c})`)
            .join(', ');

        const tagMap = {};
        pool.forEach(n => (n.tags || []).forEach(t => { tagMap[t] = (tagMap[t] || 0) + 1; }));
        const tagLine = Object.entries(tagMap)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10)
            .map(([t, c]) => `#${t}${c > 1 ? ` (${c})` : ''}`)
            .join(', ');

        const lastDate = pool.reduce((max, n) => Math.max(max, n.updatedAt || 0), 0);
        const lastStr  = lastDate
            ? new Intl.DateTimeFormat(_notedLocale(), { day:'2-digit', month:'long', year:'numeric' }).format(new Date(lastDate))
            : null;

        /* Tüm not başlıkları — AI semantik çıkarım yapabilsin */
        const titleLines = pool
            .slice()
            .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0))
            .map(n => {
                const g = (n.group && n.group !== 'Genel') ? ` [${n.group}]` : '';
                const t = (n.tags && n.tags.length) ? ` #${n.tags.join(' #')}` : '';
                return `- ${n.title}${g}${t}`;
            });
        const titlesSection = `\n\n## Tüm Not Başlıkları\n${titleLines.join('\n')}`;

        return [
            `- Toplam not: ${pool.length}`,
            `- Gruplar: ${groupLine || '—'}`,
            tagLine ? `- Etiketler: ${tagLine}` : null,
            lastStr ? `- Son güncelleme: ${lastStr}` : null,
        ].filter(Boolean).join('\n') + titlesSection;
    }

    function _buildPinnedContext(sysText, query) {
        if (!sysText || typeof State.notes === 'undefined' || !State.notes.length)
            return { ctx: '', ids: new Set() };

        /* Her zaman pinler */
        const alwaysTitles = [...sysText.matchAll(/\[\[([^?\]][^\]]{0,119})\]\]/g)]
            .map(m => m[1].trim());
        /* Koşullu pinler */
        const condTitles = [...sysText.matchAll(/\[\[\?([^\]]{1,120})\]\]/g)]
            .map(m => m[1].trim());

        if (!alwaysTitles.length && !condTitles.length) return { ctx: '', ids: new Set() };

        /* Koşullu pin için sorgu kelimeleri */
        const raw   = (query || '').toLowerCase().split(/\s+/).filter(w => w.length >= 2);
        const words = [...new Set(raw.flatMap(w => [w, _trNorm(w)]))];

        const fmt        = new Intl.DateTimeFormat(_notedLocale(), { day:'2-digit', month:'long', year:'numeric' });
        const NOTE_LIMIT = 1500;
        const parts = [];
        const ids   = new Set();

        const _addNote = (note, label) => {
            ids.add(note.id);
            const date  = note.updatedAt ? fmt.format(new Date(note.updatedAt)) : null;
            const group = note.group && note.group !== 'Genel' ? note.group : null;
            const tags  = note.tags && note.tags.length ? note.tags.map(t => '#' + t).join(' ') : null;
            const meta  = [date, group, tags].filter(Boolean).join(' · ');
            const head  = meta ? `### ${note.title} ${label}\n_${meta}_` : `### ${note.title} ${label}`;
            let content = note.contentMd || '(içerik yok)';
            if (content.length > NOTE_LIMIT)
                content = content.slice(0, NOTE_LIMIT) + '\n_…(not kısaltıldı)_';
            parts.push(`${head}\n\n${content}`);
        };

        /* Her zaman pinler */
        for (const title of alwaysTitles) {
            const note = findNoteByTitle(title);
            if (!note || note.group === 'Çöp Kutusu' || ids.has(note.id)) continue;
            _addNote(note, '📌');
        }

        /* Koşullu pinler — sorguyla eşleşiyorsa ekle */
        for (const title of condTitles) {
            const note = findNoteByTitle(title);
            if (!note || note.group === 'Çöp Kutusu' || ids.has(note.id)) continue;
            const titleLow = title.toLowerCase();
            const md       = (note.contentMd || '').toLowerCase();
            const score    = words.reduce((s, w) =>
                s + (titleLow.includes(w) ? 4 : 0) + (md.includes(w) ? 1 : 0), 0);
            if (score > 0) _addNote(note, '📎');
        }

        return { ctx: parts.join('\n\n---\n\n'), ids };
    }

    /* ── Not bağlamı oluştur (keyword skorlama + metadata) ── */
    function _buildContext(query, maxNotes, excludeIds = new Set()) {
        if (typeof State.notes === 'undefined' || !State.notes.length) return '';

        const raw   = query.toLowerCase().split(/\s+/).filter(w => w.length >= 2);
        /* Her kelime için orijinal + gövde → tekil küme */
        const words = [...new Set(raw.flatMap(w => [w, _trNorm(w)]))];

        const pool  = State.notes.filter(n => n.group !== 'Çöp Kutusu' && !excludeIds.has(n.id));

        const scored = pool.map(n => {
            const title = (n.title  || '').toLowerCase();
            const md    = (n.contentMd || '').toLowerCase();
            const tags  = (n.tags   || []).join(' ').toLowerCase();
            const group = (n.group  || '').toLowerCase();
            let score   = 0;

            /* Sorgu kelimeleri → not içeriğinde ara */
            words.forEach(w => {
                if (title.includes(w))  score += 4;
                if (tags.includes(w))   score += 3;
                if (group.includes(w))  score += 2;
                if (md.includes(w))     score += 1;
            });

            /* Başlık kelimeleri → sorguda ara (İngilizce başlık + Türkçe sorgu durumu) */
            title.split(/[\s\-_/]+/).filter(w => w.length >= 3).forEach(tw => {
                if (raw.some(qw => qw === tw || qw.includes(tw) || tw.includes(qw)))
                    score += 3;
            });

            return { n, score };
        });

        /* Yüksek skorlular önce, eşitlerde en yeni önce */
        scored.sort((a, b) => b.score - a.score || (b.n.updatedAt || 0) - (a.n.updatedAt || 0));

        /* Eşleşen notlar (score > 0) — en fazla maxNotes adet */
        let result = scored.filter(x => x.score > 0).slice(0, maxNotes);

        /* Fallback: eşleşme 5'ten azsa en son notlarla tamamla */
        const FILL_TARGET = Math.min(5, maxNotes);
        if (result.length < FILL_TARGET) {
            const ids  = new Set(result.map(x => x.n.id));
            const fill = pool
                .slice()
                .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0))
                .filter(n => !ids.has(n.id))
                .slice(0, FILL_TARGET - result.length)
                .map(n => ({ n, score: 0 }));
            result = [...result, ...fill];
        }

        if (!result.length) return '';

        const fmt          = new Intl.DateTimeFormat(_notedLocale(), { day:'2-digit', month:'long', year:'numeric' });
        const NOTE_LIMIT   = 1500; /* karakter — ~375 token */
        const CTX_LIMIT    = 7000; /* toplam context — ~1750 token */

        let totalChars = 0;
        const parts = [];

        for (const { n } of result) {
            const date  = n.updatedAt ? fmt.format(new Date(n.updatedAt)) : null;
            const group = n.group && n.group !== 'Genel' ? n.group : null;
            const tags  = n.tags && n.tags.length ? n.tags.map(t => '#' + t).join(' ') : null;
            const meta  = [date, group, tags].filter(Boolean).join(' · ');
            const head  = meta ? `### ${n.title}\n_${meta}_` : `### ${n.title}`;

            let content = n.contentMd || '(içerik yok)';
            if (content.length > NOTE_LIMIT) {
                content = content.slice(0, NOTE_LIMIT) + '\n_…(not kısaltıldı)_';
            }

            const entry = `${head}\n\n${content}`;
            if (totalChars + entry.length > CTX_LIMIT) break; /* bütçe doldu */
            parts.push(entry);
            totalChars += entry.length;
        }

        return parts.join('\n\n---\n\n');
    }

    /* ── Streaming SSE okuyucu (web modu) ── */
    async function _handleStream(readableStream, remH, limH, userText, modelId) {
        const typing = document.getElementById('ai-typing-row');
        if (typing) typing.remove();

        const d = document.createElement('div');
        d.className = 'ai-msg bot';
        if (userText) d.dataset.userText = userText;
        d.innerHTML = `<div class="ai-bot-row">
            <div class="ai-bot-av"><i class="fas fa-wand-magic-sparkles"></i></div>
            <div class="ai-bubble"><span class="ai-stream-cursor"></span></div>
        </div>
        <div class="ai-msg-foot">
            <span class="ai-msg-time">${now()}</span>
            <div class="ai-msg-acts">
                <button class="ai-act-btn" data-act="regen"  title="Yenile"><i class="fas fa-rotate-right"></i></button>
                <button class="ai-act-btn" data-act="insert" title="Editöre Ekle"><i class="fas fa-file-import"></i></button>
            </div>
        </div>`;
        msgs.appendChild(d);
        const bubble = d.querySelector('.ai-bubble');
        const foot   = d.querySelector('.ai-msg-foot');
        const botRow = d.querySelector('.ai-bot-row');
        scrollDown();

        const reader  = readableStream.getReader();
        const decoder = new TextDecoder();
        let rawText      = '';
        let rawReasoning = '';
        let sseBuffer    = '';
        let usageData    = null;

        /* Throttled render — requestAnimationFrame bazlı (~60fps) */
        let renderPending = false;
        let streamDone = false;
        const schedRender = () => {
            if (renderPending) return;
            renderPending = true;
            requestAnimationFrame(() => {
                renderPending = false;
                if (streamDone) return;
                bubble.innerHTML = mdToHtml(rawText) + '<span class="ai-stream-cursor"></span>';
                scrollDown();
            });
        };

        try {
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                sseBuffer += decoder.decode(value, { stream: true });
                const lines = sseBuffer.split('\n');
                sseBuffer = lines.pop() ?? '';
                for (const line of lines) {
                    if (!line.startsWith('data: ')) continue;
                    const chunk = line.slice(6).trim();
                    if (chunk === '[DONE]') continue;
                    try {
                        const obj = JSON.parse(chunk);
                        if (obj.usage) usageData = obj.usage;
                        const delta  = obj.choices?.[0]?.delta?.content ?? '';
                        const rdelta = obj.choices?.[0]?.delta?.reasoning_content ?? '';
                        rawText      += delta;
                        rawReasoning += rdelta;
                        if (delta || rdelta) schedRender();
                    } catch (_) {}
                }
            }
        } catch (err) {
            if (err.name === 'AbortError') return; /* kullanıcı durdurdu */
            throw err;
        }

        streamDone = true;
        /* Son render — cursor kaldır, markdown uygula, thinking ayır */
        const { thinking, reply } = _extractThinking(rawText, rawReasoning);
        const thinkHtml = thinking
            ? `<details class="ai-think">
                   <summary><span class="ai-think-arrow">▶</span> Düşünme süreci</summary>
                   <div class="ai-think-body">${esc(thinking)}</div>
               </details>`
            : '';
        bubble.innerHTML = thinkHtml + (mdToHtml(reply || rawText) || '(Boş yanıt geldi)');

        /* Token + model chip'leri — mesaj üst sağ */
        const tokChips  = _buildTokenChips(usageData, remH, limH);
        const modelChip = modelId ? `<span class="ai-tok-chip ai-model-chip" title="${esc(modelId)}">${esc(_shortModel(modelId))}</span>` : '';
        if (modelChip || tokChips) botRow.insertAdjacentHTML('beforebegin', `<div class="ai-tok-top"><div class="ai-tok-chips">${modelChip}${tokChips}</div></div>`);

        scrollDown();

        /* Geçmişe ekle */
        const finalReply = reply || rawText;
        if (finalReply) {
            _history.push({ role: 'user',      content: userText  });
            _history.push({ role: 'assistant', content: finalReply });
        }
    }

    /* ── Editöre Ekle ── */
    function _insertToEditor(bubble) {
        /* AI sohbet paneli float panelden habersiz tasarlandı (bkz. Comments.json ->
           why-ai-insert-targets-main-editor) — DOM.$content sohbete geçmeden önce float
           panele odaklanıldıysa hâlâ fpContent'i gösterebilir. Eklemeden önce ana editörü
           hedefe zorla, aksi halde AI yanıtı yanlış nota (float panelinkine) yazılır. */
        if (typeof activateInstance === 'function' && window._mainEditorInstance) {
            activateInstance(window._mainEditorInstance);
        }
        const cl = bubble.cloneNode(true);
        cl.querySelector('.ai-stream-cursor')?.remove();
        cl.querySelector('.ai-think')?.remove();

        const wrapper = document.createElement('div');
        wrapper.className = 'ai-block';
        wrapper.setAttribute('data-generated-by', 'ai');
        wrapper.innerHTML = cl.innerHTML;

        DOM.$content.appendChild(wrapper);

        let gridsRestored = false;
        Array.from(wrapper.querySelectorAll('.ng-wrap')).forEach(wrap => {
            wrapper.parentNode.insertBefore(wrap, wrapper.nextSibling);
            const p = document.createElement('p'); p.innerHTML = '<br>';
            wrapper.parentNode.insertBefore(p, wrap.nextSibling);
            gridsRestored = true;
        });
        if (wrapper.innerHTML.trim() === '' || (wrapper.children.length === 0 && !wrapper.textContent.trim())) {
            wrapper.remove();
        }

        DOM.$content.dispatchEvent(new Event('input', { bubbles: true }));
        if (gridsRestored && typeof _restoreGrids === 'function') _restoreGrids();
        if (typeof updateFooterVisibility === 'function') updateFooterVisibility();
        
        const scrollTarget = wrapper.parentNode ? wrapper : (DOM.$content.lastElementChild || DOM.$content);
        if (scrollTarget.scrollIntoView) scrollTarget.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    msgs.addEventListener('click', e => {
        const btn = e.target.closest('[data-act]');
        if (!btn) return;
        const msg  = btn.closest('.ai-msg');
        const act  = btn.dataset.act;
        const uTxt = msg?.dataset.userText || '';

        if (act === 'insert') {
            const bubble = msg?.querySelector('.ai-bubble');
            if (bubble) _insertToEditor(bubble);
        } else if (act === 'regen') {
            if (uTxt && !_busy) { input.value = uTxt; send(); }
        } else if (act === 'resend') {
            if (uTxt && !_busy) { input.value = uTxt; send(); }
        } else if (act === 'copy') {
            if (uTxt) navigator.clipboard.writeText(uTxt).catch(() => {});
        } else if (act === 'edit') {
            if (uTxt) { input.value = uTxt; input.focus(); resize(); }
        }
    });

    /* ── Gönder ── */
    function send() {
        const text = input.value.trim();
        if (!text || _busy) return;

        if (_isFileProtocol) {
            addBot('⚠️ **Yerel dosya protokolü tespit edildi.**\n\nAPI çağrıları `file://` üzerinden engellendiği için AI çalışamaz.\n\n**Çözüm:** `start_noted.bat` dosyasını çift tıklayarak uygulamayı başlatın — Python veya Node.js otomatik sunucu açar, tarayıcı `localhost`\'a yönlenir.');
            return;
        }

        const cfg = getCfg();
        const _poolReady = _getPool().filter(m => m.enabled !== false).length > 0;
        if (!cfg.apiKey && !_poolReady) {
            addBot('⚙️ Henüz model eklenmemiş.\n\n**AI Ayarları** panelinden bir provider bağlayın ve modelleri havuza ekleyin.');
            openSettings();
            return;
        }

        _busy = true;
        _abort = new AbortController();
        sendBtn.innerHTML = '<i class="fas fa-stop"></i>';
        sendBtn.title = 'Durdur';
        sendBtn.classList.add('stopping');
        const _docAtts = _attachments.filter(a => a.type === 'doc');
        const _imgAtts = _attachments.filter(a => a.type === 'img');
        let _userContent = text;
        if (_docAtts.length) _userContent = _docAtts.map(a => `[Belge: ${a.name}]\n${a.content}`).join('\n\n---\n\n') + '\n\n---\n\n' + text;
        const _userMsg = _imgAtts.length
            ? { role: 'user', content: [{ type: 'text', text: _userContent }, ..._imgAtts.map(a => ({ type: 'image_url', image_url: { url: a.b64 } }))] }
            : { role: 'user', content: _userContent };
        addUser(text); input.value = ''; resize();
        _attachments = []; _renderChips();
        showTyping();

        const model      = cfg.model || 'llama-3.3-70b-versatile';
        const defaultSys = 'Sen bir not asistanısın. Kullanıcının notlarına dayanarak Türkçe, özlü ve yardımcı yanıtlar ver.';
        const sysText    = cfg.sys || defaultSys;

        /* Pinlenmiş notlar — [[Başlık]] her zaman, [[?Başlık]] yalnızca eşleşince */
        const { ctx: pinnedCtx, ids: pinnedIds } = _buildPinnedContext(sysText, text);

        /* Keyword RAG — pinlenmiş notları hariç tut */
        const ragCtx = _buildContext(text, cfg.ctx ?? 10, pinnedIds);

        /* Birleştir: pinler önce, RAG sonra */
        const ctx = [pinnedCtx, ragCtx].filter(Boolean).join('\n\n---\n\n');

        /* ── Koleksiyon meta özeti (grup, etiket, toplam) ── */
        const _meta = _buildMeta();

        const sysContent = [
            sysText,
            _meta   ? `## Not Koleksiyonu Yapısı\n${_meta}` : '',
            ctx     ? `## İlgili Notlar\n\n${ctx}` : ''
        ].filter(Boolean).join('\n\n');

        /* Sohbet geçmişi — son 6 mesaj (3 tur) */
        const _historySlice = _history.slice(-6);

        const _payloadBase = {
            messages: [
                { role: 'system', content: sysContent },
                ..._historySlice,
                _userMsg
            ],
            max_tokens  : 1024,
            temperature : cfg.temp ?? 0.7,
            stream      : !_onLocalhost,
            ...(!_onLocalhost ? { stream_options: { include_usage: true } } : {})
        };

        /* Pool-tabanlı fallback sırası */
        const _rawPool = _getPool().filter(m => m.enabled !== false);
        const _modelsQueue = _rawPool.length
            ? _rawPool.map(m => ({ modelId: m.modelId, providerId: m.providerId }))
            : [{ modelId: model, providerId: 'groq' }];

        function _attempt(qi) {
            let _willRetry = false;
            const _entry   = _modelsQueue[qi];
            const _m       = _entry.modelId;
            const _cat     = AI_PROVIDER_CATALOG.find(p => p.id === _entry.providerId) || { endpoint: 'https://api.groq.com/openai/v1' };
            const _aKey    = _getProviderKey(_entry.providerId) || cfg.apiKey;
            const _aUrl    = _onLocalhost ? '/api/chat' : `${_cat.endpoint}/chat/completions`;
            const _aHdrs   = _onLocalhost
                ? { 'Content-Type': 'application/json' }
                : { 'Content-Type': 'application/json', 'Authorization': `Bearer ${_aKey}`, ...(_cat.extraHeaders || {}) };
            const _p = { ..._payloadBase, model: _m };
            const _body = _onLocalhost
                ? JSON.stringify({ _apiKey: _aKey, ..._p })
                : JSON.stringify(_p);

            fetch(_aUrl, {
                method : 'POST',
                headers: _aHdrs,
                signal : _abort.signal,
                body   : _body
            })
            .then(r => {
                const remH = parseInt(r.headers.get('x-ratelimit-remaining-tokens') ?? '-1');
                const limH = parseInt(r.headers.get('x-ratelimit-limit-tokens') ?? '-1');
                if (!r.ok) return r.text().then(rawBody => {
                    let msg = `HTTP ${r.status}`;
                    try { const e = JSON.parse(rawBody); msg = e.error?.message || e.error || msg; } catch(_) {}
                    const err = new Error(`${r.status}: ${msg}`);
                    err.httpStatus = r.status;
                    throw err;
                });
                if (!_onLocalhost) {
                    /* Web — SSE stream */
                    return _handleStream(r.body, remH, limH, text, _m);
                }
                /* Localhost — server.js proxy tam yanıt döndürür */
                return r.json().then(data => {
                    const raw              = data.choices?.[0]?.message?.content?.trim() || '';
                    const reasoningContent = data.choices?.[0]?.message?.reasoning_content || '';
                    const { thinking, reply } = _extractThinking(raw, reasoningContent);
                    const rl        = data._rateLimit;
                    const remaining = rl?.remaining ?? -1;
                    const limit     = rl?.limit     ?? -1;
                    const tokenInfo = { usage: data.usage || null, remaining, limit };
                    addBot(reply || '(Boş yanıt geldi)', thinking, tokenInfo, text, _m);
                    if (reply) {
                        _history.push({ role: 'user',      content: text  });
                        _history.push({ role: 'assistant', content: reply });
                    }
                });
            })
            .catch(err => {
                const el = document.getElementById('ai-typing-row');
                if (el) el.remove();
                if (err.name === 'AbortError') return;
                const _s   = err.httpStatus || 0;
                const msg  = err.message || '';
                const _isAuthErr = _s === 401 || _s === 403;
                const _isNetErr  = !_s && msg === 'Failed to fetch';
                if (!_isAuthErr && !_isNetErr && qi + 1 < _modelsQueue.length) {
                    _willRetry = true;
                    _markModelLimited(_entry.providerId, _m, _s);
                    const _next = _modelsQueue[qi + 1]?.modelId || '';
                    if (typeof _showSnack === 'function')
                        _showSnack(NotedI18n.t('msg.modelfallback').replace('{model}', _m).replace('{next}', _next), 'warn', 3500);
                    showTyping();
                    _attempt(qi + 1);
                    return;
                }
                let hint;
                if (_isNetErr) {
                    hint = _onLocalhost
                        ? 'Tarayıcı CORS politikası engelledi. `start_noted.bat` ile açın.'
                        : 'Groq API\'ye erişilemiyor. İnternet bağlantınızı kontrol edin.';
                } else if (_isAuthErr) {
                    hint = 'API anahtarı geçersiz veya yetkisiz. Ayarlar\'dan `gsk_…` anahtarınızı kontrol edin.';
                } else {
                    hint = 'Tüm modeller denendi ama yanıt alınamadı. Birkaç dakika sonra tekrar deneyin.';
                }
                addBot(`❌ **Hata:** \`${msg}\`\n\n${hint}`);
            })
            .finally(() => {
                if (_willRetry) return;
                _busy = false; _abort = null;
                sendBtn.innerHTML = '<i class="fas fa-arrow-up"></i>';
                sendBtn.title = 'Gönder (Enter)';
                sendBtn.classList.remove('stopping');
            });
        }

        _attempt(0);
    }

    /* ── Settings ── */
    const settingsPanel = document.getElementById('ai-settings-panel');
    const settingsBtn   = document.getElementById('ai-settings-btn');
    const setBackBtn    = document.getElementById('ai-set-back');
    const setSaveBtn    = document.getElementById('ai-set-save');
    const setStatus     = document.getElementById('ai-set-status');
    const tempSlider    = document.getElementById('ai-temp');
    const tempVal       = document.getElementById('ai-temp-val');
    const ctxCount      = document.getElementById('ai-ctx-count');
    const sysPrompt     = document.getElementById('ai-sys-prompt');
    const panelSub      = panel.querySelector('.ai-panel-sub');

    /* Eski sabit isimleri kaldırıldı — getAiCfg/patchAiCfg kullanılıyor */

    const AI_PROVIDER_CATALOG = [
        { id:'groq',       name:'Groq',         endpoint:'https://api.groq.com/openai/v1',        keyHint:'gsk_…',   keyLink:'https://console.groq.com/keys' },
        { id:'openrouter', name:'OpenRouter',    endpoint:'https://openrouter.ai/api/v1',          keyHint:'sk-or-…', keyLink:'https://openrouter.ai/keys', extraHeaders:{'HTTP-Referer':location.href,'X-Title':'Noted'} },
        { id:'together',   name:'Together AI',   endpoint:'https://api.together.xyz/v1',           keyHint:'',        keyLink:'https://api.together.ai/settings/api-keys' },
        { id:'fireworks',  name:'Fireworks AI',  endpoint:'https://api.fireworks.ai/inference/v1', keyHint:'fw_…',    keyLink:'https://fireworks.ai/account/api-keys' },
        { id:'mistral',    name:'Mistral',        endpoint:'https://api.mistral.ai/v1',             keyHint:'',        keyLink:'https://console.mistral.ai/api-keys' },
        { id:'custom',     name:'Özel Provider',  endpoint:null,                                   keyHint:'',        keyLink:null }
    ];

    /* ── Storage helpers ── */
    function _getProviders()       { return getAiCfg().providers || []; }
    function _saveProviders(arr)   { patchAiCfg({providers: arr}); }
    function _getPool()            { return getAiCfg().pool || []; }
    function _savePool(arr)        { patchAiCfg({pool: arr}); }
    function _getProviderKey(pid)  { return _getProviders().find(p => p.id === pid)?.apiKey || null; }

    function getCfg() {
        const c = getAiCfg();
        return { apiKey: c.key || '', sys: c.sys || '', model: c.model || '', temp: c.temp ?? 0.7, ctx: c.ctx ?? 10 };
    }

    function _updateConnStatus() {
        if (!panelSub) return;
        const pool = _getPool();
        if (pool.length > 0) {
            panelSub.textContent = `● ${pool.length} model hazır`;
            panelSub.style.color = 'var(--success, #3fb950)';
        } else if (getCfg().apiKey) {
            panelSub.textContent = '● Bağlantı hazır';
            panelSub.style.color = 'var(--success, #3fb950)';
        } else {
            panelSub.textContent = '○ API anahtarı ayarlanmadı';
            panelSub.style.color = 'var(--text-muted)';
        }
    }

    /* ── Migration: eski tek-key → yeni pool ── */
    function _migrateFromLegacy() {
        if (_getPool().length > 0) return;
        const oldKey = getAiCfg().key || '';
        if (!oldKey) return;
        _saveProviders([{ id:'groq', name:'Groq', apiKey: oldKey, addedAt: Date.now() }]);
        _savePool([
            { providerId:'groq', modelId:'llama-3.3-70b-versatile', modelName:'Llama 3.3 70B Versatile', contextWindow:128000, free:true, enabled:true },
            { providerId:'groq', modelId:'llama-3.1-8b-instant',    modelName:'Llama 3.1 8B Instant',    contextWindow:128000, free:true, enabled:true }
        ]);
    }

    /* ── Model normalizer ── */
    function _normalizeModels(providerId, data) {
        const items = Array.isArray(data) ? data : (data.data || []);
        return items.map(m => {
            let free = true;
            let contextWindow = m.context_window || m.context_length || null;
            const name = m.name || m.display_name || m.id;
            if (providerId === 'openrouter') {
                const p = m.pricing;
                free = !p || (parseFloat(p.prompt||'0') === 0 && parseFloat(p.completion||'0') === 0);
                free = free || (m.id || '').includes(':free');
                contextWindow = m.context_length || contextWindow;
            } else if (providerId === 'mistral') {
                free = false;
            }
            return { id: m.id, name, contextWindow, free };
        }).filter(m => m.id).sort((a, b) => a.id.localeCompare(b.id));
    }

    /* ── Pool UI ── */
    let _pickerModels   = [];
    let _pickerProvider = null;
    let _poolClickHandler = null;
    let _poolDragHandlers = null;

    function _markModelLimited(providerId, modelId, httpStatus) {
        const key = `${providerId}::${modelId}`;
        if (_modelHealth[key]?._timer) clearTimeout(_modelHealth[key]._timer);
        const ttl = httpStatus === 429 ? 65000 : 30000; /* 429=rate-limit ~60sn, diğerleri kısa */
        _modelHealth[key] = {
            ts: Date.now(), http: httpStatus,
            _timer: setTimeout(() => {
                delete _modelHealth[key];
                if (settingsPanel?.classList.contains('open')) _renderPool();
            }, ttl)
        };
        if (settingsPanel?.classList.contains('open')) _renderPool();
    }

    function _renderPool() {
        const grid  = document.getElementById('ai-pool-grid');
        const empty = document.getElementById('ai-pool-empty');
        if (!grid) return;
        const pool = _getPool();
        grid.innerHTML = '';
        if (empty) empty.style.display = pool.length ? 'none' : '';
        pool.forEach((entry, i) => {
            const cat = AI_PROVIDER_CATALOG.find(p => p.id === entry.providerId) || { name: entry.providerId };
            const ctx = entry.contextWindow ? Math.round(entry.contextWindow / 1000) + 'K' : '';
            const hKey   = `${entry.providerId}::${entry.modelId}`;
            const health = _modelHealth[hKey];
            const healthBadge = health
                ? `<span class="ai-pool-row-health" title="${health.http === 429 ? 'Rate limit — yakında sıfırlanır' : 'Hata — geçici devre dışı'}">${health.http === 429 ? '⚡' : '⚠'}</span>`
                : `<span></span>`;
            const row = document.createElement('div');
            row.className = 'ai-pool-row';
            row.draggable = true;
            row.dataset.idx = i;
            row.innerHTML =
                `<span class="ai-pool-row-num">${i + 1}</span>` +
                `<div class="ai-pool-row-info">` +
                  `<div class="ai-pool-row-provider">${cat.name}</div>` +
                  `<div class="ai-pool-row-model" title="${entry.modelId}">${entry.modelName || entry.modelId}` +
                    (ctx ? `<span class="ai-pool-row-sep">|</span><span class="ai-pool-row-ctx">${ctx}</span>` : '') +
                  `</div>` +
                `</div>` +
                `<span class="ai-pool-row-badge ${entry.free ? 'ai-model-badge-free' : 'ai-model-badge-paid'}">${entry.free ? 'Ücretsiz' : 'Ücretli'}</span>` +
                healthBadge +
                `<div class="ai-pool-row-actions">` +
                  `<button class="ai-pool-btn" data-action="up"   data-idx="${i}" title="Yukarı">&#x25B2;</button>` +
                  `<button class="ai-pool-btn" data-action="down" data-idx="${i}" title="Aşağı">&#x25BC;</button>` +
                  `<button class="ai-pool-btn del" data-action="del" data-idx="${i}" title="Kaldır"><i class="fas fa-trash-can"></i></button>` +
                `</div>`;
            grid.appendChild(row);
        });

        if (_poolClickHandler) grid.removeEventListener('click', _poolClickHandler);
        _poolClickHandler = e => {
            if (e.target.closest('[draggable]') && !e.target.closest('[data-action]')) return;
            const btn = e.target.closest('[data-action]');
            if (!btn) return;
            const idx    = parseInt(btn.dataset.idx);
            const action = btn.dataset.action;
            const p      = _getPool();
            if      (action === 'up'   && idx > 0)         { [p[idx], p[idx-1]] = [p[idx-1], p[idx]]; }
            else if (action === 'down' && idx < p.length-1) { [p[idx], p[idx+1]] = [p[idx+1], p[idx]]; }
            else if (action === 'del')                       { p.splice(idx, 1); }
            _savePool(p);
            _renderPool();
            _updateConnStatus();
        };
        grid.addEventListener('click', _poolClickHandler);

        if (_poolDragHandlers) {
            grid.removeEventListener('dragstart', _poolDragHandlers.start);
            grid.removeEventListener('dragend',   _poolDragHandlers.end);
            grid.removeEventListener('dragover',  _poolDragHandlers.over);
            grid.removeEventListener('drop',      _poolDragHandlers.drop);
        }
        let _dragFromIdx = -1;
        _poolDragHandlers = {
            start: e => {
                const row = e.target.closest('.ai-pool-row');
                if (!row) return;
                _dragFromIdx = parseInt(row.dataset.idx);
                e.dataTransfer.effectAllowed = 'move';
                setTimeout(() => row.classList.add('dragging'), 0);
            },
            end: e => {
                e.target.closest('.ai-pool-row')?.classList.remove('dragging');
                grid.querySelectorAll('.drag-over').forEach(r => r.classList.remove('drag-over'));
            },
            over: e => {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
                const row = e.target.closest('.ai-pool-row');
                grid.querySelectorAll('.drag-over').forEach(r => r.classList.remove('drag-over'));
                if (row && parseInt(row.dataset.idx) !== _dragFromIdx) row.classList.add('drag-over');
            },
            drop: e => {
                e.preventDefault();
                grid.querySelectorAll('.drag-over').forEach(r => r.classList.remove('drag-over'));
                const row = e.target.closest('.ai-pool-row');
                if (!row) return;
                const dropIdx = parseInt(row.dataset.idx);
                if (_dragFromIdx < 0 || _dragFromIdx === dropIdx) return;
                const p = _getPool();
                const [item] = p.splice(_dragFromIdx, 1);
                p.splice(dropIdx, 0, item);
                _savePool(p);
                _renderPool();
                _updateConnStatus();
                _dragFromIdx = -1;
            }
        };
        grid.addEventListener('dragstart', _poolDragHandlers.start);
        grid.addEventListener('dragend',   _poolDragHandlers.end);
        grid.addEventListener('dragover',  _poolDragHandlers.over);
        grid.addEventListener('drop',      _poolDragHandlers.drop);
    }

    let _pickerListChangeHandler = null;

    function _renderModelPicker(models, providerName) {
        const list     = document.getElementById('ai-model-list');
        const searchEl = document.getElementById('ai-model-search');
        const countEl  = document.getElementById('ai-picker-sel-count');
        const titleEl  = document.getElementById('ai-picker-title');
        if (!list) return;
        if (titleEl) titleEl.textContent = providerName + ' Modelleri';
        _pickerModels = models;

        function _rebuildRows(filter) {
            list.innerHTML = '';
            const visible = filter
                ? models.filter(m => m.id.toLowerCase().includes(filter) || (m.name||'').toLowerCase().includes(filter))
                : models;
            if (!visible.length) {
                list.innerHTML = '<div style="padding:12px;text-align:center;font-size:.8rem;color:var(--text-muted)">Model bulunamadı</div>';
                return;
            }
            visible.forEach(m => {
                const ctx = m.contextWindow ? Math.round(m.contextWindow / 1000) + 'K ctx' : '';
                const row = document.createElement('label');
                row.className = 'ai-model-row';
                row.innerHTML =
                    `<input type="checkbox" value="${m.id}">` +
                    `<div class="ai-model-row-info">` +
                      `<div class="ai-model-row-name" title="${m.id}">${m.name || m.id}</div>` +
                      (ctx ? `<div class="ai-model-row-meta">${ctx}</div>` : '') +
                    `</div>` +
                    `<span class="ai-model-badge ${m.free ? 'ai-model-badge-free' : 'ai-model-badge-paid'}">${m.free ? 'Ücretsiz' : 'Ücretli'}</span>`;
                list.appendChild(row);
            });
            _updateSelCount();
        }

        function _updateSelCount() {
            if (!countEl) return;
            const n = list.querySelectorAll('input[type="checkbox"]:checked').length;
            countEl.textContent = n ? `${n} seçildi` : '';
        }

        if (_pickerListChangeHandler) list.removeEventListener('change', _pickerListChangeHandler);
        _pickerListChangeHandler = _updateSelCount;
        list.addEventListener('change', _pickerListChangeHandler);

        if (searchEl) {
            searchEl.value = '';
            searchEl.oninput = () => _rebuildRows(searchEl.value.trim().toLowerCase());
        }
        _rebuildRows('');
    }

    /* ── Provider seçimi / validate ── */
    const provSelEl    = document.getElementById('ai-prov-sel');
    const customEpWrap = document.getElementById('ai-custom-ep-wrap');
    const provKeyHint  = document.getElementById('ai-prov-key-hint');
    const provKeyInput = document.getElementById('ai-prov-key');
    const provKeyTgl   = document.getElementById('ai-prov-key-toggle');
    const provStatus   = document.getElementById('ai-prov-status');
    const validateBtn  = document.getElementById('ai-prov-validate-btn');
    const pickerSec    = document.getElementById('ai-model-picker-sec');
    const pickerClose  = document.getElementById('ai-picker-close');
    const addPoolBtn   = document.getElementById('ai-add-to-pool-btn');

    function _updateProvHint(provId) {
        const cat   = AI_PROVIDER_CATALOG.find(p => p.id === provId);
        const saved = _getProviderKey(provId);
        let html = '';
        if (saved) html += '<i class="fas fa-check" style="color:#3fb950"></i> Kaydedilmiş anahtar var. ';
        if (cat?.keyLink) html += `<a href="${cat.keyLink}" target="_blank" rel="noopener" style="color:var(--accent)">${cat.name} key al →</a>`;
        if (provKeyHint) provKeyHint.innerHTML = html;
        if (provKeyInput) {
            provKeyInput.placeholder = cat?.keyHint || '…';
            if (saved) provKeyInput.value = saved;
        }
    }

    provSelEl?.addEventListener('change', () => {
        const v = provSelEl.value;
        if (customEpWrap) customEpWrap.style.display = v === 'custom' ? '' : 'none';
        if (pickerSec)    pickerSec.style.display    = 'none';
        if (provStatus)   provStatus.textContent     = '';
        _updateProvHint(v);
    });

    provKeyTgl?.addEventListener('click', () => {
        if (!provKeyInput) return;
        const show = provKeyInput.type === 'password';
        provKeyInput.type = show ? 'text' : 'password';
        provKeyTgl.innerHTML = `<i class="fas fa-${show ? 'eye-slash' : 'eye'}"></i>`;
    });

    validateBtn?.addEventListener('click', async () => {
        if (!provSelEl || !provKeyInput) return;
        const provId    = provSelEl.value;
        const apiKey    = provKeyInput.value.trim();
        const cat       = AI_PROVIDER_CATALOG.find(p => p.id === provId);
        const customEp  = document.getElementById('ai-custom-ep')?.value.trim();
        const _setProvStatus = (msg, ok) => {
            if (!provStatus) return;
            provStatus.textContent = msg;
            provStatus.style.color = ok ? '#3fb950' : '#e5534b';
        };
        if (!apiKey) { _setProvStatus('⚠ API anahtarı girin', false); return; }
        if (provId === 'custom' && !customEp) { _setProvStatus('⚠ Endpoint URL girin', false); return; }
        const base = provId === 'custom' ? customEp : cat?.endpoint;
        if (provStatus) { provStatus.textContent = 'Bağlanıyor…'; provStatus.style.color = 'var(--text-muted)'; }
        validateBtn.disabled = true;
        try {
            const headers = { 'Authorization': `Bearer ${apiKey}`, ...(cat?.extraHeaders || {}) };
            const r = await fetch(`${base}/models`, { headers });
            if (!r.ok) throw new Error(`HTTP ${r.status}`);
            const data   = await r.json();
            const models = _normalizeModels(provId, data);
            if (!models.length) throw new Error('Model listesi boş');
            const provs    = _getProviders();
            const existing = provs.find(p => p.id === provId);
            if (existing) existing.apiKey = apiKey;
            else provs.push({ id: provId, name: cat?.name || provId, apiKey, addedAt: Date.now() });
            _saveProviders(provs);
            _pickerProvider = { id: provId, name: cat?.name || provId };
            _renderModelPicker(models, cat?.name || provId);
            if (pickerSec) pickerSec.style.display = '';
            _setProvStatus(`✓ ${models.length} model yüklendi`, true);
            _updateProvHint(provId);
            _updateConnStatus();
        } catch (err) {
            if (provStatus) { provStatus.textContent = `❌ ${err.message}`; provStatus.style.color = '#e5534b'; }
        } finally {
            validateBtn.disabled = false;
        }
    });

    pickerClose?.addEventListener('click', () => { if (pickerSec) pickerSec.style.display = 'none'; });

    addPoolBtn?.addEventListener('click', () => {
        const list = document.getElementById('ai-model-list');
        if (!list || !_pickerProvider) return;
        const checked = [...list.querySelectorAll('input[type="checkbox"]:checked')];
        if (!checked.length) {
            if (provStatus) { provStatus.textContent = '⚠ En az bir model seçin'; provStatus.style.color = '#e5534b'; setTimeout(() => { if (provStatus) provStatus.textContent = ''; }, 2000); }
            return;
        }
        const pool = _getPool();
        let added = 0;
        checked.forEach(cb => {
            const modelId = cb.value;
            if (pool.some(p => p.modelId === modelId && p.providerId === _pickerProvider.id)) return;
            const md = _pickerModels.find(m => m.id === modelId) || {};
            pool.push({ providerId: _pickerProvider.id, modelId, modelName: md.name || modelId, contextWindow: md.contextWindow || null, free: md.free ?? true, enabled: true });
            added++;
        });
        _savePool(pool);
        _renderPool();
        _updateConnStatus();
        if (pickerSec) pickerSec.style.display = 'none';
        if (provStatus && added) { provStatus.textContent = `✓ ${added} model eklendi`; provStatus.style.color = '#3fb950'; setTimeout(() => { if (provStatus) provStatus.textContent = ''; }, 2500); }
    });

    /* ── Noted_System.md ↔ sistem mesajı textarea ── */
    let _sysMdTimer = null;

    function _saveSysMdFile(text) {
        if (!_onLocalhost) return;
        fetch('/api/sysmd', { method:'POST', headers:{ 'Content-Type':'text/plain; charset=utf-8' }, body: text }).catch(() => {});
    }

    function _loadServerConfig() {
        if (!_onLocalhost) return;
        fetch('/api/config').then(r => r.ok ? r.json() : null).then(data => {
            if (!data?.groqApiKey) return;
            const key = data.groqApiKey.trim();
            if (!key.startsWith('gsk_')) return;
            patchAiCfg({ key });
            _migrateFromLegacy();
            _updateConnStatus();
        }).catch(() => {});
    }

    function _loadSysMdFile() {
        if (!_onLocalhost) return;
        fetch('/api/sysmd').then(r => {
            if (!r.ok && r.status !== 204) return;
            return r.text();
        }).then(text => {
            if (!text || !text.trim()) return;
            if (sysPrompt) sysPrompt.value = text;
            patchAiCfg({ sys: text.trim() });
        }).catch(() => {});
    }

    sysPrompt?.addEventListener('input', () => {
        clearTimeout(_sysMdTimer);
        _sysMdTimer = setTimeout(() => {
            const val = sysPrompt.value;
            _saveSysMdFile(val);
            patchAiCfg({ sys: val.trim() });
        }, 800);
    });

    function loadCfg() {
        try {
            const c = getCfg();
            if (tempSlider && c.temp != null) { tempSlider.value = c.temp; if (tempVal) tempVal.textContent = c.temp; }
            if (ctxCount && c.ctx) ctxCount.value = c.ctx;
            if (sysPrompt && c.sys) sysPrompt.value = c.sys;
            _renderPool();
            if (provSelEl) { provSelEl.value = 'groq'; _updateProvHint('groq'); }
            if (customEpWrap) customEpWrap.style.display = 'none';
            if (pickerSec) pickerSec.style.display = 'none';
            if (provStatus) provStatus.textContent = '';
        } catch (_) {}
    }

    function saveCfg() {
        try {
            const sysVal = sysPrompt?.value.trim() || '';
            patchAiCfg({
                model : _getPool()[0]?.modelId || 'llama-3.3-70b-versatile',
                temp  : parseFloat(tempSlider?.value ?? 0.7),
                ctx   : parseInt(ctxCount?.value ?? 10),
                sys   : sysVal
            });
            _saveSysMdFile(sysVal);
            _updateConnStatus();
            if (setStatus) {
                setStatus.textContent = 'Kaydedildi ✓';
                setStatus.style.color = '';
                setTimeout(() => { if (setStatus) setStatus.textContent = ''; }, 2000);
            }
        } catch (_) {}
    }

    function openSettings()  { settingsPanel?.classList.add('open'); loadCfg(); _loadSysMdFile(); _renderPool(); }
    function closeSettings() { settingsPanel?.classList.remove('open'); }

    settingsBtn ?.addEventListener('click', openSettings);
    setBackBtn  ?.addEventListener('click', closeSettings);
    setSaveBtn  ?.addEventListener('click', saveCfg);

    /* ── Sistem mesajı geniş editör modalı ── */
    const sysModalOverlay = document.getElementById('sys-modal-overlay');
    const sysModalTa      = document.getElementById('sys-modal-textarea');
    const sysExpandBtn    = document.getElementById('sys-expand-btn');
    const sysModalClose   = document.getElementById('sys-modal-close');
    const sysModalSave    = document.getElementById('sys-modal-save');
    const sysModalCancel  = document.getElementById('sys-modal-cancel');

    function openSysModal()  {
        if (sysModalTa && sysPrompt) sysModalTa.value = sysPrompt.value;
        sysModalOverlay?.classList.add('open');
        setTimeout(() => sysModalTa?.focus(), 60);
    }
    function closeSysModal() { sysModalOverlay?.classList.remove('open'); }
    function saveSysModal()  {
        if (sysPrompt && sysModalTa) { sysPrompt.value = sysModalTa.value; sysPrompt.dispatchEvent(new Event('input')); }
        closeSysModal();
    }

    sysExpandBtn ?.addEventListener('click', openSysModal);
    sysModalClose?.addEventListener('click', closeSysModal);
    sysModalCancel?.addEventListener('click', closeSysModal);
    sysModalSave ?.addEventListener('click', saveSysModal);
    sysModalOverlay?.addEventListener('click', e => { if (e.target === sysModalOverlay) closeSysModal(); });
    document.addEventListener('keydown', e => {
        if (e.key === 'Escape' && sysModalOverlay?.classList.contains('open')) closeSysModal();
    });

    tempSlider?.addEventListener('input', () => { if (tempVal) tempVal.textContent = tempSlider.value; });

    _migrateFromLegacy();
    loadCfg();
    _loadServerConfig(); /* localhost'ta config.json'dan API key otomatik al */

    /* ── Dosya ekleme ── */
    const attachBtn    = document.getElementById('ai-attach-btn');
    const attachDrop   = document.getElementById('ai-attach-drop');
    const attachDocBtn = document.getElementById('ai-attach-doc-btn');
    const attachImgBtn = document.getElementById('ai-attach-img-btn');
    const fileDocInput = document.getElementById('ai-file-doc');
    const fileImgInput = document.getElementById('ai-file-img');
    const chipsEl      = document.getElementById('ai-attach-chips');

    function _renderChips() {
        if (!chipsEl) return;
        if (!_attachments.length) { chipsEl.style.display = 'none'; chipsEl.innerHTML = ''; return; }
        chipsEl.style.display = 'flex';
        chipsEl.innerHTML = _attachments.map((a, i) =>
            `<span class="ai-attach-chip">
                <i class="fas ${a.type === 'img' ? 'fa-image' : 'fa-file-lines'}"></i>
                <span>${esc(a.name)}</span>
                <button class="ai-attach-chip-rm" data-idx="${i}" title="Kaldır">×</button>
             </span>`
        ).join('');
    }

    chipsEl?.addEventListener('click', e => {
        const btn = e.target.closest('.ai-attach-chip-rm');
        if (!btn) return;
        _attachments.splice(parseInt(btn.dataset.idx), 1);
        _renderChips();
    });

    function _closeAttachDrop() {
        attachDrop?.classList.remove('open');
        attachBtn?.classList.remove('open');
    }

    attachBtn?.addEventListener('click', e => {
        e.stopPropagation();
        const nowOpen = attachDrop.classList.toggle('open');
        attachBtn.classList.toggle('open', nowOpen);
    });

    document.addEventListener('click', e => {
        if (attachDrop?.classList.contains('open') && !attachBtn?.contains(e.target) && !attachDrop?.contains(e.target))
            _closeAttachDrop();
    });

    attachDocBtn?.addEventListener('click', () => { _closeAttachDrop(); fileDocInput?.click(); });
    attachImgBtn?.addEventListener('click', () => { _closeAttachDrop(); fileImgInput?.click(); });

    fileDocInput?.addEventListener('change', () => {
        const file = fileDocInput.files[0]; if (!file) return;
        fileDocInput.value = '';
        const reader = new FileReader();
        reader.onload = ev => { _attachments.push({ type: 'doc', name: file.name, content: ev.target.result }); _renderChips(); };
        reader.readAsText(file, 'UTF-8');
    });

    fileImgInput?.addEventListener('change', () => {
        const file = fileImgInput.files[0]; if (!file) return;
        fileImgInput.value = '';
        const reader = new FileReader();
        reader.onload = ev => { _attachments.push({ type: 'img', name: file.name, b64: ev.target.result }); _renderChips(); };
        reader.readAsDataURL(file);
    });

    /* ── Olaylar ── */
    openBtn  ?.addEventListener('click', () => _open ? close() : open());
    closeBtn ?.addEventListener('click', close);
    newBtn   ?.addEventListener('click', newChat);
    overlay  ?.addEventListener('click', close);
    sendBtn  ?.addEventListener('click', () => {
        if (_busy && _abort) { _abort.abort(); return; }
        send();
    });

    input?.addEventListener('input', resize);
    /* "- " → "• " otomatik madde dönüşümü */
    input?.addEventListener('input', () => {
        const val = input.value, pos = input.selectionStart;
        const ls  = val.lastIndexOf('\n', pos - 1) + 1;
        const le  = val.indexOf('\n', pos);
        const line = val.slice(ls, le === -1 ? undefined : le);
        const m = line.match(/^(\s*)- $/);
        if (m) {
            const repl = m[1] + '• ';
            input.value = val.slice(0, ls) + repl + val.slice(le === -1 ? val.length : le);
            input.selectionStart = input.selectionEnd = ls + repl.length;
            resize();
        }
    });
    input?.addEventListener('keydown', e => {
        if (e.key !== 'Enter') return;
        const val = input.value, pos = input.selectionStart;
        const ls  = val.lastIndexOf('\n', pos - 1) + 1;
        const le  = val.indexOf('\n', pos);
        const line = val.slice(ls, le === -1 ? undefined : le);
        const bm = line.match(/^(\s*)(•\s)/);
        if (bm) {
            e.preventDefault();
            const indent = bm[1], content = line.slice(bm[0].length);
            if (e.altKey) {
                const sub = '\n' + indent + '  • ';
                input.value = val.slice(0, pos) + sub + val.slice(pos);
                input.selectionStart = input.selectionEnd = pos + sub.length;
            } else if (!content.trim()) {
                input.value = val.slice(0, ls) + val.slice(ls + bm[0].length);
                input.selectionStart = input.selectionEnd = ls;
            } else {
                const nb = '\n' + indent + '• ';
                input.value = val.slice(0, pos) + nb + val.slice(pos);
                input.selectionStart = input.selectionEnd = pos + nb.length;
            }
            resize(); return;
        }
        if (!e.shiftKey && !e.altKey) { e.preventDefault(); send(); }
    });

    document.querySelectorAll('.ai-chip').forEach(c =>
        c.addEventListener('click', () => {
            input.value = c.textContent; resize(); send();
        })
    );

    document.addEventListener('keydown', e => {
        if (e.key === 'Escape' && _open) {
            if (settingsPanel?.classList.contains('open')) closeSettings();
            else close();
        }
    });

    /* ── Not içi AI — toolbar butonları için dışa açık API ── */
    window._mdToHtml = mdToHtml;  /* markdown → HTML dönüştürücü */
    window._inlineAI = async function(action, selectedText, onResult, onError) {
        if (_isFileProtocol) { onError('file:// protokolü desteklenmiyor.'); return; }
        const cfg = getCfg();
        const _pool2 = _getPool().filter(m => m.enabled !== false);
        if (!cfg.apiKey && !_pool2.length) { onError('Model havuzu boş. AI Ayarlarından provider ekleyin.'); return; }

        const prompts = {
            expand:    'Aşağıdaki metni genişlet ve detaylandır. Yalnızca genişletilmiş metni döndür, giriş cümlesi veya açıklama ekleme:',
            summarize: 'Aşağıdaki metni özetle. Yalnızca özeti döndür, giriş cümlesi veya açıklama ekleme:',
            fix:       'Aşağıdaki metnin Türkçe yazım ve dilbilgisi hatalarını düzelt. Yalnızca düzeltilmiş metni döndür, açıklama ekleme:',
            continue:  'Aşağıdaki metnin devamını yaz. Yalnızca devam metnini döndür, giriş cümlesi veya açıklama ekleme:'
        };
        const prompt = prompts[action];
        if (!prompt) { onError('Geçersiz eylem.'); return; }

        const toneMap = {
            professional: 'Yanıtlarını profesyonel, resmi ve öz bir dilde ver.',
            friendly:     'Yanıtlarını samimi, sıcak ve dostane bir dilde ver.',
            informative:  'Yanıtlarını açıklayıcı, kapsamlı ve bilgilendirici bir dilde ver.',
            creative:     'Yanıtlarını yaratıcı, özgün ve akıcı bir dilde ver.'
        };
        const tone    = getAiCfg().tone || 'informative';
        const toneStr = toneMap[tone] || toneMap.informative;
        const model = cfg.model || 'llama-3.3-70b-versatile';
        const payloadBase = {
            messages: [
                { role: 'system', content: `Sen bir metin editörü asistanısın. Yalnızca istenen dönüşümü yap, hiçbir açıklama veya giriş ekleme. ${toneStr}` },
                { role: 'user', content: `${prompt}\n\n${selectedText}` }
            ],
            max_tokens: 1024,
            temperature: 0.5,
            stream: !_onLocalhost,
            ...(!_onLocalhost ? { stream_options: { include_usage: true } } : {})
        };

        const modelsQueue = _pool2.length
            ? _pool2.map(m => ({ modelId: m.modelId, providerId: m.providerId }))
            : [{ modelId: model, providerId: 'groq' }];

        let lastErr;
        for (let qi = 0; qi < modelsQueue.length; qi++) {
            const _entry2  = modelsQueue[qi];
            const _m       = _entry2.modelId;
            const _cat2    = AI_PROVIDER_CATALOG.find(p => p.id === _entry2.providerId) || { endpoint: 'https://api.groq.com/openai/v1' };
            const _aKey2   = _getProviderKey(_entry2.providerId) || cfg.apiKey;
            const _aUrl2   = _onLocalhost ? '/api/chat' : `${_cat2.endpoint}/chat/completions`;
            const _aHdrs2  = _onLocalhost
                ? { 'Content-Type': 'application/json' }
                : { 'Content-Type': 'application/json', 'Authorization': `Bearer ${_aKey2}`, ...(_cat2.extraHeaders || {}) };
            const _p = { ...payloadBase, model: _m };
            const fetchBody = _onLocalhost
                ? JSON.stringify({ _apiKey: _aKey2, ..._p })
                : JSON.stringify(_p);
            try {
                const r = await fetch(_aUrl2, { method: 'POST', headers: _aHdrs2, body: fetchBody });
                if (!r.ok) {
                    const rawBody = await r.text();
                    let msg = `HTTP ${r.status}`;
                    try { const e = JSON.parse(rawBody); msg = e.error?.message || e.error || msg; } catch(_) {}
                    const err = new Error(msg);
                    err.httpStatus = r.status;
                    throw err;
                }
                if (!_onLocalhost) {
                    const reader = r.body.getReader();
                    const decoder = new TextDecoder();
                    let rawText = '', sseBuffer = '';
                    while (true) {
                        const { done, value } = await reader.read();
                        if (done) break;
                        sseBuffer += decoder.decode(value, { stream: true });
                        const lines = sseBuffer.split('\n');
                        sseBuffer = lines.pop() ?? '';
                        for (const line of lines) {
                            if (!line.startsWith('data: ')) continue;
                            const chunk = line.slice(6).trim();
                            if (chunk === '[DONE]') continue;
                            try { rawText += JSON.parse(chunk).choices?.[0]?.delta?.content ?? ''; } catch(_) {}
                        }
                    }
                    const { reply: r1 } = _extractThinking(rawText.trim(), '');
                    onResult(r1 || rawText.trim(), _m);
                } else {
                    const data = await r.json();
                    const raw = (data.choices?.[0]?.message?.content || '').trim();
                    const rc  = data.choices?.[0]?.message?.reasoning_content || '';
                    const { reply: r2 } = _extractThinking(raw, rc);
                    onResult(r2 || raw, _m);
                }
                return; /* başarılı */
            } catch (err) {
                const _s        = err.httpStatus || 0;
                const _isAuth   = _s === 401 || _s === 403;
                const _isNet    = !_s && err.message === 'Failed to fetch';
                if (!_isAuth && !_isNet && qi + 1 < modelsQueue.length) {
                    lastErr = err;
                    continue; /* sonraki modeli dene */
                }
                onError(err.message || 'Bilinmeyen hata');
                return;
            }
        }
        if (lastErr) onError('Tüm modeller denendi ama yanıt alınamadı. Birkaç dakika sonra tekrar deneyin.');
    };
})();

