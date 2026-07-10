# Noted — Sürüm Geçmişi

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
