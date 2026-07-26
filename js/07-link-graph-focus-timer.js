/* ═══════════════════════════════════════════════════════════════════════
   v1.7 — YENİ ÖZELLİKLER
   1) Bağlantı Haritası   2) Odak Oturumu Sayacı
   ═══════════════════════════════════════════════════════════════════════ */

/* ── 1) BAĞLANTI HARİTASI ──────────────────────────────────────────────── */

/* Modül-seviyesi durum değişkenleri */
let graphZoom = 1;
let isDraggingSphere  = false;
let isHoveringNode    = false;
let graphHoveredNodeId = null;
let graphRafId = null;
let nodeData = [];

function rotateSphere(ax, ay) {
    const cosY = Math.cos(ay), sinY = Math.sin(ay);
    const cosX = Math.cos(ax), sinX = Math.sin(ax);
    nodeData.forEach(nd => {
        const x1 = nd.x * cosY - nd.z * sinY;
        const z1 = nd.x * sinY + nd.z * cosY;
        const y2 = nd.y * cosX - z1 * sinX;
        const z2 = nd.y * sinX + z1 * cosX;
        nd.x = x1; nd.y = y2; nd.z = z2;
    });
}
function initSpherePositions() {
    nodeData.forEach(nd => { nd.x = nd.ox; nd.y = nd.oy; nd.z = nd.oz; });
    rotateSphere(-0.3, 0);
}
Const.GRAPH_ZOOM_MIN = 0.5; Const.GRAPH_ZOOM_MAX = 2.5; Const.GRAPH_ZOOM_STEP = 0.15;

function gm_applyZoom() {
    const val = $('gm-zoom-val');
    if (val) val.textContent = Math.round(graphZoom * 100) + '%';
}
function gm_setZoom(z) {
    graphZoom = Math.max(Const.GRAPH_ZOOM_MIN, Math.min(Const.GRAPH_ZOOM_MAX, z));
    gm_applyZoom();
}
function gm_resetView() {
    graphZoom = 1; gm_applyZoom(); initSpherePositions();
}

function buildLinkGraphData() {
    const nodesMap = new Map();
    const edgeMap = new Map();
    notes.forEach(n => {
        if (!n || n.group === Const.TRASH_GROUP) return;
        const wrap = document.createElement('div');
        wrap.innerHTML = n.content || '';
        const links = [...wrap.querySelectorAll('a.wikilink[data-note-id]')];
        links.forEach(a => {
            const targetId = a.dataset.noteId;
            const target = notes.find(t => String(t.id) === String(targetId) && t.group !== Const.TRASH_GROUP);
            if (!target) return;
            if (String(n.id) === String(target.id)) return;
            const idA = String(n.id), idB = String(target.id);
            const lo = idA < idB ? idA : idB;
            const hi = idA < idB ? idB : idA;
            const key = lo + '::' + hi;
            /* v1.9 güncelleme: yön bilgisi korunur (tek yönlü / çift yönlü ok için) */
            let e = edgeMap.get(key);
            if (!e) { e = { from: lo, to: hi, loToHi: false, hiToLo: false }; edgeMap.set(key, e); }
            if (idA === lo) e.loToHi = true; else e.hiToLo = true;
            nodesMap.set(idA, n);
            nodesMap.set(idB, target);
        });
    });
    const nodes = [...nodesMap.values()].map(n => ({ id: String(n.id), title: n.title || '(başlıksız)', group: n.group || 'Genel' }));
    const edges = [...edgeMap.values()];
    return { nodes, edges };
}

