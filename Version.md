# Noted — Sürüm Geçmişi

---

## v1.15.121
**Fix — CCB (Customized Code Block) not kaydedilince siliniyordu**
- **Kök neden:** CCB, bir nota `<iframe srcdoc="..." sandbox="allow-scripts allow-forms allow-modals">` olarak eklenir. `saveNote()` içindeki `sanitize()` (DOMPurify) çağrısının `ALLOWED_ATTR` listesinde `srcdoc` ve `sandbox` YOKTU — bu iki nitelik kayıt sırasında sessizce siliniyordu. Not yeniden açıldığında iframe içerik olmadan (boş) render oluyordu; `inflateCcbBlocks()` yalnızca iframe'in VARLIĞINI kontrol ettiğinden ("zaten inflate edilmiş" varsayıp) yeniden doldurmuyordu. Kullanıcı bunu "CCB'ler kaydedilmiyor" olarak yaşıyordu — CCB **tanımı** (localStorage, Ayarlar > Geliştirici) doğru kaydediliyordu, sorun yalnızca bir **nota eklenmiş CCB örneğinin** kayıt sonrası bozulmasıydı
- **Düzeltme:** `srcdoc` ve `sandbox`, `sanitize()`'ın `ALLOWED_ATTR` listesine eklendi (`js/01-core-storage-render.js`). `sandbox` niteliğinin de allowlist'te olması güvenlik açısından önemli — o olmadan iframe'in kısıtlama seti kaybolabilirdi
- Bu proje ailesindeki bilinen "sanitize() sessiz veri kaybı" tuzaklarından biri daha (bkz. `trap-forecolor-produces-font-tag`); yeni girdi `trap-sanitize-strips-iframe-srcdoc-sandbox` olarak `Comments.json`'a eklendi
- Doğrulama: gerçek UI akışıyla (Ayarlar > Geliştirici > Yeni CCB formu → nota ekle → kaydet → kapat → yeniden aç) `srcdoc`/`sandbox` kayıttan sonra korunduğu, iframe'in gerçekten render olup script'inin çalıştığı ekran görüntüsüyle doğrulandı; RKL-10 (renk uygulama, aynı `sanitize()` yolunu kullanır) regresyon olmadığı için tekrar test edildi; konsolda sıfır hata

---

## v1.15.120
**Modülerleşme Faz 6 — Inline Yorumları Comments.json'a Taşıma (REFACTOR_PLAN.md TAMAMLANDI)**
- REFACTOR_PLAN.md'nin son fazı: kod içindeki çok satırlı açıklama yorumları (tuzak/gerekçe/tarihçe) tek kaynağa (`Comments.json`) taşındı, koddan silindi. Bölüm başlıkları (`══`/`===`/`───`), tek satırlık mekanik notlar ve JSDoc-stili API dokümantasyonu (`createGrid` parametreleri) yerinde bırakıldı
- **38 yeni girdi** eklendi (7 → 45), 12 dosyaya yayılmış (`js/01`…`js/09`, `context-menu.js`, `float-panel.js`, `noted.css`) — kapsam: wikilink otomatik tamamlama/önizleme, toolbar undo kilidi, renk/yazı tipi seçici tuzakları, grid resize/hizalama tuzakları, computed-style tuzakları (backgroundColor/textDecoration), CCB otomatik kayıt tetikleyicisi, alt-menü hover durum makinesi, panel mobil layout, resize çizgisi specificity savaşı
- **5 tekrarlayan yorum bulundu ve silindi** (yeni girdi açılmadı): bunlar zaten mevcut 7 kritik trap'in (`trap-normalizehtml-empty-block-removal`, `trap-savedtoolbarsel-debounce-race`, `trap-forecolor-produces-font-tag`, `trap-restoregrids-dom-shape-assumption`, `trap-grid-card-visual-lives-on-ng-v-wrap`, `trap-orphan-selector-list-id-specificity`) orijinal kaynak metniydi — bu silme sırasında `trap-grid-card-visual-lives-on-ng-v-wrap`'in anchor'ı (yorum metnine işaret ediyordu) kırıldı, kod satırına (`border: none; padding: 0;`) güncellendi
- **Yan bulgu — gerçek bug:** `noted.css`'te `.stb::after { display:none; } /* tooltip JS ile yönetiliyor *` satırının kapanış `*/`'si eksikti (tek `*` ile bitiyordu). Bu, sonraki yorumu da (`/* Sürükleme tutamacı */`) aynı yorum bloğuna yutuyordu — kod kaybı yoktu (yutulan aralıkta sadece yorum vardı) ama düzeltildi
- Düşük değerli/salt tarihsel notlar (ör. "v1.10 güncelleme: X artık Y de kapsıyor" gibi sadece "ne değişti" diyen, "neden" içermeyen notlar) **silindi**, taşınmadı — Comments.json'ı gürültüyle şişirmemek için
- Doğrulama: `node tools/comments-check.js` temiz (45 girdi, 12 dosya); `git diff -U0 | grep '^[+-]' | grep -v '^[+-][+-]' | grep -vE '^[+-]\s*(/\*|\*|//)'` çalıştırıldı — kalan tüm satırlar çok-satırlı yorumların (bu kod tabanında devam satırları `*` ile başlamıyor) gövde metni veya tek bilinçli bug-fix satırıydı, gerçek kod satırı **sıfır** değişti; RKL-1…RKL-15 tekrar çalıştırıldı (panel kart boşluğu/radius, resize handle konumu `right:5px`, resize çizgisi her zaman transparan, son-satır-only radius, mobil flex-column geçişi, toolbar aç/kapat, markdown kısayolu, ham tablo yapıştırma) — tümü Comments.json'a taşınan açıklamalarla birebir eşleşti; konsolda sıfır hata

---

