(function() {
    const overlay  = document.getElementById('help-overlay');
    const closeBtn = document.getElementById('hm-close-btn');
    const nav      = document.getElementById('hm-nav');
    const content  = document.getElementById('hm-content');

    window._openHelpOverlay = function() {
        overlay.classList.add('open');
        document.body.style.overflow = 'hidden';
    };
    function closeOverlay() {
        overlay.classList.remove('open');
        document.body.style.overflow = '';
    }
    window._closeHelpOverlay = closeOverlay;

    closeBtn.addEventListener('click', closeOverlay);
    overlay.addEventListener('click', function(e) { if (e.target === overlay) closeOverlay(); });
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && overlay.classList.contains('open')) closeOverlay();
    });

    window.hmNavTo = function(id) {
        const el = content.querySelector('#' + id);
        if (!el) return;
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        nav.querySelectorAll('.hm-nl').forEach(l => l.classList.remove('active'));
        const lnk = nav.querySelector('[data-target="' + id + '"]');
        if (lnk) lnk.classList.add('active');
    };

    // IntersectionObserver — root: content div, not window
    let _scrolling = false, _st = null;
    content.addEventListener('scroll', () => {
        _scrolling = true; clearTimeout(_st);
        _st = setTimeout(() => { _scrolling = false; }, 150);
    }, { passive: true });

    const observer = new IntersectionObserver((entries) => {
        if (_scrolling) return;
        let best = null, bestRatio = 0;
        entries.forEach(e => {
            if (e.intersectionRatio > bestRatio) { bestRatio = e.intersectionRatio; best = e.target; }
        });
        if (!best) return;
        nav.querySelectorAll('.hm-nl').forEach(l => l.classList.remove('active'));
        const lnk = nav.querySelector('[data-target="' + best.id + '"]');
        if (lnk) {
            lnk.classList.add('active');
            if (nav.scrollHeight > nav.clientHeight) {
                const lt = lnk.offsetTop, lb = lt + lnk.offsetHeight;
                if (lt < nav.scrollTop) nav.scrollTop = lt - 8;
                else if (lb > nav.scrollTop + nav.clientHeight) nav.scrollTop = lb - nav.clientHeight + 8;
            }
        }
    }, { root: content, rootMargin: '-10% 0px -60% 0px', threshold: [0, 0.1, 0.5, 1] });

    content.querySelectorAll('.hm-sec').forEach(s => observer.observe(s));
})();
