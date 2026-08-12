# Noted — Sürüm Geçmişi

---

## v1.17.4
**Fix — Hata Bildir özelliğiyle GitHub'a gelen 10 açık kullanıcı raporunun otomatik düzeltme turu (issue #5,#6,#8,#9,#10,#12,#13,#14)**
- **#5 — Sürükle-bırakla grup değiştirilince editör rozeti güncellenmiyordu:** Not açıkken başka bir gruba sürüklenip bırakıldığında `n.group` güncelleniyor ama `State.editorGroup` (badge'in okuduğu snapshot) senkronize edilmiyordu — grup picker'daki `applyGroup()`'un zaten yaptığı senkronizasyon sürükle-bırak yolunda eksikti. `_setupNoteDragDrop()`'un `drop` dinleyicisine aynı senkronizasyon eklendi (ana editör + float panel rozeti)
- **#6 — Uzun kod blokları varsayılan olarak açık geliyordu, daraltılınca da scroll bozuluyordu:** `inflateCodeBlocks()` artık >8 satırlık kod bloklarını varsayılan daraltılmış render ediyor; kullanıcı elle genişlet/daralt yaparsa bu tercih `data-cb-touched` ile korunuyor (bir sonraki render'da ezilmiyor — bu yeni nitelik `sanitize()` ALLOWED_ATTR'a eklenmezse kayıtta sessizce silinirdi, eklendi). Ayrı bir CSS hatası da giderildi: `pre.cb-collapsed`'in `overflow:hidden`'ı yatay scroll'u da öldürüyordu, `overflow:auto` yapıldı
- **#8 — Float Panel'de başlık olmasa da İçindekiler düğmesi görünür kalıyordu:** Ana editördeki `buildTocPanel()`'in aksine float panelde düğme görünürlüğünü senkronize eden hiçbir kod yoktu. `_fpUpdateTocBtnVisibility()` eklendi, not yüklenince ve içerik her değiştiğinde çağrılıyor; düğme artık varsayılan gizli başlıyor
- **#9 — Bookmark oluğu gereğinden genişti:** `#content`/`.fp-editor-content` sol padding'i 28px→20px, bookmark ikonu -20px→-14px; tıklama algılama eşiği (`js/06-bookmark-settings-ccb.js`) aynı oranda güncellendi
- **#10 — Kompakt görünümde pinli notlar arası aralık grup içi notlardan dar görünüyordu:** Pinli notların üst kenarlığı (1px amber border) zaten dar olan 2px margin'i görsel olarak yiyordu; kompakt+pinli kombinasyonuna özel `margin-top:4px` eklendi
- **#13 — Bağlantı Haritası'ndaki Group Legend satırı birden fazla satıra sarabiliyordu:** `#graph-legend` artık panel genişliğinde (`left:0;right:0`), altta sabit, `flex-wrap:nowrap` + `overflow-x:auto` ile tek satır halinde yatay kaydırılıyor
- **#14 — Group Legend'da bir gruba tıklamanın hiçbir etkisi yoktu:** Legend öğelerine tıklama işleyicisi hiç bağlanmamıştı (`pointer-events:none` de zaten engelliyordu). Artık bir gruba tıklanınca yalnızca o grubun notları + bağlantılı (başka gruptaki) notlar gösteriliyor, ilişkili-ama-başka-gruptaki notlar %35 opaklıkla soluk çiziliyor; yeni "Tüm Notlar" girdisiyle filtre temizleniyor. `graph.allnotes` anahtarı 5 dile eklendi
- **#12 — Not hatırlatıcısı çalışmıyor gibiydi:** Statik incelemede hatırlatıcının açık sekmede doğru ateşlendiği doğrulandı (gerçek kök neden muhtemelen PWA'nın kapalıyken/arka plandayken tam OS bildirimi göndermemesi — `sw.js`'de push/periodicSync altyapısı yok, bu büyük bir ayrı özellik, bu turda kapsam dışı bırakıldı). Buna karşın somut bir regresyon bulundu ve düzeltildi: `saveReminderFromPopup()` popup her kaydedildiğinde TÜM satırların `fired` bayrağını `false`'a sıfırlıyordu — popup sırf yeni bir hatırlatıcı eklemek için açılıp kapatılsa bile geçmişte zaten ateşlenmiş bir hatırlatıcı tarih/saat değişmediği halde yeniden "ateşli" hale gelip tekrar tetikleniyordu. Artık tarih/saat değişmediyse önceki `fired` durumu korunuyor. Ayrıca: sekme arka plandayken (`document.hidden`) ve bildirim izni daha önce verilmişse, hatırlatıcı artık tarayıcı `Notification` API'siyle de gösteriliyor (in-page toast'a ek olarak)
- **Kapsam dışı bırakılanlar:** #7 (kod bloğuna başlık + ikon Wrap düğmesi + sabit header) tüm kod bloklarının DOM yapısını değiştirmeyi gerektiren büyük ve riskli bir değişiklik olduğu, canlı tarayıcı doğrulaması bu ortamda yapılamadığı için bu turda atlandı. #11 (AI asistan panelinde geçmiş konuşmalara erişim) — hiçbir saklama mekanizması yok, bug değil net-new orta ölçekli özellik, atlandı
- `node tools/comments-check.js` temiz; `Lang.json` 5 dilde `graph.allnotes` eklendi ve doğrulandı; **canlı tarayıcıda doğrulanmadı** — bu ortamda preview/browser erişimi yok, yalnızca statik analiz + `node --check` ile sözdizimi doğrulaması yapıldı

---

