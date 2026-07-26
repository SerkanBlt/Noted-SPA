/* ══════════════════════════════════════════════════════════════════
   Noted — Play Store ekran görüntüsü demo verisi
   ══════════════════════════════════════════════════════════════════
   NASIL KULLANILIR:
   1. Chrome'da GİZLİ PENCERE açın (Ctrl+Shift+N) — gerçek notlarınıza
      dokunmadan izole bir oturumda çalışmak için.
   2. http://localhost:5500/Noted.html adresine gidin (dev sunucu
      çalışıyor olmalı).
   3. F12 ile DevTools'u açın → Console sekmesine geçin.
   4. Bu dosyanın TÜM içeriğini kopyalayıp konsola yapıştırın, Enter'a
      basın.
   5. Ctrl+Shift+M ile "Device toolbar"ı açın, üstten bir telefon
      profili seçin (örn. "Pixel 7", ya da "Responsive" + 412x915).
   6. Aşağıdaki "SAHNELER" bölümündeki adımları sırayla uygulayıp her
      birinde Ctrl+Shift+P → "screenshot" yazıp "Capture screenshot"
      seçin — dosya doğrudan Downloads klasörünüze iner.
   7. İşiniz bitince gizli pencereyi kapatın; hiçbir kalıcı veri
      bırakmaz.
   ══════════════════════════════════════════════════════════════════ */

(function () {
    resetEditor();
    State.notes = [];

    const now = Date.now();
    function addNote(o) {
        State.notes.push({
            id: genId(), createdAt: now, updatedAt: now,
            pinned: false, colorLabel: null, tags: [], group: 'Genel',
            reminders: [], reminderNote: '', reminder: null,
            ...o
        });
    }

    addNote({
        title: 'Proje Fikirleri 2026', group: 'İş', pinned: true, colorLabel: 'blue',
        tags: ['proje', 'fikir'],
        content: '<h2>Yeni Özellik Fikirleri</h2><p>Bu çeyrekte odaklanılacak konular:</p><ul><li><span style="color:#22c55e"><strong>Takım senkronizasyonu</strong></span> — çevrimdışı-öncelikli senkron katmanı</li><li><span style="color:#3b82f6"><strong>Mobil uygulama</strong></span> — bkz. [[Mobil Yol Haritası]]</li><li>Şablon galerisi genişletme</li></ul><blockquote>Kullanıcı geri bildirimi: "Tablo blokları harika, ama daha fazla renk seçeneği isterim"</blockquote>',
        contentMd: ''
    });

    addNote({
        title: 'Mobil Yol Haritası', group: 'İş', colorLabel: 'orange', tags: ['mobil'],
        content: '<h3>Android Sürümü</h3><p>PWA temelli, TWA paketleme ile Play Store\'a hazırlanıyor.</p><ul class="todo-list"><li class="todo-item" data-checked="true">PWA altyapısı</li><li class="todo-item" data-checked="true">Dokunmatik sürükleme desteği</li><li class="todo-item" data-checked="false">Play Store yayını</li></ul>',
        contentMd: ''
    });

    addNote({
        title: 'Haftalık Planlama', group: 'Kişisel', colorLabel: 'green',
        content: '<p>Bu haftanın öncelikleri #planlama #odak</p>',
        contentMd: ''
    });

    addNote({
        title: 'Kitap Notları — Atomic Habits', group: 'Kişisel', colorLabel: 'purple',
        tags: ['kitap', 'okuma'],
        content: '<p>Alışkanlık döngüsü: <em>işaret → istek → tepki → ödül</em></p>',
        contentMd: ''
    });

    saveNotes();
    State.openGroups = ['Kişisel', 'İş'];
    localStorage.setItem('noted_groups_v1', JSON.stringify(State.openGroups));
    render();

    // Sprint Panosu — panel/kanban grid demo notu ayrıca kuruluyor
    resetEditor();
    DOM.$title.value = 'Sprint Panosu';
    DOM.$content.innerHTML = '<p>Bu haftaki görev dağılımı:</p>';
    const grid = createGrid('panel', 3);
    DOM.$content.appendChild(grid);
    const titles = grid.querySelectorAll('.ng-title');
    const labels = ['Yapılacak', 'Devam Ediyor', 'Tamamlandı'];
    titles.forEach((t, i) => { if (labels[i]) t.textContent = labels[i]; });
    const cells = grid.querySelectorAll('.ng-cell');
    const items = ['Şablon galerisi\ntasarımı', 'Play Store\nhazırlığı', 'Dokunmatik\nsürükleme desteği'];
    cells.forEach((c, i) => { if (items[i]) c.innerHTML = items[i].split('\n').map(l => '<div>' + l + '</div>').join(''); });
    saveNote();

    resetEditor();
    console.log('%cDemo veri hazır — 5 not oluşturuldu.', 'color:#22c55e;font-weight:bold;font-size:14px');
    console.log('Şimdi aşağıdaki SAHNELER adımlarını sırayla uygulayın (bkz. bu dosyanın üst kısmı).');
})();

/* ══════════════════════════════════════════════════════════════════
   SAHNELER — her birinden sonra Ctrl+Shift+P → "Capture screenshot"
   ══════════════════════════════════════════════════════════════════

   SAHNE 1 — Not Listesi
     Script çalıştıktan sonra sayfayı normal haliyle bırakın (editör
     kapalı, liste görünür). Doğrudan ekran görüntüsü alın.

   SAHNE 2 — Zengin Editör
     Konsola yapıştırın:
       editNote(State.notes.find(n => n.title === 'Proje Fikirleri 2026').id)
     Ekran görüntüsü alın.

   SAHNE 3 — Panel / Kanban Grid
     Konsola yapıştırın:
       editNote(State.notes.find(n => n.title === 'Sprint Panosu').id)
     Ekran görüntüsü alın.

   SAHNE 4 — Karanlık Tema
     Konsola yapıştırın:
       State.themeMode='dark'; applyTheme();
       editNote(State.notes.find(n => n.title === 'Proje Fikirleri 2026').id)
     Ekran görüntüsü alın.

   ══════════════════════════════════════════════════════════════════ */