## v1.15.119
**Modülerleşme Faz 4 Kapanış Temizliği — Global Konsolidasyonu TAMAMLANDI**
- v1.15.118'de Faz 4'ün planla adı geçen 5 kümesi bitmişti ama global-satır sayısı hâlâ 23'tü (hedef ≤15) — kalan 18 satır plana dahil edilmemiş özellik-yerel/geçiş durumu değişkenlerdi: wikilink otomatik tamamlama (`wlAcActive` vb. 5), wikilink önizleme (`_wlPreviewShowT` vb. 3), dış panel (`_extPanelTimer`/`_extPanelZ`/`_extPanelMap`), toolbar sürükleme (`toolbarHideTimer` vb. 3), arama DOM referansları (`searchInput`/`searchClear`/`renderDebounced`), slash menü (`slashMenuOpen` vb. 4), CCB/AI/bookmark bayrakları (`_aiInserting`, `_bmMousedownInGutter`), grid hizalama popup'ı (`_ngAlignPopup`/`_ngAlignTable`), `_idSeed`, `activeInstance`
- Bunların tamamı `EditorState` (çoğu) veya `DOM` (arama referansları) nesnesine, aynı grep-doğrulanmış dot-notation rename tekniğiyle taşındı. `_themeSaved` (yalnızca bir sonraki satırda kullanılan tek kullanımlık boot değeri) namespace'e taşınmak yerine tamamen elendi — bir IIFE içine gömülerek top-level bildirim ihtiyacı ortadan kaldırıldı
- **`EditorState` nesnesinin tanımı `js/02`'den `js/01`'e taşındı:** bu temizlikte `js/01`'deki wikilink/ext-panel durumu da `EditorState`'e eklendiği için, nesnenin `js/02` yüklenmeden önce (yani `js/01`'in kendisinde) var olması gerekiyordu — aksi hâlde `js/01` çalışırken "EditorState is not defined" hatası verirdi. Bu, script yükleme sırasına bağımlı ince bir hataydı; ilk denemede atlanıp `node --check` + kapsamlı grep taramasıyla yakalandı
- **Süreç içinde iki tekrarlayan hata bulundu ve düzeltildi:** (1) çoklu-değişken bildirim satırlarını elle bölerken bazı dosyalarda değişkenin SADECE bildirim satırı düzeltilip diğer ~15-30 kullanım yeri unutuldu — kapsamlı `grep` taraması bunu commit'ten önce yakaladı, ikinci bir codemod geçişiyle düzeltildi; (2) `searchInput`/`searchClear` için de aynı hata (bildirim düzeltildi, kullanım yerleri unutuldu) — aynı yöntemle yakalanıp düzeltildi
- Ölçüm: top-level global-satır sayısı **23 → 5** — kalan 5 satırın tamamı kalıcı: `$` yardımcı fonksiyonu + `Const`/`DOM`/`State`/`EditorState` nesnelerinin kendisi (bunlar konsolidasyonun HEDEFİ, daha fazla azaltılamaz). **Faz 4 çıkış koşulu (≤15) karşılandı: 105 → 5**
- Doğrulama: `node --check` 12 dosyada temiz; global scope sızıntısı yok; wikilink otomatik tamamlama (`[[` yazınca panel açılıyor), yazı tipi boyutu artırma, slash menü açılışı, tablo hücre hizalama popup'ı, arama debounce, bookmark gutter mousedown algılama — hepsi ayrı ayrı test edildi; RKL-1, RKL-9, RKL-12, RKL-13 tekrar doğrulandı; konsolda sıfır hata
- `Comments.json`: `trap-normalizehtml-empty-block-removal` satır numarası (`--fix` ile) tazelendi, anchor değişmedi

---

## v1.15.118
**Modülerleşme Faz 4e — Global Konsolidasyonu: Editör Oturum Durumu (en hassas küme)**
- Faz 4'ün planın açıkça "en son taşınsın" dediği son alt-fazı: `_activeEditTarget`, `_savedToolbarSel`, `_selChangePending`, `_editorLocked` (`js/02`) ve `_snapTitle`, `_editActive`, `_contentDirty` (`js/03`) — bu iki değişken (`_activeEditTarget`/`_savedToolbarSel`) v1.15.109'da bir yarış durumu (race condition) bug'ına yol açmıştı (bkz. `Comments.json` → `trap-savedtoolbarsel-debounce-race`), bu yüzden plan bunları en sona bırakmayı ve sonrasında RKL-11'i özellikle tekrar koşmayı şart koşuyor
- `js/02` başında tek bir `const EditorState = {}` tanımlandı (dosya yükleme sırasında `js/01`'den sonra ilk kez ihtiyaç duyulduğu yer); ~123 kullanım yeri (5 dosya) codemod ile güncellendi
- **RKL-11 özel olarak, tam da tarihi hatayı tetikleyen senaryoyla test edildi:** panel içinde bir `<li>` öğesine metin seçilip `EditorState._savedToolbarSel` bilinçli olarak `null`'a set edilerek (debounce henüz çalışmamış gibi) toolbar'ın gerçek `mousedown`→`change` event zinciri tetiklendi — hem yazı tipi ailesi hem boyutu **ilk denemede** uygulandı, `_saveToolbarSel()`'in senkron tazelemesi doğru çalışıyor
- Ölçüm: top-level global-satır sayısı **27 → 23** (başlangıçtan beri 105 → 23)
- Doğrulama: `node --check` temiz; global scope sızıntısı yok; RKL-9 (kaydet→kapat→aç), RKL-11 (font ailesi/boyutu ilk denemede, yarış senaryosuyla), RKL-12 (markdown kısayolu), RKL-13 (mobil) doğrulandı; konsolda sıfır hata
- `Comments.json`: `trap-savedtoolbarsel-debounce-race` satır numarası (`--fix` ile) tazelendi, anchor değişmedi
- **Not:** Faz 4'ün "≤15" çıkış koşuluna henüz ulaşılmadı (23 kaldı) — geri kalanlar (`wlAc*`, `_extPanel*`, `_thcRefreshUI`, `toolbarHideTimer` grubu, `slashMenu*` grubu, `_ngAlignPopup/_ngAlignTable`, `_idSeed`, `activeInstance`, `_themeSaved` vb.) planın 5 kümesine bilinçli olarak dahil edilmemişti; bunlar ayrı bir temizlik alt-adımında ele alınacak

---

## v1.15.117
**Modülerleşme Faz 4d — Global Konsolidasyonu: Uygulama Durumu**
- Faz 4'ün dördüncü ve en büyük alt-fazı: 22 uygulama-durumu değişkeni (`notes`, `openGroups`, `expandedNotes`, `searchQuery`, `filterGroup`, `filterTag`, `themeMode`, `isDark`, `editorGroup`, `editorColorLabel`, `editorPinned`, `editorReminders`, `editorReminderNote`, `tocOpen`, `activePickerId`, `deleteTargetId`, `deletePermanent`, `pendingNoteId`, `sortOrder`, `listView`, `customTemplates`, `focusModeActive`) tek bir `const State = {}` nesnesine taşındı — hepsi `let`/`var` (Sabitler/DOM cache'in aksine sürekli yeniden atanıyor), bu yüzden destructuring köprüsü değil gerçek `State.notes` dot-notation'ı kullanıldı
- **~284 kullanım yeri** (`notes` tek başına 89) bir Node.js codemod ile değiştirildi. **Tek satırda çoklu değişken tanımlayan 4 satır** (`let notes = ...; let openGroups = ...;` gibi) codemod'un basit "satır başı let/const" deseniyle doğru işlenemeyeceği için **elle** ayrı `State.x = ...;` ifadelerine bölündü — aksi halde 2., 3., 4. değişken `let State.x = ...` gibi geçersiz sözdizimine dönüşürdü
- **İkinci bir gölgeleme tuzağı bulundu:** `listView` hem global durum değişkeni hem de config şemasının KENDİ anahtar adı (`getUiCfg().listView`, `patchUiCfg({listView: value})`, ve config varsayılanları migrasyonundaki `listView: _ls(...)` satırı) olarak kullanılıyordu. Bu üç yer codemod'dan placeholder ile korundu; yine de biri (varsayılan migrasyon satırı, çok-boşluklu hizalama yüzünden ilk taramada gözden kaçtı) `State.listView   : ...` olarak bozulup `node --check` tarafından yakalandı ve elle düzeltildi
- Ölçüm: top-level global-satır sayısı **36 → 27** (başlangıçtan beri 105 → 27)
- Doğrulama: `node --check` 12 dosyada temiz; global scope sızıntısı yok (`typeof notes/themeMode === 'undefined'`); not kaydet (pin/renk-etiketi/grup dahil) → kapat → yeniden aç, arama, tema (dark/light `--bg` farkı), markdown kısayolu, mobilde tam genişlik + odakta görünen toolbar hepsi doğrulandı; konsolda sıfır hata
- `Comments.json`: `trap-normalizehtml-empty-block-removal` satır numarası (`--fix` ile) tazelendi, anchor değişmedi

---

## v1.15.116
**Modülerleşme Faz 4c — Global Konsolidasyonu: Özellik-Yerel Durum**
- Faz 4'ün üçüncü alt-fazı: plan "kendi dosyasında IIFE'ye kapat" diyor — bu, önceki iki alt-fazdaki (Sabitler/DOM cache) namespace-nesnesi tekniğinden farklı, gerçek scope kapsülleme gerektiriyordu
- **`js/07-link-graph-focus-timer.js` tamamen tek bir IIFE'ye alındı** (11 değişken: `graphZoom`, `isDraggingSphere`, `isHoveringNode`, `graphHoveredNodeId`, `graphRafId`, `nodeData`, `focusTimerState`, `_focusTimerInterval`, `typewriterActive`, `qsActiveIndex`, `qsResultsCache`) — bu dosyanın TÜM state'i ve 37 fonksiyonu yalnızca bu dosya içinde kullanılıyor (önce grep ile doğrulandı). Dışarıdan (js/03, js/06) çağrılan 6 fonksiyon (`openLinkGraph`, `closeLinkGraph`, `toggleTypewriterMode`, `recordActivityToday`, `openQuickSwitcher`, `closeQuickSwitcher`) dosya sonunda `window.*` ile açıldı — çağıran taraflarda hiçbir değişiklik gerekmedi (bare global çağrı zaten `window` nesnesine düşer)
- **`js/03-search-format-shortcuts.js`'te "arama ipucu" bloğu** (`_searchOpHideT` + `positionSearchOpHint`) kendi küçük IIFE'sine kapatıldı — yalnızca 4 event listener içinde kullanılıyor, dış bağımlılığı yok
- **Bilinçli olarak ATLANDI:** `js/02`'deki toolbar-sürükleme durumu (`toolbarHideTimer`, `toolbarDragged`, `_fsizeApplying`) ve `js/08`'deki hizalama popup durumu (`_ngAlignPopup`, `_ngAlignTable`) — bu değişkenlerin kullanım yerleri dosya genelinde diğer (ilgisiz) kodla iç içe geçmiş durumda, temiz bir IIFE sınırı yok. Bunları sarmalamak kod taşımayı (restructure) gerektirirdi, salt "kapsülleme" değil — en kırılgan dosyalarda (özellikle js/08, Noted Grid Sistemi) bu riski almamayı tercih ettim
- Girinti: IIFE'ye alınan gövdeler 4 boşlukla yeniden girintilendi (plan'ın ölçüm komutu `^(let|const|var)` sütun-0 eşleşmesi kullandığı için gerçek kapsülleme ancak girintiyle ölçüme yansıyor)
- Ölçüm: top-level global-satır sayısı **48 → 36** (başlangıçtan beri 105 → 36)
- Doğrulama: `node --check` 12 dosyada temiz; global scope sızıntısı yok (`typeof graphZoom === 'undefined'`, `typeof _searchOpHideT === 'undefined'` pencerede), bağlantı haritası aç/kapat, daktilo modu, hızlı geçiş aç/kapat, aktivite kaydı, arama ipucu hover — hepsi çalışıyor; RKL-9/RKL-12 (kaydet/kapat/yeniden aç, markdown kısayolu) tekrar doğrulandı; konsolda sıfır hata
- `Comments.json`: `trap-forecolor-produces-font-tag` satır numarası (`--fix` ile) tazelendi, anchor değişmedi