function renderLinkGraph() {
    const body = $('graph-body');
    if (!body) return;
    body.innerHTML = '';
    graphHoveredNodeId = null; isHoveringNode = false;
    const { nodes, edges } = buildLinkGraphData();
    if (!nodes.length) {
        const empty = document.createElement('div');
        empty.className = 'graph-empty';
        empty.innerHTML = 'Henüz bağlantılı notunuz yok.<br>' +
            'Bir nottan diğerine <code>[[Not Adı]]</code> yazarak bağlantı oluşturabilirsiniz.';
        body.appendChild(empty);
        return;
    }
    const MAX_NODES = 80;
    let shownNodes = nodes;
    let limited = false;
    if (nodes.length > MAX_NODES) { shownNodes = nodes.slice(0, MAX_NODES); limited = true; }
    const idSet = new Set(shownNodes.map(n => n.id));
    const shownEdges = edges.filter(e => idSet.has(e.from) && idSet.has(e.to));

    /* ══ CANVAS 2D RENDERER ══ */
    const canvas = document.createElement('canvas');
    canvas.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;display:block;cursor:grab;';
    body.style.position = 'relative';
    body.appendChild(canvas);
    const ctx = canvas.getContext('2d');

    function resizeCanvas() {
        canvas.width  = body.clientWidth  || 760;
        canvas.height = body.clientHeight || 480;
    }
    resizeCanvas();
    if (window.ResizeObserver) {
        const ro = new ResizeObserver(resizeCanvas);
        ro.observe(body);
    }

    /* ── Unit-sphere layout (golden angle spiral) ── */
    const PHI_GA = Math.PI * (3 - Math.sqrt(5));
    nodeData = shownNodes.map((n, i) => {
        const yy = 1 - (i / Math.max(shownNodes.length - 1, 1)) * 2;
        const rr = Math.sqrt(Math.max(0, 1 - yy * yy));
        const th = PHI_GA * i;
        return { n, ox: Math.cos(th) * rr, oy: yy, oz: Math.sin(th) * rr,
                 x: 0, y: 0, z: 0, color: getColor(n.group || 'Genel').main };
    });
    const nodeById = new Map(nodeData.map(nd => [nd.n.id, nd]));

    /* ── Perspective projection (unit-sphere → canvas px) ── */
    const FOV = 3.5;
    function sphereR() { return Math.min(canvas.width, canvas.height) * 0.38 * graphZoom; }
    function project(nd) {
        const cx = canvas.width / 2, cy = canvas.height / 2;
        const R = sphereR(), sc = FOV / (FOV + nd.z);
        return {
            x:     cx + nd.x * R * sc,
            y:     cy + nd.y * R * sc,
            z:     nd.z,
            alpha: 0.18 + (1 - nd.z) / 2 * 0.82,
            size:  Math.max(3, (5 + (0.5 - nd.z) * 4)) * sc * Math.max(0.6, graphZoom)
        };
    }

    /* ── SLERP great-circle arc (from Particles.html) ── */
    function sphereArcPts(a, b, steps) {
        const r1 = Math.hypot(a.x, a.y, a.z) || 1;
        const r2 = Math.hypot(b.x, b.y, b.z) || 1;
        const rA = (r1 + r2) * 0.5;
        const ax = a.x/r1, ay = a.y/r1, az = a.z/r1;
        const bx = b.x/r2, by = b.y/r2, bz = b.z/r2;
        const dot = Math.max(-1, Math.min(1, ax*bx + ay*by + az*bz));
        const theta = Math.acos(dot);
        const pts = [];
        for (let i = 0; i <= steps; i++) {
            const t = i / steps;
            let sx, sy, sz;
            if (theta < 0.001) { sx = ax; sy = ay; sz = az; }
            else {
                const s0 = Math.sin((1-t)*theta) / Math.sin(theta);
                const s1 = Math.sin(t*theta)     / Math.sin(theta);
                sx = s0*ax + s1*bx; sy = s0*ay + s1*by; sz = s0*az + s1*bz;
            }
            pts.push({ x: sx*rA, y: sy*rA, z: sz*rA });
        }
        return pts;
    }

    function projectArc(pts) {
        const cx = canvas.width / 2, cy = canvas.height / 2, R = sphereR();
        return pts.map(p => {
            const sc = FOV / (FOV + p.z);
            return { x: cx + p.x * R * sc, y: cy + p.y * R * sc, z: p.z };
        });
    }

    /* ── Glass sphere (canvas radial gradients) ── */
    function drawGlassSphere() {
        const cx = canvas.width / 2, cy = canvas.height / 2, R = sphereR();
        const dk = document.documentElement.getAttribute('data-theme') === 'dark';
        ctx.save();

        /* Base fill */
        const base = ctx.createRadialGradient(cx - R*0.28, cy - R*0.32, R*0.04, cx, cy, R);
        if (dk) {
            base.addColorStop(0,    'rgba(255,255,255,0.05)');
            base.addColorStop(0.65, 'rgba(20,50,140,0.03)');
            base.addColorStop(0.93, 'rgba(0,170,255,0.10)');
            base.addColorStop(1,    'rgba(0,210,255,0.28)');
        } else {
            base.addColorStop(0,    'rgba(255,255,255,0.22)');
            base.addColorStop(0.65, 'rgba(160,190,255,0.06)');
            base.addColorStop(0.93, 'rgba(80,130,220,0.11)');
            base.addColorStop(1,    'rgba(50,90,200,0.32)');
        }
        ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI*2);
        ctx.fillStyle = base; ctx.fill();

        /* Rim */
        ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI*2);
        ctx.strokeStyle = dk ? 'rgba(90,160,255,0.22)' : 'rgba(80,130,225,0.30)';
        ctx.lineWidth = 1.5; ctx.stroke();

        /* Specular highlight */
        const spec = ctx.createRadialGradient(cx - R*0.36, cy - R*0.38, 0, cx - R*0.36, cy - R*0.38, R*0.50);
        spec.addColorStop(0,   'rgba(255,255,255,0.24)');
        spec.addColorStop(0.5, 'rgba(255,255,255,0.04)');
        spec.addColorStop(1,   'rgba(255,255,255,0)');
        ctx.beginPath(); ctx.arc(cx - R*0.36, cy - R*0.38, R*0.50, 0, Math.PI*2);
        ctx.fillStyle = spec; ctx.fill();

        /* Bottom refraction */
        const rim = ctx.createRadialGradient(cx + R*0.28, cy + R*0.38, 0, cx + R*0.28, cy + R*0.38, R*0.30);
        rim.addColorStop(0, 'rgba(255,255,255,0.10)');
        rim.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.beginPath(); ctx.arc(cx + R*0.28, cy + R*0.38, R*0.30, 0, Math.PI*2);
        ctx.fillStyle = rim; ctx.fill();

        ctx.restore();
    }

    /* ── Draw one edge pass (front or back) ── */
    const EDGE_STEPS = 14;
    function drawEdgePass(na, nb, edge, isFront, highlighted) {
        const arcPts3D = sphereArcPts(na, nb, EDGE_STEPS);
        const proj = projectArc(arcPts3D);
        const alpha = ((1 - na.z) / 2 + (1 - nb.z) / 2) * 0.5;
        const dk = document.documentElement.getAttribute('data-theme') === 'dark';
        const a = highlighted ? Math.min(0.95, alpha * 2.2 + 0.2) : alpha * 0.45;
        ctx.save();
        ctx.strokeStyle = dk ? `rgba(110,185,255,${a})` : `rgba(55,115,220,${a})`;
        ctx.lineWidth   = highlighted ? 1.8 : 0.9;

        /* Draw arc segments belonging to this pass */
        let seg = null;
        const flush = () => { if (seg && seg.length > 1) {
            ctx.beginPath(); ctx.moveTo(seg[0].x, seg[0].y);
            for (let k = 1; k < seg.length; k++) ctx.lineTo(seg[k].x, seg[k].y);
            ctx.stroke();
        } seg = null; };
        for (let i = 0; i < proj.length; i++) {
            const front = proj[i].z <= 0;
            if (front === isFront) { if (!seg) seg = []; seg.push(proj[i]); }
            else flush();
        }
        flush();

        /* Arrow heads — direction follows loToHi / hiToLo flags */
        const first = proj[0], second = proj[1];
        const last  = proj[proj.length - 1], prev = proj[proj.length - 2];
        const drawArrow = (tip, dx, dy, nodeSize) => {
            const dd = Math.hypot(dx, dy) || 1;
            const nx = dx/dd, ny = dy/dd, px = -ny, py = nx;
            const AL = 7, AH = 3;
            const tx = tip.x - nx*nodeSize*0.8, ty = tip.y - ny*nodeSize*0.8;
            ctx.fillStyle = ctx.strokeStyle;
            ctx.beginPath(); ctx.moveTo(tx, ty);
            ctx.lineTo(tx - nx*AL + px*AH, ty - ny*AL + py*AH);
            ctx.lineTo(tx - nx*AL - px*AH, ty - ny*AL - py*AH);
            ctx.closePath(); ctx.fill();
        };
        /* lo→hi: arrow at nb */
        if ((last.z <= 0) === isFront && edge.loToHi) {
            const pb = project(nb);
            drawArrow(pb, last.x - prev.x, last.y - prev.y, pb.size);
        }
        /* hi→lo: arrow at na */
        if ((first.z <= 0) === isFront && edge.hiToLo) {
            const pa = project(na);
            drawArrow(pa, first.x - second.x, first.y - second.y, pa.size);
        }

        ctx.restore();
        return proj;
    }

    /* ── Draw node ── */
    function drawNode(nd, p, hovered) {
        ctx.save();
        ctx.globalAlpha = p.alpha;
        if (nd.z < 0.1) { ctx.shadowColor = nd.color; ctx.shadowBlur = hovered ? 20 : 9; }
        ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI*2);
        ctx.fillStyle = nd.color; ctx.fill();
        if (hovered) {
            ctx.shadowBlur = 0;
            ctx.beginPath(); ctx.arc(p.x, p.y, p.size + 3.5, 0, Math.PI*2);
            ctx.strokeStyle = 'rgba(255,255,255,0.75)'; ctx.lineWidth = 1.8; ctx.stroke();
        }
        ctx.shadowBlur = 0;
        if (nd.z < 0.35) {
            const lbl = nd.n.title.length > 20 ? nd.n.title.slice(0,20) + '…' : nd.n.title;
            const fs  = Math.max(9, Math.min(13, p.size * 1.5));
            ctx.font = `${hovered ? '600' : '400'} ${fs}px var(--font-ui,system-ui)`;
            ctx.globalAlpha = p.alpha * (0.55 + (0.35 - nd.z) * 1.2);
            const dk = document.documentElement.getAttribute('data-theme') === 'dark';
            ctx.fillStyle = hovered ? (dk ? '#fff' : '#111') : (dk ? 'rgba(215,228,255,0.88)' : 'rgba(25,38,80,0.82)');
            ctx.textBaseline = 'middle';
            const right = p.x > canvas.width / 2;
            ctx.textAlign = right ? 'left' : 'right';
            ctx.fillText(lbl, right ? p.x + p.size + 5 : p.x - p.size - 5, p.y);
        }
        ctx.restore();
    }

    /* ── Legend ── */
    const groupColorCache = {};
    nodeData.forEach(nd => { const g = nd.n.group || 'Genel'; if (!groupColorCache[g]) groupColorCache[g] = nd.color; });
    const legend = document.createElement('div');
    legend.id = 'graph-legend';
    Object.entries(groupColorCache).sort((a, b) => a[0].localeCompare(b[0], 'tr')).forEach(([grp, clr]) => {
        const item = document.createElement('div');
        item.className = 'graph-legend-item';
        item.innerHTML = `<span class="graph-legend-dot" style="background:${clr}"></span>${esc(grp)}`;
        legend.appendChild(item);
    });
    body.appendChild(legend);

    /* ── Animation loop ── */
    graphZoom = 1; gm_applyZoom(); initSpherePositions();
    let animDotPhase = 0;
    const projCache = new Map();

    if (graphRafId) cancelAnimationFrame(graphRafId);

    function loop() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        animDotPhase = (animDotPhase + 0.007) % 1;

        if (!isDraggingSphere) {
            rotateSphere(0, isHoveringNode ? 0.0003 : 0.0025);
        }

        const sorted = [...nodeData].sort((a, b) => b.z - a.z);
        projCache.clear();
        sorted.forEach(nd => projCache.set(nd.n.id, project(nd)));

        /* ── 1. Back edges (z > 0) ── */
        shownEdges.forEach(e => {
            const na = nodeById.get(e.from), nb = nodeById.get(e.to);
            if (na && nb) drawEdgePass(na, nb, e, false, graphHoveredNodeId && (e.from === graphHoveredNodeId || e.to === graphHoveredNodeId));
        });

        /* ── 2. Back nodes ── */
        sorted.forEach(nd => { if (nd.z > 0) drawNode(nd, projCache.get(nd.n.id), nd.n.id === graphHoveredNodeId); });

        /* ── 3. Glass sphere ── */
        drawGlassSphere();

        /* ── 4. Front edges (z ≤ 0) + animated dots ── */
        shownEdges.forEach(e => {
            const na = nodeById.get(e.from), nb = nodeById.get(e.to);
            if (!na || !nb) return;
            const hl = graphHoveredNodeId && (e.from === graphHoveredNodeId || e.to === graphHoveredNodeId);
            const proj = drawEdgePass(na, nb, e, true, hl);
            /* Animated dots on highlighted edges — flow follows link direction */
            if (hl && proj) {
                const reverse = e.hiToLo && !e.loToHi;
                for (let d = 0; d < 4; d++) {
                    const tb = (animDotPhase + d * 0.25) % 1;
                    const t = reverse ? 1 - tb : tb;
                    const fade = tb < 0.8 ? 1 : (1 - tb) / 0.2;
                    const ri = t * (proj.length - 1);
                    const i0 = Math.min(Math.floor(ri), proj.length - 2);
                    const fr = ri - i0;
                    const pt = {
                        x: proj[i0].x + (proj[i0+1].x - proj[i0].x) * fr,
                        y: proj[i0].y + (proj[i0+1].y - proj[i0].y) * fr,
                        z: proj[i0].z + (proj[i0+1].z - proj[i0].z) * fr
                    };
                    if (pt.z > 0) continue;
                    ctx.save();
                    ctx.beginPath(); ctx.arc(pt.x, pt.y, 2.5, 0, Math.PI*2);
                    ctx.fillStyle = `rgba(255,220,80,${fade * 0.9})`;
                    ctx.shadowBlur = 6; ctx.shadowColor = 'rgba(255,220,80,0.8)';
                    ctx.fill(); ctx.shadowBlur = 0; ctx.restore();
                }
            }
        });

        /* ── 5. Front nodes ── */
        sorted.forEach(nd => { if (nd.z <= 0) drawNode(nd, projCache.get(nd.n.id), nd.n.id === graphHoveredNodeId); });

        graphRafId = requestAnimationFrame(loop);
    }
    loop();

    /* ── Canvas interaction ── */
    function hitTest(mx, my) {
        const frontFirst = [...nodeData].sort((a, b) => a.z - b.z);
        for (const nd of frontFirst) {
            if (nd.z > 0) continue;
            const p = projCache.get(nd.n.id);
            if (p && Math.hypot(mx - p.x, my - p.y) <= p.size + 8) return nd.n.id;
        }
        return null;
    }

    canvas.addEventListener('mousemove', e => {
        if (isDraggingSphere) return;
        const rect = canvas.getBoundingClientRect();
        const sx = canvas.width / rect.width, sy = canvas.height / rect.height;
        const hit = hitTest((e.clientX - rect.left) * sx, (e.clientY - rect.top) * sy);
        if (hit !== graphHoveredNodeId) {
            graphHoveredNodeId = hit; isHoveringNode = !!hit;
            canvas.style.cursor = hit ? 'pointer' : 'grab';
            if (hit) {
                const p = projCache.get(hit);
                scheduleWlPreview({
                    dataset: { noteId: hit }, isConnected: true,
                    getBoundingClientRect: () => {
                        const r = canvas.getBoundingClientRect();
                        const sx2 = r.width / canvas.width, sy2 = r.height / canvas.height;
                        return { left: r.left + p.x*sx2, right: r.left + (p.x+p.size)*sx2,
                                 top: r.top + (p.y-p.size)*sy2, bottom: r.top + (p.y+p.size)*sy2 };
                    }
                });
            } else scheduleHideWlPreview();
        }
    });

    canvas.addEventListener('mouseleave', () => {
        graphHoveredNodeId = null; isHoveringNode = false; scheduleHideWlPreview();
    });

    canvas.addEventListener('click', e => {
        if (isDraggingSphere) return;
        const rect = canvas.getBoundingClientRect();
        const sx = canvas.width / rect.width, sy = canvas.height / rect.height;
        const hit = hitTest((e.clientX - rect.left) * sx, (e.clientY - rect.top) * sy);
        if (hit) { closeLinkGraph(); editNote(hit); }
    });

    canvas.addEventListener('touchend', e => {
        if (e.changedTouches.length !== 1) return;
        const t = e.changedTouches[0], rect = canvas.getBoundingClientRect();
        const sx = canvas.width / rect.width, sy = canvas.height / rect.height;
        const hit = hitTest((t.clientX - rect.left) * sx, (t.clientY - rect.top) * sy);
        if (hit) { closeLinkGraph(); editNote(hit); }
    }, { passive: true });

    if (limited) {
        const note = document.createElement('div');
        note.style.cssText = 'position:absolute;bottom:36px;left:12px;font-size:.7rem;color:var(--text-muted);pointer-events:none;';
        note.textContent = `İlk ${MAX_NODES} not gösteriliyor.`;
        body.appendChild(note);
    }
}

