# Noted — Modülerleşme İş Emri

> **Bu belge bir uygulama spesifikasyonudur, bir öneri değildir.**
> Uygulayan ajan bu belgeyi baştan sona okumadan hiçbir düzenleme yapmamalıdır.

---

## 0. Başlangıç Durumu (bu belge yazıldığında doğrulanmış)

| Bilgi | Değer |
|---|---|
| Sürüm | `v1.15.110` |
| `Noted.html` | 18.526 satır |
| CSS bloğu | `<style>` satır **14**, `</style>` satır **4665** → içerik **4.650** satır (15–4664) |
| `</head>` / `<body>` | satır **4666** / **4667** |
| JS bloğu #1 | `<script>` satır **5511**, `</script>` satır **16213** → içerik **10.701** satır — **body içinde**, DOM markup'tan sonra |
| JS bloğu #2 | satır **16623 → 16683** (60 satır) — yardım modalı IIFE |
| JS bloğu #3 | satır **16789 → 18073** (1.284 satır) — float panel IIFE |
| JS bloğu #4 | satır **18077 → 18525** (448 satır) — context menu IIFE |
| Top-level fonksiyon | 217 |
| Top-level `let/const/var` | 105 |
| `window.*` köprüsü | 48 |

**Kritik yapısal gerçekler:**

1. JS blokları #2, #3, #4 **zaten IIFE'dir** ve dış dünyayla yalnızca `window.*` üzerinden konuşur. Bunlar bağımsız modül adayıdır.
2. Blok #1 `<body>` içindedir ve parse anında DOM sorgular (`const $title = ...`, satır 5654). **Script konumu davranış açısından anlamlıdır; split sırasında DOM'a göre konumu korunmalıdır.**
3. `let` değişkenleri script blokları arasında paylaşılmaz. Kod bunu satır 16176'da kendi yorumunda kabul eder ve `window._fpWlDetect` gibi köprüler kurar.

---

## 1. Değişmez Kurallar (ihlal = işi durdur)

