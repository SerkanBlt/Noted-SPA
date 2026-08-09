/* Noted — Service Worker (çevrimdışı kabuk)
   SÜRÜM: uygulama sürümüyle birlikte artırılmalı, yoksa kullanıcı eski
   önbelleğe takılı kalır (cache-first strateji). */
const VERSION = 'v1.15.131';
const CACHE = 'noted-' + VERSION;

const ASSETS = [
    "./Noted.html",
    "./noted.css",
    "./manifest.json",
    "./js/01-core-storage-render.js",
    "./js/02-toolbar-panel-column.js",
    "./js/03-search-format-shortcuts.js",
    "./js/04-unsaved-templates-drawer.js",
    "./js/05-ai-chat-panel.js",
    "./js/06-bookmark-settings-ccb.js",
    "./js/07-link-graph-focus-timer.js",
    "./js/08-noted-grid-system.js",
    "./js/09-search-undo-bridge.js",
    "./js/context-menu.js",
    "./js/float-panel.js",
    "./js/help-modal.js",
    "./js/pwa-register.js",
    "./vendor/fontawesome.css",
    "./vendor/fonts.css",
    "./vendor/purify.min.js",
    "./vendor/fonts/fa-solid-900.woff2",
    "./vendor/fonts/roboto-300-latin-ext.woff2",
    "./vendor/fonts/roboto-300-latin.woff2",
    "./vendor/fonts/roboto-400-latin-ext.woff2",
    "./vendor/fonts/roboto-400-latin.woff2",
    "./vendor/fonts/roboto-700-latin-ext.woff2",
    "./vendor/fonts/roboto-700-latin.woff2",
    "./vendor/fonts/roboto-condensed-300-latin-ext.woff2",
    "./vendor/fonts/roboto-condensed-300-latin.woff2",
    "./vendor/fonts/roboto-condensed-400-latin-ext.woff2",
    "./vendor/fonts/roboto-condensed-400-latin.woff2",
    "./vendor/fonts/roboto-condensed-700-latin-ext.woff2",
    "./vendor/fonts/roboto-condensed-700-latin.woff2",
    "./icons/icon-192.png",
    "./icons/icon-512.png",
    "./icons/maskable-192.png",
    "./icons/maskable-512.png"
];

/* TUZAK: cache.add() yonlendirilmis (301/302) yaniti "redirected" bayragiyla
   saklar; tarayici boyle bir yaniti GEZINME istegi icin REDDEDER ve sayfa
   acilmaz. Dev sunucusu /Noted.html -> /Noted yonlendirmesi yaptigi icin bu
   gercekten yasandi. Cozum: yaniti yeniden insa edip bayragi dusur. */
async function _temizYanit(res) {
    return new Response(await res.blob(), {
        status: 200,
        statusText: 'OK',
        headers: res.headers,
    });
}

self.addEventListener('install', e => {
    e.waitUntil((async () => {
        const c = await caches.open(CACHE);
        /* Tek bir dosya 404 verirse addAll TAMAMEN basarisiz olur ve SW hic
           kurulmaz — bu yuzden tek tek, hatayi yutarak ekleniyor. */
        await Promise.all(ASSETS.map(async u => {
            try {
                const res = await fetch(new Request(u, { cache: 'reload', redirect: 'follow' }));
                if (!res.ok) throw new Error('HTTP ' + res.status);
                await c.put(u, await _temizYanit(res));
            } catch (err) {
                console.warn('[SW] onbellege alinamadi:', u, err.message);
            }
        }));
        self.skipWaiting();
    })());
});

self.addEventListener('activate', e => {
    e.waitUntil((async () => {
        const adlar = await caches.keys();
        await Promise.all(adlar.filter(a => a.startsWith('noted-') && a !== CACHE)
                               .map(a => caches.delete(a)));
        await self.clients.claim();
    })());
});

self.addEventListener('fetch', e => {
    const istek = e.request;
    /* Yalnizca kendi origin'imizdeki GET istekleri. AI saglayicilarina giden
       capraz-origin POST'lara ASLA dokunma — yoksa sohbet bozulur. */
    if (istek.method !== 'GET') return;
    let url;
    try { url = new URL(istek.url); } catch (_) { return; }
    if (url.origin !== self.location.origin) return;

    e.respondWith((async () => {
        const vurus = await caches.match(istek, { ignoreSearch: true });
        if (vurus) return vurus;
        try {
            const yanit = await fetch(istek);
            /* Basarili yanitlari sessizce onbellege ekle (calisma zamani) */
            if (yanit && yanit.ok && yanit.type === 'basic') {
                const c = await caches.open(CACHE);
                c.put(istek, yanit.clone());
            }
            return yanit;
        } catch (err) {
            /* Cevrimdisi + onbellekte yok: gezinme istegiyse uygulama kabugunu ver.
               Sunucu uzantisiz URL'e yonlendirebildigi icin (/Noted.html -> /Noted)
               gezinme adresi onbellek anahtariyla ayni olmayabilir. */
            if (istek.mode === 'navigate') {
                const kabuk = await caches.match('./Noted.html');
                if (kabuk) return kabuk;
            }
            throw err;
        }
    })());
});