(function initGraphZoomAndRotateControls() {
    const zin = $('gm-zoom-in'), zout = $('gm-zoom-out'), zreset = $('gm-zoom-reset'), body = $('graph-body');
    if (zin) zin.addEventListener('click', () => gm_setZoom(graphZoom + Const.GRAPH_ZOOM_STEP));
    if (zout) zout.addEventListener('click', () => gm_setZoom(graphZoom - Const.GRAPH_ZOOM_STEP));
    if (zreset) zreset.addEventListener('click', () => { gm_resetView(); });
    
    if (body) {
        /* Tekerlek ile zoom */
        body.addEventListener('wheel', e => {
            e.preventDefault();
            gm_setZoom(graphZoom + (e.deltaY < 0 ? Const.GRAPH_ZOOM_STEP : -Const.GRAPH_ZOOM_STEP));
        }, { passive: false });

        body.style.cursor = 'grab';
        let gmPrevDragX = 0, gmPrevDragY = 0;

        /* ── Mouse ── */
        body.addEventListener('mousedown', e => {
            if (e.button !== 0 || graphHoveredNodeId) return;
            isDraggingSphere = true;
            gmPrevDragX = e.clientX; gmPrevDragY = e.clientY;
            body.style.cursor = 'grabbing'; e.preventDefault();
        });
        document.addEventListener('mousemove', e => {
            if (!isDraggingSphere) return;
            const dx = e.clientX - gmPrevDragX;
            const dy = e.clientY - gmPrevDragY;
            rotateSphere(dy * 0.007, dx * 0.007);
            gmPrevDragX = e.clientX; gmPrevDragY = e.clientY;
        });
        document.addEventListener('mouseup', () => {
            if (isDraggingSphere) { isDraggingSphere = false; body.style.cursor = 'grab'; }
        });

        /* ── Touch: tek parmak → döndür, iki parmak → zoom ── */
        let gmTouchStartX = 0, gmTouchStartY = 0;
        let gmTouchPrevX = 0, gmTouchPrevY = 0;
        let gmPinchStartDist = 0, gmPinchStartZoom = 1;

        function getTouchDist(t) {
            const dx = t[0].clientX - t[1].clientX;
            const dy = t[0].clientY - t[1].clientY;
            return Math.hypot(dx, dy);
        }

        body.addEventListener('touchstart', e => {
            if (e.touches.length === 1) {
                if (e.target.closest('.graph-node')) return;
                isDraggingSphere = true;
                gmTouchStartX = e.touches[0].clientX;
                gmTouchStartY = e.touches[0].clientY;
                gmTouchPrevX = e.touches[0].clientX;
                gmTouchPrevY = e.touches[0].clientY;
            } else if (e.touches.length === 2) {
                isDraggingSphere = false;
                gmPinchStartDist = getTouchDist(e.touches);
                gmPinchStartZoom = graphZoom;
            }
            e.preventDefault();
        }, { passive: false });

        body.addEventListener('touchmove', e => {
            e.preventDefault();
            if (e.touches.length === 1 && isDraggingSphere) {
                const tdx = e.touches[0].clientX - gmTouchPrevX;
                const tdy = e.touches[0].clientY - gmTouchPrevY;
                rotateSphere(tdy * 0.008, tdx * 0.008);
                gmTouchPrevX = e.touches[0].clientX;
                gmTouchPrevY = e.touches[0].clientY;
            } else if (e.touches.length === 2) {
                const dist = getTouchDist(e.touches);
                if (gmPinchStartDist > 0) {
                    gm_setZoom(gmPinchStartZoom * (dist / gmPinchStartDist));
                }
            }
        }, { passive: false });

        body.addEventListener('touchend', e => {
            if (e.touches.length === 0) isDraggingSphere = false;
        }, { passive: true });

        /* Düğüme dokunarak notu aç */
        body.addEventListener('touchend', e => {
            if (e.changedTouches.length !== 1) return;
            const target = document.elementFromPoint(
                e.changedTouches[0].clientX, e.changedTouches[0].clientY
            );
            const nodeG = target && target.closest('.graph-node');
            if (nodeG && nodeG.dataset.noteId) {
                closeLinkGraph();
                editNote(nodeG.dataset.noteId);
            }
        }, { passive: true });
    }
})();