1. **Faz başına tek commit.** Fazları birleştirme. Her faz bağımsız `git revert` edilebilir olmalı.
2. **Davranış değişikliği yasak.** Bu iş emrinin tamamı davranış-koruyucudur. Bir şeyi "daha iyi" yapma dürtüsü gelirse **yapma, not al, sona bırak.**
3. **Dokunulmayan kodu yeniden biçimlendirme.** Girinti/satır sonu/tırnak stili değiştirme. Diff okunabilirliği bu işin güvenlik mekanizmasıdır.
4. **Satır numaraları yalnızca faz başlangıcında geçerlidir.** İlk düzenlemeden sonra tüm konumları **çapa metni** (anchor) ile bul. Bu belgedeki satır numaralarına körü körüne güvenme.
5. **Doğrulama çalışan uygulamada yapılır.** "Söz dizimi hatası yok" veya "dosya yazıldı" doğrulama değildir. Her fazın kendi runtime kontrol listesi vardır.
6. **Bir doğrulama başarısız olursa: DUR.** İleri doğru düzeltmeye çalışma. `git revert` et, ne olduğunu raporla, talimat bekle.
7. **Sürüm numarası her fazda 5 yerde artırılır:** satır 2 HTML yorumu, `<title>`, `.hm-app-ver`, `.hm-ver`, yardım `<h2>`. `Version.md`'ye giriş eklenir.
8. **Commit mesajı Bash heredoc ile yazılır**, PowerShell here-string ile değil (bu projede bir kez karakter bozulmasına yol açtı). Commit sonrası `git log -1 --format=%B` ile karakter bütünlüğü doğrulanır.
9. **`git push` her fazın sonunda yapılır** (proje GitHub Pages'e deploy oluyor).
10. **Kod değiştirmeden ÖNCE `Comments.json` okunur, sonra güncellenir.** Bkz. bölüm 2.

---

## 2. `Comments.json` — Kod Dışı Yorum Sistemi

### Gerekçe

Tasarım aşamasına ait açıklamalar (tuzaklar, "bu neden böyle", tarihçe) kod dosyasının içine
inline yorum olarak yazılmaz; `Comments.json` dosyasına yazılır.

- Üretimdeki kullanıcının bu açıklamalara ihtiyacı yok → sevk edilen dosya küçülür.
- Ajan, 18.5k satır taramak yerine ~200 satırlık küratörlü bir indeks okur → **keşif** maliyeti düşer.
- Girdi doğrudan satır numarası verdiği için müdahale noktasına tek adımda gidilir.

### Kritik tasarım kararı: `anchor` otoritedir, `line` ipucudur

> **Satır numaraları kayar.** Üstteki her ekleme/silme alttaki tüm numaraları geçersiz kılar.
> Bu refactor sırasında 4.650 satır CSS taşınacak, 10.701 satır JS bölünecek — yani
> **her satır numarası en az bir kez bayatlayacak.** Saf satır-numarası tabanlı bir sistem
> ilk fazda çöker ve bayat yorum, hiç yorum olmamasından **daha kötüdür** (aktif olarak yanıltır).

Bu yüzden her girdi iki konum bilgisi taşır:

| Alan | Rol |
|---|---|
| `anchor` | **Otorite.** Kodda birebir geçen, dosya içinde **benzersiz** metin. Konum bununla bulunur. |
| `line` | **Yalnızca ipucu.** Bayat olabilir. Doğrulayıcı tarafından otomatik onarılır. |

### Şema

```jsonc
{
  "id":     "trap-normalizehtml-empty-block-removal",  // kalıcı, kebab-case, asla değişmez
  "level":  "critical",          // critical | important | info
  "type":   "trap",              // trap | why | history | todo | perf
  "file":   "Noted.html",
  "line":   5750,                // ipucu — doğrulayıcı günceller
  "anchor": "if (/(^|\\s)ng-/.test(el.className)) return;",  // BENZERSIZ olmalı
  "symbol": "normalizeHtml",     // kapsayan fonksiyon/selektör (opsiyonel)
  "title":  "Tek satır özet",
  "body":   "Asıl açıklama.",
  "refs":   ["v1.15.106"]        // sürüm etiketi / belge referansı
}
```

**Seviyeler:**

| Seviye | Anlamı |
|---|---|
| `critical` | Bu koda dokunmadan **önce** okunmalı. İhlali **sessiz veri kaybı / bozulma** üretir. |
| `important` | Değiştirmeden önce anlaşılmalı. İhlali **görünür bug** üretir. |
| `info` | Bağlam / gerekçe. Okunmaması zarar vermez. |

### Doğrulayıcı: `tools/comments-check.js`

Sistemi kırılgan olmaktan çıkaran parça budur. Üç arıza modunu yakalar:

```bash
node tools/comments-check.js            # doğrula (hata varsa çıkış kodu 1)
node tools/comments-check.js --fix      # kaymış 'line' değerlerini onar
node tools/comments-check.js --list critical   # seviyeye göre listele
node tools/comments-check.js --for Noted.html  # dosyanın girdileri
```

| Arıza | Tespit | Sonuç |
|---|---|---|
| **Kayma** — anchor bulundu ama farklı satırda | Otomatik | `--fix` ile onarılır |
| **Yetim** — anchor artık kodda yok | Otomatik | **HATA** — kod silinmiş/değişmiş, girdi güncellenmeli |
| **Belirsiz** — anchor birden çok yerde | Otomatik | **HATA** — anchor uzatılmalı |

> Doğrulanmış: üç arıza modu da test edildi, `--fix` kaymayı onarıyor, çıkış kodu doğru.

### Çalışma kuralları

1. **Kod değiştirmeden ÖNCE:** `node tools/comments-check.js --for <dosya>` çalıştır.
   `critical` girdileri **oku**. Bunlar bu kod tabanında tekrar tekrar bug üretmiş noktalardır.
2. **Kod değiştirdikten SONRA:** `node tools/comments-check.js` çalıştır. Temiz olmalı.
   Kayma varsa `--fix`. Yetim/belirsiz varsa **elle düzelt** — otomatik düzeltme yok, çünkü
   kararı insan/ajan vermelidir (girdi hâlâ geçerli mi, yoksa kod mu ortadan kalktı?).
3. **Yeni açıklama yazarken:** koda inline yorum ekleme, `Comments.json`'a girdi ekle.
   İstisna: **tek satırlık, yerel, mekanik** açıklamalar (`/* px → rem */` gibi) kodda kalabilir.
   Kural şu: *"Bunu bilmeyen biri buraya dokunursa bir şey bozulur mu?"* → evet ise `Comments.json`.
4. **`anchor` seçimi:** mümkün olan en kısa **benzersiz** metin. Değişme ihtimali düşük olanı seç
   (fonksiyon imzası > gövde satırı; CSS selektörü > bildirim değeri).
5. **Girdi silme:** kodun kendisi kalktıysa girdiyi sil. Kod duruyor ama açıklama eskidiyse
   `body`'yi güncelle, `id`'yi **değiştirme**.

### Her fazın çıkış koşuluna eklenir

Bu belgedeki **her fazın** çıkış koşuluna şu madde dâhildir:

> `node tools/comments-check.js` **temiz** dönüyor ve o fazda değişen/taşınan kodun
> girdileri (`file` alanı dâhil) güncellenmiş.

Özellikle **Faz 2** (CSS → `noted.css`) ve **Faz 3** (JS → ayrı dosyalar) sırasında
girdilerin `file` alanı **toplu olarak** güncellenmelidir; anchor'lar taşımayı sağ atlatır
ama dosya adı değişir.

### Ajanın bunu gerçekten okumasını sağlamak

Bu kuralın bağlayıcı olması için **proje kökünde bir `CLAUDE.md`** bulunmalı ve şu maddeyi
içermelidir:

```markdown
- Herhangi bir kod dosyasını değiştirmeden önce `node tools/comments-check.js --for <dosya>`
  çalıştır ve `critical` girdileri oku. Değişiklikten sonra `node tools/comments-check.js`
  temiz dönmeli. Yeni açıklamaları koda değil `Comments.json`'a yaz.
```

`REFACTOR_PLAN.md`'ye yazmak yeterli değildir — ajan bu belgeyi yalnızca refactor işi için okur,
`CLAUDE.md`'yi ise her oturumda okur.

### Dürüst uyarı — takas

Bu sistemin bir maliyeti var: `Noted.html:5750`'ye bakan bir **insan**, artık oradaki tuzağı
göremez; `Comments.json`'a bakmak zorundadır. Bu kabul edilebilir bir takas, **ancak**
`Comments.json` güncel kalırsa. Bayat bir `Comments.json`, inline yorumdan kesinlikle
daha kötüdür. Doğrulayıcının her fazda çalıştırılması bu yüzden pazarlık konusu değildir.

---

## 3. Regresyon Kontrol Listesi (RKL)

Bu liste **her fazın öncesinde ve sonrasında** çalıştırılır. Sonuçlar aynı olmalıdır.

Uygulama `http://localhost:5500/Noted.html` üzerinden açılır (`.claude/launch.json` içindeki "Noted SPA" yapılandırması).

| # | Kontrol | Beklenen |
|---|---|---|
| RKL-1 | Panel bloğu ekle (3 kolon) | 3 bağımsız kart, aralarında **10px** boşluk, üst köşeler `8px` radius |
| RKL-2 | Panel hücresine odaklan | **Yalnızca o kolonun** kartı accent border + `0 0 0 2px accent-dim` glow |
| RKL-3 | Panelden çık (blur) | Accent kalkar, nötr renge döner |
| RKL-4 | Panele "Satır Ekle" | Alt köşe radius **en alt satıra** taşınır; aktif kolon accent'i **tüm satırları** kapsar; yeni hücrelerde `data-col` doğru |
| RKL-5 | Panel splitter | İki kart arasındaki boşluğun **tam ortasında**; hover/sürükleme dâhil **her durumda transparan** |
| RKL-6 | Tablo bloğu ekle | Başlık satırında arka plan boşluğu/çizgi artefaktı **yok** |
| RKL-7 | Kolon bloğuna odaklan | Dikey ayırıcı çizgiler accent rengi alır |
| RKL-8 | Boş hücreli grid ile kaydet | Yazı girilmemiş `.ng-cell` / `.ng-title` **korunur** (`normalizeHtml` yemez) |
| RKL-9 | Notu kapat → yeniden aç | Toolbar 6 butonla görünür, hücreler `contentEditable=true`, resize handle'lar restore, **konsolda hata yok** |
| RKL-10 | Kolon bloğunda metin rengi uygula | `<span style="color:...">` üretilir, `sanitize()` sonrası **korunur** |
| RKL-11 | Panelde liste içi font ailesi + boyutu | **İlk denemede** uygulanır (`<li>` içindeki metne) |
| RKL-12 | Markdown kısayolları | `* `, `- ` → madde listesi; `[] ` → görev listesi; `\|\| ` → tablo; `# `, `> `, `1. ` |
| RKL-13 | Mobil (375×812) | Panel/Kolon kartları **tam genişlik + eşit**, aralarında boşluk; **toolbar görünür** |
| RKL-14 | Panel başlık bg boyama / içerik satırı bg boyama | Başlıkta **kart** arka planı; içerik satırında **seçili metin** arka planı |
| RKL-15 | `#content`'e ham `<table>` yapıştır | Makul render: `width:100%`, `border-collapse:collapse`, taşma yok |

> RKL-15 özellikle **Faz 1** için kritiktir; o fazın ana risk noktasıdır.

---

## FAZ 0 — Baseline

**Amaç:** Değişiklik yapmadan önce referans noktası oluşturmak.

### Adımlar

1. `git status` temiz mi doğrula. Değilse **DUR** ve rapor et.
2. `git rev-parse HEAD` çıktısını kaydet (rollback referansı).
3. Uygulamayı başlat, **RKL-1 … RKL-15**'i baştan sona çalıştır.
4. Her kontrolün sonucunu yaz. Baseline'da **zaten bozuk** olan bir şey varsa not et — o fazın sorumluluğu değildir, ama sonradan "biz mi bozduk" tartışmasını önler.

### Çıkış koşulu
RKL sonuçları belgelenmiş. **Commit yok** (kod değişmedi).

---

## FAZ 1 — CSS Mayını: Yetim Selektör Listesi

**Amaç:** Bu oturumda üç kez patlayan specificity çakışmasının kök nedenini kurutmak.

### Kök neden (doğrulanmış)

`Noted.html` satır **4216–4235** şu yapıdadır:

```css
/* ── Editör içi tablo stilleri ── */
#content table,
.col-panel-content table,
#content table td,
...
.layout-col table th:focus,          /* ← SONDA VİRGÜL */

/* ══ NOTED GRID SİSTEMİ (Panel · Tablo · Kolon) ══ */

/* Temel wrapper — hepsi <table class="noted-grid"> */
.noted-grid {
    width: 100%; max-width: 100%; border-collapse: collapse;
    table-layout: fixed; margin: 0;
    font-size: .93rem;
}
```

Selektör listesi **virgülle bitiyor** ve arada yalnızca yorum var. CSS ayrıştırmasında yorumlar atıldığı için tarayıcı bunu **tek bir kural** olarak görür. Ampirik kanıt (tarayıcıda `cssText` okumasıyla doğrulandı):

```
#content table, ..., .layout-col table th:focus, .noted-grid {
  width: 100%; max-width: 100%; border-collapse: collapse;
  table-layout: fixed; margin: 0px; font-size: 0.93rem;
}
```

**Sonuç:** `#content table td` (ID içerdiği için specificity **1,0,2**) grid hücrelerine `margin:0` ve `border-collapse:collapse` dayatıyor; class tabanlı grid kuralları (specificity ~0,3,3) bunu yenemiyor.

Bu tek hata şu üç bug'ın kaynağıydı: panel `border-collapse` (v1.15.103), panel mobil `margin` (v1.15.110), kolon mobil `margin` (v1.15.110).

### Adım 1.1 — Kök nedeni tarayıcıda tekrar doğrula

Değişiklik yapmadan önce, uygulamada şu probu çalıştır ve çıktıyı kaydet:

```js
(function () {
  const sheets = Array.from(document.styleSheets);
  for (const sheet of sheets) {
    try {
      for (const rule of sheet.cssRules) {
        if (rule.selectorText && rule.selectorText.includes('#content table')) {
          return rule.cssText.slice(0, 400);
        }
      }
    } catch (e) {}
  }
  return 'BULUNAMADI';
})()
```

Çıktı `.noted-grid`'i **aynı kural içinde** içeriyorsa kök neden doğrulanmıştır. İçermiyorsa **DUR** — kod bu belgeden farklıdır, rapor et.

### Adım 1.2 — Yetim listeyi kaldır, yerine kapsamlı kural koy

`/* ── Editör içi tablo stilleri ── */` çapasından `.layout-col table th:focus,` satırına kadar olan bloğu **tamamen** aşağıdakiyle değiştir. `.noted-grid { ... }` kuralına **dokunma**, olduğu gibi kalsın.

```css
        /* ── Editör içine yapıştırılan HAM tablolar (noted-grid olmayan) ──
           TARİHÇE: Buradaki selektör listesi eskiden sonu virgülle bitiyordu ve araya
           yalnızca yorum girdiği için tarayıcı bunu aşağıdaki .noted-grid kuralıyla TEK
           kural olarak ayrıştırıyordu. Sonuç: #content table td (ID → specificity 1,0,2)
           grid hücrelerine margin:0 / border-collapse dayatıyor, class tabanlı grid
           kurallarını eziyordu. Üç ayrı bug'ın kök nedeni buydu.
           Çözüm: :not(.noted-grid) — artık grid tablolarıyla HİÇ eşleşmiyor, dolayısıyla
           ID specificity'si zararsız. Bildirimler eski (kazara) davranışla birebir aynı
           tutuldu ki yapıştırılan tabloların görünümü değişmesin. */
        #content table:not(.noted-grid),
        .col-panel-content table:not(.noted-grid),
        .layout-col table:not(.noted-grid) {
            width: 100%; max-width: 100%;
            border-collapse: collapse;
            table-layout: fixed;
            margin: 0;
            font-size: .93rem;
        }
```

> **Neden `table-layout: fixed` korunuyor?** Kazara da olsa bugünkü davranış bu. Davranış-koruma kuralı gereği aynen bırakılıyor. `auto` muhtemelen yapıştırılan tablolar için daha iyi olurdu — **bu bir sonraki iş için not, bu fazda yapma.**

> **Neden hücre (`td`/`th`) kuralı yok?** Eski listedeki tek anlamlı bildirim `font-size`'dı; o da tablodan hücrelere miras kalır. Diğerleri (`width`, `border-collapse`, `table-layout`) hücre üzerinde etkisizdi.

### Adım 1.3 — Artık gereksiz kalan workaround'ları kaldır

Kök neden gittiğine göre, onu yenmek için eklenen `#content` specificity yamaları ölü ağırlıktır. **Bunları kaldırmak, kök nedenin gerçekten gittiğinin kanıtıdır.**

Şu **5 selektör satırını** kaldır (yalnızca `#content ` ile başlayan fazlalık satırı; onunla eşleşen class tabanlı satır kalsın):

| Çapa | Kaldırılacak |
|---|---|
| `.noted-grid.grid-panel` ana kuralı | `#content .noted-grid.grid-panel,` |
| Mobil panel `margin-bottom: 10px` | `#content .noted-grid.grid-panel tbody tr td,` |
| Mobil panel `:last-child` | `#content .noted-grid.grid-panel tbody tr td:last-child,` |
| Mobil kolon `margin-bottom: 14px` | `#content .noted-grid.grid-column tbody td,` |
| Mobil kolon `:last-child` | `#content .noted-grid.grid-column tbody td:last-child,` |

Bu satırların yanındaki "specificity artırıldı" açıklayıcı yorumlarını da güncelle/kaldır — artık yanlış bilgi vermesinler.

### Adım 1.4 — Doğrulama (zorunlu, runtime)

1. Adım 1.1'deki probu tekrar çalıştır → `.noted-grid` **artık aynı kuralda olmamalı**.
2. **RKL-1, RKL-4, RKL-13, RKL-15**'i çalıştır. Özellikle:
   - Masaüstünde panel kartları arası boşluk **10px** (ölç: `getBoundingClientRect`).
   - Mobilde (375px) panel `td` `margin-bottom` **10px**, kolon `td` **14px** (ölç: `getComputedStyle`).
   - Ham `<table>` yapıştır → `width:100%`, `border-collapse:collapse` korunuyor.
3. Tam **RKL-1 … RKL-15**.

**Herhangi biri başarısızsa: revert et, DUR, rapor et.**

### Çıkış koşulu
Sürüm `v1.15.111`, `Version.md` güncel, commit + push yapılmış.

---

## FAZ 2 — CSS'i `noted.css`'e Ayır

**Amaç:** 4.650 satırı (%25) dosyadan çıkarmak. Paylaşılan mutable state olmadığı için risk en düşük fazdır.

### Adım 2.1 — Taşı

1. `<style>` (satır 14) ile `</style>` (satır 4665) **arasındaki** içeriği — etiketler hariç — `noted.css` dosyasına **birebir** taşı. Tek karakter değiştirme, girintiyi olduğu gibi bırak.
2. `Noted.html`'de o bloğun yerine:
   ```html
   <link rel="stylesheet" href="noted.css">
   ```
3. `<link>` etiketi, kaldırılan `<style>` ile **aynı konumda** olmalı (satır 13'teki DOMPurify script'inden sonra, `</head>`'den önce). CSS sırası önemlidir.

### Adım 2.2 — `file://` doğrulaması (bu fazın ana riski)

> **Bu belgeyi yazan oturum bunu ampirik olarak doğrulayamadı** — tarayıcı önizleme paneli `file://` navigasyonunu engelliyor (`chrome-error://chromewebdata/`). Beklenti: `<link rel="stylesheet">` `file://` altında çalışır (`type="module"` script'lerin aksine). **Uygulayan ajan bunu doğrulamak zorundadır.**

1. `Noted.html`'i doğrudan `file://` ile aç (dosyaya çift tıklama eşdeğeri).
2. Stil uygulanıyor mu kontrol et — örn. `getComputedStyle(document.querySelector('.app-header')).background` boş/varsayılan olmamalı.
3. **Eğer `file://` altında CSS yüklenmiyorsa:** bu fazı **tamamen geri al**, CSS'i inline bırak ve rapor et. Tek dosya taşınabilirliği bu projede CSS ayrımından daha değerlidir.

### Adım 2.3 — Doğrulama

1. `http://localhost:5500/Noted.html` üzerinde tam **RKL-1 … RKL-15**.
2. Ek olarak, taşımanın sessiz kayıp yaşamadığını kanıtla:
   ```bash
   # <style> içeriği satır sayısı ile noted.css satır sayısı eşleşmeli
   wc -l noted.css
   ```
   Beklenen: **4.650** (± yalnızca dosya sonu newline farkı).
3. Konsolda 404 veya hata olmamalı (`read_console_messages`).

### Çıkış koşulu
Sürüm `v1.15.112`, commit + push. `Noted.html` ≈ 13.900 satır.

---

## FAZ 3 — JS'i Klasik `<script src>` Dosyalarına Böl

**Amaç:** Blok #1'i (10.701 satır) yönetilebilir dosyalara ayırmak.

### Neden build step YOK

`file://` altında çalışmayan şey spesifik olarak `<script type="module">`'dür. **Klasik** `<script src="x.js">`:
- `file://` altında yüklenir,
- **global scope'u aynen paylaşır** → 105 global bugünkü gibi çalışmaya devam eder,
- yükleme sırası korunursa **davranış birebir aynı** kalır.

Bu yüzden bu faz saf metin taşımadır. **`type="module"` KULLANMA. `import`/`export` EKLEME.**

### Adım 3.1 — Bölme haritasını çıkar (önce onay al)

1. Blok #1 içindeki tüm `/* ══ ... ══ */` bölüm işaretlerini listele (**80 adet** mevcut — ölçüldü):
   ```bash
   sed -n '5511,16213p' Noted.html | grep -n '/\* ══'
   ```
2. Şu kurallara uyan bir dosya haritası öner:
   - Bölme **yalnızca** top-level `══` bölüm sınırlarında yapılır. Bir bölümün ortasından bölme.
   - Hedef dosya boyutu **≤ 1.500 satır**.
   - Orijinal sıra **kesinlikle** korunur.
   - Dosya adları yükleme sırasını yansıtır: `js/01-....js`, `js/02-....js`, …
3. Haritayı **uygulamadan önce** rapor et ve onay bekle.

### Adım 3.2 — Taşı

1. Her dosya için: ilgili satır aralığını **birebir** kes-yapıştır. Tek karakter değiştirme.
2. `Noted.html`'de blok #1'in bulunduğu **tam konuma** (satır 5511 civarı, `</div>` sonrası) sıralı `<script src>` etiketlerini koy:
   ```html
   <script src="js/01-core.js"></script>
   <script src="js/02-....js"></script>
   ...
   ```
3. **Konum kritiktir:** bu script'ler `<body>` içinde, DOM markup'tan **sonra** çalışmalı; çünkü `const $title = ...` (eski satır 5654) parse anında DOM sorgular. `<head>`'e taşıma.

### Adım 3.3 — Blok #2, #3, #4

Bunlar zaten IIFE'dir ve yalnızca `window.*` ile konuşur → doğrudan kendi dosyalarına taşınabilir:

| Blok | İçerik | Hedef |
|---|---|---|
| #2 (16623→16683) | Yardım modalı | `js/help-modal.js` |
| #3 (16789→18073) | Float panel | `js/float-panel.js` |
| #4 (18077→18525) | Context menu | `js/context-menu.js` |

Her biri, HTML'de bulunduğu **kendi konumunda** `<script src>` ile değiştirilir (kendi DOM elemanlarından sonra gelmeleri gerekir).

### Adım 3.4 — Doğrulama

1. **Yükleme sırası kanıtı:** sayfada `window.__loadOrder` gibi geçici bir iz bırakmadan, konsolda hata olmadığını ve `typeof createGrid === 'function'`, `typeof saveNote === 'function'`, `typeof _setPanelColumnActive === 'function'` döndüğünü doğrula.
2. **Cross-block köprü kanıtı:** `typeof window._fpWlDetect === 'function'` ve `typeof window._openHelpOverlay === 'function'`.
3. `file://` altında da aç ve aynı kontrolleri tekrarla.
4. Tam **RKL-1 … RKL-15**.
5. Konsolda **sıfır** hata.

### Çıkış koşulu
Sürüm `v1.15.113`, commit + push. `Noted.html` ≈ 1.400 satır (yalnızca markup + script/link etiketleri).

---

## FAZ 4 — Global Konsolidasyonu

**Amaç:** 105 top-level `let/const/var`'ı birkaç namespace nesnesine toplamak. Yapısal değerin asıl bulunduğu faz.

### Neden bu faz split'ten SONRA

Split sonrası her global'in hangi dosyaya ait olduğu görünür hâle gelir; bu, gruplamayı tahmine değil gözleme dayandırır.

### Adım 4.1 — Sınıflandır

Mevcut 105 global şu kümelere ayrılır (ilk analiz):

| Küme | Örnekler | Hedef |
|---|---|---|
| **DOM cache** (~35) | `$title`, `$content`, `$editor`, `$picker`, `$toolbar`, `$slashMenu` … | `const DOM = { ... }` |
| **Uygulama durumu** (~20) | `notes`, `expandedNotes`, `editorGroup`, `themeMode`, `isDark`, `sortOrder`, `listView` | `const State = { ... }` |
| **Editör oturum durumu** (~15) | `_activeEditTarget`, `_savedToolbarSel`, `_selChangePending`, `_editorLocked`, `_snapTitle` | `const EditorState = { ... }` |
| **Sabitler** (~20) | `PALETTE`, `COLOR_LABELS`, `TEMPLATES_V2`, `SLASH_COMMAND_GROUPS`, `MD_INLINE_TRIGGERS`, `_SHAPES` | `const Const = { ... }` — **`Object.freeze`** |
| **Özellik-yerel** (~15) | `graphZoom`, `focusTimerState`, `typewriterActive`, `qsActiveIndex` | Kendi dosyasında IIFE'ye kapat |

### Adım 4.2 — Uygulama kuralları

1. **Küme küme ilerle, hepsini birden değil.** Her küme kendi commit'i olabilir (bu fazın alt-fazları).
2. En düşük riskli kümeden başla: **Sabitler** → **DOM cache** → **Özellik-yerel** → **Uygulama durumu** → **Editör oturum durumu**.
3. `_savedToolbarSel` ve `_activeEditTarget` **en son** taşınsın: bunlar bu projede yarış durumu bug'ına yol açmış en hassas iki değişkendir (v1.15.109). Taşındıktan sonra **RKL-11** özellikle tekrar koşulmalıdır.
4. Bir global `window.*` üzerinden dışarı açılıyorsa, **köprüyü koru** — başka blok/dosya ona bağımlı olabilir.
5. Her alt-adımda: `grep -n '\bDEĞİŞKEN_ADI\b' js/*.js` ile **tüm** kullanım yerlerini bul, hiçbirini atlama.

### Adım 4.3 — Doğrulama

Her alt-adımdan sonra tam **RKL-1 … RKL-15** + konsolda sıfır hata.

### Çıkış koşulu
Top-level global sayısı **105 → ≤ 15**. Ölçüm:
```bash
grep -chE '^(let|const|var) ' js/*.js | paste -sd+ | bc
```

---

## FAZ 5 — Storage Arayüzü + IndexedDB Geçişi

> **Bu, plandaki en yüksek riskli fazdır: kullanıcı notu kaybı mümkündür.** Diğer tüm fazlardan sonra, ayrı bir oturumda yapılmalıdır.

### Adım 5.1 — Arayüzü çıkar (veri katmanına dokunmadan)

1. Tüm `localStorage` erişimlerini bul:
   ```bash
   grep -n 'localStorage' js/*.js
   ```
2. Hepsini tek bir `js/storage.js` arkasına al:
   ```js
   const Storage = {
     async getNotes() { ... }, async setNotes(v) { ... },
     async getConfig(ns) { ... }, async setConfig(ns, v) { ... },
   };
   ```
3. **Bu adımda arka uç hâlâ `localStorage`.** Yalnızca çağrı yüzeyi değişir.
4. Arayüz **async** olmalıdır (IndexedDB async'tir); çağıranlar şimdiden `await`'e uyarlanır.
5. Doğrulama: tam RKL + not kaydet/yükle/sil/dışa aktar döngüsü.
6. **Ayrı commit.** Buraya kadar veri riski yok.

### Adım 5.2 — IndexedDB arka ucu

1. **Önce yedek:** geçiş kodu çalışmadan önce mevcut `localStorage` içeriğini `noted_backup_pre_idb` anahtarına **tam kopyala** ve kopyanın bütünlüğünü doğrula.
2. IndexedDB arka ucunu yaz, aynı `Storage` arayüzünü uygula.
3. **Tek yönlü, tek seferlik migration:** `localStorage` → IndexedDB. Migration bayrağı: `noted_storage_v=3`.
4. **Migration'dan sonra `localStorage` verisini SİLME.** En az bir sürüm boyunca dokunulmadan kalsın (geri dönüş yolu).
5. Kota aşımı, IndexedDB desteklenmemesi, migration yarıda kesilmesi durumlarında **`localStorage`'a geri düş** ve kullanıcıya bildir.

### Adım 5.3 — Doğrulama (veri odaklı)

1. Migration **öncesi** not sayısı, başlıklar ve toplam içerik uzunluğunu kaydet.
2. Migration **sonrası** aynı ölçümleri al → **birebir eşleşmeli**.
3. Sayfayı yenile → notlar IndexedDB'den geliyor mu doğrula.
4. Migration'ı **ikinci kez** tetiklemeyi dene → bayrak sayesinde tekrar çalışmamalı, veri bozulmamalı.
5. Dışa/içe aktarma (export/import) döngüsü çalışmalı.
6. Tam **RKL-1 … RKL-15**.

### Çıkış koşulu
Notlar IndexedDB'de, `localStorage` yedeği duruyor, geri dönüş yolu açık.

---

## FAZ 6 — Inline Yorumları `Comments.json`'a Taşı

**Amaç:** Tasarım aşamasına ait açıklamaları koddan çıkarıp tek kaynağa toplamak.

### Adım 6.1 — Envanter

```bash
# Cok satirli aciklama bloklari (tasima adayi)
grep -n '/\*' Noted.html js/*.js noted.css | wc -l
```

Her yorumu üç kovadan birine ayır:

| Kova | Ne yapılır |
|---|---|
| **Taşınacak** | "Bunu bilmeyen biri dokunursa bir şey bozulur" tipi: tuzak, gerekçe, tarihçe, sürüm notu | 
| **Kalacak** | Tek satırlık, yerel, mekanik (`/* px → rem */`, bölüm başlığı `/* ══ ... ══ */`) |
| **Silinecek** | Ölü/yanlış/kodu tekrarlayan yorumlar (`/* i'yi artir */`) |

> **Bölüm başlıklarını (`/* ══ ... ══ */`) SİLME.** Faz 3'ün bölme haritası onlara dayanıyor
> ve navigasyon değeri yüksek.

### Adım 6.2 — Taşı

Her taşınan yorum için `Comments.json`'a girdi ekle (şema: bölüm 2), sonra koddan sil.
`anchor` olarak **yorumun kendisini değil**, açıkladığı **kod satırını** seç — yorum silinince
anchor da kaybolurdu.

### Adım 6.3 — Doğrulama

1. `node tools/comments-check.js` → temiz.
2. Taşınan her açıklama için `--list` çıktısında karşılığı var mı gözle doğrula.
3. Tam **RKL-1 … RKL-15** (yorum silme kod davranışını değiştirmemeli — değiştirdiyse
   yanlışlıkla kod silinmiştir, **DUR**).
4. `git diff --stat` → yalnızca yorum satırları silinmiş olmalı, kod satırı **sıfır** değişmeli.
   Bunu kanıtla: `git diff -U0 | grep '^[+-]' | grep -v '^[+-][+-]' | grep -v '^\s*[+-]\s*\(/\*\|\*\|//\)'`
   çıktısı **boş** olmalı.

### Çıkış koşulu
Sürüm artırılmış, `Comments.json` genişletilmiş, doğrulayıcı temiz, commit + push.

---

## 4. Kapsam Dışı (bu iş emrinde YAPMA)

Bunlar bilinçli olarak ertelenmiştir. Bir sonraki iş emrinin konusudur:

- ❌ Build step (Vite / bundler) — çoklu geliştirici veya plugin hedefi somutlaşana kadar gereksiz
- ❌ `type="module"` / `import` / `export` — `file://` desteğini kırar
- ❌ Plugin / addin API'si — stabil sınırlar oturmadan tasarlanamaz
- ❌ Kullanıcı yönetimi / backend / senkronizasyon — modülerleşmeden bağımsız, çok daha büyük bir proje
- ❌ Store paketlemesi (Capacitor/Tauri)
- ❌ TypeScript'e geçiş
- ❌ Test altyapısı kurulumu
- ❌ Görsel/tasarım değişiklikleri — **proje kuralı: tasarım öğeleri onaysız değiştirilmez**

---

## 5. Rollback

Her faz tek commit olduğu için:

```bash
git log --oneline -5          # faz commit'ini bul
git revert <commit-sha>       # geri al
git push
```

Birden fazla faz geri alınacaksa **en yeniden en eskiye** doğru sırayla revert et.

Faz 5.2'de (IndexedDB) veri kaybı şüphesi varsa: `noted_backup_pre_idb` anahtarından geri yükle.

---

## 6. Bu Kod Tabanına Özgü Tuzaklar

Bu tuzaklar **`Comments.json` içinde yaşar** — burada tekrarlanmaz.
(Bu belge kendi kuralına uyar: tek kaynak, kopya yok.)

```bash
node tools/comments-check.js --list critical
```

Şu an 7 girdi var; hepsi bu projede en az bir kez gerçek bug üretmiş noktalardır:
`normalizeHtml` boş blok silme · `_restoreGrids` DOM yapısı varsayımı ·
`_savedToolbarSel` debounce yarışı · `foreColor` → `<font>` kaybı ·
yetim CSS selektörü / ID specificity · `.ng-v-wrap` kart görseli ·
`.ng-toolbar` overflow kırpması.

**Kod değiştirmeden önce bunları okumak zorunludur** (bölüm 2, çalışma kuralı 1).

---

## 7. Faz Özeti

| Faz | İş | Risk | Beklenen sonuç |
|---|---|---|---|
| 0 | Baseline + RKL | Yok | Referans noktası |
| 1 | Yetim CSS selektörü | Düşük | 3 bug'ın kök nedeni gider |
| 2 | CSS → `noted.css` | Düşük | −4.650 satır |
| 3 | JS → klasik script dosyaları | Düşük-Orta | `Noted.html` ≈ 1.400 satır |
| 4 | Global konsolidasyonu | Orta | 105 → ≤ 15 global |
| 5 | Storage arayüzü + IndexedDB | **Yüksek** | Veri katmanı modern |
| 6 | Inline yorumları `Comments.json`'a taşı | Düşük | Kod satırı azalır, açıklama tek kaynakta |

> **Faz 6 neden en sonda?** Inline yorumların toplu taşınması ancak dosya yapısı
> nihai hâlini aldıktan (Faz 3) ve kod stabilize olduktan sonra anlamlıdır; aksi hâlde
> `file` alanları iki kez güncellenir. Ancak `Comments.json` **Faz 0'dan itibaren
> mevcuttur** ve tuzak girdileriyle doludur — yani faydası ilk fazdan itibaren alınır.
