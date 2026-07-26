# Noted-SPA — Ajan Talimatları

Türkçe bir not alma SPA'sı. Kullanıcıya dönük tüm metin (UI, commit, belge) **Türkçe**dir.

## Proje şekli

| Dosya | Ne |
|---|---|
| `Noted.html` | **Uygulamanın tamamı** — HTML + CSS + JS tek dosyada (~18.5k satır) |
| `Comments.json` | Kod dışı yorum veritabanı (aşağıya bak) |
| `tools/comments-check.js` | `Comments.json` doğrulayıcı |
| `REFACTOR_PLAN.md` | Modülerleşme iş emri (6 faz) — yapısal iş buradan yürür |
| `Version.md` | Sürüm geçmişi — her sürümde güncellenir |
| `Noted_System.md` | Uygulama içi AI asistanının sistem mesajı (uygulama kodu değil) |
| `ProgressPlan.md` | Ticari yol haritası |
| `server.js`, `start_noted*.{bat,ps1}` | Yerel sunucu yardımcıları |

Dev sunucu: `.claude/launch.json` içindeki **"Noted SPA"** (port 5500). Uygulamayı çalıştırmak
için `preview_start` kullan, `Bash` ile sunucu başlatma.

## Kod değiştirmeden ÖNCE — zorunlu

```bash
node tools/comments-check.js --for Noted.html
```

`critical` girdileri **oku**. Bunlar bu kod tabanında en az bir kez gerçek bug üretmiş
noktalardır (sessiz veri kaybı, not açılışının yarıda kesilmesi, biçimlendirmenin
hiç uygulanmaması gibi). Tuzakların listesini buraya kopyalama — tek kaynak `Comments.json`.

## Kod değiştirdikten SONRA — zorunlu

```bash
node tools/comments-check.js     # temiz dönmeli; kayma varsa --fix
```

Yeni bir açıklama yazacaksan **koda inline yorum ekleme**, `Comments.json`'a girdi ekle.
Ölçüt: *"Bunu bilmeyen biri buraya dokunursa bir şey bozulur mu?"* → evet ise `Comments.json`.
Tek satırlık mekanik notlar ve `/* ══ bölüm başlıkları ══ */` kodda kalır.

`Comments.json`'da **`anchor` otoritedir, `line` yalnızca ipucudur** — satır numaraları kayar.

## Sürüm ritüeli

Her davranış değişikliğinde sürüm artırılır ve **5 yerde** güncellenir (`Noted.html`):

1. Satır 2'deki HTML yorumu — **açıklama metnini de güncelle**, sadece numarayı değil
2. `<title>`
3. `.hm-app-ver`
4. `.hm-ver`
5. Yardım modalındaki `<h2>`

Ardından `Version.md`'ye giriş ekle.

## Doğrulama

**"Söz dizimi hatası yok" veya "dosya yazıldı" doğrulama değildir.** Değişikliği çalışan
uygulamada sür ve gözlemle: hücreye tıkla, kaydet, notu kapatıp aç, mobil boyutta bak.
Ölçülebilir kanıt kullan (`getComputedStyle`, `getBoundingClientRect`), göz kararı değil.

Bu kod tabanında bug'lar sessizdir — kaydedilen içeriğin kaybolması, `editNote()`'un
yarıda kesilmesi, biçimlendirmenin hiçbir şeye uygulanmaması gibi. Hiçbiri konsola
hata basmaz. Bu yüzden gerçek kullanıcı akışını sürmek şart.

## Commit + push

Her tamamlanmış değişiklikten sonra commit **ve** push (GitHub Pages'e deploy oluyor).

Commit mesajını **Bash heredoc** ile yaz, PowerShell here-string ile değil — bu projede
bir kez karakter bozulmasına yol açtı. Commit sonrası `git log -1 --format=%B` ile doğrula.

## Bu projeye özgü kısıtlar

- **`<script type="module">` KULLANMA.** `file://` altında CORS nedeniyle yüklenmez ve
  uygulamanın "tek dosyayı indir, çalıştır" özelliğini kırar. Dosya bölmek gerekiyorsa
  klasik `<script src>` kullan — global scope'u paylaşır, `file://` altında çalışır.
- **Yeni ID tabanlı CSS selektörü ekleme.** Bu dosyada ID specificity üç ayrı bug üretti;
  detay `Comments.json` → `trap-orphan-selector-list-id-specificity`.
- **Mevcut tasarım öğelerini onaysız değiştirme.** Renk, boşluk, tipografi, yerleşim
  değişikliği önerilir — kararı kullanıcı verir.
- **Yeni element eklerken z-index çakışmasını kontrol et.** Mevcut en yüksek üçlü:
  `#snack-container` = 99999, `.ctx-sub-panel` = 99600, `#ctx-menu` = 99500.
- Yapısal/modülerleşme işi için önce `REFACTOR_PLAN.md` oku; oradaki faz sırası ve
  değişmez kurallar bağlayıcıdır.
