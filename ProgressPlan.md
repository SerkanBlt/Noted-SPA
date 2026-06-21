# Noted — Ticari Yol Haritası

> Son güncelleme: 2026-06-21  
> Mevcut versiyon: v1.15.x  
> Hedef: Bireysel kullanıcıdan takım SaaS'ına

---

## Mimari Kararlar

### Depolama Evrimi
```
Şimdi       localStorage (tek JSON blob)
↓
v1.5        IndexedDB (web) + SQLite (native, Capacitor)
↓
v1.5        Şifreli sync — AES-256, sunucu şifreli blob saklar
            Anahtar = kullanıcı şifresinden türetilir (PBKDF2)
            Geliştirici dahil kimse okuyamaz
```

### Platform Evrimi
```
v1.0        Web (mevcut GitHub Pages → kendi domain)
v1.5        Capacitor ile iOS + Android + Mac + Windows Store
v2.0        Takım workspace, real-time collaboration
```

### Backend Evrimi
```
v1.0        Yok (sadece statik web)
v1.5        Supabase — Auth + şifreli blob sync + Stripe abonelik
v2.0        Supabase + CRDT tabanlı real-time (takım için)
```

### Gelir Modeli
```
Ücretsiz    Temel özellikler, sınırlı AI kullanımı
Ücretli     Sınırsız not + AI, şifreli sync, native uygulama,
            gelişmiş özellikler (takvim, kod editörü, vs.)
```

---

## Geliştirme Fazları

### 🔄 Şimdi — Devam Eden (v1.15.x)
Aktif geliştirme, tek dosya yapısı korunuyor.

