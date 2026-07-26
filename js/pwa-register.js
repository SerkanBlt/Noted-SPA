/* Service Worker kaydi — yalnizca http(s) altinda.
   file:// altinda navigator.serviceWorker TANIMSIZDIR; kosulsuz cagirmak
   "tek dosyayi indir, calistir" senaryosunu hataya dusurur. */
(function () {
    if (location.protocol !== 'http:' && location.protocol !== 'https:') return;
    if (!('serviceWorker' in navigator)) return;
    window.addEventListener('load', function () {
        navigator.serviceWorker.register('sw.js').catch(function (e) {
            console.warn('[Noted] Service worker kaydedilemedi:', e && e.message);
        });
    });
})();
