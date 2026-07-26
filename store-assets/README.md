# Play Store Mağaza Listesi Materyalleri

Bu klasör, Google Play Console'un mağaza listesi adımında ihtiyaç duyulan
materyalleri içerir. Uygulamanın kendisiyle (Noted.html) hiçbir ilişkisi
yoktur — service worker (`sw.js`) bu klasöre dokunmaz, PWA önbelleğine
girmez.

## İçerik

| Dosya | Ne için | Durum |
|---|---|---|
| `store-listing-tr.txt` | Kısa + uzun açıklama (Türkçe) | Hazır, doğrudan yapıştırılabilir |
| `feature-graphic-1024x500.jpg` | Zorunlu banner görseli | Hazır, doğrudan yüklenebilir |
| `demo-data-script.js` | Ekran görüntüsü almak için demo veri + adımlar | Hazır — kullanım talimatı dosyanın içinde |

## Eksik olan — sizin tamamlamanız gereken

- **Ekran görüntüleri (telefon, en az 2 adet):** `demo-data-script.js`
  içindeki talimatları izleyerek Chrome DevTools'un "Capture screenshot"
  komutuyla kendiniz alacaksınız — gizli pencerede çalıştığı için gerçek
  notlarınıza dokunmaz.
- **512×512 uygulama ikonu:** `../icons/icon-512.png` zaten var, Play
  Console'un "App icon" alanına doğrudan yüklenebilir.
- **İçerik derecelendirme anketi:** Play Console içinde doldurulur,
  önceki sohbette verilen rehbere bakın.
