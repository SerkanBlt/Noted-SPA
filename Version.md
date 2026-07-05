# Noted — Sürüm Geçmişi

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