function openLinkGraph() {
    const overlay = $('graph-overlay');
    if (!overlay) return;
    renderLinkGraph();
    overlay.classList.add('open');
}

function closeLinkGraph() {
    const overlay = $('graph-overlay');
    if (overlay) overlay.classList.remove('open');
    if (graphRafId) { cancelAnimationFrame(graphRafId); graphRafId = null; }
}

(function wireGraphUI() {
    const btn = $('graph-view-btn');
    if (btn) btn.addEventListener('click', openLinkGraph);
    const closeBtn = $('graph-close');
    if (closeBtn) closeBtn.addEventListener('click', closeLinkGraph);
    const overlay = $('graph-overlay');
    if (overlay) overlay.addEventListener('click', function (e) {
        if (e.target === overlay) closeLinkGraph();
    });
})();


/* ── 3) ODAK OTURUMU SAYACI ────────────────────────────────────────────── */
Const.FOCUS_TIMER_KEY = 'noted_focus_timer_v1';
function todayKey() {
    const d = new Date();
    return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate();
}
let focusTimerState = (function loadFocusTimer() {
    const def = { duration: 25, remaining: 25 * 60, running: false, dateKey: todayKey(), sessionsToday: 0 };
    const saved = safeLoadJSON(Const.FOCUS_TIMER_KEY, null);
    if (!saved || typeof saved !== 'object') return def;
    const st = Object.assign({}, def, saved);
    if (st.dateKey !== todayKey()) { st.dateKey = todayKey(); st.sessionsToday = 0; }
    st.running = false;
    return st;
})();
let _focusTimerInterval = null;