## v1.17.3
**Fix — Float panelden (ikinci editör) kaydedilen notlarda tablo/panel/kod bloğu araç çubukları kalıcı olarak içeriğe gömülüyordu (v1.17.2'de flag'lenmiş bilinen sorun, bu sürümde giderildi)**
- **Kök neden:** Ana editördeki `saveNote()` (`js/02-toolbar-panel-column.js`), `DOM.$content.innerHTML`'i okumadan önce `.ng-toolbar`/`.ng-add-col`/`.cb-toolbar` sınıflı geçici UI elementlerini DOM'dan çıkarıp okuduktan sonra geri koyuyordu — ama `js/float-panel.js` kendi `fpContent.innerHTML`'ini **doğrudan** okuyan 6 ayrı noktaya (otomatik kayıt, başlık input kaydı, başlık blur kaydı, manuel "Kaydet" düğmesi, "Bu Notu Şablon Kaydet", dock-swap çift tıklama) bu korumayı hiç uygulamıyordu. Sonuç: float panelden tablo/panel/kolon (`noted-grid`) veya kod bloğu içeren bir not kaydedildiğinde, o elementlerin hover-görünür araç çubukları HTML içeriğine kalıcı olarak gömülüyordu — not tekrar açıldığında bu kalıntılar DOM'da var ama `innerHTML`'den yeniden ayrıştırıldıkları için orijinal JS event listener'ları yok (inert, tıkla-tıkla-çalışmıyor), ayrıca depolama şişiyordu. Konsolda hiçbir hata vermiyordu
- **Düzeltme:** Strip-then-restore deseni `window._stripUiChromeAndRead(el)` adında paylaşılan bir yardımcıya çıkarıldı (`js/01-core-storage-render.js`, script sırasında hem `js/02` hem `js/float-panel.js`'den önce yükleniyor). `saveNote()` artık kendi kopyasını tutmak yerine bu yardımcıyı çağırıyor; `float-panel.js`'deki 6 okuma noktasının (ve ayrıca dock-swap sırasında ana editörün `#content`'ini doğrudan okuyan 7. bir nokta) hepsi aynı yardımcıyı kullanacak şekilde güncellendi
- Doğrulama: float panelde tablo + kod bloğu içeren bir not açılıp düzenlendi, otomatik kayıt ve manuel kayıt yollarının ikisi de tetiklendi; `State.notes`'taki kaydedilen `content` incelendi, `.ng-toolbar`/`.cb-toolbar` HTML'i artık İÇERMİYOR; not tekrar açıldığında araç çubukları `_restoreGrids()`/`_inflateCodeBlocks()` tarafından canlı dinleyicilerle yeniden üretiliyor (beklenen davranış); `node tools/comments-check.js` temiz; konsolda yeni hata yok
- **Ek düzeltme (aynı sürüm içinde):** İlk push'ta `sw.js`'deki `VERSION` sabiti `v1.17.2`'de unutulmuştu — dosyanın kendi üst yorumu bunun "uygulama sürümüyle birlikte artırılmalı, yoksa kullanıcı eski önbelleğe takılı kalır (cache-first strateji)" olduğunu açıkça söylüyor ve önceki her sürümde bu adım atılmıştı. Sonuç: GitHub Pages'teki ham HTML `v1.17.3` gösterse de, PWA'yı daha önce ziyaret etmiş/kurmuş kullanıcıların service worker'ı `noted-v1.17.2` önbelleğinden cache-first sunmaya devam ediyordu — kullanıcı raporuyla ("v1.17.3 olarak açılmıyor") fark edildi. `VERSION = 'v1.17.3'` olarak düzeltildi, `activate` handler'ı eski `noted-v1.17.2` önbelleğini otomatik siliyor

---

## v1.17.2
**Feat — 4 kullanıcı isteği: kod bloğu kopyala/daralt ikonları, not sürükle-bırak (grup taşıma), Hata Bildir düğmeleri metne çevrildi, Yardım modalı güncellendi**
- **Kod Blokları:** Her kod bloğunun (`<pre>`) sağ üst köşesine gerçek DOM düğmeleri eklendi — eskiden orada yalnızca statik bir CSS `::before` "kod" etiketi vardı (tıklanamaz, ayrıca Türkçe'de sabit kalan bir i18n açığıydı). Yeni araç çubuğu: **kopyala** (kod metnini panoya kopyalar, başarılı olursa snack bildirimi gösterir) ve **daralt/genişlet** (uzun kod parçalarını ~130px'e sıkıştırıp alt kenarda yumuşak bir geçişle gizler, tekrar tıklanınca açılır). Kod bloğunun oluşturulabileceği HER yerde (araç çubuğu/`/code` slash komutu, hazır şablonlar, özel şablonlar, geri al/yinele, not açma) araç çubuğu otomatik ekleniyor (`inflateCodeBlocks()`, CCB'nin `inflateCcbBlocks()`'uyla aynı desen). **Kritik fark:** CCB'nin aksine, var olan araç çubuğu "atlanmıyor" — her çağrıda önce kaldırılıp yeniden kuruluyor, çünkü geri al/yinele gibi `innerHTML` yeniden ayrıştırma işlemlerinden sonra eski düğmeler DOM'da kalsa da JS dinleyicilerini kaybediyor (bkz. `Comments.json` → `trap-inflatecodeblocks-must-rebuild-not-skip`). Araç çubuğu, notu kaydetmeden önce `saveNote()` tarafından içerikten çıkarılıyor (`.ng-toolbar`/`.ng-add-col` ile aynı korumaya eklendi) — kalıcı olarak not içeriğine gömülmüyor
- **Not Listesi Sürükle-Bırak:** Bir not kartı sürüklenip başka bir grubun üzerine bırakıldığında not o gruba taşınır (grup başlığı vurgulanır, bırakınca "Not '{grup}' grubuna taşındı" bildirimi gösterilir). Delegasyon `#main-list`'in kendisine (render()'da yeniden oluşturulmayan tek sabit element) TEK SEFER kuruluyor — AI model havuzu sürükle-bırak'ıyla aynı desen (bkz. `Comments.json` → `trap-notedragdrop-called-once-not-per-render`)
- **Hata Bildir paneli:** Vazgeç/Gönder düğmeleri artık ikon (⨯/✓ dairesel düğme) değil, metin düğmesi (link-dialog'daki `.ldbtn-*` ailesiyle aynı görsel dil); Vazgeç sola, Gönder sağa dayalı (`justify-content:space-between`)
- **Yardım modalı:** Yeni **"Dil & Çeviri"** bölümü eklendi (5 dil desteği, anında uygulanma, kalıcı tercih, kapsam sınırları — v1.17.0/v1.17.1'de eklenen çok dillilik özelliğinin daha önce hiç belgelenmemiş olduğu fark edildi). **Veri Kalıcılığı** bölümüne 2 yeni madde: "Uygulama Olarak Kurulum (PWA)" ve "Hata Bildirimi" (ikisi de daha önce belgelenmemişti). **Düzeltme:** "localStorage Tabanlı Depolama" maddesi hâlâ 2026-08-09'da tamamlanmış IndexedDB geçişinden önceki hâliyle duruyordu — güncellendi. Not Yönetimi ve Zengin Editör bölümlerindeki ilgili maddeler bu sürümün yeni özellikleriyle (sürükle-bırak, kod bloğu ikonları) güncellendi; "Kod Blokları" maddesindeki var olmayan "sözdizimi vurgulama" iddiası kaldırıldı. Hero açıklamasındaki artık geçersiz "Tek HTML dosyasında çalışır" iddiası "Tarayıcıda veya kurulabilir bir uygulama (PWA) olarak çalışır" ile değiştirildi; kategori sayacı 17 → 18
- `Lang.json` 668 → 679 anahtar (tüm yeni/değişen içerik 5 dilde tam çevrildi, doğrulama script'iyle sıfır eksik anahtar teyit edildi)
- Doğrulama: kod bloğu ekleme/kopyalama (clipboard API doğrudan çağrıldı, panoya doğru metin yazıldığı doğrulandı)/daraltma-genişletme/kaydetme-sonrası-araç-çubuğu-yok/not-tekrar-açılınca-araç-çubuğu-canlı-dinleyiciyle-geri-geliyor senaryolarının hepsi canlı DOM üzerinden tek tek test edildi; sürükle-bırak senkron `DragEvent`+`DataTransfer` simülasyonuyla uçtan uca doğrulandı (not gerçekten hedef gruba taşındı, kaynak grup boşalınca listeden kayboldu); Hata Bildir düğmeleri `getBoundingClientRect()` ile sola/sağa dayalı olduğu ölçüldü; Yardım modalının yeni/değişen tüm maddeleri İngilizce ve Almanca'da tek tek doğrulandı; `node tools/comments-check.js` temiz; konsolda yeni hata yok
- **Ayrı bir bulgu, bu sürüme dahil edilmedi (flag'lendi):** Yüzen editör (float panel) kendi kaydetme yolunda (`fpContent.innerHTML` okuyan ~7 çağrı noktası) ana editördeki `saveNote()`'un yaptığı UI-chrome-çıkar-sonra-oku korumasını yapmıyor — bu, `.ng-toolbar`/`.ng-add-col` ve şimdi `.cb-toolbar`'ın da yüzen editörden kaydedilen notlarda kalıcı olarak içeriğe gömülebileceği anlamına geliyor (önceden var olan bir sorun, bu sürümde büyütülmedi, ayrı görev olarak kaydedildi)

---

## v1.17.1
**Fix — Dinamik JS metinleri çevrilmemişti: editör footer buton tooltipleri, not listesi filtre/sıralama menüleri, not kartı buton tooltipleri (kullanıcı isteği: "Editör footerdaki düğme tooltipleri, not listesi filtreleme ve sıralama menüleri, not listesi notlarındaki düğme tooltipleri çevirileri yapılmamış")**
- **Kök neden:** v1.17.0'da `data-i18n*` etiketleme yalnızca **statik HTML**'i kapsıyordu. Uygulamanın büyük bir kısmı ise elementleri **JS ile çalışma zamanında** üretiyor ya da state değişince `.title`/`.textContent`/`.innerHTML`'i doğrudan hardcoded Türkçe ile **üzerine yazıyor** (`updateEditorPinBtn`, `setEditorLocked`, `updateReminderBtn`, `buildNoteItem`, dropdown/context-menu oluşturucuları) — bu yol `applyLanguage()`'ın DOM taramasını tamamen atlıyor, statik bir etiket olsa bile her state değişiminde üzerine Türkçe yazılıyor
- **Kapsam:** `js/01`–`js/09`'un tamamı + `js/context-menu.js` + `js/float-panel.js` taranarak aynı sınıftan ~90 çağrı sitesi bulundu ve düzeltildi — not kartı eylem düğmeleri (Yeni Sekmede Aç/Kopyala Link/Sabitle/Hatırlatıcı/Sil), editör footer pin/kilit/hatırlatıcı düğmeleri, sırala/grupla/etiket dropdown'ları, boş liste ("Henüz not yok"/"Sonuç bulunamadı") ve grup başlığı not sayacı ("N not"), bağlantı ekleme diyaloğu, renk/arkaplan rengi popup'ları, mikrofon durumları, şablon dropdown'u, AI panelinin bağlantı durumu rozetleri, sürüm geçmişi/CCB geliştirici sekmesi, Bağlantı Haritası (boş durum, kısayol düğmeleri, "N düğümle sınırlı" notu), Odak Oturumu (başlat/duraklat/devam et, oturum sayacı, tamamlanma toast'ı), şekil araç çubuğu (renk/sil/döndür/dolgu modları), hizalama popup'ı, **sağ-tık bağlam menüsünün tamamı** (~35 etiket: Geri Al/Yinele/Kes/Kopyala/Yapıştır, tablo/bağlantı/wikilink/kod bloğu/şekil/callout/başlık/liste/görsel/CCB alt grupları), ve yüzen ikinci editör panelinin (float panel) tüm state-toggle düğmeleri. `Lang.json` 541 → 650 anahtara çıktı
- **Kritik bir boot-sırası çökmesi bulundu ve düzeltildi:** `js/06-bookmark-settings-ccb.js`'nin CCB geliştirici sekmesi liste oluşturucusu (`renderList()`) top-level bir IIFE'nin sonunda **koşulsuz** çağrılıyor — yani kullanıcı hiçbir şeye tıklamadan, sayfa parse edilirken çalışıyor. İçindeki bir `NotedI18n.t('ccb.empty')` çağrısı, `js/i18n.js` (gerçek `NotedI18n` nesnesini tanımlayan dosya) henüz yüklenmeden tetiklendiğinde `ReferenceError: NotedI18n is not defined` fırlatıyordu — taze bir profilde (cache/localStorage temizlenmiş) canlı olarak doğrulandı, not listesi render'ı yarıda kesiliyordu. Tek tek çağrı sitesini `_t()` fallback'iyle korumak yetersiz kaldı (hangi fonksiyonun boot-time'da tetiklenebileceğini kanıtlamak pratik değil); kalıcı çözüm `Noted.html`'nin en erken inline script'inde `js/i18n.js` yüklenmeden önce **throw etmeyen bir `window.NotedI18n` kukla nesnesi** tanımlamak oldu (`t(key)` anahtarı olduğu gibi döner) — `js/i18n.js` yüklenince kendi tam çalışan nesnesiyle bunun üzerine yazıyor (bkz. `Comments.json` → `trap-notedi18n-stub-before-real-object`)
- Doğrulama: taze sekmede sıfır konsol hatası (yalnızca önceden var olan ilgisiz `/api/config` 404'ü); not kartı butonları/editör footer/sıralama-grup-etiket dropdown'ları/sağ-tık bağlam menüsü canlı DOM incelemesiyle tek tek doğrulandı; Almanca'ya canlı geçişte tüm bu elemanların (`"Neueste"`, `"2 Notizen"`, `"Im zweiten Editor öffnen"` vb.) anında güncellendiği doğrulandı; `node tools/comments-check.js` temiz

---

## v1.17.0
**Feat — Uygulama arayüzü çok dilli oldu: İngilizce/Almanca/İtalyanca/Fransızca/Türkçe (kullanıcı isteği: "Header sağ hamburger soluna bir dil düğmesi koymak istiyorum... tüm uygulama o dile dönsün", kapsam sorusuna kullanıcı "Tek seferde, tüm kapsam" yanıtını verdi — Yardım modalı ve Gizlilik Politikası dahil hiçbir bölüm faza bölünmeden aynı oturumda tamamlandı)**
- **Mimari:** `Lang.json` (541 anahtar × 5 dil, `en` şema referansı) + `js/i18n.js` (bağımsız IIFE, `window.NotedI18n` olarak dışa açılıyor). Elementler `data-i18n` (innerHTML — bazı sözlük değerleri `<strong>/<kbd>/<code>/<a>` biçimlendirme taşıdığı için bilerek `textContent` değil), `data-i18n-title`, `data-i18n-placeholder`, `data-i18n-tip` (`.stb` araç ipuçları için `data-tip` attribute'üne yazıyor), `data-i18n-dp` (contenteditable `data-placeholder`'ına), `data-i18n-aria` (`aria-label`'a) ile işaretlendi. İkon+metin düğmelerinde `data-i18n` her zaman yalnızca metni saran iç `<span>`'e konuldu — üst elemente konsaydı ikon silinirdi (`Comments.json` → `trap-i18n-icon-span-placement`)
- **Kapsam:** Header/hamburger menü, AI Sohbet paneli (Ayarlar alt paneli dahil), Sistem Mesajı/Hata Bildir modalları, Odak Oturumu paneli, editör üst çubuğu + şablon dropdown'u, yan araç çubuğunun ~25 ipucu, içerik footer'ının 11 düğmesi, İçindekiler paneli, yan panel (liste başlığı, filtre/sıralama/görünüm dropdown'ları, gelişmiş arama operatörleri açıklaması — operatör anahtar kelimeleri `grup:`/`etiket:`/`renk:`/`sabit:` kasıtlı olarak her dilde Türkçe kaldı, bkz. `why-i18n-search-operators-literal`), tüm popup'lar (AI eylem/ton, wikilink, renk etiketi, hatırlatıcı, Hızlı Not, ana araç çubuğu, kolon/sayfa düzeni dropdown'ları, grup seçici, silme/kaydetme onay toast'ları, sürüm geçmişi popup'ı, Bağlantı Haritası modalı), Görev paneli, Ayarlar modalının **7 sekmesinin tamamı** (Genel/Görünüm/Kısayollar/Gelişmiş/AI/Versiyonlar/Geliştirici — Tema Özelleştirici'nin tüm renk etiketleri dahil), Hızlı Geçiş modalı, ve **Yardım modalının tamamı** (17 özellik kategorisinin hepsi, hero istatistikleri, klavye kısayolları tablosu). Yüzen editör (float panel) kendi paralel DOM'unda aynı anahtarları yeniden kullanacak şekilde ayrıca etiketlendi
- **`privacy.html` de kapsamda** (Play Store'un gerektirdiği bağımsız belge) — kendi küçük dil seçicisi ve mini i18n önyükleyicisiyle hem bağımsız açılışta hem Ayarlar > Genel akordeonuna `DOMParser`+`innerHTML` ile enjekte edildiğinde çalışıyor; enjekte edilen kopyada `<script>` DOMParser+innerHTML yolundan geçtiği için inert kalıyor, bu yüzden `js/06-bookmark-settings-ccb.js`'deki enjeksiyon kodu enjeksiyon sonrası `NotedI18n.applyLanguage()`'ı elle yeniden çağırıyor
- **Varsayılan dil:** `localStorage['noted_lang']` yoksa (ilk açılış) İngilizce; kullanıcı seçimi kalıcı. Dil dropdown'u hamburger'in solunda, `#lang-wrap` (editor-menu-wrap ile aynı desen — `position:relative` ayrı sarmalayıcı, dropdown kendi butonuna değil `.header-right`'a hizalanmasın diye)
- **Tarih/saat/sayı formatlaması dile bağlandı:** 26 ayrı dosyada hardcoded `'tr-TR'` olan `toLocaleDateString`/`toLocaleTimeString`/`toLocaleString` çağrıları artık `_notedLocale()` (en-US/de-DE/it-IT/fr-FR/tr-TR eşlemesi) kullanıyor. **Kritik bir sıralama tuzağı bulundu ve düzeltildi:** `js/i18n.js` DOM'un tamamı hazır olsun diye en son yükleniyor, ama `js/01`'in ilk `render()`'ı sayfa açılır açılmaz `_notedLocale()`'i çağırıyor — bu, `body` açılır açılmaz çalışan ayrı bir inline script ile `window._notedLocale`'in geçici/sade bir sürümünü en baştan tanımlayarak çözüldü (`Comments.json` → `trap-notedlocale-must-exist-before-js01`). Ayrıca `applyLanguage()` artık dil değişince `render()`'ı yeniden tetikliyor ki not kartlarının tarihleri de güncel kalsın (doğrudan ölçüldü: DE'ye geçince "Aug 10, 2026 07:42 PM" → "10. Aug. 2026 19:42"). Hızlı Geçiş'in arama normalizasyonu (`_qsNormalize`) bilerek istisna tutuldu — UI diline değil, not İÇERİĞİNİN Türkçe karakter kurallarına bağlı kalması gerekiyor (`why-qsnormalize-locale-stays-tr`)
- **26 `alert`/`confirm`/`_showSnack` dinamik mesajı** Lang.json'a taşındı (depolama dolu uyarısı, tablo satır/kolon silme kısıtları, CCB/şablon sil onayları, geçersiz JSON, model fallback bildirimi, not-zaten-açık uyarıları, JSON içe aktarma onayı vb.); `{ad}` gibi yer tutucular `.replace()` ile dolduruluyor
- **Kapsam dışı bırakılan (bilinçli):** hazır not şablonlarının (Günlük Not/Toplantı/Fikir) İÇERİK gövdeleri (yalnızca dropdown etiketleri çevrildi, notun içine eklenen "Bugün Ne Yaptım?" gibi başlıklar Türkçe kaldı — bu, kullanıcının DÜZENLEYECEĞİ not içeriğine yakın bir kapsam sınırı, ayrı bir karar gerektirir); `Version.md`, `Comments.json`, commit mesajları (zaten CLAUDE.md'de geliştirici içeriği olarak kapsam dışı)
- `fa-globe` ikonu kırpılmış Font Awesome setinde yoktu, `fa-bug`/`fa-pause` ile aynı yöntemle (`\f0ac` glifi) eklendi
- `Comments.json`'a 5 yeni girdi; `sw.js`'nin `ASSETS` listesine `Lang.json` + `js/i18n.js` eklendi
- Doğrulama: 5 dilin hepsi tarayıcıda tek tek denendi (header, hamburger menü, AI paneli, Ayarlar'ın 7 sekmesi, Yardım modalının tamamı, privacy.html hem bağımsız hem gömülü); ilk açılışta varsayılan İngilizce ve `localStorage` kalıcılığı doğrudan doğrulandı; not kartı tarih formatının dil değişince canlı güncellendiği ölçüldü; Türkçe'ye dönüldüğünde orijinal metinlerle **birebir** eşleştiği (round-trip) doğrulandı; Almanca (en uzun çeviriler) mobil genişlikte (375px) hamburger dropdown'unun taşmadığı `getBoundingClientRect()` ile ölçüldü; `node tools/comments-check.js` temiz; konsolda yeni hata yok (yalnızca önceden var olan, ilgisiz `/api/config` 404'ü)

---

## v1.16.15
**Fix — Issue #4'ü kapatmadan önce genişletilen kapsam: HTML/Markdown dışa aktarma da kaydedilmemiş notlarda aktif olmalı (kullanıcı isteği: "Yeni not girişi yapıldığında ve içerik girildiğinde ... HTML olarak indir ve Markdown olarak indir düğmeleri de aktif hale gelmeli")**
- **Kök neden:** `export-html-btn`/`export-md-btn`, yalnızca `editNote()` (kayıtlı bir not açılışı) içinde `removeAttribute('disabled')` ile etkinleşiyordu; `resetEditor()`'da ise `setAttribute('disabled','')` ile hep kapatılıyordu. Kaydedilmemiş bir notta hiçbir tetikleyici bu iki düğmeyi etkinleştirmiyordu — TOC bug'ıyla aynı aile: dışa aktarma fonksiyonları da `State.notes`'ta ID ile aranan **kayıtlı** bir notu zorunlu kılıyordu
- **Düzeltme:** Düğmelerin etkin/pasif durumu artık `updateFooterVisibility()` içinde — footer'ın kendisiyle **aynı** `hasTitle` kriteriyle — kontrol ediliyor; bu fonksiyon zaten her başlık/içerik değişiminde (input dinleyicileri, `editNote`, `resetEditor`, `applyTemplate`, undo/redo, grid'ler, AI ekleme…) çağrılıyor, tek kaynak oldu. `editNote()`/`resetEditor()`'daki eski elle-toggle satırları kaldırıldı. `exportNoteAsHtml`/`exportNoteAsMarkdown`, `State.notes`'ta not bulunamazsa yeni `_buildLiveNoteForExport()` ile canlı editör durumundan (title/content/group/tags) geçici bir not nesnesi kuruyor — kayıtlı bir not için mevcut `group`/`tags`/`updatedAt` hâlâ korunuyor
- **Yan bulgu — gerçek, önceden var olan ayrı bir tuzak:** Markdown dışa aktarmayı yeni bir notla test ederken içerik tamamen **kayboldu** (başlık/tarih/footer geldi, gövde boştu). Kök neden: `htmlToMarkdown()`'ın `block()` fonksiyonu yalnızca `node.children` (ELEMENT düğümleri) geziyordu — boş bir `contenteditable`'a atılan **ilk tuş vuruşu**, hiçbir `<p>`/`<div>` sarmalayıcısı olmadan **çıplak bir metin düğümü** üretir (`DOM.$content.innerHTML` doğrudan incelenerek doğrulandı). Bu, teorik olarak kayıtlı notları da etkileyebilirdi (`normalizeHtml()` de çıplak metni sarmıyor) ama bu özellik kaydedilmemiş notların export'unu aktif hale getirene kadar nadiren tetikleniyordu. Düzeltme: `block()` artık `childNodes` geziyor, blok-olmayan içeriği bir tampon'da biriktirip bir sonraki gerçek blok elemanında (veya sonunda) paragraf olarak akıtıyor
- Float panel (`fp-export-html-btn`/`fp-export-md-btn`) kasıtlı olarak dokunulmadı — float panel yalnızca zaten kayıtlı notları açabiliyor, hiçbir zaman "yeni/boş not" durumuna girmiyor, bu yüzden bu bug'a hiç maruz kalmıyor
- `Comments.json`'a 2 yeni girdi (`why-export-buttons-use-hastitle-not-savedid` — important, `trap-htmltomarkdown-dropped-bare-text-nodes` — critical)
- Doğrulama: Yeni not + başlık yazılınca (içerik yazılmadan önce) düğmelerin hemen etkinleştiği, notun hâlâ kaydedilmemiş (`edit-id` boş) kaldığı doğrudan ölçüldü; `URL.createObjectURL` geçici olarak yakalanarak **gerçek indirilen dosya içeriği** (Blob metni) hem HTML hem Markdown için okundu — düzeltme öncesi Markdown gövdesi boştu, düzeltme sonrası içerik doğru geldiği doğrudan kanıtlandı; düzgün yapılandırılmış içerik (h2/p/strong/ul/blockquote/pre) için `htmlToMarkdown()` çıktısının değişmediği ayrı bir regresyon testiyle doğrulandı; şablon eklenmiş bir notta TOC + HTML export + MD export'un **üçünün birden** aynı anda doğru etkin olduğu tek bir testte doğrulandı; test için oluşturulan tüm geçici notlar temizlendi; konsolda yeni hata yok; `node tools/comments-check.js` temiz

---

## v1.16.14
**Fix — İçindekiler (TOC) düğmesi kaydedilmemiş notlarda çalışmıyordu (gerçek kullanıcı raporu — Hata Bildir özelliğiyle bizzat GitHub Issue #4 olarak bildirildi ve "Evet, düzelt" onayıyla düzeltildi)**
- **Kök neden:** `buildTocPanel(noteId)`, başlıkları `State.notes` içinden ID ile aranan **kaydedilmiş** `n.content`'ten çıkarıyordu. Henüz kaydedilmemiş (taslak/yeni) bir notun orada karşılığı olmadığından, ekranda H2/H3 başlıkları görünür olsa bile fonksiyon erken dönüp düğmeyi gizli/paneli boş bırakıyordu — not kaydedilip yeniden açılınca (artık `State.notes`'ta karşılığı olduğundan) düzgün çalışıyordu. Float panelin kendi `buildFpToc()`'u bu hataya hiç düşmemişti çünkü zaten canlı DOM'dan (`fpContent.querySelectorAll('h2,h3')`) okuyordu — ana editörünki bu doğru deseni izlemiyordu
- **Düzeltme:** `buildTocPanel()` artık parametre almıyor, doğrudan canlı `DOM.$content.querySelectorAll('h2, h3')`'ten okuyor (float panelinkiyle aynı, kanıtlanmış desen). Ayrıca `DOM.$content`'e bir `input` dinleyicisi eklendi — kullanıcı yazarken/başlık eklerken panel canlı güncelleniyor
- **İkinci bir kök neden daha bulundu (ilk düzeltme kullanıcının bildirdiği tam repro'yu çözmedi):** `applyTemplate()` (Şablon Seç) ve `editorUndo`/`editorRedo` içeriği `DOM.$content.innerHTML = ...` ile **doğrudan atama** yoluyla değiştiriyor — bu, tarayıcıda native `input` olayı **hiç fırlatmaz** (yalnızca kullanıcı tuş vuruşu veya `execCommand` fırlatır). Bu üç yere de `buildTocPanel()`'e açık çağrı eklendi; `editNote()` zaten kendi elle çağırıyordu, değişmedi
- `Comments.json`'a 1 yeni kritik girdi (`why-buildtocpanel-needs-explicit-calls-for-programmatic-inserts` — gelecekte `DOM.$content.innerHTML=` ile içerik değiştiren yeni bir yer eklenirse aynı tuzağa düşülebileceğini not düşüyor)
- Doğrulama: Kullanıcının bildirdiği **tam repro adımları** (Şablon Seç > Günlük Not, kaydetmeden İçindekiler'e bas) düzeltme öncesi gerçekten başarısız olduğu doğrudan gözlemlendi (ilk düzeltmeden SONRA bile — `innerHTML` atamasının input fırlatmadığı ayrıca keşfedildi), düzeltme sonrası aynı adımlarla 3 başlığın doğru listelendiği doğrulandı; tıklayınca doğru başlığa kaydırdığı ayrıca test edildi; elle yazarak (`execCommand`) başlık eklemenin de canlı güncellediği doğrulandı; undo/redo için `buildTocPanel` çağrı sayısı doğrudan sayılarak (enstrümantasyonla) hem undo'da hem redo'da tam olarak bir kez çağrıldığı ve her ikisinde de panelin gerçek içerikle (başlıklı/başlıksız) tutarlı kaldığı kanıtlandı; test için oluşturulan tüm geçici notlar (bu sürüm dahil, önceki sürümlerden kalanlar da) temizlendi; konsolda yeni hata yok; `node tools/comments-check.js` temiz

---

## v1.16.13
**Fix — Hata Bildir'in ham GitHub API hataları anlaşılır Türkçe yönlendirmeye çevrildi (gerçek kullanıcı raporu: fine-grained PAT oluşturup repository'yi seçmesine rağmen "Gönderilemedi: Resource not accessible by personal access token" hatası aldı)**
- **Kök neden (kullanıcı ortamında doğrulandı):** GitHub'ın fine-grained PAT'leri, seçilen depo için HER izni (Issues dahil) varsayılan olarak **"No access"** yapıyor — yalnızca repository'yi seçmek yetmiyor, "Issues" iznini ayrıca "Read and write" olarak işaretlemek gerekiyor. Kullanıcıya bunu açıklayıp adım adım (GitHub → Settings → Developer settings → Fine-grained tokens → token → Repository permissions → Issues → Read and write) düzeltme yolunu gösterdim
- **Kod tarafında kalıcı iyileştirme:** `_ghErrorHint(status, rawMsg)` eklendi — GitHub'ın ham, teknik mesajlarını (403 "Resource not accessible", 404, 401) somut Türkçe yönlendirmeye çeviriyor; eşleşmeyen hata kodlarında (örn. 422 validation) fonksiyon `null` döner ve çağıran GERİ ham GitHub mesajına düşer (bilgi kaybı yok, yalnızca bilinen desenler için ek açıklama var)
- Doğrulama: Kullanıcının gerçekte aldığı 403/"Resource not accessible by personal access token" hatası `fetch` mock'lanarak birebir tekrar oluşturuldu, düzeltme sonrası panelde doğru adım-adım Türkçe mesajın çıktığı doğrulandı; ayrıca 404 ve 401 durumları ile bilinçli olarak eşleşmeyen bir 422 hatası da ayrı ayrı test edilip 422'de ham mesajın kaybolmadan göründüğü (fallback çalışıyor) doğrulandı; konsolda yeni hata yok; `node tools/comments-check.js` temiz

---

## v1.16.12
**Feat — Hamburger menüsüne "Hata Bildir" (kullanıcı isteği: zengin metin kutulu bir panel, ikon Cancel/Submit düğmeleri, gönderilince kayıt altına alınması, sonradan "Coworks" ile değerlendirilecek durum alanları)**
- **Kapsam netleştirmesi (kullanıcıya iki soru sorularak):** Uygulama GitHub Pages'te statik olarak yayınlanıyor — sunucu tarafında kod çalıştırmıyor, bu yüzden `ReportedBugs.json`'a **sunucu tarafında** yazmak teknik olarak mümkün değildi. Kullanıcı "GitHub Issues kullan" seçeneğini seçti. Ayrıca kullanıcının tarif ettiği büyük otomasyon (10 bildirim birikince "Coworks"un devreye girmesi, e-posta atması, "Closed" kontrolü, otomatik sürüm yayınlaması) bu oturumda kod olarak kurulamayacak kadar büyük ve dış altyapı (zamanlanmış tetikleyici, e-posta servisi, otomatik deploy yetkisi) gerektirdiği için kullanıcı "Yalnızca Hata Bildir UI + kayıt" kapsamını onayladı — otomasyon ayrı, sonraki bir konu
- **Hamburger menüsü — "Hata Bildir":** "Ayarlar"ın hemen altına eklendi (`fa-bug` ikonu — kırpılmış Font Awesome setinde yoktu, `fa-pause`/`fa-play` ile aynı doğrulanmış yöntemle eklendi). Tıklanınca mevcut `.sys-modal` kabuğunu yeniden kullanan bir panel açılıyor: mini biçim araç çubuğu (Kalın/İtalik/Madde Listesi — `document.execCommand`, toolbar'daki mousedown+preventDefault deseniyle seçim korunuyor), çok satırlı `contenteditable` zengin metin kutusu, ve **ikon şeklinde** Vazgeç (çerçevesiz, kırmızıya dönen X) / Gönder (dolu accent zeminli check) düğmeleri
- **Gönderim — GitHub Issue olarak:** Backend olmadığından PAT **doğrudan tarayıcıdan** GitHub Issues API'sine POST atılıyor — bu, AI sağlayıcı anahtarlarıyla (`js/05-ai-chat-panel.js`) **birebir aynı güven modeli**: kullanıcı kendi GitHub Personal Access Token'ini Ayarlar > Gelişmiş'e giriyor (aynı `ai-key-wrap`/göster-gizle deseni), yalnızca `localStorage`'da tutuluyor, hiçbir yere gönderilmiyor. İçerik `htmlToMd()` (not kaydetmede zaten kullanılan aynı fonksiyon) ile Markdown'a çevrilip issue gövdesi yapılıyor; başlık "Hata Bildirimi — {tarih}", etiketler `hata-bildirimi` + `durum:yeni` (GitHub'da olmayan etiketler POST sırasında otomatik oluşturulur) — bu etiket şeması, kullanıcının ileride kuracağı "Coworks" sürecinin (`label:durum:yeni` / `label:durum:renew` sorgulayacağı) veri modeliyle uyumlu tasarlandı, ama o süreç bu sürümde kurulmadı
- Hata durumları: PAT girilmemişse ("Önce Ayarlar > Gelişmiş'ten…") veya API hatası (GitHub'ın döndürdüğü gerçek mesajla, örn. "Bad credentials") panel İÇİNDE gösteriliyor, panel kapanmıyor, kullanıcı düzeltip tekrar deneyebiliyor
- `Comments.json`'a 2 yeni girdi (`why-bugreport-uses-client-side-github-pat` — critical, PAT güven modelini ve tek-kullanıcılı varsayımı açıklıyor; `why-bugreport-labels-map-to-future-cowork-status` — info)
- Doğrulama: Panel gerçek tıklamayla açılıp kapatıldı; Kalın komutu toolbar düğmesiyle gerçek metne uygulanıp `<b>` etiketinin oluştuğu doğrudan `innerHTML` incelemesiyle doğrulandı; PAT girilmeden Gönder'e basınca **gerçek ağ isteği hiç atılmadan** doğru uyarının çıktığı doğrulandı; ardından `fetch` mock'lanarak (gerçek bir GitHub issue oluşturmadan) tam gönderim akışı sürüldü — istek URL'i, metodu, `Authorization` başlığı, ve gövdedeki `title`/`body`(Markdown)/`labels` alanlarının hepsi doğrudan yakalanıp doğrulandı, başarı sonrası panelin kapandığı doğrulandı; ayrı bir mock ile 401 hata senaryosu da sürülüp panelin açık kaldığı, gerçek hata mesajının gösterildiği ve Gönder düğmesinin tekrar aktif olduğu doğrulandı; Ayarlar > Gelişmiş'teki GitHub Erişim Anahtarı alanının kayıtlı değeri doğru yüklediği ve göster/gizle göz ikonunun çalıştığı doğrudan test edildi; `fa-bug` glifinin gerçekten var olduğu geçici bir test kuralıyla ekran görüntüsüyle önce doğrulandı, sonra kalıcı olarak eklendi; konsolda yeni hata yok; `node tools/comments-check.js` temiz

---

## v1.16.11
**Feat — Ayarlar'a "Versiyonlar" sekmesi, Gizlilik Politikası "Genel" altında akordeon (kullanıcı isteği: mevcut sürüm + son 5 sürümün "Daha Fazla" ile sayfalanan geçmişi + Gizlilik Politikası'nın Genel sekmesinde satır içi açılması)**
- **Yeni sekme — Ayarlar > Versiyonlar:** Üstte "Mevcut Sürüm: vX.Y.Z" rozeti, altında "Sürüm Geçmişi" başlığı ve son 5 sürümün akordeon listesi (yalnızca en son sürüm açık, diğerleri kapalı) gösteriliyor. **İkinci bir sürüm listesi elle tutulmuyor** — sekme ilk açıldığında `Version.md` çalışma zamanında `fetch()` edilip regex ile parse ediliyor (`## vX.Y.Z` başlığı → hemen altındaki `**Tip — Başlık (...)**` kalın özet satırı → `- ` ile başlayan madde satırları, bloklar `---` ile ayrılıyor); bu format zaten CLAUDE.md'nin sürüm ritüeliyle her sürümde üretiliyor, tek kaynak `Version.md` kalıyor (DRY)
- **"Daha Fazla" sayfalama:** Altta bir düğme, tıklanınca 5 sürüm daha (hepsi kapalı) ekleniyor, düğme kalan sürüm kalmayınca kayboluyor; test edilen 64 kayıtlı sürümün tamamı (`v1.16.11` → `v1.15.80`) 11 tıklamayla doğru sırayla, yalnızca ilk öğe açık kalarak yüklendi
- **Gizlilik Politikası artık Ayarlar > Genel altında, satır içi akordeon:** Eskiden uygulama içinden hiç link verilmeyen bağımsız bir `privacy.html` (yalnızca Play Store'un ayrıca gerektirdiği bağımsız URL için vardı) artık "Genel" sekmesinin altına eklenen bir akordeon başlığıyla erişilebilir; tıklanınca **aynı sekmede aşağı doğru** açılıyor (ayrı pencere/sekme/modal değil). `privacy.html` içeriği kopyalanmıyor — akordeon ilk açıldığında dosya `fetch()` edilip yalnızca `<body>` içeriği `.privacy-embed` sarmalayıcısına enjekte ediliyor; o dosyanın kendi `<style>`'ı gelmediği için `noted.css`'e aynı `--bg/--surface/--text/--border/--accent` değişken adlarını kullanan bir eşleme seti eklendi (otomatik tema uyumu)
- **PWA çevrimdışı desteği:** `sw.js`'nin `ASSETS` önbellek listesine `Version.md` ve `privacy.html` eklendi — bu iki dosya artık runtime'da fetch edildiği için, çevrimdışı kullanımda da bu iki sekmenin çalışması için önceden önbelleğe alınmaları gerekiyordu (aksi halde "Yüklenemedi" gösterirlerdi)
- Yan bulgu: `privacy.html`'deki `[E-POSTA ADRESİNİZİ BURAYA YAZIN]` placeholder'ları önceden (bu oturumun başından beri commit edilmemiş halde) gerçek adresle değiştirilmişti — bu özellik artık o içeriği doğrudan uygulama içinde gösterdiği için bu düzeltme de bu sürümle birlikte commit edildi
- `Comments.json`'a 3 yeni girdi (`why-versions-tab-parses-versionmd-live`, `why-privacy-accordion-fetches-standalone-file`, `why-sw-precaches-versionmd-privacy` — hepsi important)
- Doğrulama: Versiyonlar sekmesi gerçek tıklamayla açılıp `Version.md` fetch edildi, mevcut sürüm rozeti/ilk öğenin açık olması/diğerlerinin kapalı olması/`"Daha Fazla"` davranışı (5'er 5'er, kapalı, tükenince gizlenme) doğrudan DOM ölçümüyle doğrulandı; ekran görüntüleriyle `<code>`/`<strong>` inline dönüşümlerinin doğru render olduğu görsel olarak da kanıtlandı; Gizlilik Politikası akordeonu gerçek tıklamayla açılıp kapatıldı, enjekte edilen içerikte `<h1>`, 10 adet `<h2>`, `.box`, `<table>` ve güncel e-posta adresinin doğru geldiği doğrudan DOM sorgusuyla doğrulandı, ekran görüntüsüyle tablo/kutu/kod stillerinin tema ile uyumlu render olduğu görsel olarak da doğrulandı; `sw.js`'nin yeni iki dosyayı gerçekten önbelleğe aldığı **temiz bir sekmede** sıfırdan SW kurulumu yaptırılıp `caches` doğrudan sorgulanarak kanıtlandı (ilk denemede aynı sekmedeki eski test artığı sahte önbellek durumu yanıltıcıydı, temiz sekmede doğrulandı); konsolda yeni hata yok; `node tools/comments-check.js` temiz

---

## v1.16.10
**Fix — Footer düğmeleri yanlışlıkla yatayda da ortalanmıştı, geri alındı (kullanıcı düzeltmesi: "eski yerlerine geri dönsün, yatayda ortalama değil dikeyde ortalanmış olmalarını istemiştim")**
- v1.16.9'da "aralarını açalım ve yatayda ortalanmış olsun" isteği `justify-content:center` (tüm düğme grubunu footer genişliğinde ortalama) olarak yorumlanmıştı — kullanıcı bunun yanlış olduğunu belirtti: düğmeler **eski konumlarında** (sol grup sola, tek başına duran "Notu Kapat" sağa yaslı) kalmalıydı, yalnızca **dikeyde** ortalı olmaları isteniyordu
- `align-items:center` (dikey ortalama) zaten `.content-footer`'da baştan beri vardı, v1.16.9'da da hiç değişmedi — geri alınması gereken tek şey `justify-content:center`'dı
- `.content-footer` tekrar `justify-content:space-between`'e, `.cf-group-left`/`.cf-group-right` tekrar `flex:1` + kendi `justify-content:flex-start`/`flex-end`'ine döndürüldü (v1.16.9 öncesi orijinal davranış — bkz. `trap-cf-buttons-ghost-slots-space-between`, hayalet-slot koruması bu iki-grup yapısına bağlı, bozulmadı)
- Grup **içi** boşluk artışı (8px→11px) korundu — kullanıcının orijinal "çok sıkışık duruyor" şikayeti pozisyon tartışmasından bağımsızdı ve hâlâ geçerliydi
- `Comments.json`'daki `trap-cf-buttons-ghost-slots-space-between` girdisi bu geri alışı yansıtacak şekilde güncellendi
- Doğrulama: `getComputedStyle` ile `justify-content:space-between` ve `align-items:center` doğrudan ölçüldü, ekran görüntüsüyle düğmelerin eski (sol küme + sağda tek X) konumuna döndüğü ve dikeyde hizalı kaldığı görsel olarak da doğrulandı; `node tools/comments-check.js` temiz

---

## v1.16.9
**Fix — Footer düğme aralığı/ortalama, liste-başı ArrowDown, Biçim Kopyalayıcı renk mirası (kullanıcı bildirimi: 3 ayrı düzeltme)**
- **Footer düğmeleri sıkışıktı, sola yaslıydı:** `.content-footer` eskiden `justify-content:space-between` ile iki grubu (ikincil eylemler solda, "Notu Kapat" sağda) zıt uçlara itiyordu — sol grup içindeki 9 düğme `gap:8px` ile sıkışık dururken sağda tek bir düğme yalnız kalıyordu. `justify-content:center` + `gap:22px` (gruplar arası) + grup içi `gap:11px`'e geçildi; `.cf-group-left`/`.cf-group-right`'ın eski `flex:1` özelliği kaldırıldı (`flex:0 0 auto`) ki `justify-content:center` gerçekten ortalayabilsin. Bu değişiklik, `Comments.json`'daki dokümante edilmiş `trap-cf-buttons-ghost-slots-space-between` uyarısının (gizli düğmelerin `space-between`'de hayalet boşluk bırakması) altında yatan İKİ-GRUP yapısını bozmadı — yalnızca gruplar arası boşluk dağıtım yöntemi değişti, gizlenen düğmeler hâlâ `display:none` kullanıyor (hayalet slot riski yok)
- **Madde listesiyle başlayan notta ArrowDown çalışmıyordu:** İmleç notun mutlak başında (ilk `<li>`'nin ilk karakterinden önce) iken `ArrowDown` hiçbir şey yapmıyordu — bilinen bir Chromium/contenteditable garipliği (tarayıcı liste işaretçisiyle "bir alt satır" konumunu hesaplayamıyor). Aynı kod tabanında **aynı köşe durumu için zaten var olan bir emsal** bulundu: `Enter` tuşu, imleç notun ilk bloğunun (liste dahil) mutlak başındayken önüne boş bir paragraf ekliyordu (kullanıcı "yukarı kaçabilsin" diye). Aynı mantıkla `ArrowDown` için de bir **güvenli fallback** eklendi: `preventDefault` YOK, native davranış önce çalışır, yalnızca imleç bir sonraki tick'te HÂLÂ aynı konumdaysa (native gerçekten başarısız olduysa) `Selection.modify('move','forward','line')` ile bir satır aşağı itiliyor — native zaten çalışıyorsa bu kod tamamen no-op
- **Biçim Kopyalayıcı, tema varsayılan rengini "sabit" kopyalıyordu:** Kaynak metnin rengi hiç değiştirilmemişse (yalnızca `var(--text)` tema varsayılanını miras alıyorsa) bile `getComputedStyle` somut bir `rgb()` döndürüyor; bu değer kopyalanıp başka bir metne yapıştırıldığında `span.style.color` olarak SABİTLENİYOR — açık temada kopyalanan metin koyu temaya (veya sonradan tema değişince) yapıştırılınca koyu-üzerine-koyu okunmaz hale geliyordu. `backgroundColor`'da zaten kullanılan desenle aynı yöntemle düzeltildi: `color` artık `getComputedStyle` ile değil, `DOM.$content`'e kadar ata zincirinde **açıkça inline `style.color` uygulanmış** (kullanıcı Font Rengi aracını gerçekten kullandığında oluşan) bir düğüm aranarak okunuyor; bulunamazsa `fmt.color` boş kalıyor ve yapıştırılan `span`'a hiç `color` set edilmiyor (hedefin tema rengini miras alıyor)
- `Comments.json`'a 2 yeni girdi (`why-format-copier-color-uses-explicit-inline-only` — important) + 1 güncellenen girdi (`trap-cf-buttons-ghost-slots-space-between` — anchor/body v1.16.9 için güncellendi)
- Doğrulama: **Footer** — gerçek not oluşturulup (`title`+`content` dolu, `cf-empty` kalkınca) `getComputedStyle` ile `justify-content:center`/`gap:22px` doğrudan ölçüldü, ekran görüntüsüyle görsel olarak da düğmelerin artık ortada ve aralıklı durduğu doğrulandı, bazı düğmeler `.hidden` iken bile (`display:none`, hayalet slot yok) düzenin bozulmadığı kontrol edildi. **ArrowDown** — gerçek `computer` tuş vuruşunun bu test ortamında `e.key=""` (boş) gönderdiği tespit edilip (tarayıcı-pane'e özgü bir test kısıtı, gerçek kullanıcı tuşunu temsil etmiyor), doğru `key:'ArrowDown'` alanlı sentetik event ile fallback'in üç yolu da doğrudan doğrulandı: (1) native hareket etmediğinde `Selection.modify` devreye girip imleci doğru satıra taşıyor, (2) mutlak baştan farklı bir konumda hiç tetiklenmiyor, (3) native/başka bir mekanizma imleci zaten taşımışsa ikinci kez oynatmıyor (no-op). **Biçim Kopyalayıcı** — gerçek `applyColor()` akışı taklit edilerek (execCommand foreColor + font→span dönüşümü) açıkça renklendirilmiş metinde rengin doğru kopyalandığı, hiç renklendirilmemiş (tema varsayılanı) metinde `fmt.color`'ın boş kaldığı ve yapıştırılan `span`'a hiç `color` stili eklenmediği, buna karşın açık renkli kopyaların hâlâ doğru yapıştırıldığı üç ayrı senaryoda `innerHTML` çıktısı doğrudan incelenerek kanıtlandı; `node tools/comments-check.js` temiz

---

## v1.16.8
**Fix — YouTube önizlemesi görüntü getirmiyordu, ulaşılamayan linkler artık bildirimle karşılanıyor (kullanıcı bildirimi: "YouTube linkleri üzerine gelince panel açılıyor ama görüntü gelmiyor" + "web linkine ulaşılamıyorsa panel açılmasın, 'Panel açılamıyor' bildirimi çıksın")**
- **Kök neden 1 (asıl regresyon) — `extractYouTubeId()` yalnızca `?v=` parametresini okuyordu:** `youtube.com/shorts/{id}`, `/embed/{id}`, `/live/{id}` biçimindeki linklerde video ID URL **path**'inde, `?v=` parametresi hiç yok. Bu yüzden bu linkler YouTube olarak tanınmıyor (`isYT=false`), **genel web-linki koluna düşüp** ham `youtube.com` URL'i doğrudan `<iframe src>`'e konuyordu — YouTube bunu `X-Frame-Options` ile sessizce reddediyor, panel açılıyor ama içi **hep boş** kalıyordu. Kullanıcının "önceden çalışıyordu" demesiyle örtüşüyor: Shorts linkleri yaygınlaştıkça bu kod yolu daha sık tetiklenmeye başladı. Düzeltme: `/shorts|embed|live/{id}` path pattern'leri de tanınıyor artık; ayrıca hostname eşleşmesi `evilyoutube.com` gibi sahte alan adlarını yanlışlıkla kabul etmeyecek şekilde tam-etki-alanı kontrolüne sıkılaştırıldı
- **Yan iyileştirme — `youtube.com` yerine `youtube-nocookie.com`:** AB/GDPR bölgesinde Google onay çerezi yoksa `youtube.com/embed` bazen video yerine iframe İÇİNDE bir çerez-onay ekranı gösterebiliyor (küçük panelde bomboş gibi algılanıyor) — gizlilik-geliştirilmiş `youtube-nocookie.com` domaini bu sorunu büyük ölçüde atlıyor, oynatma davranışı birebir aynı
- **Yeni özellik — erişilemeyen/gömülemeyen linkler artık panel açmadan önce kontrol ediliyor:** `createExtLinkPanel()` artık senkron değil — panel DOM'a eklenmeden önce YouTube linkleri için YouTube'un CORS'a açık genel oEmbed uç noktasıyla (video silinmiş/private/gömme kapalıysa 400/401 döner) doğrulanıyor; genel web linkleri için `fetch(url, {mode:'no-cors'})` ile **ulaşılabilirlik** test ediliyor (durumu okuyamıyoruz ama DNS/bağlantı hatasında fetch reddediliyor — CORS gerektirmeyen tek güvenilir "ulaşılamıyor" sinyali, 5sn timeout'lu). Kontrol başarısız olursa panel hiç açılmıyor, yerine `_showSnack('Panel açılamıyor', 'err')` bildirimi çıkıyor. Kullanıcı kontrol sürerken linkten ayrılırsa (`_cancelExtPanelCheck`) kontrol daha sonra başarıyla sonuçlansa bile panel **açılmıyor** — artık üzerinde olunmayan bir link için aniden panel belirmesin diye
- `Comments.json`'a 2 yeni girdi (`trap-extractyoutubeid-missed-shorts-embed-live` — critical, `why-extlinkpanel-verifies-before-opening` — important)
- Doğrulama: Gerçek uçtan uca akış sürüldü — toolbar'ın "Bağlantı Ekle" diyaloğuyla gerçek bir YouTube linki eklenip not kaydedildi, kapatılıp yeniden açıldı (sanitize round-trip), **gerçek 3 saniyelik hover gecikmesiyle** test edildi: standart `watch?v=` linki zaten çalışıyordu (ekran görüntüsüyle doğrulandı — Rick Astley videosu doğru render oldu); ardından **Shorts linkiyle aynı akış** tekrarlandı — düzeltme öncesi teorik olarak boş kalacak durum, düzeltme sonrası `youtube-nocookie.com/embed/` src'iyle doğru render olduğu ekran görüntüsüyle kanıtlandı; gerçekte var olmayan bir alan adına (`*.invalid` TLD) ve geçersiz bir YouTube video ID'sine hover yapılıp her ikisinde de panelin **hiç açılmadığı** ve `_showSnack`'in tam olarak `('Panel açılamıyor','err')` argümanlarıyla çağrıldığı doğrudan mock'lanarak doğrulandı; erişilebilir sıradan bir web linkinin (`example.com`) hâlâ normal şekilde açıldığı (regresyon yok) ayrıca doğrulandı; `extractYouTubeId` 9 farklı URL formatıyla (watch/youtu.be/shorts/embed/live/m./sahte-domain/alakasız-domain) tek tek test edildi; konsolda beklenenler dışında yeni hata yok (test linklerinin kendi `ERR_NAME_NOT_RESOLVED`/`400`'ü hariç); `node tools/comments-check.js` temiz

---

## v1.16.7
**Fix + Feat — Sesle arama düzeltmesi, Duraklat/Devam Et/Durdur düğmeleri (kullanıcı bildirimi: "not listesi arama panelinde sesle arama çalışmıyor" + "ses animasyonu altında Durdur/Duraklat/Devam Et düğmeleri olsun")**
- **Bulgu — Not listesi "Sesle Ara" tamamen çalışmıyordu:** `js/03-search-format-shortcuts.js`'teki VOICE SEARCH IIFE'sinde `_se` değişkeni (arama kutusunu saran `#search-expand`) hiç tanımlanmamıştı ama click handler'ın ilk satırı ona referans veriyordu — her tıklamada **`ReferenceError: _se is not defined`** fırlıyordu ve bu, `recognition.start()`'tan ÖNCE gerçekleştiği için ses tanıma hiçbir zaman başlamıyordu. Kullanıcı konsola bakmadığı sürece bu görünmezdi (buton sadece "hiçbir şey yapmıyor" gibi görünüyordu). Gerçek tıklamayla (`document.getElementById('search-mic').click()`) önce hatayı doğrudan yakaladım, sonra `_se=$('search-expand')` eklenip savunmacı `_se &&` kontrolüyle düzeltildi; düzeltme sonrası aynı tıklama artık hatasız `recognition.start()`'a ulaşıyor (`listening` sınıfı doğru ekleniyor) — doğrudan ölçüldü
- **Yeni özellik — Sesle yazma göstergesinde Duraklat/Devam Et/Durdur:** v1.16.6'da eklenen büyük editör-ortası ses göstergesinin altına 3 ikon düğme eklendi (`#vri-pause-btn`/`#vri-resume-btn`/`#vri-stop-btn`, float panelde `fp-` önekli eşleniği). Web Speech API'de gerçek bir `pause()` yok — Duraklat aslında `recognition.stop()` çağırıyor ama önce bir `_paused` bayrağı set ediyor, bu da `continuous:true` modunun `onend`'de normalde yaptığı **otomatik yeniden başlatmayı** bastırıyor (bayrak olmasa "duraklatma" bir saniye içinde kendi kendine devam ederdi). Devam Et bayrağı temizleyip elle `recognition.start()` çağırıyor. Duraklatılınca gösterge halkalarının/ikonun nefes animasyonu da `animation-play-state:paused` ile donduruluyor — gerçekten kayıt yapılmadığını görsel olarak yansıtıyor
- **Yan bulgu — `fa-pause`/`fa-play` ikonları projenin kırpılmış Font Awesome setinde yoktu:** `vendor/fontawesome.css` yalnızca kullanılan ~110 ikonu içerecek şekilde 102KB'den 18KB'ye kırpılmıştı (`Comments.json` → `trap-vendor-css-trim-orphan-selector`); Duraklat/Devam Et düğmeleri eklenene kadar bu iki ikon hiç kullanılmıyordu. Önce gerçek `.woff2` font dosyasında glif olarak var olduklarını (geçici bir test kuralıyla) doğruladım, sonra doğru Font Awesome 6 Solid kod noktalarıyla (`\f04c`, `\f04b`) mevcut `.fa-stop` kuralının hemen yanına tek satırlık bağımsız kurallar olarak eklendi — gruplu-seçici tuzağına (bkz. `trap-orphan-selector-list-id-specificity`) girmeden
- `Comments.json`'a 2 yeni girdi (`trap-search-mic-needs-se-defined` — critical, `why-mic-pause-fakes-pause-via-stop-flag` — important)
- Doğrulama: `_se` hatası düzeltme öncesi gerçek tıklamayla doğrudan yakalandı (`ERROR: _se is not defined`), düzeltme sonrası aynı tıklama hatasız geçip `listening` sınıfının doğru eklendiği ölçüldü; Duraklat/Devam Et/Durdur tam durum makinesi (dinliyor→duraklat→devam et→durdur) hem ana editörde hem float panelde gerçek düğme tıklamalarıyla uçtan uca sürüldü, her adımda `classList`/`getComputedStyle` (görünürlük, `animation-play-state`, buton görünürlük takası) doğrudan ölçüldü; `fa-pause`/`fa-play` glifleri düzeltme öncesi boş/görünmez, sonrası ekran görüntüsüyle doğru şekiller (iki çubuk / üçgen) olarak görsel doğrulandı; konsolda yeni hata yok (yalnızca ortamdan bağımsız `/api/config` 404'ü); `node tools/comments-check.js` temiz

---

## v1.16.6
**Stil — panel düğmeleri, çekmece ikonları, sesle yazma göstergesi (kullanıcı bildirimi: 3 maddelik stil isteği)**
- **Madde 3 — "Tüm düğmelerin stili aynı olmalı, örneğin Bağlantı Haritası paneline bak":** Kullanıcı referans stili netleştirdi: ikon, minimal, çerçevesiz, hover'da yalnızca ikon rengi accent'e dönüşen, tema duyarlı — bu zaten `.cf-btn`/`.side-icon-btn` sınıflarında (not editörü footer'ı, kenar çubuğu başlığı) tutarlı şekilde uygulanmış durumdaydı. Tüm panel/modal başlıklarındaki ikon düğmeler taranıp bu mantığa getirildi: `.gm-zoom-btn` (Bağlantı Haritası zoom +/−/sıfırla) ve `.rp-add-icon-btn` (Hatırlatıcı popup "+" düğmesi) — kullanıcının işaret ettiği tam örnek — çerçeve+dolgu zemini kaldırıldı; `.gm-close`, `.ai-icon-btn` (AI panel: yeni sohbet/ayarlar/kapat/geri/model-kapat — tek sınıf 5 düğmeyi kapsıyor), `.sys-modal-head-close`, `#editor-search-close`/`#fp-search-close`, `#todo-panel-close`, `#settings-close` — hover'ları `var(--text)`/gri dolgudan `var(--accent)`'e çevrildi; `.hm-close` (Yardım modalı) ve `#stb-close`/`#fp-stb-close` (araç çubuğu kapat) — hover'ları kırmızıdan (`#ef4444`) `var(--accent)`'e çevrildi (bunlar "kapat" ama yıkıcı olmayan eylemler, kırmızı diğer ~8 benzer düğmeyle tutarsız bir tekildi). `#stb-close`/`#fp-stb-close`'un varsayılan `background:var(--surface-2)`'si BİLEREK korundu — `position:sticky` ile kaydırmalı araç çubuğunun altından kayan diğer düğmeleri gizlemesi için opak zemine ihtiyacı var (`Comments.json` → `trap-stb-close-keeps-background-for-sticky-occlusion`); form alanı yardımcıları (`.ai-key-toggle` gibi, bordürlü input'a bitişik) kapsam dışı bırakıldı — farklı bir UI ailesi
- **Madde 4 — "Üst çekmece ikonu daha belirgin olmalı ve alt çekmece ikonuyla aynı olmalı":** `#stb-trigger`/`#fp-stb-trigger` (üst çekmece kulakçığı) varsayılan `opacity:.06` taşıyordu (neredeyse görünmezdi), `#cf-trigger` (alt çekmece) `opacity:.55` — doğrudan ölçülüp doğrulandı. Üst çekmecenin opacity'si `.55`'e eşitlendi, geri kalan tüm özellikleri (boyut, radius, border, shadow, hover) zaten ayna simetrikti
- **Madde 5 — "Sesle yazma öne çıkarılmalı... editör ortasında büyük sesli yazma animasyonu":** Sesle yazma aktifken (`#content-mic`/`#fp-mic-btn` tıklanınca) editör içeriğinin ortasında büyük, transparan, kırmızı bir mikrofon ikonu + etrafında sırayla (0s/.8s/1.6s gecikmeli) genişleyip solan 3 halka gösteriliyor artık — "soft" bir nefes alma efektiyle (`prefers-reduced-motion` desteğiyle). `#voice-record-indicator`/`#fp-voice-record-indicator`, mevcut `.mic-listening`/`.fp-mic-listening` sınıf-tabanlı mekanizmasının (zaten `#editor`/`#float-panel`'e ekleniyor) üzerine kurulu — **yeni JS gerekmedi**, salt CSS + iki yeni `<div>` (`Comments.json` → `why-voice-record-indicator-driven-by-ancestor-class`)
- `Comments.json`'a 2 yeni girdi
- Doğrulama: Bağlantı Haritası zoom düğmesi gerçek fare hover'ıyla test edildi — düzeltme öncesi `getComputedStyle().color` sabit gri kalıyordu, sonrası gerçek hover anında `rgb(91,157,249)` (`var(--accent)`) ölçüldü; `#stb-trigger`/`#cf-trigger` opacity'leri düzeltme sonrası `getComputedStyle` ile **birebir `0.55`** olarak doğrulandı; ses göstergesi hem ana editörde hem float panelde `.mic-listening`/`.fp-mic-listening` sınıfı programatik olarak eklenip `display:flex` + 3 halkanın `animationName`/`animationDelay` değerleri doğrudan ölçüldü, ekran görüntüsüyle görsel olarak da (iki farklı animasyon karesi) doğrulandı, mobil genişlikte (375px) `clamp()` boyutlandırmasının taşma yaratmadığı `scrollWidth`/`clientWidth` karşılaştırmasıyla doğrulandı; konsolda yeni hata yok (yalnızca ortamdan bağımsız, önceden var olan `/api/config` 404'ü); `node tools/comments-check.js` temiz

---

## v1.16.5
**Fix — iki stil hatası (kullanıcı bildirimi: "Tablo dış çerçeve round köşeleri silik gözüküyor" / "pil görünümünde hover olduğunda borderın sol tarafı silik gözüküyor")**
- **Bulgu 1 — tablo dış çerçeve köşe yuvarlaması silik/çentikli görünüyordu:** `.noted-grid.grid-table` üzerinde `border-collapse:collapse` + `border-radius:8px` + `overflow:hidden` **aynı `<table>` elementinde** birlikte tanımlıydı — Chromium'da bu üçü aynı elementte güvenilir birlikte çalışmıyor, collapse edilmiş hücre kenarları köşe yuvarlamasını çentikli/silik gösteriyor. Düzeltme: border/border-radius/box-shadow/`:focus-within` accent durumu artık table'ı saran `.ng-table-scroll` (Faz'da zaten var olan, düz bir div — `overflow-x:auto` zaten kendi clip bağlamını tetikliyor) üzerinde tanımlı; `.noted-grid.grid-table`'ın kendisi yalnızca header arka planını taşıyor
- **Bulgu 2 — not listesinde pil (pill) görünümünde hover'da SOL kenar hiç görünmüyordu:** `#main-list.view-pill .note-item` kuralı `border-left:none !important` ile (renk-etiketi şeridini, `.note-item[data-cl]`/`.selected`'ın kendi `!important` `border-left-color`'unu bastırmak için) SOL kenarı tamamen kapatıyor, hemen ardından `border:1.5px solid var(--border)`'u **important OLMADAN** yeniden yazıyordu. `!important` bir bildirim sonraki normal-öncelikli bir shorthand tarafından asla ezilmez — sonuç: taban durumda sol kenar hep görünmezdi (3 kenar gri, sol yok), hover'da üst/sağ/alt accent rengine dönerken sol kenar **hiç boyanmıyordu** (görünmeyen/eksik kalan bir kenar). Düzeltme: tek bir `border:1.5px solid var(--border) !important` shorthand'ı ile 4 kenar birden atomik ayarlandı (bu hem `[data-cl]`/`.selected`'ın rengini specificity+importance ile bastırmaya devam ediyor hem sol kenarı diğer 3'le eşitliyor), `:hover`'daki `border-color` de `!important` yapıldı (aksi halde taban kuralın `!important`'ını ezemezdi)
- `Comments.json`'a 2 yeni girdi (`trap-table-corner-radius-lives-on-ng-table-scroll`, `trap-pill-note-item-border-needs-important-shorthand`, ikisi de important/trap)
- Doğrulama: **Tablo düzeltmesi** — `.ng-table-scroll` elementi geçici `transform:scale(6)` ile büyütülüp düzeltme öncesi/sonrası ekran görüntüsü karşılaştırıldı, öncesinde sol-üst köşede belirgin çentik/kesinti, sonrasında temiz sürekli yuvarlama gözlemlendi. **Pil düzeltmesi** — gerçek fare hover'ı ile (pill elementi geçici `transform:scale(4)` ile büyütülüp `computer.hover` gerçek imleç konumlandırmasıyla test edildi, `el.matches(':hover') === true` doğrudan doğrulandı) düzeltme sonrası `getComputedStyle` ile 4 kenarın da **birebir aynı** `0.8px solid rgb(59,130,246)` (accent) olduğu ölçüldü (öncesinde sol kenar `0px none` idi); ayrıca `data-cl="red"` geçici olarak enjekte edilip renk-etiketi şeridinin pil kenarından **sızmadığı** (sol kenar hâlâ nötr `var(--border)`, kırmızı değil) doğrudan ölçümle doğrulandı; konsolda yeni hata yok; `node tools/comments-check.js` temiz

---

## v1.16.4
**Fix — AI yönetiminde iki sessiz bug (kullanıcı bildirimi: "AI yönetimini de kontrol eder misin?")**
- **Bulgu 1 — AI sohbetinden "Editöre Ekle" yanlış nota yazabiliyordu:** `#ai-chat-panel` float panelin varlığından tamamen habersiz tasarlanmış (dosyada `_fpNoteId`/`fp-content` referansı hiç yok). "Editöre Ekle" doğrudan `DOM.$content`'e yazıyordu — float panele odaklanılıp (kapatılmadan) AI sohbetine geçilip bir yanıt eklenirse, içerik **yanlış nota** (float panelinkine) sessizce gidiyordu; `DOM.$editId` hâlâ doğru notu gösterdiği için fark edilmiyordu. Düzeltme: `_insertToEditor()` artık başlangıçta `activateInstance(window._mainEditorInstance)` çağırıp `DOM.$content`'i ana editöre geri döndürüyor — `editNote()`'un zaten kullandığı aynı desen
- **Bulgu 2 (daha ciddi) — not içi AI eylemleri (Genişlet/Özetle/Düzelt/Devam Et) içeriği ekleyip HİÇ KAYDETMEYEBİLİYORDU:** İçerik ekleme zaten `savedEt`'i (tetiklenme anındaki `EditorState._activeEditTarget`) kullanıyordu — doğruydu. Ama SONRAKİ `input` event dispatch'i `DOM.$content`'e yapılıyordu. AI isteği ağ üzerinden asenkron geldiği için kullanıcı yanıt gelmeden float panele geçebilir — içerik `savedEt` sayesinde **doğru yere** ekleniyor ama `input` event'i **yanlış elemente** (float panel) gidiyor, `#content`'in dirty-listener'ı hiç tetiklenmiyor, `_doSave()` `_contentDirty` kontrolünde sessizce erken dönüp **kaydetmiyordu**. Kullanıcı AI içeriğini ekranda görüyor ama not kapatılıp açılınca/sayfa yenilenince içerik **kayboluyordu** — konsolda hiçbir hata yok. Düzeltme: dispatch artık `DOM.$content` yerine `savedEt`'e yapılıyor
- **Ayrıca doğrulanan, sorun bulunmayan alanlar:** AI eylem içeriğinin kendisi (`savedEt.insertBefore`) zaten doğru elemanı kullanıyordu — yalnızca bildirim event'i yanlıştı; `_aiInserting` bayrağı (bookmark tetiklenmesini önleyen ayrı, basit bir guard) sorunsuz; provider/model havuzu CRUD'u (`patchAiCfg`/`getAiCfg`, ekleme/yeniden sıralama/silme) hem doğrudan config hem gerçek "Kaldır" butonu üzerinden test edildi, sorunsuz
- `Comments.json`'a 2 yeni girdi (`trap-ai-insert-dispatch-must-use-savedet` — critical, `why-ai-insert-targets-main-editor` — important)
- Doğrulama: `window._inlineAI` gerçek ağ çağrısı yerine anında/gecikmeli çözülen bir mock ile değiştirilip **gerçek** `_execInlineAI`/`_runAiFlow` akışı sürüldü — ana editörde metin seçilip AI eylemi tetiklendi, yanıt gelmeden float panele odaklanıldı, sahte yanıt geldi: düzeltme öncesi `EditorState._contentDirty` `false` kalıyordu ve 2sn sonra IndexedDB'de AI içeriği **hiç yoktu** (ölçüldü); düzeltme sonrası `_contentDirty` `true` oluyor ve içerik doğrudan IndexedDB sorgusuyla **kalıcı olduğu** kanıtlandı; float panel etkileşimi olmayan normal akışın da bozulmadığı ayrıca doğrulandı; AI sohbetinin "Editöre Ekle"'si aynı senaryoyla ayrı test edildi (float panelde Not B açıkken sohbetten ekleme yapıldı, düzeltme öncesi Not B'ye, sonrası doğru şekilde Not A'ya gittiği doğrulandı); konsolda yeni hata yok; `node tools/comments-check.js` temiz

---

## v1.16.3
**Fix — "Sütun Ekle"/"Panel Ekle"/"Kolon Ekle" konsola ReferenceError basıyordu (önceki turda bulunup ayrı görev olarak işaretlenmişti)**
- **Kök neden:** `_gridAddCol()` (`js/08-noted-grid-system.js:494`), `requestAnimationFrame(() => _positionGridAddBtn(table));` çağırıyordu — bu fonksiyon "toolbar üstlendi" gerekçesiyle bir önceki iyileştirmede kaldırılmıştı (yorum satırı hâlâ duruyor: `/* _positionGridAddBtn kaldırıldı — toolbar üstlendi */`) ama bu **çağrı sitesi** silinmeyi unutulmuştu. Sonuç: Tablo/Panel/Kolon fark etmeksizin her "sütun ekle" tıklamasında `requestAnimationFrame` callback'i içinde `ReferenceError: _positionGridAddBtn is not defined` fırlıyordu — kullanıcı akışını görünür şekilde bozmadığı için (rAF callback hatası sessizce yutuluyor) şimdiye kadar fark edilmemişti
- **Düzeltme:** Ölü satır kaldırıldı, `_gridAddCol()`'un geri kalanına dokunulmadı
- Doğrulama: Gerçek uygulamada önce hatayı **temiz bir sekmede** somut olarak yakaladım (`ReferenceError`, `js/08-noted-grid-system.js:494:33`); düzeltme sonrası Tablo/Panel/Kolon türü üç blok da gerçek toolbar butonu tıklamasıyla (`Sütun Ekle`/`Panel Ekle`/`Kolon Ekle`) test edildi — üçünde de sütun sayısı doğru arttı (2→3) ve **temiz bir sekmede** konsolda hiçbir hata kalmadığı doğrulandı

---

## v1.16.2
**Fix — Geniş Tablo/Panel/Kolon bloğu editörün tamamını yatay kaydırıyordu (kullanıcı bildirimi)**
- **Kullanıcı bildirimi:** "Tablo eğer sağa doğru gidiyorsa scroll tablo içinde olmalı editörde değil"
- **Kök neden:** Sütun ekleme (`_gridAddCol`, Tablo/Panel/Kolon aynı fonksiyonu paylaşır) her seferinde son sütunu ikiye böler; çok sütun eklenince 60px taban genişliğe çarpıp **toplam** tablo genişliğini büyütmeye başlar. `.noted-grid`'in `width:100%`/`max-width:100%`'u `table-layout:fixed` + açık `<col>` px genişlikleriyle birlikte güvenilir şekilde uygulanmıyor — tablo sütunlarının toplamı kadar geniş render oluyor, kendi konteynerine sığmıyor. `#content`'in **kendi** `overflow-y:auto`'su CSS gereği `overflow-x`'i de otomatik `'auto'` hesaplatıyor (`trap-ng-toolbar-clipped-by-overflow`'daki aynı mekanizmanın tersi yönde işleyen hâli) — sonuç: geniş tablo **tüm not içeriğini** (başlıklar, diğer bloklar dahil) yatay kaydırılabilir yapıyordu, yalnızca tablo değil
- **Düzeltme:** Tablo/Kolon tipleri artık `<table>`'ı yeni bir `.ng-table-scroll` div'ine sarıyor; Panel zaten var olan `.ng-panel-frame`'i kullanıyor (boş bir "yalnızca layout" kuralıydı, artık dolduruldu). İkisine de `overflow-x:auto; max-width:100%;` verildi — **`.ng-wrap`'e değil** (oraya vermek `.ng-toolbar`'ın negatif-top konumlandırmasını kırpardı, zaten belgelenmiş bir tuzak). Mevcut (kayıtlı) notlar için `_upgradeGridWraps()` bu sarmalayıcıyı geriye dönük ekliyor — `.ng-panel-frame` yükseltmesinin zaten kullandığı aynı `:scope >` deseniyle
- Doğrulama: Gerçek `applyGridTable`/`applyGridPanel` ile blok oluşturulup sütunlar 400px'e zorlandı — düzeltme öncesi davranış ölçüldü (`#content.scrollWidth 1229 > clientWidth 957`, yani editör kaydırılabilirdi), düzeltme sonrası tablo hâlâ doğal (geniş, 1200px) genişliğinde render oluyor ama **yalnızca `.ng-table-scroll`** kaydırılabilir (`scrollWidth 1201 > width 912`), `#content.scrollWidth === clientWidth` (**artık kaydırılamıyor**) doğrudan ölçüldü; eski format (sarmalayıcısız) bir not elle oluşturulup `editNote()` ile açıldığında `_upgradeGridWraps()`'in geriye dönük doğru şekilde sardığı ve içeriğin kaybolmadığı doğrulandı; Panel tipi hem ana editörde hem float panelde (`.ng-panel-frame` üzerinden) aynı şekilde test edildi; ekran görüntüsüyle iç kaydırma çubuğunun blok altında göründüğü, editör kartının sabit kaldığı doğrulandı; konsolda yeni hata yok; `node tools/comments-check.js` temiz

---

## v1.16.1
**Fix — Float panelde Tablo/Panel/Kolon blokları çalışmıyordu (kullanıcı bildirimi)**
- **Kök neden 1 — araç çubuğu hiç üretilmiyordu:** `saveNote()` `.ng-toolbar`/`.ng-add-col` elementlerini kayıttan HER ZAMAN çıkarır (`note.content`'te hiç saklanmazlar) — yalnızca editörde GÖRÜNTÜLENİRKEN `_restoreGrids()` tarafından yeniden üretilirler. Ana editörün `editNote()`'u bunu çağırıyordu, float panelin `loadNote()`'u (`js/float-panel.js`) ise `_upgradeGridWraps()`/`_restoreGrids()`/`initShapeOverlays()`'i **hiç çağırmıyordu** — sonuç: float panelde tablo/panel/kolon bloklarının araç çubuğu **hiç yoktu** (bozuk değil, YOKTU)
- **Kök neden 2 — başlık hücresi bolşukları kart rengiyle doluyordu:** `noted.css`'teki `.fp-editor-content th { background:var(--surface-2); }` kuralı, yapıştırılan HAM tablolar için yazılmıştı ama `.noted-grid`'i hariç tutmuyordu — REFACTOR_PLAN.md Faz 1'de `#content` için düzeltilen **aynı tuzak**, float panel için hiç uygulanmamıştı. `--pnl-header-bg` tesadüfen `--surface-2`'ye eşit olduğu için panel başlığının (`th`, olması gereken şeffaf) arka planı `.ng-v-wrap` kartıyla aynı renge boyanıyor, kartın etrafındaki boşluklar kayboluyordu (ana editörde `th` şeffaf kalıyordu — orada bu kural hiç yok)
- **Kök neden 3 — toolbar/satır/kolon eylemleri float panelde kaydedilmiyordu:** `deleteBlock()`, `equalizeWidths()` ve altı `_grid*` fonksiyonu (`_gridAddRow`/`_gridAddCol`/`_gridDeleteRow`/`_gridDeleteCol`/`_gridMoveRow`/`_gridMoveCol`) + resize sürüklemesi bitişi hepsi `DOM.$content`'e bakan `_markDirty()` çağırıyordu — toolbar butonlarının `mousedown`'ı `e.preventDefault()` yaptığı için tıklama yeni bir focus event üretmiyor, `DOM.$content` güncellenmiyor. Float panelde bir satır eklendiğinde `_markDirty()` **yanlış** (muhtemelen ana) editörün kirli bayrağını işaretliyordu — float panelin kendi input-tabanlı otomatik kaydı hiç tetiklenmiyordu, **eklenen satır/kolon/silinen blok hiç kalıcı olmuyordu**
- **Düzeltmeler:** `_restoreGrids()`/`initShapeOverlays()` artık opsiyonel bir `root` parametresi alıyor (varsayılan `DOM.$content`, geriye dönük uyumlu), `loadNote()` üçünü de `fpContent` ile çağırıyor. `noted.css`'teki 3 kural `:not(.noted-grid)` ile (main editördeki gibi) nitelendi. Paylaşılan `_gridMarkDirty(el)` yardımcısı eklendi — `el.closest('[contenteditable="true"]')` ile bloğun **gerçek sahibini** bulup sentetik bir `input` event'i dispatch ediyor; bu hem ana editörün kendi dirty-listener'ını hem float panelin kendi debounce'unu doğru şekilde tetikliyor, `DOM.$content`'e hiç güvenmiyor
- `Comments.json`'a 3 yeni girdi (`trap-fp-editor-content-th-needs-not-noted-grid`, `why-restoregrids-shapes-accept-root`, genişletilen `why-gridtoolbar-uses-owner-closest-not-domcontent`)
- Doğrulama: Panel/Tablo/Kolon türü üç not gerçek `applyGridPanel`/`applyGridTable`/`applyGridColumn` + `saveNote()` ile oluşturuldu; float panelde her üçü için araç çubuğu varlığı (6/11/4 buton) doğrulandı; panel türünde `th` arka planının ana editörle **birebir eşleştiği** (şeffaf), tablo türünde de birebir eşleştiği (gri, kasıtlı farklı tasarım) ölçüldü; float panelden "Satır Ekle" tıklanıp 1.2sn beklendi — düzeltme öncesi eklenen satır IndexedDB'ye hiç yazılmıyordu, düzeltme sonrası doğru yazıldığı doğrudan IndexedDB sorgusuyla kanıtlandı; ana editörün kendi satır ekleme + kaydetme akışının bozulmadığı (yalnızca kendi 2sn debounce'u kadar süre aldığı) ayrıca doğrulandı; konsolda yeni hata yok; `node tools/comments-check.js` temiz

---

## v1.16.0
**Sürüm şeması 1.16.x'e geçti + paylaşılan editör-instance state taraması (float panel bug'ının genellemesi)**
- **Sürüm numaralandırması artık `v1.16.x`.** Önceki iki sürümde (v1.15.132/133) bulunan float panel/undo çapraz-kirlenme hatalarının kök nedeni ortak bir mimari desendi (paylaşılan `DOM.$content`/`EditorState.activeInstance` referansı, yalnızca focus event'leriyle güncelleniyor); kullanıcı bu deseni taşıyan diğer yerlerin de taranmasını istedi ve buradan sonraki sürümler 1.16.x ile başlıyor
- **Taramada bulunan üçüncü, ayrı bir paylaşılan-state sistemi:** `EditorState._activeEditTarget` (js/02) — toolbar formatlama (Kalın/İtalik/liste vb.) butonlarının hangi elemente uygulanacağını tutar, `DOM.$content`'ten **tamamen bağımsız**, yalnızca gerçek `focus`/`focusin` event'leriyle güncellenir. `activateInstance()` bunu taşımıyordu. Sonuç: float panele odaklanılıp kapatıldığında bu değer orada takılı kalabiliyordu
- **İki farklı ciddiyet seviyesi ölçüldü:** (1) Panel **kapatıldıktan sonra** — önceki sürümün `fpContent.innerHTML=''` temizliği sayesinde zaten zararı sınırlıydı (formatlama boş/gizli bir elemente gidip sessizce hiçbir şey yapmıyordu — kafa karıştırıcı ama yıkıcı değil); (2) panel **hâlâ açıkken** (kapatılmadan) ana editörün toolbar'ından bir buton tıklanırsa — bu **daha ciddi**: gerçekten görünür/dolu float panel içeriğine yanlışlıkla formatlama uygulanabiliyordu
- **Düzeltme:** `doClose()` (`js/float-panel.js`) artık `EditorState._activeEditTarget` float panelin elementiyse ana `#content`'e geri döndürüyor ve `_savedToolbarSel`'i temizliyor. `editNote()` (`js/03-search-format-shortcuts.js`) de her not açılışında aynı sıfırlamayı yapıyor — bu hem float panel hem olası grid-hücresi kaynaklı eskimişliğe karşı ekstra güvenlik
- **Taramada bulunan dördüncü, düşük öncelikli gedik:** sağ-tık (context) menüsündeki "Geri Al"/"Yinele" — hem ana editörde hem float panelde aynı `buildItems()` fonksiyonuyla kuruluyordu, ikisi de doğrudan `window.editorUndo()`/`editorRedo()` çağırıp doğru `EditorState.activeInstance`'ın seçili olduğunu **örtük olarak** (sağ-tıkın native focus davranışına güvenerek) varsayıyordu — `fp-undo-btn`/`fp-redo-btn` butonlarının zaten kullandığı **açık** `activateInstance()` deseninden farklı. Artık iki context-menu tetikleyicisi de (`$content`/`$fpContent`) `buildItems()`'a hangi instance'ı hedeflediğini açıkça geçiyor, "Geri Al"/"Yinele" tıklanınca önce `activateInstance(inst)` çağrılıyor
- **Taranıp SORUN BULUNMAYAN alanlar** (doğrulandı, false-positive değil): undo geçmişi yığınları (`_stack`/`_idx`) zaten instance-başına ayrı; `EditorState._contentDirty`/`_editActive`/`_snapTitle` (kaydedilmemiş değişiklik takibi) yalnızca ana editörün sabit `#content`/`#title` elementlerine bağlı, float panel hiç dokunmuyor; `EditorState._editorLocked` ile float panelin kendi `_fpLocked`'ı ayrı değişkenler, senkronizasyonları açık/kasıtlı; `State.editorGroup`/`editorPinned`/`editorColorLabel`/vb. float panel tarafından hiç kullanılmıyor
- `Comments.json`'a 2 yeni girdi (`why-editnote-resets-activeedittarget`, `trap-ctx-menu-undo-redo-needs-explicit-instance`) + 1 mevcut girdi genişletildi (`trap-floatpanel-close-must-restore-domcontent`)
- Doğrulama: float panele odaklanıp kapatıldıktan sonra ana editörde metin seçilip Kalın butonuna basıldı — düzeltme öncesi teorik olarak yanlış (artık boş) elemente gidebilecekken, düzeltme sonrası doğru şekilde ana editörün gerçek içeriğine `<b>` uygulandığı ölçüldü; sağ-tık menüsü hem ana hem float için ayrı ayrı kuruldu, `activeInstance` bilerek float'a sabitlenmiş haldeyken ana editörde sağ-tık→"Geri Al" tıklandı — düzeltme sonrası doğru (ana) yığından geri alındığı, float panelin hiç etkilenmediği doğrulandı; konsolda yeni hata yok (bir test script'inden kalma eski bir hata mesajı temiz bir sekmede tekrarlanmadığı doğrulanıp elenmiş false-positive olarak kayda geçti); `node tools/comments-check.js` temiz

---

## v1.15.133
**Fix — Undo geçmişi float panel/ana editör arasında çapraz sızdırıyordu (kullanıcı sorusu üzerine bulundu)**
- v1.15.132'nin `DOM.$content` çapraz-not sorununu araştırırken kullanıcı "undo history de aynı sorunu yaşıyor mu" diye sordu — evet, **ilişkili ama ayrı bir kök nedenle**
- **Kök neden:** `js/09-search-undo-bridge.js`'teki `_debouncePush()`, karakter-düzeyinde her değişiklikte 500ms'lik bir `setTimeout` kuruyor; zamanlayıcı ateşlendiğinde `_pushState()` `DOM.$content.innerHTML`'i (kapanışa doğru alınmış) kullanıyor ama **`EditorState.activeInstance`'i o anda hangisi aktifse onu** kullanıyor. Kullanıcı ana editörde yazıp 500ms içinde float panele (veya tam tersi) geçerse, zamanlayıcı geçişten **sonra** ateşlenip düzenlemeyi **yanlış (yeni aktif) notun** undo yığınına yazıyordu — eski notun kendi geçmişinden o adım sessizce kayboluyordu
- Bu, kaydedilen not **içeriğini** bozmuyor (kayıt işlemleri undo yığınından değil canlı DOM'dan okuyor) ama undo geçmişini gerçek şekilde kirletiyor: kullanıcı float panelde Ctrl+Z'ye basınca ana editördeki alakasız bir notun içeriği görünebilirdi
- **Düzeltme:** `js/09` artık `window._undoFlushPending` (mevcut `_flushDebounce`'a eşit) olarak dışa açıyor; `activateInstance()` (`js/01`) `EditorState.activeInstance`'i değiştirmeden **önce** bunu çağırıyor — bekleyen zamanlayıcı hâlâ doğru (eski) instance aktifken senkron olarak flush edilip iptal ediliyor. Aynı düzeltme hem ana→float hem float→ana yönünde geçerli
- `Comments.json` → `trap-undo-debounce-fires-after-instance-switch` (critical)
- Doğrulama: karakter-düzeyinde (characterData, `_debouncePush`'ın gerçek yolu — `childList` mutasyonları zaten anında flush oluyor) bir düzenleme yapılıp 500ms debounce penceresi içinde diğer editöre geçildi — düzeltme öncesi düzenleme yanlış instance'ın yığınına sızıyordu (somut olarak reprodüksiyonla gösterildi), düzeltme sonrası geçiş anında doğru instance'a flush olduğu, karşı tarafın hiç etkilenmediği hem ana→float hem float→ana yönünde ayrı ayrı doğrulandı; ek olarak instance değiştirmeden normal undo/redo döngüsünün (v1→v2→undo→v1→redo→v2) bozulmadığı doğrulandı; konsolda yeni hata yok; `node tools/comments-check.js` temiz

---

## v1.15.132
**Fix — Float panel kapatınca çapraz-not veri kaybı (kullanıcı bildirimi)**
- **Kök neden:** `js/01-core-storage-render.js`'teki çoklu-editör "instance" sistemi, hangi contenteditable alanı odaklanırsa paylaşılan `DOM.$content` referansını oraya yönlendiriyor (`activateInstance()`). Float panelin `fp-content`'i de bu sisteme kayıtlı. Kullanıcı float panele odaklanıp (okumak/düzenlemek için tıklayıp) sonra paneli kapatınca (X / menü / vazgeç — hepsi `doClose()`'a çıkıyor), `DOM.$content` **`fp-content`'te kalıyordu** — ana editörün kendi `#content` elementi görsel olarak hiç değişmemiş gibi duruyordu ama paylaşılan referans yanlış yere işaret ediyordu
- **Somut hasar:** Kullanıcı ana editördeki nota geri dönmeden (içerik alanına tıklamadan) Kaydet/Ctrl+Enter'a bastığında veya not değiştirirken çıkan "kaydedilsin mi?" onay diyaloğunda "Evet" dediğinde, `saveNote()` `DOM.$content.innerHTML`'i okuyordu — bu artık float panelin **bayat** içeriğiydi. Sonuç: ana editördeki notun **gerçek içeriği, float panelin içeriğiyle sessizce üzerine yazılıyordu** — `DOM.$editId` hâlâ doğru notu gösterdiği için konsolda hiçbir hata yoktu, kullanıcı yalnızca notunun içeriğinin değiştiğini/kaybolduğunu görüyordu
- **İkinci belirti (aynı kök neden):** `_fpNoteId` de kapatmada sıfırlanmıyordu — `window._fpGetCurrentNoteId()` kapatıldıktan **sonra bile** eski notun id'sini döndürmeye devam ediyor, kullanıcı o notu ana editörde tekrar açmaya çalışınca "Bu not zaten ikinci editörde açık" uyarısı **kalıcı olarak** (paneli tekrar açıp kapatana kadar) yanlış şekilde tetikleniyordu
- **Düzeltme:** `doClose()` (`js/float-panel.js`) artık üç şeyi birlikte yapıyor: `_fpNoteId = null`, float panelin başlık/içerik alanlarını boşaltıyor, ve `EditorState.activeInstance` float panelin instance'ıysa `activateInstance(window._mainEditorInstance)` ile `DOM.$content`'i ana editöre geri döndürüyor — `editNote()`'un zaten kullandığı aynı savunma deseninin (`why-floatpanel-nulls-fpnoteid-before-editnote`) kapatma yoluna da uygulanmış hâli. Üç kapatma yolu da (X butonu, menü, vazgeç) tek `doClose()` fonksiyonundan geçtiği için tek noktadan düzeltildi
- `Comments.json` → `trap-floatpanel-close-must-restore-domcontent` (critical/trap)
- Doğrulama: gerçek senaryo adım adım kuruldu — Not A ana editörde açıldı, Not B float panelde açılıp `activateInstance` ile odaklanma simüle edildi (`DOM.$content` → `fp-content` olduğu doğrulandı), panel X butonuyla kapatıldı → `_fpGetCurrentNoteId()===null` ve `DOM.$content` ana editöre **geri döndüğü** ölçüldü; ardından ana editöre hiç tıklamadan gerçek `saveNote()` çağrıldı → Not A'nın **gerçek** içeriğinin korunduğu, Not B'nin içeriğinin sızmadığı IndexedDB'den doğrudan doğrulandı (düzeltme öncesi bu adım Not A'nın içeriğini Not B'ninkiyle değiştirirdi); yanlış "ikinci editörde açık" uyarısının artık tetiklenmediği, notun normal şekilde açılabildiği doğrulandı; panel gerçekten açık kalırken uyarının **hâlâ doğru şekilde** tetiklendiği (regresyon yok) ayrıca test edildi; konsolda yeni hata yok; `node tools/comments-check.js` temiz

---

## v1.15.131
**Faz 5 adım 3 — Notlar için IndexedDB arka ucu (REFACTOR_PLAN.md Faz 5 tamamlandı)**
- **Notların kalıcılık arka ucu `localStorage`'dan IndexedDB'ye taşındı.** `Storage.getNotes()`/`setNotes()` (v1.15.130'da async iskelet olarak eklenmişti) artık gerçek IndexedDB koduyla çalışıyor: `noted_idb` v1, tek object store `notes_store`, tek kayıt (`put(State.notes,'all')`) — not-başına kayıt değil, çünkü 19 `saveNotes()` çağrı sitesinin hiçbiri "şu notu kaydet" demiyor, hepsi "tüm diziyi kaydet"
- **Tek yönlü, tek seferlik migration:** önce `noted_v1`'i `noted_backup_pre_idb`'ye yedekle (yazıp geri okuyarak doğrula), sonra IndexedDB'ye yaz, sonra IndexedDB'den geri okuyup uzunluk doğrula — ancak o zaman `noted_storage_v='3'` bayrağı set edilir. Herhangi bir adım başarısız olursa kaynak dokunulmamış kalır, bir sonraki boot'ta otomatik tekrar denenir (kalıcı pes-etme bayrağı yok)
- **Güvenlik ağı aynası (kullanıcı onaylı tasarım kararı):** migration sonrası `setNotes()` hem IndexedDB'ye (yetkili) hem `localStorage['noted_v1']`'e (best-effort, kota hatasında sessizce yutulur) yazmaya devam ediyor — kapanış-sırasında-transaction-yarım-kalma riskine karşı güncel bir yedek her zaman hazır
- **Sekmeler-arası 15sn'lik yumuşak kilit** (`noted_idb_migration_lock`) — migration doğası gereği idempotent olduğu için doğruluk için şart değil, yalnızca gereksiz eş-zamanlı tekrar işini önlüyor
- **Bulunan ve düzeltilen ciddi bug (bu fazın kendi geliştirmesi sırasında):** eski `_migrateStorageV2` IIFE'si (config birleştirme, önceki sürümlerden) `noted_storage_v === '2'` tam eşleşmesiyle çalışıyordu — yeni migration bayrağı '3' olunca bu IIFE'nin guard'ı FALSE dönüyor, IIFE HER BOOT'ta yeniden çalışıp bayrağı '3'ten '2'ye düşürüyordu. Sonuç: `Storage.getNotes()` de flag'i göremiyor, migration'ı HER BOOT'ta yeniden tetikliyor, `localStorage['noted_v1']`'deki (artık yalnızca best-effort ayna olan) veriyi IndexedDB'nin üzerine yazıyordu — konsolda hiçbir hata yoktu. "Probe" testiyle (localStorage'a elle sahte not enjekte edip reload) somut olarak yakalandı. Guard artık `>=2` (sayısal karşılaştırma) — `Comments.json` → `trap-storage-v-key-shared-by-two-migrations`
- Doğrulama: 5 (sonra 2) not `localStorage`'a elle seed edilip taban çizgisi (sayı + toplam içerik uzunluğu + başlık listesi) ölçüldü; migration sonrası aynı ölçümler `State.notes` üzerinden birebir eşleşti; IndexedDB'nin gerçekten dolduğu `State.notes`'u bypass eden ham `indexedDB.open` sorgusuyla doğrudan kanıtlandı; **probe testi** (migration sonrası `localStorage['noted_v1']`'e elle sahte not enjekte edip reload) önce bug'ı yakaladı (sahte not sızdı), düzeltme sonrası temiz geçti (sızmadı, flag `'3'` sabit kaldı) — hem "migration ikinci kez çalışmadı" hem "IndexedDB gerçekten yetkili kaynak" tek testte kanıtlandı; `saveNotes()`'un hem IndexedDB'ye hem mirror'a yazdığı doğrudan ölçüldü; gerçek `editNote()`/`saveNote()` UI fonksiyonları üzerinden bir not düzenlenip kaydedildi, tam sayfa yenilemesi sonrası kalıcılığı doğrulandı; not listesi UI'da doğru render olduğu (`NOTLAR 2/2`) gözlemlendi; konsolda yeni hata yok; `node tools/comments-check.js` temiz

---

## v1.15.130
**Faz 5 adım 2 — IndexedDB geçişine hazırlık: async depolama iskeleti (arka uç hâlâ localStorage)**
- **`file://` desteği artık gerekli değil.** `CLAUDE.md` güncellendi: dağıtım artık GitHub Pages + Android/iOS/Windows (PWA kurulumu — manifest.json/sw.js zaten mevcut) üzerinden, her zaman `http(s)` origin'inde. `<script type="module">` yasağının teknik gerekçesi (CORS/`file://`) geçersiz kaldı — modüle geçiş ayrı bir karar, bu sürümde yapılmadı. `CLAUDE.md`'nin proje-şekli tablosu da gerçek dosya yapısını (Faz 1-4 sonrası `noted.css` + `js/*.js` bölünmüşlüğü, `Noted.html` artık ~1.4k satır) yansıtacak şekilde düzeltildi — eskiden hâlâ "tek dosyada ~18.5k satır" yazıyordu
- **`State.notes` yüklemesi tek async bloğa birleşti** (`js/01-core-storage-render.js`, yeni `window._notesReadyPromise`): eskiden üç ayrı parse-anı bloğu vardı (senkron `localStorage` okuma, contentMd migration IIFE'si — `saveNotes()`'u bypass edip doğrudan `localStorage.setItem` yapıyordu, ve ayrı bir yerde backward-compat alan doldurma) — üçü artık tek bir async fonksiyonda sırayla çalışıyor, contentMd migration'ı artık `saveNotes()` üzerinden geçiyor (bypass yok)
- **`saveNotes()` artık `async`**, yeni bir `Storage` nesnesi (`getNotes()`/`setNotes()`) arkasında — bu commit'te arka uç hâlâ `localStorage` (davranış birebir aynı), IndexedDB bir sonraki commit'te eklenecek. 19 çağrı sitesinin hiçbiri değişmedi (hepsi zaten fire-and-forget, dönüş değerine bakmıyordu)
- **Boot gate:** `js/06-bookmark-settings-ccb.js`'teki INIT `render()` çağrısı artık `window._notesReadyPromise.then(render)` — script yükleme sırasında `render()`'ın tek senkron/parse-anı çağrı noktası olduğu doğrulandı (tüm script dosyalarında `render`/`updateBadge`/`renderList`/`collectTodos` için top-level çağrı taraması yapıldı, tek sonuç bulundu)
- **Bulunan gerçek bug (henüz belirti vermemiş, IndexedDB geçişiyle ortaya çıkacaktı):** `js/float-panel.js`'teki `getNote()` fallback'i ve `loadLatest()` doğrudan `localStorage.getItem('noted_v1')` okuyordu. Bugüne kadar zararsızdı çünkü `saveNotes()` `localStorage`'ı senkron güncelliyordu; IndexedDB arka uca geçilince bu anahtar artık her kayıtta güncellenmeyecek ve float panelin "en son notu yükle" akışı migration-anındaki donmuş veriye kilitlenecekti. Artık ikisi de yeni `window._fpGetAllNotes()` köprüsü üzerinden bellekteki `State.notes`'u kullanıyor
- Doğrulama: `localStorage`'a elle 2 not seed edilip sayfa yenilendi — `window._notesReadyPromise` sonrası not sayısı, `contentMd` dolgusu ve backward-compat alanları (`pinned`/`colorLabel`/`tags`) ölçüldü; bir notu düzenleyip `saveNotes()` çağrıldı, `localStorage`'a doğru yazıldığı doğrulandı; float panel "sağa yerleştir" akışı gerçek UI üzerinden tetiklenip `ensureNote()`→`loadLatest()`'in bellekteki en güncel notu (biraz önce düzenlenen) doğru seçtiği kanıtlandı; sayfa tam yenilendi, düzenlemenin kalıcı olduğu doğrulandı; konsolda yeni hata yok (mevcut, ilgisiz `/api/config` 404'ü hariç); `node tools/comments-check.js` temiz

## v1.15.129
**Görev paneli — açılır/kapanır not grupları + toplu daralt/genişlet + tıklama davranışı değişti**
- **Not başlıkları artık açılır/kapanır.** Panel her açıldığında tüm gruplar **kapalı** başlıyor (`open()` her seferinde `expandedGroups` kümesini sıfırlıyor). Başlık satırındaki ok ikonuna veya başlığın boş alanına tıklamak grubu aç/kapa yapıyor; sadece başlık **metnine** tıklamak nota gidiyor — bu iki eylem aynı satırda ayrı hedeflerle (`e.stopPropagation()`) çakışmadan çalışıyor
- **Filtre satırının sağına iki ikon düğme eklendi:** Tümünü Daralt (`fa-compress-alt`) / Tümünü Genişlet (`fa-expand-alt`) — ikisi de zaten vendor'a gömülü ikonlar, yeni ikon derlemesi gerekmedi. `margin-left:auto` ile filtre butonlarından ayrılıp satırın sağına yaslandı
- **Tıklama davranışı değiştirildi (önceki sürümde eklenen davranışın üzerine):** v1.15.128'de checkbox'a tıklamak işaretliyor, satırın geri kalanı notu açıyordu. Artık **görev satırının tamamı** (checkbox dahil) işaretliyor; nota gitmek için **not başlığına** tıklamak gerekiyor. Kapalı bir grubun içindeki satırlar DOM'a hiç eklenmiyor (yalnızca açık gruplar render ediliyor) — büyük not sayısında gereksiz DOM şişmiyor
- **`sw.js` `VERSION` senkron güncellendi**
- Doğrulama: Panel her açılışta tüm grupların kapalı başladığı (`0` satır görünür) ölçüldü; ok ikonuna tıklamanın grubu açıp `chevron-down → chevron-up` olarak değiştiği ve panelin kapanmadığı doğrulandı; görev satırına tıklamanın notu **açmadan** işaretlediği (`note.content` üzerinden), başlık metnine tıklamanın paneli kapatıp notu açtığı (`edit-id` ile) ayrı ayrı test edildi; Tümünü Genişlet/Daralt düğmelerinin görünür satır sayısını (`3` ↔ `0`, iki not grubuyla) doğru değiştirdiği ölçüldü; düğmelerin filtre satırının sağına yaslandığı `getBoundingClientRect` ile doğrulandı; `node tools/comments-check.js` temiz

---

## v1.15.128
**Sol panel + Görev paneli + editör başlığı — 4 UX düzeltmesi**
- **Bulunan gerçek bug:** Sabitlenmiş notlar konteynerinin class adı `js/01-core-storage-render.js` içinde `'pinned-State.notes-container'` yazılmıştı (muhtemelen bir "notes" → "State.notes" toplu bul-değiştir'in düz string literalini de yanlışlıkla değiştirmesiyle oluştu). `noted.css`'teki `#main-list.view-pill .pinned-notes-container { display:flex; gap:... }` kuralı bu yüzden hiç eşleşmiyordu — **Pil (pill) görünümünde sabitlenmiş notlar `margin:0` ile üst üste, gerçek 0px boşlukla diziliyordu.** Class adı düzeltildi; pil görünümdeki `gap` değeri de `8px 8px`'ten `5px 8px`'e çekilerek normal grupların `.group-content` `gap`'iyle birebir eşleştirildi. Kompakt ve standart görünümlerde sabitlenmiş notlar zaten `.note-item` üzerinden gruplarla aynı `margin-top`'u paylaşıyordu (ölçüldü: ikisi de eşit) — orada ayrı bir düzeltme gerekmedi
- **Görevler paneli satır aralığı daraltıldı:** `.todo-panel-item` dikey padding'i `7px` → `4px`
- **Görevler panelinde check/uncheck artık çalışıyor.** Önceden satıra tıklamak yalnızca notu açıyordu, işaretleme imkânı yoktu. Artık checkbox'a tıklamak notu açmadan işaretliyor/kaldırıyor; satırın geri kalanına tıklamak eskisi gibi notu açıyor. Not o an editörde açıksa canlı DOM güncelleniyor (mevcut `MutationObserver` + autosave zinciri devreye giriyor); açık değilse `note.content` doğrudan güncellenip `saveNotes()` çağrılıyor — iki yol da veri kaybı yaratmayacak şekilde ayrıştırıldı
- **Editör başlığında grup rozeti ile arama düğmesi yer değiştirdi** (hem ana editör hem ikinci/float editör): rozet artık arama düğmesinden önce geliyor, böylece arama paneli açılıp genişlediğinde rozet onun solunda sabit kalıyor. Sıraya bağlı CSS kuralı olmadığı doğrulandıktan sonra saf DOM sırası değişikliği olarak uygulandı
- **`sw.js` `VERSION` sabiti** de senkron güncellendi — aksi hâlde çevrimdışı kabuk eski dosyalarda takılı kalırdı (bkz. v1.15.127 notu)
- Doğrulama: Pil görünümünde sabitlenmiş/normal notlar arası piksel boşluk `getBoundingClientRect` ile ölçüldü (önce: pin `0px`/grup `8px` column-gap uyumsuz; sonra: ikisi de `5px`/`8px` ile birebir eşleşiyor); kompakt ve standart görünümlerde ikisinin zaten eşit olduğu (`2px`, `5px`) ayrıca ölçüldü; görev paneli satır padding'i `getComputedStyle` ile doğrulandı; checkbox toggle iki senaryoda da test edildi — not editörde açıkken (canlı DOM + `_contentDirty` + 2sn sonra otomatik kaydın `note.content`'e yansıdığı ölçüldü) ve kapalıyken (`note.content` anında güncellendi); satırın geri kalanına tıklamanın hâlâ notu açtığı ve paneli kapattığı doğrulandı; rozet/arama sırası hem DOM hem `getBoundingClientRect` ile iki editörde de doğrulandı; `node tools/comments-check.js` temiz

---

## v1.15.127
**PWA temeli — manifest + ikonlar + çevrimdışı service worker (Play Store hazırlığı 1/2)**
- `manifest.json` eklendi: `display: standalone` (TWA'nın şartı), `start_url`/`scope` **göreli** (`./`) — böylece hem GitHub Pages alt dizininde hem başka bir yolda çalışır
- **4 PNG ikon üretildi** (`icons/`): 192 + 512 `any`, 192 + 512 `maskable`. Mevcut SVG favicon tarayıcı canvas'ıyla rasterize edildi; maskable sürümlerde logo Android'in güvenli bölgesine sığması için %62'ye küçültülüp tam kanama arka plana yerleştirildi. 512'lik ikon Play Store liste görseli olarak da kullanılabilir
- **`sw.js` — çevrimdışı kabuk:** 36 dosya (uygulama + vendor fontlar + ikonlar) ön-belleğe alınıyor. `fetch` yalnızca **aynı origin'deki GET** isteklerine dokunuyor; AI sağlayıcılarına giden çapraz-origin POST'lar es geçiliyor (aksi hâlde sohbet bozulurdu)
- **`file://` korundu:** service worker yalnızca `http:`/`https:` altında kaydoluyor. `file://` altında `navigator.serviceWorker` tanımsızdır; koşulsuz çağırmak "tek dosyayı indir, çalıştır" senaryosunu hataya düşürürdü
- **Süreçte bulunan gerçek bug:** İlk denemede çevrimdışı açılış **boş hata sayfası** verdi. Sebep: dev sunucusu `/Noted.html` → `/Noted` yönlendirmesi yapıyor; `cache.add()` yanıtı `redirected` bayrağıyla saklıyor ve tarayıcı böyle bir yanıtı **gezinme isteği için reddediyor** — konsolda anlamlı hata da vermiyor. Çözüm: kurulumda yanıt `_temizYanit()` ile yeniden inşa ediliyor (status 200, bayrak düşük). `Comments.json` → `trap-sw-cached-redirect-breaks-navigation`
- **Not:** `sw.js` içindeki `VERSION` sabiti her uygulama sürümünde artırılmalı; cache-first strateji nedeniyle artırılmazsa kullanıcı eski dosyalara takılı kalır
- Doğrulama: SW kaydı + `controller` kontrolü; önbellekteki 36 dosyanın disk içeriğiyle **birebir eşleştiği** betikle karşılaştırıldı (ilk üretimde `pwa-register.js` listede eksikti, yakalandı); önbelleklenen kabuğun `redirected:false` / `status:200` olduğu doğrulandı; **dev sunucusu tamamen durdurulup sayfa yenilendi — uygulama 8 notuyla, fontlarıyla, ikonlarıyla ve DOMPurify'ıyla tam açıldı** (ekran görüntüsüyle); tam RKL-1…RKL-15 + dokunmatik regresyonu; konsolda sıfır hata

---

## v1.15.126
**Faz 5 adım 1 — Depolama dayanıklılığı (persist + erken kota uyarısı)**
- **`navigator.storage.persist()` isteniyor.** İzin verilirse tarayıcı, cihaz depolaması azaldığında bu origin'in verisini **tahliye etmez**. Kritik nokta: bu koruma IndexedDB'ye değil **tüm origin'e** (localStorage dahil) uygulanır — yani Android'deki asıl veri kaybı riskini kapatan şey budur, IndexedDB'nin kendisi değil. Chrome izni etkileşim ölçütlerine göre verir (yer imi, ana ekrana ekleme, PWA kurulumu); localhost'ta `false` dönmesi normaldir ve hata değildir
- **Kota uyarısı artık hata olmadan ÖNCE veriliyor.** Eski davranış yalnızca `setItem` hata fırlattıktan *sonra* uyarıyordu — o noktada veri zaten diske gitmemişti. `StorageHealth.check()` her kayıtta (30sn throttle) toplam yükü ölçüp %80'de bir kez uyarır; kullanıcının hâlâ yer açma şansı varken. `navigator.storage.estimate()` localStorage tavanını göstermediği (origin'in genel kotasını — GB'lar — döndürdüğü) için yük elle ölçülüyor
- **Yan bulgu — gerçek bug:** `noted.css`'te `#snack-container` kuralı vardı ama **element `Noted.html`'de hiç yoktu**. Sonuç: uygulamadaki 10+ bildirim ("Önce bir hücreye tıklayın", "Başlık satırı silinemez", "Bağlantı kopyalandı", AI yedek model bildirimi…) yalnızca `console.warn`'a düşüyor, kullanıcıya **hiç görünmüyordu** — konsolda hata da vermiyordu. `_showSnack` artık konteyneri yoksa oluşturuyor (aynı dosyadaki tooltip host'uyla aynı örüntü). Bu düzeltme olmasa yeni kota uyarısı da görünmeyecekti
- **Plandan bilinçli sapma (kullanıcı onaylı):** `REFACTOR_PLAN.md` Faz 5, `Storage` arayüzünün **async** olmasını ve çağıranların `await`'e uyarlanmasını söylüyor. Ölçüm sonrası bunun 60 senkron config çağrısı + 19 `saveNotes()` çağrısı + parse anında çalışan 5 okumaya dokunmayı gerektirdiği görüldü. Planın kendisinin "not kaybı mümkün" dediği fazda bu yüzey çok geniş bulundu; IndexedDB geçişi bir sonraki adımda **bellek-önbellekli (write-through)** tasarımla yapılacak — senkron çağrı yerleri korunur, yalnızca kalıcılık arka ucu değişir. Uygulama zaten `State.notes`'u bellekte tutup `saveNotes()` ile yazdığı için bu desene hâlihazırda uygun
- Doğrulama: `persist()` çağrısı ve dönüş değeri ölçüldü; kota eşiği geçici olarak düşürülüp uyarının **gerçekten göründüğü** ekran görüntüsüyle doğrulandı; aynı uyarının ikinci kez spam yapmadığı ve 30sn throttle'ın çalıştığı test edildi; snack düzeltmesi sonrası uygulamanın diğer mesajlarının da göründüğü doğrulandı; not kaydet→diskte doğrula→sil döngüsü ve tam RKL-1…RKL-15; konsolda sıfır hata

---

## v1.15.125
**Fix — 3 CDN bağımlılığı yerele gömüldü (Mobil hazırlığı 2/3)**
- **Kapatılan güvenlik açığı:** `sanitize()` içinde `if (typeof DOMPurify === 'undefined') return html;` satırı vardı — DOMPurify CDN'den yüklenemediğinde (uçakta, kesintide, engelli ağda) temizleme **tamamen atlanıyordu**. Ölçüldü: CDN yokken `<img src=x onerror="alert(1)"><script>…</script>` ham olarak geçiyordu. DOMPurify artık `vendor/purify.min.js`'ten yüklendiği için bu yol tamamen ortadan kalktı
- **Çevrimdışı çalışma:** Uygulama artık sıfır dış istek yapıyor (ağ sekmesiyle doğrulandı). Önceden ağsız açılışta 347 ikon ve tüm tipografi kayboluyordu
- Eklenenler: `vendor/purify.min.js` (21KB), `vendor/fontawesome.css` (18KB), `vendor/fonts.css` (5KB), `vendor/fonts/` (13 woff2, ~620KB)
- **Font Awesome kırpıldı:** 102KB → 18KB (%82). Uygulama yalnızca `fas` (solid) stilini ve ~110 ikonu kullanıyor; kalan 1732 ikon kuralı ve 9 gereksiz `@font-face` çıkarıldı
- **Roboto:** yalnızca fiilen istenen ağırlıklar (300/400/700) ve `latin` + `latin-ext` alt kümeleri indirildi — `latin-ext` Türkçe (ğ ı ş İ Ğ Ş) için zorunlu, ölçümle doğrulandı. Diğer 6 alt küme (kiril, yunan, vietnam…) alınmadı
- Üretim betikleri `tools/vendor-build-fontawesome.js` ve `tools/vendor-build-fonts.js` olarak saklandı — yeni ikon kullanılırsa yeniden çalıştırılmalı
- **Süreçte bulunan ve düzeltilen gerçek bug:** İlk kırpma denemesinde 22 ikon **yanlış glife** bağlandı (`bolt` → güneş, `bars` → ampul). Sebep: FA minified CSS gruplu selektör kullanıyor (`.fa-bolt:before,.fa-zap:before{…}`); tek selektör arayan regex grubun ortasından eşleşip sildiğinde geriye **yetim `.fa-bolt:before,`** kalıyor ve bir sonraki kuralla birleşip onun kod noktasını alıyordu. Bu, projenin daha önce üç kez yaşadığı `trap-orphan-selector-list-id-specificity` tuzağının birebir aynısı. Kuralın tamamını işleyen sürümle düzeltildi ve `Comments.json` → `trap-vendor-css-trim-orphan-selector` olarak kaydedildi
- **`file://` altında font testi:** Göreli URL'li `@font-face`'in `file://` altında çalışıp çalışmadığı varsayılmadı, ayrı bir test sayfasıyla ölçüldü — çalışıyor, dolayısıyla base64 gömme (%33 şişme) gereksizdi
- Not: HTML dışa aktarma özelliğindeki (`js/04`) CDN bağlantıları **bilinçli olarak** korundu — dışa aktarılan dosya Downloads'a gider, yanında `vendor/` klasörü olmaz; orada `sans-serif`'e zarif şekilde düşüyor
- Doğrulama: Sıfır dış kaynak (`link[href]`/`script[src]` taraması boş); tüm fontlar `document.fonts.check()` ile yüklü; Türkçe karakterlerin Roboto ile çizildiği genişlik ölçümüyle kanıtlandı; **110 ikonun kod noktası orijinal CSS ile birebir karşılaştırıldı — sıfır sapma** (ekran görüntüsü yeterli değil, yanlış glif de bir gliftir); `file://` altında gerçek tarayıcıda açılıp doğrulandı; tam RKL-1…RKL-15 + dokunmatik regresyonu; konsolda sıfır hata

---

## v1.15.124
**Fix — Dokunmatik sürükleme 2/2: kalan noktalar (Mobil hazırlığı 1/3 tamamlandı)**
- v1.15.123'te eklenen `startPointerDrag()` yardımcısına kalan **altı** sürükleme noktası bağlandı: üst toolbar taşıma (`js/02`), AI panel genişliği (`js/05`), Todo panel genişliği (`js/06`), float panel dikey splitter (`float-panel.js`), wiki önizleme paneli taşıma ve boyutlandırma (`js/01`)
- İlgili kollara `touch-action:none` eklendi: `.toolbar-drag`, `#ai-panel-resize-handle`, `#todo-panel-resize-handle`, `#fp-vsplitter`, `.yt-drag-bar`, `.ext-resize-handle`
- **Bilinçli olarak dönüştürülmeyenler:** `js/03` yan panel splitter'ı ve içerik yükseklik kolu, `js/07` bağlantı haritası, `float-panel.js` mobil çekme kulpları — bunların **zaten kendi `touchstart`/`touchmove` yolları var** ve bazıları tasarlanmış jestler içeriyor (yükseklik kolunda 420ms uzun-basma + titreşim geri bildirimi, haritada iki parmak pinch-zoom). Çalışan bu kodu pointer'a çevirmek o jestleri bozardı; gerekçe `Comments.json` → `trap-pointer-drag-needs-touch-action-none` içine yazıldı
- Hover amaçlı `mousemove` dinleyicileri (yer imi oluğu, harita düğüm vurgusu) sürükleme olmadıkları için kapsam dışı bırakıldı
- Doğrulama: AI panel genişliği **üç girdi türüyle de** hedeflenen piksele tam isabetle ayarlandı — fare 500px, dokunmatik 600px, kalem 350px (hepsi istenen değeri birebir tutturdu) ve ayar `localStorage`'a kaydedildi. Toolbar dokunmatikle taşındı (100→190px), Todo paneli dokunmatikle daraltıldı (860→659px, kaydedildi). Test sırasında iki kez "değişmedi" sonucu alındı; her ikisi de araştırıldı ve **gerçek regresyon değil**, sınır-değere dayanma (panel zaten min/max genişlikteydi) olduğu kanıtlandı. Tam RKL-1…RKL-15; konsolda sıfır hata

---

## v1.15.123
**Fix — Dokunmatik sürükleme çalışmıyordu (Mobil hazırlığı 1/3)**
- **Kök neden:** Tüm sürükleme etkileşimleri yalnızca `mousedown` + `document.mousemove/mouseup` dinliyordu. Tarayıcılar dokunmayı *tıklama* için fare olayına çevirir ama **sürükleme** için çevirmez — parmak hareketi sayfa kaydırmasına gider. Sonuç: kolon genişliği değiştirme ve şekil taşı/boyutlandır/döndür dokunmatik cihazlarda tamamen ölüydü, konsolda hiçbir hata vermeden
- **Çözüm:** `startPointerDrag(onMove, onEnd)` ortak yardımcısı eklendi (`js/01`). Pointer olayları fare + dokunmatik + kalemi tek kodla kapsıyor. Dört sürükleme noktası (grid kolon resize, şekil taşı/boyutlandır/döndür) bu yardımcıya bağlandı — her birinde tekrarlanan 6 satırlık listener ekle/kaldır kalıbı tek çağrıya indi
- **Kritik detay:** Pointer olayları tek başına yetmiyor — sürükleme kolunda CSS `touch-action: none` yoksa tarayıcı dokunuşu kaydırmaya ayırır ve `pointermove` hiç gelmez. `.ng-resize`, `.shape-resize-handle`, `.shape-rotate-handle`, `.note-shape-overlay`'e eklendi. `.shape-text-wrap` bilerek `touch-action:auto` bırakıldı (orada sürükleme yok; JS zaten erken `return` ediyor, metin seçimi/kaydırma tarayıcıya ait). Bu tuzak `Comments.json` → `trap-pointer-drag-needs-touch-action-none` olarak kaydedildi
- **Bonus:** Eski kod `pointercancel` karşılığı olan bir durumu hiç ele almıyordu; yardımcı bunu da temizliyor (sistem sürüklemeyi kesince state takılı kalmaz)
- **Kapsam notu:** Telefonlarda (`max-width:640px`) kolon resize kolu zaten bilinçli olarak gizli — panel/kolon kartları orada dikey diziliyor, boyutlandırma anlamsız. Bu tasarım kararına dokunulmadı; kolon resize düzeltmesi tabletler/dokunmatik dizüstüler/yatay mod için geçerli. **Şekiller ise hiçbir boyutta gizlenmiyordu, yani telefon dahil tüm dokunmatik cihazlarda düzeldi**
- Doğrulama: Düzeltme öncesi dokunmatik sürükleme ölçüldü (328px → 328px, değişim yok), sonrası ölçüldü (397.6px → 334.6px ✅). Şekil taşıma (sx 44→104), boyutlandırma (220×130→287×177), döndürme (0°→56°) dokunmatikle doğrulandı. Fare regresyonu ayrıca test edildi (çalışıyor), metin alanının sürüklemeyi tetiklemediği doğrulandı. Not kaydet→yeniden aç sonrası dokunmatiğin hâlâ çalıştığı test edildi (listener yeniden bağlama tuzağının bulunduğu bölge). Tam RKL-1…RKL-15 + mobil (375×812) ekran görüntüsü; konsolda sıfır hata

---

## v1.15.122
**CCB Dışa Aktar / İçe Aktar — Addin'e Giden İlk Adım**
- Kullanıcı talebi üzerine: CCB'ler artık tek tek `.ccb.json` dosyası olarak dışa/içe aktarılabiliyor — ileride bir "store"dan CCB seçip kurma özelliğine giden ilk, düşük riskli adım. Tam bir plugin/addin API'si **bilinçli olarak yapılmadı** (REFACTOR_PLAN.md'nin kapsam dışı listesinde: "stabil sınırlar oturmadan tasarlanamaz") — bunun yerine mevcut mimariye (localStorage tabanlı CCB listesi) dokunmadan, üstüne eklenen basit bir dosya taşınabilirliği katmanı
- **Ayarlar > Geliştirici** sekmesine "İçe Aktar" butonu eklendi (mevcut "Yeni CCB" yanında); her CCB satırına "Dışa Aktar" butonu eklendi (Düzenle/Sil yanında) — tamamı mevcut `.ccb-act-btn`/`.ccb-add-btn` stilleri yeniden kullanılarak, yeni CSS eklenmeden
- Dışa aktarılan format: `{_type:"noted-ccb", _version:1, group, name, height, code}` — `_type`/`_version` alanları ileride format değişirse eski dosyaları ayırt edebilmek için (bkz. `Comments.json` → `why-ccb-export-has-type-version-fields`)
- İçe aktarma hem **tek CCB nesnesini** hem **CCB dizisini** (toplu) kabul eder; geçersiz girdiler (isim veya kod eksik) sessizce atlanır, kaç tanesinin başarıyla eklendiği kullanıcıya bildirilir; içe aktarılan her CCB'ye **yeni bir id** üretilir (mevcut CCB'lerle çakışma riski yok)
- Bu, aynı oturumda düzeltilen bir bug ile birlikte geldi: mevcut vault-genelinde dışa/içe aktarma (`notlar.json`, "Dışa Aktar" ana menü butonu) zaten CCB'leri `_ccbs` alanıyla topluca taşıyordu — bu yeni özellik ona ek olarak **tekil** CCB paylaşımını mümkün kılıyor
- Doğrulama: gerçek UI akışıyla (buton tıklama → form → dosya seçimi simülasyonu) hem dışa aktarılan JSON'un doğru biçimde üretildiği hem tekil/dizi içe aktarmanın doğru çalıştığı hem geçersiz girdilerin doğru filtrelendiği test edildi; ekran görüntüsüyle buton yerleşimi ve mevcut tasarım diliyle tutarlılığı doğrulandı; konsolda sıfır hata

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
