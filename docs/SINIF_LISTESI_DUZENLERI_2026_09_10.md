# Kullanım amacına göre sınıf listeleri — 0.39.0

Sınıfım → Sınıf işlemleri ve Belgeler ekranlarında üç gerçek hazırlama eylemi bulunur:

| Eylem | Hazırlanan çıktı |
| --- | --- |
| Sınıfta kullan | Dikey A4; sıra, okul numarası, geniş öğrenci adı ve beş boş işaret sütunu. |
| İletişim için hazırla | Yatay A4; öğrenci kimliği, anne, baba ve diğer yakın bilgileri öğrenciye bağlı bloklarda. |
| Ayrıntılı döküm al | Dikey A4; seçilmiş tüm kayıt alanlarının etiketli öğrenci dökümü. |

Amaç seçimi alanları ve sayfa düzenini hazırlar, gerçek PDF önizlemesini açar. Önizlemede sayfa düzeni değiştirildiğinde öğrenci, dönem ve alan kapsamı korunur. Günlük düzende seçilmiş ek alanlar ayrıntı bölümüne alınır; sessizce atılmaz. Bireysel/acil kart şablonlarında sınıf listesi düzeni uygulanmaz. Klasik çizelge ve eski kısa iletişim çıktıları kullanılabilir.

Excel'de seçilmiş veri sayfası korunur; baskı sayfası sabit kayıt anahtarlarıyla bu veriye bağlıdır. Kaynak sıralanınca ilişkiler korunur; isim ve telefon düzeltmeleri yeniden hesaplamayla baskıya yansır. Eksik veya mükerrer anahtar yanlış öğrenci değeri göstermeden görünür hata üretir. Üç yeni çıktı dosya adındaki Gunluk, Iletisim ve Ayrintili bölümleriyle ayrılır.

## Kabul

- Kurgu verilerle gerçek uygulama ekranından üç amaç seçildi; her birinde doğru PDF sayfa yönü, seçilmiş iki öğrenci ve gerçek XLSX indirmesi doğrulandı. Geliştirme 390 px; derlenmiş uygulama internet kapalıyken ayrıca sınandı. `app/tests/roster-purpose-ui.spec.ts`.
- Günlük, iletişim ve ayrıntılı örneklerin dört PDF sayfası Poppler ile görüntülenip incelendi. Kanıt: `app/output/roster-redesign/`.
- Microsoft Excel'de 24 gerçek yeniden hesaplama, kaynak düzenleme, sıralama ve baskı kontrolü geçti. İletişim örneği normal sayfada üç öğrenci bloğu içerir; uzun adlar ve çok sayıda yakın içeren 15 öğrencilik örnek altı sayfadır. Günlük işaretleme boşlukları, ayrıntı alanları ve devam sayfaları kontrol edildi. 12 Excel testi geçti. Kanıt: `app/output/roster-layouts-xlsx/`.
- Zorlayıcı iletişim PDF'sinin son yedi sayfasının tamamı görsel olarak denetlendi; son uzun öğrenci, adresi ve imza aynı sayfada kaldı. İmza için ayrı boş sayfa üretilmiyor. Nihai kanıt `app/output/class-roster-layouts-2026-09-10/renders-contact-final/` klasöründedir; `renders-contact/` önceki tasarımın karşılaştırma kanıtıdır.

Son ortak kabul: 1.324/1.324 özellik testi, TypeScript, politika lint, üretim derlemesi, 140 JavaScript parçasının paket bütçesi ve 36 korunan çalışma zamanı dosyası geçti. Mevcut 14 PDF önizleme senaryosu ve yeni üç amaç akışı başarılıdır. Son üretim kabulü 320 px ekranda internet kapalıyken hem Sınıfım hem Belgeler'den gerçek PDF/Excel hazırladı.

Zıt yönde kayıtlı okul şablonlarıyla da amaç düzeninin sayfa yönü korunur; okul bilgileri değiştirilmez. PDF tamlık testinde uzun kelimelerin sütunlar arasında karışmasını önlemek için ham metin akışı kullanılır; sayfa düzeni ve telefonun aynı satırda kalması ayrıca konumlu metinle denetlenir.

Testler gerçek çocuk verisi kullanmaz. Kalıcı veri şeması ve yedek biçimi değişmedi. Bu sürüm yereldir; uzak yayın yapılmadı.

## Sonraki geliştirme önerileri — henüz uygulanmadı

1. **Desteği sonuçlandır:** değerlendirme tarihi gelen destekte önceki ve sonraki gerçek gözlemleri göster; aynı desteği gelecek haftaya taşı, yeniden gözlem planla veya takibi kapat seçimiyle ilgili kayıtları birlikte tamamla.
2. **Belgeyi aynı seçimle yenile:** kaynak değiştiğinde pencereyi yeniden kurdurmak yerine değişen kayıt sayısını ve güncelle eylemini sun; düzeni, dönemi ve seçilmiş çocukları koruyarak yeni sürüm üret.
3. **Gözlem odağını plana yerleştir:** az gözlem kaydı bulunan çocuklar için mevcut günlük etkinliklerden uygun seçenek hazırla; seçilince çocuklar ve etkinlik planın gözlem odağına yazılsın.
4. **Görüşme hazırlığını tamamla:** aile görüşmesi seçilen desteği mevcut veli bilgisi ve uygun zamanlarla birleştir; seçilen yerel görüşme hazırlığını ve kaynak bağlantısını kaydet, davet belgesini hazırla.
5. **Ay sonu dosyasını hazırla:** gerçekten mevcut planlar, kaydedilmiş değerlendirmeler ve seçilmiş belgelerden içerik listeli bir çıktı paketi oluştur; eksikleri somut hazırlama adımlarına bağla.

Öncelik önerisi 1 ve 2'dir: mevcut işlemin devamını öğretmene yeniden kurdurmadan tamamlar. Gelişim sonucu, gerçekleşmiş etkinlik, resmî randevu veya gönderilmiş davet uydurulmaz.