function saveFocusTimer() {
    try { localStorage.setItem(Const.FOCUS_TIMER_KEY, JSON.stringify(focusTimerState)); } catch (e) {}
}
function fmtMMSS(sec) {
    sec = Math.max(0, sec | 0);
    const m = Math.floor(sec / 60), s = sec % 60;
    return (m < 10 ? '0' : '') + m + ':' + (s < 10 ? '0' : '') + s;
}
function renderFocusTimer() {
    const timeEl = $('ft-time'), toggleEl = $('ft-toggle'), sessEl = $('ft-sessions');
    const d25 = $('ft-dur-25'), d50 = $('ft-dur-50');
    if (timeEl)  timeEl.textContent = fmtMMSS(focusTimerState.remaining);
    if (toggleEl) toggleEl.textContent = focusTimerState.running ? 'Duraklat' : (focusTimerState.remaining < focusTimerState.duration * 60 ? 'Devam Et' : 'Başlat');
    if (sessEl)  sessEl.textContent = 'Bugün: ' + focusTimerState.sessionsToday + ' oturum';
    [[d25, 25], [d50, 50]].forEach(([el, m]) => {
        if (!el) return;
        el.classList.toggle('active', focusTimerState.duration === m);
        el.disabled = focusTimerState.running;
    });
}
function focusTimerTick() {
    if (focusTimerState.dateKey !== todayKey()) {
        focusTimerState.dateKey = todayKey();
        focusTimerState.sessionsToday = 0;
    }
    focusTimerState.remaining--;
    if (focusTimerState.remaining <= 0) {
        focusTimerState.remaining = 0;
        focusTimerState.running = false;
        focusTimerState.sessionsToday++;
        clearInterval(_focusTimerInterval);
        _focusTimerInterval = null;
        showFocusTimerToast('Odak oturumu tamamlandı! 🎉 Bugün ' + focusTimerState.sessionsToday + '. oturumunuz.');
        focusTimerState.remaining = focusTimerState.duration * 60;
    }
    renderFocusTimer();
    saveFocusTimer();
}
function showFocusTimerToast(msg) {
    const t = document.createElement('div');
    t.textContent = msg;
    t.style.cssText = 'position:fixed;bottom:24px;left:50%;transform:translateX(-50%);' +
        'background:var(--accent);color:#fff;padding:10px 18px;border-radius:999px;' +
        'font-size:.82rem;z-index:9999;box-shadow:0 8px 24px rgba(0,0,0,.25)';
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 4000);
}
function startFocusTimer() {
    if (focusTimerState.running) return;
    focusTimerState.running = true;
    if (_focusTimerInterval) clearInterval(_focusTimerInterval);
    _focusTimerInterval = setInterval(focusTimerTick, 1000);
    renderFocusTimer();
    saveFocusTimer();
}
function pauseFocusTimer() {
    focusTimerState.running = false;
    if (_focusTimerInterval) { clearInterval(_focusTimerInterval); _focusTimerInterval = null; }
    renderFocusTimer();
    saveFocusTimer();
}
function setFocusTimerDuration(min) {
    if (focusTimerState.running) return;
    focusTimerState.duration = min;
    focusTimerState.remaining = min * 60;
    renderFocusTimer();
    saveFocusTimer();
}

