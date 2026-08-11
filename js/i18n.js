/* Noted — Çok dillilik (i18n) motoru (v1.17+)
   Bağımsız IIFE — yalnızca window.* üzerinden konuşur (bkz. CLAUDE.md).
   Lang.json'u yükler, data-i18n* attribute'lerini DOM'a uygular, dil dropdown'unu kurar. */
(function () {
    'use strict';

    var STORAGE_KEY = 'noted_lang';
    var DEFAULT_LANG = 'en';
    var SUPPORTED = ['en', 'de', 'it', 'fr', 'tr'];

    var _dict = null;      /* { en:{...}, de:{...}, it:{...}, fr:{...}, tr:{...} } */
    var _current = DEFAULT_LANG;

    function _getStoredLang() {
        try {
            var v = localStorage.getItem(STORAGE_KEY);
            if (v && SUPPORTED.indexOf(v) !== -1) return v;
        } catch (e) { /* localStorage kapalı olabilir (gizli sekme vb.) */ }
        return null;
    }

    function _setStoredLang(lang) {
        try { localStorage.setItem(STORAGE_KEY, lang); } catch (e) {}
    }

    async function _loadDict() {
        if (_dict) return _dict;
        var res = await fetch('./Lang.json', { cache: 'no-cache' });
        if (!res.ok) throw new Error('Lang.json yuklenemedi: HTTP ' + res.status);
        _dict = await res.json();
        return _dict;
    }

    function _lookup(map, fallback, key) {
        if (map && map[key] != null) return map[key];
        if (fallback && fallback[key] != null) return fallback[key];
        return null;
    }

    function applyLanguage(lang) {
        if (!_dict) return;
        if (SUPPORTED.indexOf(lang) === -1) lang = DEFAULT_LANG;
        var map = _dict[lang] || {};
        var fallback = _dict[DEFAULT_LANG] || {};

        document.querySelectorAll('[data-i18n]').forEach(function (el) {
            var val = _lookup(map, fallback, el.getAttribute('data-i18n'));
            if (val != null) el.innerHTML = val;
        });
        document.querySelectorAll('[data-i18n-title]').forEach(function (el) {
            var val = _lookup(map, fallback, el.getAttribute('data-i18n-title'));
            if (val != null) el.setAttribute('title', val);
        });
        document.querySelectorAll('[data-i18n-placeholder]').forEach(function (el) {
            var val = _lookup(map, fallback, el.getAttribute('data-i18n-placeholder'));
            if (val != null) el.setAttribute('placeholder', val);
        });
        document.querySelectorAll('[data-i18n-tip]').forEach(function (el) {
            var val = _lookup(map, fallback, el.getAttribute('data-i18n-tip'));
            if (val != null) el.setAttribute('data-tip', val);
        });
        document.querySelectorAll('[data-i18n-dp]').forEach(function (el) {
            var val = _lookup(map, fallback, el.getAttribute('data-i18n-dp'));
            if (val != null) el.setAttribute('data-placeholder', val);
        });
        document.querySelectorAll('[data-i18n-aria]').forEach(function (el) {
            var val = _lookup(map, fallback, el.getAttribute('data-i18n-aria'));
            if (val != null) el.setAttribute('aria-label', val);
        });

        document.querySelectorAll('.lang-item').forEach(function (el) {
            el.classList.toggle('active', el.getAttribute('data-lang') === lang);
        });

        document.documentElement.setAttribute('lang', lang);
        _current = lang;
        _setStoredLang(lang);
        window._notedLang = lang;
        /* Not kartlarındaki tarih/saat metinleri data-i18n değil, render() içinde
           _notedLocale() ile JS'de üretiliyor — dil değişince güncel kalsınlar diye
           yeniden render tetikleniyor (bkz. Comments.json trap-notedlocale-...). */
        if (typeof window.render === 'function') { try { window.render(); } catch (e) {} }
        try { window.dispatchEvent(new CustomEvent('noted:langchange', { detail: { lang: lang } })); } catch (e) {}
    }

    function currentLang() { return _current; }

    var LOCALE_MAP = { en: 'en-US', de: 'de-DE', it: 'it-IT', fr: 'fr-FR', tr: 'tr-TR' };
    /* toLocaleDateString/toLocaleTimeString/toLocaleString/recognition.lang cagrilarinin
       tumunun kullandigi tek nokta — 26 ayri dosyada tek tek hardcoded 'tr-TR' yerine. */
    function localeTag() { return LOCALE_MAP[_current] || LOCALE_MAP[DEFAULT_LANG]; }
    window._notedLocale = localeTag;

    /* Dinamik JS metinleri (alert/confirm/_showSnack, JS-inşa dropdown'lar vb.) icin. */
    function t(key) {
        if (!_dict) return key;
        var map = _dict[_current] || {};
        var fallback = _dict[DEFAULT_LANG] || {};
        var v = _lookup(map, fallback, key);
        return v != null ? v : key;
    }

    function _wireDropdown() {
        var btn = document.getElementById('lang-btn');
        var dropdown = document.getElementById('lang-dropdown');
        if (!btn || !dropdown) return;

        btn.addEventListener('click', function (e) {
            e.stopPropagation();
            dropdown.classList.toggle('open');
        });
        document.addEventListener('click', function (e) {
            if (!dropdown.classList.contains('open')) return;
            if (btn.contains(e.target) || dropdown.contains(e.target)) return;
            dropdown.classList.remove('open');
        });
        dropdown.querySelectorAll('.lang-item').forEach(function (item) {
            item.addEventListener('click', function () {
                applyLanguage(item.getAttribute('data-lang'));
                dropdown.classList.remove('open');
            });
        });
    }

    async function _init() {
        try {
            await _loadDict();
        } catch (err) {
            console.warn('[i18n] Lang.json yuklenemedi, arayuz varsayilan (HTML icindeki) dilde kalacak:', err.message);
            return;
        }
        applyLanguage(_getStoredLang() || DEFAULT_LANG);
        _wireDropdown();
    }

    window.NotedI18n = { applyLanguage: applyLanguage, currentLang: currentLang, t: t, locale: localeTag };
    _init();
})();
