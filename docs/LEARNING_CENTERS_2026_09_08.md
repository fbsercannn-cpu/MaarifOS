# Öğrenme merkezi ve materyal rotasyonu — yerel kabul

8 Eylül 2026 · MaarifOS 0.28.0 · MR-104.

Öğretmen, Sınıfım veya Bugün → Sınıf yönetimi → Öğrenme merkezleri yolundan tarihli bir merkez düzeni oluşturur. Her merkezde ad, malzemeler, ortam gözlemi ve sonraki düzenleme bulunur. Önceki düzeni kopyalamak yeni bir taslak açar; kaydetmeden stok veya geçmiş değişmez.

## Malzeme hesabı ve işlem bütünlüğü

Her ayırma, malzeme defterinde aynı kimlikli gerçek emanet hareketini oluşturur. `Toplam = kullanılabilir + emanet + hasarlı` eşitliği korunur. Ayrılan 3 adet malzeme, başka bir merkez veya kişiye verilebilecek miktarı 3 azaltır. Gelecekte başlayacak plan da malzemeyi kayıt anında ayırır; ekran bunu bildirir. Birbirinden farklı birimler toplanmaz.

Merkez planı ile bütün malzeme hareketleri aynı şifreli veri işlemi içindedir. Bir malzeme yetersizse planın bir bölümü kaydedilmez. İki sekmenin aynı eski stok bilgisiyle kaydetmesi engellenir. Boş bir taslak açıkken etkin sınıf değişirse işlem başka sınıfa yazılmaz. Geçersiz veya önceki kayıtlardan belirgin biçimde geri kalmış cihaz saati reddedilir.

Kapanış tarihi stok iadesi üretmez. Öğretmen merkez düzenini kapattığında her emanetin yalnız kalan miktarı aynı işlemde iade edilir. Örneğin 3 adet ayırmadan 1 adet daha önce iade edilmişse kapanış 2 adet iade eder. Kapanmış merkezin iadesini geri alarak görünmeyen açık emanet yaratma engellenir. Gözlem ve sonraki düzenleme olayları geçmişte kalır.

## Ekran ve belge

390 piksel ekranda tarih, merkez ve miktar girişi; stok yetersizliği açıklaması; geçmiş düzen seçimi; gözlem kaydı; kapanış ve yeniden açılış denetlendi. Gerçek PDF önizlemesi ve indirmesi test edildi. Ortam notlarının belgeye eklenmesi öğretmenin seçimine bağlıdır. Merkez belgesi çocuk adı veya bireysel çocuk değerlendirmesi içermez.

## Kabul kanıtları

| Kontrol | Sonuç | Kanıt |
|---|---|---|
| Alan, miktar, ilişki, kaynak, kısmi iade, ters işlem ve sınıf değişimi | 12 Node testi geçti | `app/tests/features/learning-centers.test.mjs` |
| Paylaşılan stok defteriyle birlikte | 26 Node testi geçti; yukarıdaki 12 testi içerir | `app/tests/features/classroom-admin.test.mjs` |
| Gerçek mobil giriş ve kalıcılık | 1 geliştirme senaryosu geçti | `app/output/learning-centers-2026-09-08/development/` |
| Üretim paketi ve ağ kapalı yeniden açılış | 1 senaryo geçti | `app/output/learning-centers-2026-09-08/production-final.txt` |
| Ayrı ajan incelemesi | Sınıf değişimi ve saat bulguları düzeltildi; yeniden doğrulandı | `app/output/family-engagement-2026-09-08/learning-center-independent-audit.json` |
| Şifreli başka-kasa geri yükleme ve çocuk kaldırma | Merkez kimliği, miktarlar ve ortak kayıtlar korundu | `app/tests/core/enrichment-backup.spec.ts` |

Son birleşik sürümün makbuzu `SINIF_YONETIMI_KABUL_2026_09_08.md` içindedir. Bu belge uzak yayın veya fiziksel cihaz testi kanıtı değildir.