(function wireFocusTimerUI() {
    const toggle = $('ft-toggle'), d25 = $('ft-dur-25'), d50 = $('ft-dur-50');
    if (toggle) toggle.addEventListener('click', function () {
        if (focusTimerState.running) pauseFocusTimer(); else startFocusTimer();
    });
    if (d25) d25.addEventListener('click', function () { setFocusTimerDuration(25); });
    if (d50) d50.addEventListener('click', function () { setFocusTimerDuration(50); });
    renderFocusTimer();
})();

(function wrapToggleFocusModeForTimer() {
    const _origToggle = toggleFocusMode;
    toggleFocusMode = function (forceOff) {
        const wasActive = document.body.classList.contains('focus-mode');
        _origToggle(forceOff);
        const isActive = document.body.classList.contains('focus-mode');
        if (wasActive && !isActive && focusTimerState.running) {
            pauseFocusTimer();
        }
        if (isActive) renderFocusTimer();
    };
})();


/* ======================================================================
   NOTED v1.9 - YENI OZELLIKLER
   1) Daktilo Modu (Typewriter Mode)
   2) Yazma Serisi & Istatistik Paneli
   3) Hızlı Geçiş / Komut Paleti (Ctrl/Cmd+K)
   ====================================================================== */

/* ---------------------------------------------------------------------
   1) DAKTILO MODU (Typewriter Mode)
   --------------------------------------------------------------------- */
let typewriterActive = false;
try { typewriterActive = getUiCfg().typewriter === true; } catch (_e) {}

function tw_findActiveBlock() {
    const sel = window.getSelection();
    if (!sel || !sel.anchorNode) return null;
    let node = sel.anchorNode;
    if (node.nodeType === Node.TEXT_NODE) node = node.parentNode;
    /* v1.9 güncelleme (2. tur): seçimin içinde bulunduğu ToDo satırı (varsa) ayrıca tespit edilir */
    const todoLi = (node.closest ? node.closest('.todo-item') : null);
    /* v1.10 güncelleme (5. tur): ToDo olmayan bullet/numarali liste satırı da tespit edilir */
    const liNode = (node.closest ? node.closest('li') : null);
    const listLi = (liNode && !todoLi && liNode.closest('ul,ol')) ? liNode : null;
    while (node && node.parentNode !== DOM.$content) node = node.parentNode;
    const block = (node && DOM.$content.contains(node)) ? node : null;
    return {
        block: block,
        todoLi: (todoLi && block && block.contains(todoLi)) ? todoLi : null,
        listLi: (listLi && block && block.contains(listLi)) ? listLi : null
    };
}

function tw_updateActiveBlock() {
    if (!typewriterActive) return;
    const res = tw_findActiveBlock();
    Array.prototype.forEach.call(DOM.$content.children, ch => ch.classList.remove('tw-active'));
    Array.prototype.forEach.call(DOM.$content.querySelectorAll('.todo-item'), li => li.classList.remove('tw-todo-active'));
    /* v1.10 güncelleme (5. tur): genel liste satırlarındaki onceki aktif vurgu temizlenir */
    Array.prototype.forEach.call(DOM.$content.querySelectorAll('li.tw-li-active'), li => li.classList.remove('tw-li-active'));
    if (res) {
        if (res.block && res.block.classList) res.block.classList.add('tw-active');
        if (res.todoLi) res.todoLi.classList.add('tw-todo-active');
        if (res.listLi && res.listLi.classList) res.listLi.classList.add('tw-li-active');
    }
}