---

## v1.15.115
**Modülerleşme Faz 4b — Global Konsolidasyonu: DOM Cache Kümesi**
- Faz 4'ün ikinci alt-fazı: 38 adet `$xxx` DOM referansı (`$title`, `$content`, `$editor`, `$toolbar`, `$slashMenu`, `$reminderPopup` vb. — `$content` hariç hepsi `const`, `$content` ise editör-instance değiştirme akışında yeniden atanan `let`) `js/01-core-storage-render.js` başındaki tek bir `const DOM = {}` nesnesine taşındı
- Kapsam ve hacim nedeniyle (toplam ~500 kullanım yeri, `$content` tek başına 170) elle değil, doğrulanabilir bir **Node.js codemod** ile yapıldı: her değişken için önce bildirim satırı (`^(const|let)\s+\$AD` → `DOM.$AD`), sonra `(?<!DOM\.)\$AD\b` negatif-lookbehind'li global regex ile kalan tüm kullanımlar değiştirildi — böylece codemod'un kendi ürettiği `DOM.$AD` metni ikinci kez eşleşip `DOM.DOM.$AD`'ye dönüşmedi
- **Bir gölgeleme (shadowing) tuzağı bulundu ve bilinçli olarak atlandı:** `js/context-menu.js` kendi yerel (IIFE scope'lu) `const $content = document.getElementById('content')`'ini tanımlıyor — global `$content` ile aynı isim ama kasıtlı olarak ayrı, üstelik global `$content` aktif editör instance'ına göre değişebilen (`let`) bir referans. Bu dosya codemod'dan hariç tutuldu; global'e bağlanması `#content`'in her zaman doğru elemanı göstermesi garantisini bozardı
- Ölçüm: top-level global-satır sayısı **85 → 48** (Faz 4 başlangıcından beri 105 → 48)
- Doğrulama: `node --check` 12 dosyada temiz; RKL-1, RKL-2/3, RKL-9, RKL-12, RKL-13 gerçek DOM ölçümleriyle doğrulandı — panel kart boşluğu/radius, odak/blur accent geçişi, kaydet→kapat→yeniden aç sonrası 6 toolbar butonu + 6 hücre + 4 resize handle + doğru `$editId`, `* ` → madde listesi, slash menü açılışı (`$slashMenu`), mobilde tam genişlik + odakta görünen toolbar; konsolda sıfır hata
- `Comments.json`: `trap-normalizehtml-empty-block-removal` satır numarası (`--fix` ile) tazelendi, anchor değişmedi

---

## v1.15.114
**Modülerleşme Faz 4a — Global Konsolidasyonu: Sabitler Kümesi**
- 105 top-level `let/const/var`'ı birkaç namespace nesnesine toplama işinin (Faz 4) ilk alt-fazı: en düşük riskli küme olan **Sabitler** (23 adet — `PALETTE`, `COLOR_LABELS`, `TEMPLATES_V2`, `SLASH_COMMAND_GROUPS`, `SLASH_COMMANDS`, `SLASH_INLINE_MAP`, `MD_INLINE_TRIGGERS`, `_SHAPES`, `_SHAPE_PATHS`, `WIKILINK_RE`, `SEARCH_OP_RE`, `_THC_*`, `_themeIcons`, `GRAPH_ZOOM_*`, `FOCUS_TIMER_KEY`, `ACTIVITY_LOG_KEY`, `TRASH_GROUP`, `COLOR_LABEL_ALIASES`, `VIEW_ITEMS`) tek bir `const Const = {}` nesnesine (`js/01-core-storage-render.js` başında) taşındı
- Kullanım yerleri **gerçekten** `Const.PALETTE` biçimine döndürüldü (bare isimleri yeniden `let`/`const` ile açan bir "köprü" hilesi kullanılmadı) — 9 dosyada (`js/01` … `js/08`, `js/float-panel.js`) toplam ~55 kullanım yeri `grep -n '\bDEĞİŞKEN\b'` ile tek tek bulunup güncellendi
- **`Object.freeze` bilinçli olarak uygulanmadı:** inceleme sırasında `SLASH_COMMAND_GROUPS`'un CCB (Kod Dışı Komut Bloğu) özelliği tarafından çalışma zamanında `.push()`/`.splice()` ile değiştirildiği tespit edildi — dondurma bu akışı sessizce bozardı. Planın "Object.freeze" önerisi, projenin "sıfır davranış değişikliği" kuralıyla çatıştığı için atlandı
- `js/float-panel.js`'deki `typeof TEMPLATES_V2 !== 'undefined'` / `typeof _SHAPES !== 'undefined'` savunma kontrolleri `Const.TEMPLATES_V2` / `Const._SHAPES` üzerinden eşdeğer şekilde yeniden kuruldu
- Ölçüm: top-level global-satır sayısı `grep -chE '^(let|const|var) ' js/*.js` ile **105 → 85**
- Doğrulama: `node --check` tüm 12 dosyada temiz; tarayıcıda RKL-1, RKL-2/3, RKL-9, RKL-12, RKL-13 gerçek DOM ölçümleriyle (`getBoundingClientRect`/`getComputedStyle`) doğrulandı — panel kart boşluğu 10px, odak/blur accent geçişi, kapat→yeniden aç sonrası 6 toolbar butonu + 6 düzenlenebilir hücre + 4 resize handle korunuyor, `* ` → madde listesi dönüşümü çalışıyor, mobilde tam genişlik eşit kartlar + odakta görünen toolbar; tema geçişinde `--bg`/`--accent` CSS değişkenleri `Const._THC_DEFS`'ten doğru okunuyor; konsolda sıfır hata
- `Comments.json`: `trap-normalizehtml-empty-block-removal` girdisinin satır numarası (`--fix` ile) tazelendi, anchor değişmedi

---

## v1.15.113
**Modülerleşme Faz 3 — JS 12 Dosyaya Bölündü**
- 10.701 satırlık ana `<script>` bloğu, yalnızca üst düzey `══` bölüm sınırlarında kesilerek 9 dosyaya ayrıldı: `01-core-storage-render.js` … `09-search-undo-bridge.js` (her biri ≤1.636 satır, ortalama ~1.189). Zaten IIFE olan 3 blok (`help-modal.js`, `float-panel.js`, `context-menu.js`) da kendi konumlarında ayrıldı — toplam 12 dosya
- **`<script type="module">` KULLANILMADI** — hepsi klasik `<script src>`, global scope'u aynen paylaşıyor, `file://` altında çalışıyor. `Noted.html` 13.875 → 1.389 satıra düştü (yalnızca markup + script/link etiketleri)
- **İlk kesim denemesi 4 dosyada syntax hatasına yol açtı** (kesim noktaları çok satırlı `/* ═══...═══ */` yorum bloklarının ortasına denk gelmişti — biri de bir `forEach` callback'inin ortasındaydı). Tüm 80 bölüm işaretinin **kesin** satır numaraları referans dosyadan tek tek çıkarılıp doğrulanarak yeniden kesildi; bu kez her dosya `node --check` ile tek tek syntax doğrulamasından geçirildi, sonra birleştirilmiş içerik `diff` ile orijinal blokla **byte-identical** karşılaştırıldı
- `Comments.json`'daki 4 JS girdisinin `file` alanı ilgili yeni dosyalara güncellendi (`normalizeHtml`→01, `_restoreToolbarSel`→02, `applyColor`→03, `_restoreGrids`→08-noted-grid-system.js — bu oturumda en çok düzeltilen grid sistemi kodu tek parça korundu)
- Doğrulama: `createGrid`/`saveNote`/`_setPanelColumnActive`/`_restoreGrids` fonksiyon olarak tanımlı, `window._fpWlDetect`/`window._openHelpOverlay` köprüleri çalışıyor, RKL-1…RKL-15 baseline ile birebir eşleşti, konsolda sıfır hata; `file://` altında gerçek bir Chrome penceresinde görsel olarak da doğrulandı

---

## v1.15.112
**Modülerleşme Faz 2 — CSS `noted.css`'e Ayrıldı**
- 4.643 satırlık `<style>` bloğu (%25'lik kesim) `Noted.html`'den birebir çıkarılıp `noted.css`'e taşındı; `Noted.html` 18.519 → 13.875 satıra düştü
- `<link rel="stylesheet" href="noted.css">` DOMPurify script'inden hemen sonra, `</head>`'den önce eklendi — kaldırılan `<style>` ile aynı konumda
- **`file://` doğrulaması yapıldı:** gerçek bir Chrome penceresinde (`file:///.../Noted.html`) sayfa açılıp ekran görüntüsüyle doğrulandı — koyu tema, kenarlıklar, tipografi, ikonlar sorunsuz render oluyor. `<script type="module">`'ün aksine `<link rel="stylesheet">` `file://` altında CORS kısıtlamasına takılmıyor
- `Comments.json`'daki 3 CSS girdisinin (`trap-orphan-selector-list-id-specificity`, `trap-grid-card-visual-lives-on-ng-v-wrap`, `trap-ng-toolbar-clipped-by-overflow`) `file` alanı `noted.css`'e güncellendi
- Doğrulama: RKL-1…RKL-15 baseline ile birebir eşleşti, `noted.css` 200 OK ile yükleniyor, konsolda sıfır hata

---

## v1.15.111
**Modülerleşme Faz 1 — Yetim CSS Selektörünün Kökten Temizlenmesi**
- `#content table, .col-panel-content table, ...` listesi sonu virgülle bitip araya yalnızca yorum girdiği için tarayıcı bunu `.noted-grid` kuralıyla **tek kural** olarak ayrıştırıyordu. Sonuç: `#content table td` (ID → specificity 1,0,2) grid hücrelerine `margin:0`/`border-collapse:collapse` dayatıp class tabanlı grid kurallarını eziyordu — panel `border-collapse` (v1.15.103), panel mobil `margin` (v1.15.110), kolon mobil `margin` (v1.15.110) bug'larının **ortak kök nedeni** buydu
- Selektörler `:not(.noted-grid)` ile grid tablolarından tamamen ayrıldı; ID specificity artık zararsız. Yapıştırılan ham tablolar için eski (kazara) davranış birebir korundu
- Kökü yenmek için eklenen 5 adet `#content .noted-grid...` özel-durum satırı (panel ana kural, panel/kolon mobil margin + last-child) artık gereksiz olduğu için kaldırıldı — bunların kaldırılabilmesi kök nedenin gerçekten gittiğinin kanıtı
- `REFACTOR_PLAN.md` Faz 1 uygulandı; `Comments.json`'daki `trap-orphan-selector-list-id-specificity` girdisi düzeltilmiş duruma güncellendi (tip: `history`, uyarı olarak kalıcı)
- Doğrulama: RKL-1…RKL-15 baseline ile birebir eşleşti (panel/tablo/kolon/mobil/ham-tablo-yapıştırma), konsolda sıfır hata

---

## v1.15.110
**Markdown Satır-Başı Kısayolları + Mobil Grid Düzeltmeleri**
- **Markdown kısayolları:** Satır başında karakter + boşluk yazınca otomatik dönüşüm — `* ` / `- ` madde listesi, `[] ` görev listesi, `|| ` tablo (`/t` ile aynı). Ek olarak mantıklı görülen kısayollar da eklendi: `# `/`## `/`### ` başlık, `> ` alıntı, `1. ` sıralı liste. Mevcut `/xxx ` sistemiyle aynı alt yapıyı (`applySlashCommand`) kullanıyor; liste öğesi içindeyken tekrar tetiklenmiyor (yanlışlıkla listeyi kaldırmasın diye)
- **Mobil — Panel/Kolon layout düzeltildi:** `.ng-v-wrap`'in masaüstü boşluk hilesi (`width:calc(100%-10px)+margin-right:10px`) mobilde de sızıyordu, kartlar tam genişlik olmuyordu. Ayrıca `#content table td` (eski ID selektör) `margin:0` vererek yeni margin-bottom tabanlı boşluk kuralını eziyordu (bkz. v1.15.103/105 ile aynı kök neden ailesi) — `#content` ile specificity artırılarak düzeltildi. Artık Panel kartları ve Kolon blokları mobilde tam genişlik, eşit ve aralarında gerçek boşlukla diziliyor
- **Mobil — Tablo/Panel/Kolon toolbar'ları görünmüyordu:** `.ng-wrap { overflow-x: auto }` kuralı, CSS gereği `overflow-y`'yi de zorla `auto`ya çeviriyor, bu da üstte `position:absolute` + negatif `top` ile duran `.ng-toolbar`'ı kırpıyordu. Yatay scroll ihtiyacı yalnızca Tablo tipinde olduğundan `overflow-x:auto` doğrudan `.noted-grid.grid-table`'a taşındı, `.ng-wrap` serbest bırakıldı

---

## v1.15.109
**Grid — Zengin Metin Biçimlendirme: 2 Kök Neden Düzeltildi**
- **Yarış durumu (race condition):** `_savedToolbarSel` yalnızca debounce'lu (RAF/`setTimeout`) `selectionchange` ile güncelleniyordu; bir grid hücresinde metin seçilip hemen ardından toolbar'da font boyutu/ailesi gibi bir işlem tetiklenirse debounce henüz çalışmamış oluyor, `_restoreToolbarSel()` eski/boş bir range'i geri yükleyip canlı (doğru) seçimi eziyordu — komut hiçbir şeye uygulanmıyordu. Özellikle madde imli liste (`<li>`) içeriğinde tutarlı şekilde tetikleniyordu. `_restoreToolbarSel()` artık restore etmeden önce senkron `_saveToolbarSel()` ile tazeleniyor; font seçici (`tb-font-select`) kendi mousedown snapshot'ında da aynı düzeltme uygulandı
- **Yazı tipi rengi kayıtta kayboluyordu:** `applyColor()` `execCommand('foreColor')` kullanıyordu, bu da `<font color="...">` üretiyor; `sanitize()`'in izin verilen etiket listesinde `font` yok, kayıtta tamamen siliniyordu (renk canlı editörde görünüp kayıttan sonra kayboluyordu — Kolon bloğunda fark edilen sorun buydu). `fontFamily`'deki mevcut `<font>`→`<span style>` dönüşüm deseni `applyColor()`'a da uygulandı
- Doğrulama: liste içinde font ailesi/boyutu ilk denemede uygulanıyor, Kolon bloğunda renk artık `<span style="color">` olarak üretilip sanitize sonrası korunuyor, tam kaydet+yeniden aç döngüsünde içerik kaybolmuyor

---

## v1.15.108
**Grid — Panel Kartları Tablo ile Aynı Aile Görünümü**
- Panel kartlarına tablonun dış çerçevesiyle birebir aynı `box-shadow: 0 1px 4px var(--shadow)` eklendi (başlık + içerik kartlarında)
- Aktif kolon (col-active + panel fokusta) artık tablonun `:focus-within` formülüyle birebir aynı: `border-color: var(--accent)` + `box-shadow: 0 0 0 2px var(--accent-dim)` glow ring — önceden yalnızca border rengi değişiyordu, glow yoktu

---

## v1.15.107
**Grid — Panel Arka Plan Davranışı, Çoklu Satır, Başlık Placeholder**
- Panel arka plan boyama ayrıştırıldı: **başlıkta** (th) araç yine hücre/kart arka planını değiştirir; **içerik satırlarında** (td) artık seçili metnin arka planını değiştirir (Kolon bloğuyla aynı davranış). Kart arka planı görsel olarak `.ng-v-wrap` üzerinde olduğundan hedef ona göre düzeltildi
- Panel'e "Satır Ekle" ile yeni satır eklendiğinde: yuvarlak alt köşeler artık en alt satıra taşınıyor (ara satırlar köşesiz, tek parça kart görünümü sürüyor), yeni satırdaki hücreler doğru `data-col` alıyor ve aktif kolon (col-active) accent'i artık TÜM satırları kapsıyor (`_restoreGrids()`'in .ng-cell/.ng-title klonlaması col-active listener'ını siliyordu, düzeltildi; `_upgradeGridWraps()`'teki satır bazlı kolon-index hesaplama hatası da giderildi)
- Tablo ve Panel başlıkları artık "Başlık 1" / "Panel 1" gibi varsayılan metinle gelmiyor — placeholder zaten yeterli, başlıklar boş oluşturuluyor

---

## v1.15.106
**Grid — Kritik Kayıt/Yükleme Bug'ları + Splitter Konumu**
- **KRİTİK — kayıt kaybı düzeltildi:** `normalizeHtml()` her kayıtta boş (`children.length===0` ve metinsiz) `<div>`/`<p>` elemanlarını siliyordu; bu, henüz yazı girilmemiş `.ng-cell`/`.ng-title`/`.ng-resize` grid elemanlarını da siliyordu (yeni eklenen Tablo/Panel/Kolon bloklarında hücrelerin çoğu başlangıçta boştur). Artık `data-ph` attribute'lu veya `ng-` prefixli class'a sahip elemanlar bu temizlikten muaf
- **KRİTİK — not yeniden açma crash'i düzeltildi:** `_restoreGrids()` toolbar'ı `wrap.insertBefore(toolbar, table)` ile ekliyordu; Panel'de `table` artık `wrap`'ın değil `.ng-panel-frame`'in çocuğu olduğundan bu `"not a child of this node"` hatası fırlatıp **`editNote()`'un tamamını yarıda kesiyordu** (not açılışında locked/pinned/dirty state hiç kurulmuyordu). Artık toolbar her zaman `wrap`'ın ilk çocuğu olarak ekleniyor, yapıya bakılmaksızın çalışıyor
- Bu iki bug birlikte "Tablo/Panel/Kolon kayıt almıyor" ve "not kapatılıp açılınca toolbar çalışmıyor/farklı görünüyor" şikayetlerinin kök nedeniydi
- Panel resize splitter'ı artık iki kart arasındaki 10px boşluğun tam ortasında (`right: 5px`); hover/sürükleme dahil her durumda tamamen transparan kalıyor (`!important` ile accent sızıntısı kesin engellendi)

---

## v1.15.105
**Grid — Panel: 6 Düzeltme (Taşma, Gölge, Splitter, Aktif Kolon)**
- **Kritik taşma bug'ı düzeltildi:** kart görseli (border/radius/background/boşluk) `th`/`td`'den `.ng-v-wrap` iç elemanına taşındı; `th`/`td` artık tamamen sade (border/padding yok). Önceden kilitli px kolon genişlikleri (resize sonrası) üstüne border-spacing eklenince panel sayfa dışına taşıyordu — artık table-layout hesabı kart border/boşluğundan hiç etkilenmiyor, taşma imkansız
- Kolon arası gerçek 10px boşluk artık `.ng-v-wrap`'te `width: calc(100% - 10px) + margin-right: 10px` ile sağlanıyor (önceki `width:100%+margin-right` denemesi kartı taşırıp boşluğu iptal ediyordu)
- Kart satırlarındaki (başlık hariç) sol/sağ/alt gölgeleme kaldırıldı (`box-shadow` tamamen silindi)
- Resize splitter'ı artık panele odaklanıldığında da tamamen transparan kalıyor — specificity çakışması (`.noted-grid:focus-within .ng-resize::after` sızıntısı) `.ng-panel-frame` ile bertaraf edildi
- Aktif kolon accent'i artık tablo ile aynı mantıkta çalışıyor: yalnızca panel fokustayken (`.ng-wrap:focus-within`) aktif kolonun kartı accent border alır; panelden çıkılınca (blur) otomatik nötr renge döner
- Panel üst sağ toolbar butonları doğrulandı — `:focus-within` ile doğru şekilde görünüyor

---

## v1.15.104
**Grid — Panel Bağımsız Yuvarlak Köşeli Kartlar**
- Panel yeniden her kolonun bağımsız bir kart olduğu tasarıma döndürüldü: th/td tam border alır (`border: 1px solid var(--pnl-border)`), th üst köşeler + td alt köşeler `border-radius: 8px` ile yuvarlatıldı, header/içerik arası çizgi yok (tek parça kart görünümü)
- Dış çerçeve (`ng-panel-frame`) kaldırıldı — panel artık boşlukta duran bağımsız kartlardan oluşuyor, tek bir çerçeve içinde değil
- `border-collapse: separate` + `border-spacing: 10px 0` ile kolonlar arasında gerçek boşluk; `#content table` specificity çakışması `#content .noted-grid.grid-panel` ile bertaraf edildi
- Aktif kolon accent'i geri geldi: fokuslanan kolonun kartı (`col-active`) accent border + glow alır, diğer kartlar etkilenmez
- Resize çizgisi tekrar varsayılanda görünmez; kart borderi ayırıcı görevi görüyor, yalnızca hover/sürüklemede accent gösterir

---

## v1.15.103
**Grid — Panel Kolon Kartları (Yuvarlak Köşe + Gerçek Boşluk)**
- Kritik bug düzeltildi: `#content table` (ID selektör) `.noted-grid.grid-panel`'in `border-collapse:separate` + `width` + `margin-inline` kurallarını specificity nedeniyle override ediyordu — kolonlar arası boşluk hiç render olmuyordu
- Kök neden çözümü: `border-spacing` tabanlı boşluk hilesi tamamen kaldırıldı; yerine `border-right: 10px solid transparent` + `background-clip: padding-box` yaklaşımı getirildi — flush kenar garantili, table-layout hesaplama hatasına açık değil
- Her kolonun th'si üst köşelerden, td'si alt köşelerden `border-radius: 8px` ile yuvarlatıldı — kolonlar kart gibi görünüyor
- Panel dış çerçevesi (`ng-panel-frame` border/accent) ve iç ayırıcı çizgi (`ng-resize` accent) davranışı korundu

---

## v1.15.102
**Grid — Panel Tablo Benzeri Davranış**
- ng-panel-frame: dış çerçeve eklendi (`border: 1px solid var(--pnl-border)`, `box-shadow`); fokusta border-color ve shadow accent rengi alır — tablo davranışıyla birebir aynı
- Kolon kart borderleri kaldırıldı: th/td yalnızca arka plan rengini taşır, dış çerçeve görünümü sağlar
- ng-resize iç ayırıcı çizgiler: `--pnl-border` rengiyle görünür; fokusta accent rengi alır
- `col-active` per-kolon CSS kuralları kaldırıldı (iç çizgi tabanlı yaklaşımla gerek kalmadı)
- Kolonlar arası boşluk `border-spacing: 10px 0` ile korunuyor

---

## v1.15.101
**Grid — Panel Aktif Kolon Accent**
- Panel kartlarında odaklanılan kolon: yalnızca o kolona ait th/td `col-active` class'ı alır; `.ng-panel-frame:focus-within .col-active` CSS kuralıyla sadece aktif kolona accent border verilir
- `_setPanelColumnActive(table, colIdx)`: tüm th/td üzerinde `col-active` toggle eder
- `createGrid()` panel th/td focus handler'larına `_setPanelColumnActive` çağrısı eklendi
- `_upgradeGridWraps()`: mevcut panel notlarına `data-col` attribute ve focus handler'ları geriye dönük olarak bağlanır

---

## v1.15.100
**Grid — Panel Kart Görünümü, Header Gap, Kolon Accent (3 düzeltme)**
- Panel: her kolon bağımsız kart — `ng-panel-frame` sadece `overflow:hidden + border-radius`, th/td'lere tam border verildi; kartlar arası boşluk `border-spacing:10px`, dış kenarlarda sub-pixel gap (görünmez, flush görünüm)
- Tablo header sol gap giderildi: tablo `background` → `var(--tbl-header-bg)` olarak değiştirildi (collapse/radius clip'te header bg rengi görünür); `tbody td`'ye `background:var(--surface)` eklendi
- Kolon bloğu focus: dikey çizgiler artık accent rengi alıyor — `.grid-column:focus-within .ng-resize::after { background: var(--accent) }` daha yüksek specificity ile `var(--border)` override'ını geçti

---

## v1.15.99
**Grid — Panel Çerçeve Korunumu, Header Arka Plan Düzeltmesi**
- Panel dış çerçevesi korundu: `ng-panel-frame` wrapper div eklendi; `overflow: hidden` sayesinde `margin-inline: -10px` hilesi çalışır, ilk/son kolonun dış kenarında boşluk kalmaz
- Panel toolbar çerçevenin dışında (ng-wrap içinde) kalır; `overflow: hidden` toolbar'ı kesmez
- Kolon arası boşluk: `border-collapse: separate; border-spacing: 10px 0` ile tam ortada dikey ayırıcılar
- Tablo başlık arka plan gap'i düzeltildi: köşe `th` hücrelerine `border-top-left-radius`/`border-top-right-radius` eklendi (Chrome `border-collapse:collapse + overflow:hidden` bug'ı için)
- Mevcut notlardaki panel blokları `_upgradeGridWraps()` içinde otomatik migrate edilir

---

## v1.15.98
**Grid — Panel Kart Görünümü, Header Arka Plan, Kolon Opacity**
- Panel bloğu kart görünümüne dönüştürüldü: her kolon ayrı bir kart olarak çerçevelenir, kolonlar arası boşluk 12px, ilk/son kolonun dış kenarında boşluk yok
- Panel ve tablo başlık satırlarında (`thead tr`) arka plan rengi tam kaplamıyor görünümü giderildi; `thead` ve `thead tr` için de arka plan rengi eklendi
- Kolon bloğu aktif seçiliyken diğer kolonların içeriğini soluklaştıran `opacity: .5` kaldırıldı; yalnızca dikey ayırıcı çizgiler accent rengi alıyor

---

## v1.15.97
**HTML Markup Temizleme — 3 Katman**
- **Paste intercept:** Word/web'den yapıştırmada `text/html` yakalanır; inline style, gereksiz class ve bilinmeyen tag'lar temizlenir, `<b>`→`<strong>` / `<i>`→`<em>` normalleştirilir. MD tablo yapıştırması etkilenmez.
- **Allowlist sanitize():** DOMPurify artık izin verilen tag + attribute listesiyle çalışır; listelenmemiş her şey otomatik çıkarılır. Uygulama özel tag ve `data-*` attribute'ları allowlist'e dahil edildi.
- **Normalize-on-save:** Her kayıtta `normalizeHtml()` çalışır; boş `style=""`/`class=""` attribute'ları, iç içe aynı inline tag'lar (`<strong><strong>`) ve içeriksiz blok elementler temizlenir.

---

## v1.15.96
**localStorage Konsolidasyonu**
- ~35 dağınık localStorage anahtarı 3 birleşik nesneye indirildi: `noted_ai_v1`, `noted_ui_v1`, `noted_content_v1`
- Tek seferlik migration IIFE: eski anahtarları okuyup yeni yapıya aktarır, eski anahtarları siler, `noted_storage_v=2` bayrağı ile tekrar çalışmaz
- `getAiCfg()` / `patchAiCfg()`, `getUiCfg()` / `patchUiCfg()`, `getContentCfg()` / `patchContentCfg()` yardımcı fonksiyonları eklendi
- sessionStorage kullanımı tamamen kaldırıldı (AI config artık localStorage'da kalıcı)
- Export/import: yeni `noted_ai_v1` formatını yazar; eski formatlı JSON dosyaları geriye dönük uyumlu olarak okunur

---

## v1.15.95
**AI Panel — Pool Health Badge Düzeltmesi**
- `openSettings()` çağrıldığında `_renderPool()` de çalışır; ayarlar paneli açılınca rate-limit badge'leri artık anında görünür

---

> **Not:** Her yeni versiyon bu dosyaya eklenir.

---

## v1.15.94
**AI Panel — Model Takibi**
- Her bot mesajının sağ üstünde hangi modelin yanıt verdiği gösterilir (kısa model adı chip'i)
- Model 429 (rate limit) veya hata aldığında Model Havuzu listesinde anlık uyarı rozeti çıkar: ⚡ rate limit için, ⚠ diğer hatalar için
- 429 rozeti 65 sn, diğer hata rozetleri 30 sn sonra otomatik kalkar
- Ayarlar paneli açıkken rozetler anında güncellenir

---

## v1.15.93
**AI Panel — Hover Aksiyonlar, Bullet Liste, Dosya Ekleme**
- Bot cevabı üzerine gelince sağ altta **Yenile** ve **Editöre Ekle** icon butonları görünür; token chip'leri sağ üste taşındı
- Prompt üzerine gelince sağ altta **Değiştir**, **Kopyala**, **Yenile** icon butonları görünür
- Textarea'da `- ` yazıp boşluk basmak `•` madde işaretine dönüşür; `Enter` yeni madde, `Alt+Enter` alt madde açar, boş maddede `Enter` listeden çıkar
- Sol tarafa `+` butonu eklendi: **Belge** (txt/md/csv/json/pdf/docx) ve **Resim** ekleme; eklenen dosyalar chip olarak gösterilir

---

## v1.15.92
**Grid — Border Kesik Görünme Düzeltmesi**
- `.ng-wrap` üzerindeki `overflow-x: clip` kaldırıldı; tablo ve panel dış border'larının kesik görünmesi düzeltildi

---

## v1.15.91
**Grid — Hücre Click Focus, Genişlikleri Eşitle, Taşma Önleme**
- Tablo/Panel/Kolon hücrelerinde boş alana tıklamak artık doğru hücreye odaklanır (vWrap/thWrap/rWrap click listener'ları)
- Her grid türünün toolbar'ına **Genişlikleri Eşitle** butonu eklendi
- `.noted-grid`'e `max-width: 100%` eklenerek içerik taşması engellendi

---

## v1.15.90
**ToDo — Bütünlük Düzeltmeleri**
- Tamamlanmış ToDo öğelerinin tik rengi `--accent` değişkeniyle uyumlu hale getirildi
- `ng-cell` içindeki ToDo öğelerine tıklamak artık doğru elemana odaklanıyor
- `atStart` tespitinde imleç `li` öğesinin kendisinde olduğu kenar durumu düzeltildi
- Todo-text sonunda `Delete` tuşuna basmak bir sonraki maddeyi doğru şekilde birleştirir

---

## v1.15.89
**Ayarlar — Tab Sırası ve İkon Düzenlemesi**
- Ayarlar sekmesi sırası: **Genel / Görünüm / Kısayollar / Gelişmiş / AI / Geliştirici**
- Sekme başlıklarındaki ikonlar kaldırıldı, yalnızca metin gösteriliyor

---

## v1.15.88
**Ayarlar Modali — Sabit Yükseklik**
- Ayarlar modalı sekme içeriğine göre boyut değiştirmeyecek şekilde sabit yüksekliğe ayarlandı

---

## v1.15.87
**CCB Grup Combobox — Z-Index ve Overflow Düzeltmesi**
- CCB grup dropdown'ı `body` seviyesinde render edilerek `overflow:hidden` olan kapsayıcı içinde kesilme sorunu giderildi
- Z-index 9850 olarak ayarlandı

---

## v1.15.86
**CCB — Grup Alanı Combobox**
- CCB ekleme formundaki grup alanı combobox'a dönüştürüldü: mevcut gruplar önerilir, yeni grup adı da yazılabilir

---

## v1.15.85
**CCB — Kayıt Zorlama Düzeltmesi**
- CCB eklendikten sonra `input` olayı dispatch edilerek kaydın tetiklenmesi sağlandı

---

## v1.15.84
**CCB — 3 Hata Düzeltmesi**
- L1 submenu kapanma sorunu giderildi
- İlk gösterim sırasında görünürlük sorunu düzeltildi
- Ekleme UX akışı iyileştirildi

---

## v1.15.83
**CCB — Auto-Resize, İlk Yükleme, Sağ Tık Submenu**
- CCB iframe'i içeriğe göre otomatik yeniden boyutlanıyor
- İlk yüklemede CCB görünür hale getirildi
- Sağ tık menüsüne kademeli (cascaded) submenu desteği eklendi

---

## v1.15.82
**CCB — Customized Code Blocks**
- Editöre özel kod blokları (CCB) ekleme özelliği getirildi: iframe tabanlı, gruplandırılmış, sürüklenebilir bloklar

---

## v1.15.81
**AI — Tablo Ayrıştırıcı Düzeltmesi**
- `mdToHtml` fonksiyonu ayraç satırı (`---`) olmayan AI tablolarını otomatik olarak düzeltiyor

---

## v1.15.80
**Markdown Yapıştır**
- Sağ tık menüsüne **Markdown Yapıştır** seçeneği eklendi
- `Ctrl+Shift+V` kısayolu ile metin Markdown formatında yapıştırılabiliyor
