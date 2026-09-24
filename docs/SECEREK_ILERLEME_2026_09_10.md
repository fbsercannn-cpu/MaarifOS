# Olay tarihi ve seçerek ilerleme — 0.36.0

Öğretmenin işi, geçmiş bir olayı doğru güne yerleştirip kaydını uygun etkinlik/program ile ilişkilendirmek ve planlamanın sıradaki basamağını yeniden metin kurmadan tamamlamaktır.

## Gözlem

Öğrenci profilinin üst bölümündeki kayıtlı gözleme dokunmak doğrudan işlem panelini açar. Arşivde her gözlemde `Tarihi ve bağlantıları düzenle` bulunur. Tarih düzeltme ham metni veya kaydın ilk oluşturulma anını değiştirmez; olay zamanı ayrı ele alınır. Destek amacıyla gelecekteki plana eklenen adım, gözlemin yaşandığı asıl etkinliğin bağlantısı olarak sunulmaz.

Kaynak, tarih veya sınıf değiştiğinde eski seçenekle yazılmaz. Kayıt bağı korunamıyorsa tarih ile uyumlu gerçek bağ seçimi gerekir. Tamamlanmış raporların kaynak bütünlüğü göz ardı edilmez.

## Planlama

Planlar'ın başında hazır sonraki adım bulunur. Aynı akış kayıtlı planlarda ve günlük planın Bugün/Kayıt Ekle/Planlar girişlerinde kullanılır. Eksik yıl, ay veya hafta basamağı hazır seçenekle oluşturulur; günlük adım gerçek plan/etkinlik kaydı üretir. Kaydetmek uygulandı, gözlendi veya değerlendirildi anlamına gelmez.

Gelişmiş düzenleme ekranları korunur. Varsayılan yol mevcut veriyi tekrar soran boş formdan başlamaz. Her adımın kaydedilen sonucu ve devam eylemi görünürdür.

## Önce / sonra

| Durum | Önce | Yeni yol |
|---|---|---|
| Kayıtlı gözleme dokunma | Gizli arşivdeki satıra kaydırma | Doğrudan tarih/bağlantı işlemleri |
| Gözlemin olay tarihi | Kayıttan sonra erişilebilir tarih işlemi yok | Bugün/Dün/tarih seçimiyle düzeltme |
| Gözlem bağlantısı | Kategori ve sonraki destek planı; asıl kaynak bağı ayrı kalabiliyor | Gerçek etkinlik/program kaynaklarını seçerek kaydetme |
| Günlük plan boş | Form açıp plan içeriğini kurma | Eksik üst basamakları tamamlayıp hazırlanmış günü kaydetme |
| Boş gözlem filtresi | Açıklama metni | Tüm gözlemleri aç veya ilk gözlemi ekle eylemi |

## Doğrulama

Uygulama testleri yalnız kurgu sınıf/çocuk kullanır. Yenileme, 320 px görünüm, kanonik kayıt ilişkileri, eski seçim, tekrar tıklama, şifreli yedek ve çevrimdışı üretim senaryoları kabul kapsamındadır. Uzak yayın, commit veya push bu görevde yetkilendirilmedi.

Son kaynak üzerinde 1.305/1.305 özellik testi, TypeScript üretim derlemesi, paket bütçesi ve politika lint kontrolü geçti. Mobil çalışma zamanı 36 korunan dosyada doğrulandı; klavye sözleşmeleri 2/2, ajan sözleşmeleri 5/5 ve çalışma zamanı kilit testleri 3/3 geçti.

Plan modeli 7/7, ilgili plan regresyonları 34/34 ve gerçek IndexedDB eşzamanlı yazım/yeniden açma testi 1/1 geçti. Gözlem modeli 6/6 ve gerçek IndexedDB bileşen testleri 2/2 geçti. Eski kategori/hazırlık bileşeni 4/4; gerçek uygulamada öğrenci silme, eski önizleme, arşiv silme, gözlemden destek planı ve ortak kayıt koruma senaryoları 5/5 geçti. Tarih kaydının hemen ardından bağlantı seçme sırasında eski seçeneklerin tekrar etkinleşmesi ve okuma hatasının yanlış yazma hatası gibi görünmesi giderildi.

390 px elle kontrolde öğrenci gözleminden tarih/bağlantı paneline erişim ve hazır hafta → günlük matematik hedefi → kaydedilmiş gün akışı doğrulandı. Başlıklar metindeki sözcük ipuçlarıyla sıralanır; doğrudan eşleşme yoksa katalog seçenekleri öneri diye sunulmaz. Öğretmen açık seçimle gerçek bağlantıyı kaydeder.

Son kaynakla `tests/click-through-ui.spec.ts` 2/2 geçti: dünün olay tarihi, gerçek etkinlik/hedef ataması, yeniden açma ve geri/ileri gezinme; yıl–ay–hafta–gün bağlantıları, planlanmış etkinlik, tam gün akışına geçiş ve mükerrersiz yenileme. Üretim paketi `tests/pwa/click-through-offline.spec.ts` 1/1 geçti: internet kapalıyken tarih düzeltme → hemen Maarif başlığı seçme → yenileme → plan omurgası → günlük plan kaydetme ve açma. Üretimde kayıtlar şifreli zarfla saklandığından kalıcılık zarf sayıları ve yeniden açılan uygulamadaki tarih/kaynak üzerinden doğrulanır.

Kalıcı çalışma kuralı: Her öneri, seçilebilir bir eyleme; her eylem, doğrulanmış kayıt sonucuna ve anlamlı bir sonraki adıma bağlanır.