function setTypewriterMode(on) {
    typewriterActive = !!on;
    document.body.classList.toggle('typewriter-mode', typewriterActive);
    const btn = $('tw-btn');
    if (btn) {
        btn.classList.toggle('active', typewriterActive);
        btn.title = typewriterActive
            ? 'Daktilo Modundan Çık (Ctrl+Shift+W)'
            : 'Daktilo Modu - sadece üzerinde çalıştığınız satırı öne çıkarır (Ctrl+Shift+W)';
    }
    patchUiCfg({ typewriter: typewriterActive });
    if (typewriterActive) tw_updateActiveBlock();
    else Array.prototype.forEach.call(DOM.$content.children, ch => ch.classList && ch.classList.remove('tw-active'));
}

function toggleTypewriterMode() { setTypewriterMode(!typewriterActive); }

(function initTypewriterMode() {
    const btn = $('tw-btn');
    if (btn) btn.addEventListener('click', toggleTypewriterMode);
    if (DOM.$content) {
        DOM.$content.addEventListener('keyup', tw_updateActiveBlock);
        DOM.$content.addEventListener('click', tw_updateActiveBlock);
        DOM.$content.addEventListener('focus', tw_updateActiveBlock);
    }
    document.addEventListener('selectionchange', () => { if (typewriterActive) tw_updateActiveBlock(); });
    if (typewriterActive) setTypewriterMode(true);
})();



/* ---------------------------------------------------------------------
   2) YAZMA SERISI & ISTATISTIK PANELI
   --------------------------------------------------------------------- */
Const.ACTIVITY_LOG_KEY = 'noted_activity_log_v1';

function _todayISO(d) {
    d = d || new Date();
    const y = d.getFullYear(), m = String(d.getMonth() + 1).padStart(2, '0'), day = String(d.getDate()).padStart(2, '0');
    return y + '-' + m + '-' + day;
}

function recordActivityToday() {
    let log = [];
    try { log = JSON.parse(localStorage.getItem(Const.ACTIVITY_LOG_KEY) || '[]'); } catch (_e) { log = []; }
    if (!Array.isArray(log)) log = [];
    const today = _todayISO();
    if (log[log.length - 1] !== today) {
        log.push(today);
        if (log.length > 400) log = log.slice(log.length - 400);
        try { localStorage.setItem(Const.ACTIVITY_LOG_KEY, JSON.stringify(log)); } catch (_e) {}
    }
}

function computeStreak() {
    let log = [];
    try { log = JSON.parse(localStorage.getItem(Const.ACTIVITY_LOG_KEY) || '[]'); } catch (_e) { log = []; }
    if (!Array.isArray(log) || !log.length) return 0;
    const set = new Set(log);
    let streak = 0;
    let cursor = new Date();
    if (!set.has(_todayISO(cursor))) cursor.setDate(cursor.getDate() - 1);
    while (set.has(_todayISO(cursor))) {
        streak++;
        cursor.setDate(cursor.getDate() - 1);
    }
    return streak;
}

function computeTotalWords() {
    let total = 0;
    notes.forEach(n => {
        const tmp = document.createElement('div');
        tmp.innerHTML = n.content || '';
        const txt = (tmp.textContent || '').trim();
        if (txt) total += txt.split(/\s+/).filter(Boolean).length;
    });
    return total;
}

function computeWeekCount() {
    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    return notes.filter(n => {
        const t = Number(n.createdAt || n.id || 0);
        return t && t >= weekAgo;
    }).length;
}

function renderStatsPanel() {
    const elS = $('stat-streak'), elW = $('stat-words'), elN = $('stat-week');
    if (!elS || !elW || !elN) return;
    elS.textContent = computeStreak();
    elW.textContent = computeTotalWords().toLocaleString('tr-TR');
    elN.textContent = computeWeekCount();
}

function positionStatsPanel() {
    const panel = $('stats-panel'), mini = $('stats-mini-btn');
    if (!panel || !mini) return;
    const r = mini.getBoundingClientRect();
    /* v1.10 guncelleme (5. tur): panel artik dugmenin ALTINA ve onun
       hizasindan SAGA dogru aciliyor (eskiden ustte aciliyordu) */
    panel.style.left = Math.max(8, Math.min(r.left, window.innerWidth - 256)) + 'px';
    panel.style.bottom = 'auto';
    panel.style.top = (r.bottom + 6) + 'px';
}
function openStatsPopup() {
    const panel = $('stats-panel');
    if (!panel) return;
    renderStatsPanel();
    positionStatsPanel();
    panel.classList.add('open');
}
function closeStatsPopup() {
    const panel = $('stats-panel');
    if (panel) panel.classList.remove('open');
}
/* İstatistikler artık Ayarlar > Genel tab'ında statik olarak gösteriliyor */
(function initStats() {
    recordActivityToday();
    renderStatsPanel();
})();

/* ---------------------------------------------------------------------
   3) HIZLI GECIS / KOMUT PALETI (Ctrl/Cmd+K)
   --------------------------------------------------------------------- */
let qsActiveIndex = -1;
let qsResultsCache = [];

function _qsNormalize(s) {
    return String(s || '')
        .toLocaleLowerCase('tr-TR')
        .replace(/I/g, 'i')
        .normalize('NFD').replace(/[̀-ͯ]/g, '');
}

function qsFilterNotes(query) {
    const q = _qsNormalize(query).trim();
    if (!q) {
        return notes.slice().sort((a, b) => (Number(b.updatedAt || b.id || 0)) - (Number(a.updatedAt || a.id || 0))).slice(0, 8);
    }
    return notes.filter(n => {
        const hay = _qsNormalize([
            n.title || '',
            n.group || '',
            Array.isArray(n.tags) ? n.tags.join(' ') : ''
        ].join(' '));
        return hay.indexOf(q) !== -1;
    }).slice(0, 30);
}