- [ ] ToDo davranışları — düzeltme ve geliştirme
- [ ] AI Panel — ilave özellikler
- [ ] Not içi AI — ilave özellikler
- [ ] Mobile layout — geliştirme
- [ ] Tablo / Panel / Kolon — pürüz temizleme ve ilave özellikler
- [ ] Not duplicate etme
- [ ] Bookmark özelliğini geliştirme
- [ ] Video/imaj link hover popup (önizleme paneli)
- [ ] Sayfa arkası template'ler
- [ ] Kod bloğu — syntax highlight (Python, C#, VBA, C++, JS, vb.)

---

### 📦 v1.0 — İlk Ticari Yayın (Web)
> Hedef: App Store süreçlerine girmeden web'de kullanıcı geri bildirimi almak.  
> Önce web, iterasyon yap, sonra native.

**Ürün özellikleri:**
- [ ] İngilizce dil desteği (i18n altyapısı)
- [ ] Onboarding akışı — ilk açılış deneyimi, boş ekran sorunu
- [ ] PDF / print export
- [ ] Not import/export (Markdown, HTML)
- [ ] Notion / Obsidian / Evernote import
- [ ] Gelişmiş arama — full-text, filtreli, etiket bazlı
- [ ] Command palette (Cmd+K)
- [ ] Takvim entegrasyonu — notlara linkli, hatırlatıcı
- [ ] Add-in / Add-on platformu — kullanıcı özelleştirmesi

**Zorunlu (App Store ve hukuki):**
- [ ] Gizlilik politikası sayfası
- [ ] Kullanım şartları
- [ ] KVKK / GDPR uyumu
- [ ] Veri silme talebi akışı
- [ ] Erişilebilirlik (accessibility) — temel WCAG

**Altyapı:**
- [ ] Kendi domain'e taşıma
- [ ] Hata izleme (Sentry veya benzeri)
- [ ] Temel kullanım analitiği (gizlilik odaklı, Plausible vb.)

---

### 💰 v1.5 — Ücretli Plan + Native Uygulama
> Backend devreye girer. Abonelik başlar. Native store'lara girilir.

**Altyapı:**
- [ ] Supabase kurulumu (Auth + DB + Storage)
- [ ] Stripe entegrasyonu — aylık/yıllık plan
- [ ] Freemium sınır yönetimi (not sayısı? AI kullanımı? storage?)
- [ ] Abonelik UI — upgrade prompt, billing portal

**Depolama:**
- [ ] IndexedDB geçişi (web)
- [ ] Capacitor kurulumu — proje yapısı Vite'a taşınır
- [ ] SQLite geçişi (native)
- [ ] Şifreli sync — AES-256, Supabase'de şifreli blob
- [ ] Çoklu cihaz senkronizasyonu

**Native:**
- [ ] iOS build + App Store başvurusu
- [ ] Android build + Google Play başvurusu
- [ ] Mac App Store (opsiyonel, Capacitor ile kolay)
- [ ] Microsoft Store (opsiyonel)
- [ ] Home screen widget (hızlı not yakalama)
- [ ] Push notification (hatırlatıcılar)

**Özellikler:**
- [ ] Web clipper (tarayıcı eklentisi)
- [ ] Not versiyon geçmişi ("3 gün öncesine dön")
- [ ] Paylaşımlı notlar — tek kişiyle link paylaşımı (read-only)
- [ ] OCR — fotoğraftan metin

---

### 👥 v2.0 — Takım
> Real-time collaboration. Büyük teknik yatırım gerektiriyor.  
> Faz 1'den ~12-18 ay sonra.

**Teknik:**
- [ ] CRDT altyapısı (Yjs veya Automerge) — çakışmasız eş zamanlı düzenleme
- [ ] Takım workspace veri modeli
- [ ] İzin yönetimi (owner / editor / viewer)
- [ ] Real-time presence (kim nerede düzenliyor)

**Özellikler:**
- [ ] Takım workspace oluşturma / davet
- [ ] Paylaşımlı not — eş zamanlı düzenleme
- [ ] Yorum / mention sistemi
- [ ] Takım export/import
- [ ] Admin paneli — kullanıcı yönetimi, kullanım istatistikleri
- [ ] SSO / kurumsal giriş (SAML, Google Workspace)

---

## Mimari Notlar

### Kod Yapısı Geçişi
Şu an `Noted.html` tek dosya. v1.5 öncesi Vite'a taşınacak:
```
src/
├── index.html
├── styles/          CSS dosyaları
├── js/
│   ├── state.js     Global state
│   ├── storage.js   localStorage → IndexedDB → SQLite soyutlaması
│   ├── notes.js     CRUD
│   ├── editor.js    Editör mantığı
│   ├── ai-panel.js  AI panel
│   ├── graph.js     Bağlantı haritası
│   └── main.js      Entry point
└── capacitor.config.json
```
> **Kural:** Vite geçişi sırasında SIFIR yeni özellik eklenmez. Ayrı bir sprint.

### Şifreli Sync Prensibi
- Not verisi **hiçbir zaman** sunucu tarafında okunabilir formatta saklanmaz
- Şifreleme anahtarı kullanıcının cihazında türetilir (PBKDF2 / Argon2)
- Sunucu sadece: `user_id`, `device_id`, `encrypted_blob`, `updated_at` saklar
- Bu hem GDPR'ı kolaylaştırır hem de güçlü bir pazarlama argümanıdır

### Supabase Kullanım Alanları
| Alan | Kullanım |
|------|----------|
| Auth | Kullanıcı girişi, oturum yönetimi |
| Database | `users`, `subscriptions`, `encrypted_notes` tabloları |
| Storage | Şifreli büyük blob'lar (resim, ek dosya) |
| Edge Functions | Stripe webhook, lisans doğrulama |

### Önerilen Freemium Sınırları (tartışmaya açık)
| Özellik | Ücretsiz | Ücretli |
|---------|----------|---------|
| Not sayısı | 100 | Sınırsız |
| AI sorgu/ay | 20 | Sınırsız |
| Sync | Yok | ✓ |
| Native uygulama | Yok | ✓ |
| Versiyon geçmişi | Yok | 30 gün |
| Takvim / hatırlatıcı | Yok | ✓ |

---

## Rakip Analizi (Konumlanma)

| Uygulama | Güçlü | Zayıf |
|----------|-------|-------|
| Notion | Veritabanı, takım | Yavaş, karmaşık, veri sunucuda |
| Obsidian | Local-first, plugin | Senkron ücretli, mobile zayıf |
| Bear | Sade, Apple ekosistemi | Sadece Apple, AI yok |
| Evernote | Köklü | Ağır, eski UX |
| **Noted** | AI entegreli, local-first, şifreli sync, cross-platform | Yeni, bilinmez |

**Notlar için satış noktası:** *"Verileriniz sadece sizin — yapay zeka destekli, şifreli, çevrimdışı çalışan not uygulaması."*

---

## Karar Günlüğü

| Tarih | Karar | Gerekçe |
|-------|-------|---------|
| 2026-06-21 | Web önce, sonra native | App Store süreçleri uzun; web'de hızlı iterasyon |
| 2026-06-21 | Supabase seçildi | Auth + DB + Storage tek pakette, open source |
| 2026-06-21 | Capacitor seçildi | Mevcut HTML/JS kodu neredeyse olduğu gibi kullanılır |
| 2026-06-21 | Şifreli sync (AES-256) | Gizlilik vaadini teknik olarak güvence altına almak |
| 2026-06-21 | CRDT takım fazına ertelendi | Real-time collaboration başlı başına 3-6 aylık iş |
