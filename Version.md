# Noted — Sürüm Geçmişi

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