function qsRenderResults(query) {
    const wrap = $('qs-results');
    if (!wrap) return;
    qsResultsCache = qsFilterNotes(query);
    qsActiveIndex = qsResultsCache.length ? 0 : -1;
    if (!qsResultsCache.length) {
        wrap.innerHTML = '<div id="qs-empty"><i class="fas fa-circle-question"></i> Sonuç bulunamadı</div>';
        return;
    }
    wrap.innerHTML = qsResultsCache.map((n, i) => {
        const title = esc(n.title || '(Başlıksız Not)');
        const group = esc(n.group || 'Genel');
        return '<div class="qs-item' + (i === 0 ? ' active' : '') + '" data-id="' + esc(String(n.id)) + '" data-idx="' + i + '">'
            + '<i class="fas fa-file-lines"></i><span class="qs-title">' + title + '</span>'
            + '<span class="qs-group">' + group + '</span></div>';
    }).join('');
    Array.prototype.forEach.call(wrap.querySelectorAll('.qs-item'), el => {
        el.addEventListener('click', () => qsOpenSelected(parseInt(el.getAttribute('data-idx'), 10)));
    });
}

function qsMoveSelection(delta) {
    if (!qsResultsCache.length) return;
    qsActiveIndex = (qsActiveIndex + delta + qsResultsCache.length) % qsResultsCache.length;
    const wrap = $('qs-results');
    Array.prototype.forEach.call(wrap.querySelectorAll('.qs-item'), (el, i) => {
        el.classList.toggle('active', i === qsActiveIndex);
    });
    const activeEl = wrap.querySelector('.qs-item.active');
    if (activeEl && activeEl.scrollIntoView) activeEl.scrollIntoView({ block: 'nearest' });
}

function qsOpenSelected(idx) {
    const n = qsResultsCache[idx !== undefined ? idx : qsActiveIndex];
    if (!n) return;
    closeQuickSwitcher();
    editNote(n.id);
}

function openQuickSwitcher() {
    const overlay = $('qs-overlay'), input = $('qs-input');
    if (!overlay || !input) return;
    overlay.classList.add('open');
    input.value = '';
    qsRenderResults('');
    setTimeout(() => input.focus(), 30);
}

function closeQuickSwitcher() {
    const overlay = $('qs-overlay');
    if (overlay) overlay.classList.remove('open');
    qsActiveIndex = -1;
    qsResultsCache = [];
}

(function initQuickSwitcher() {
    const overlay = $('qs-overlay'), input = $('qs-input'), badge = $('qs-discover-badge');
    if (!overlay || !input) return;

    overlay.addEventListener('mousedown', e => { if (e.target === overlay) closeQuickSwitcher(); });
    if (badge) badge.addEventListener('click', openQuickSwitcher);
    /* v1.10 güncelleme (4. tur): köşedeki x düğmesi paneli kapatır */
    const qsCloseBtn = $('qs-close-btn');
    if (qsCloseBtn) qsCloseBtn.addEventListener('click', e => { e.stopPropagation(); closeQuickSwitcher(); });

    input.addEventListener('input', e => qsRenderResults(e.target.value));
    input.addEventListener('keydown', e => {
        if (e.key === 'ArrowDown') { e.preventDefault(); qsMoveSelection(1); }
        else if (e.key === 'ArrowUp') { e.preventDefault(); qsMoveSelection(-1); }
        else if (e.key === 'Enter') { e.preventDefault(); qsOpenSelected(); }
        else if (e.key === 'Escape') { e.preventDefault(); closeQuickSwitcher(); }
    });
})();


/* v1.10 güncelleme (kullanıcı talebi, 2026-06-08): v1.9 "Versiyonlar/Yardım" tek seferlik
   seed enjeksiyonu kaldırıldı — html içinde statik not tutulmaması kuralı gereği. */


/* ══ SCROLL HIZLI GEZİNTİ ══ */
(function initScrollJump() {
    function setupJump(scrollEl, container) {
        if (!scrollEl || !container) return;

        const btnTop = document.createElement('button');
        btnTop.className = 'scroll-jump-btn sjb-top';
        btnTop.title = 'Başa Git';
        btnTop.innerHTML = '<i class="fas fa-chevron-up"></i>';
        btnTop.addEventListener('click', () => scrollEl.scrollTo({ top: 0, behavior: 'smooth' }));

        const btnBot = document.createElement('button');
        btnBot.className = 'scroll-jump-btn sjb-bot';
        btnBot.title = 'Sona Git';
        btnBot.innerHTML = '<i class="fas fa-chevron-down"></i>';
        btnBot.addEventListener('click', () => scrollEl.scrollTo({ top: scrollEl.scrollHeight, behavior: 'smooth' }));

        container.appendChild(btnTop);
        container.appendChild(btnBot);

        let lastTop = scrollEl.scrollTop;
        let hideTimer;

        function showBtn(btn) {
            clearTimeout(hideTimer);
            btn.classList.add('sjb-visible');
            hideTimer = setTimeout(() => {
                btnTop.classList.remove('sjb-visible');
                btnBot.classList.remove('sjb-visible');
            }, 2000);
        }

        scrollEl.addEventListener('scroll', () => {
            const cur = scrollEl.scrollTop;
            if (cur > lastTop + 2) showBtn(btnBot);
            else if (cur < lastTop - 2) showBtn(btnTop);
            lastTop = cur;
        }, { passive: true });
    }

    window._setupScrollJump = setupJump;
    // Editor
    setupJump(document.getElementById('content'), document.getElementById('editor-inner-wrap'));
})();

/* ══ TABLO POPUP ══ */
/* Tab ile hücre gezinmesi */

