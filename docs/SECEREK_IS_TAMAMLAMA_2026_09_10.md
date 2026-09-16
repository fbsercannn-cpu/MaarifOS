# Seçerek iş tamamlama — 0.35.0

Öğretmen gözlemi bir kez yazar. MaarifOS, kaynağa göre başlık seçeneklerini sıralar; öğretmenin seçimini kaydeder ve sonraki eğitim adımını hazır metin, plan başlığı ve tarihle sunar. Öğretmen seçtiğinde haftalık plan ile gözlem arasındaki bağlantı aynı işlemde tamamlanır. Plan kaydı, etkinliğin uygulandığı veya çocuğun değerlendirildiği anlamına gelmez.

## Kullanım

1. Gözlemi kaydet: `Gözlemden sonraki adım` açılır.
2. Başlığı seç: ham gözlem değişmeden kategoriye yerleşir; seçilen başlık görünür.
3. Hazır eğitim adımını aç ve `Seç ve haftalık plana ekle`: uygun mevcut hafta kullanılır; eksik yıl/ay/hafta kayıtları oluşturulur. Kaynak gözlem, çocuk ve değerlendirme tarihi bağlanır.
4. `Kaydedilen planı aç`: doğrudan ilgili haftaya gider ve eklenen destek adımını gösterir.

Aynı yapılabilir işler Bugün, Sınıfım, öğrenci profili ve Planlar ekranlarında da bulunur. Tamamlanan işler bekleyenler arasından çıkar. Kaynakları bulunan hazırlık listesinde öğretmen kaynakları seçer; liste oluşturulur ve her madde `Hazırladım, tamamla` ile kalıcı olarak kapanır. Seçenekler yerelde hazırlanır; gömülü üretken yapay zekâ veya dış hizmet eklenmedi.

## Kalıcı silme

`Sınıfım → Sınıf işlemleri → öğrencinin diğer işlemleri → Tamamen sil` yolu aktif öğrenciye açıktır. `Silinen / ayrılan öğrenciler` bölümünde de aynı eylem bulunur. Eski arşivleme seçeneği korunur.

Etki özeti öğrenciyi ve ilişkili kayıt sayılarını gösterir. Öğretmen onay kutusunu seçer ve kalıcı silme düğmesine dokunur. Önizlemeden sonra ilişkili veri değişirse onay geçersizdir; güncel kapsam yeniden hazırlanır. Cihaz içi kurtarma noktaları veriyle birlikte atomik olarak temizlenir. Ortak kayıtlarda diğer çocuklar korunur, hedef öğrencinin bağlantısı çıkarılır. Ortak metin içinde ayrıca yazılmış adlar anlam analiziyle ayıklanmaz; önceden indirilmiş yedekler cihaz içi silmeyle değişmez. Aktif gezi gibi mevcut güvenli kapanış şartları korunur.

Eski tekil öğrenci alanları, silinen gözlem/medya bağlantıları ve ilgili plan değerlendirmeleri de kapsamdadır. Kalan kayıtlarda silinen kimlik bulunmaması ve üretim yolunda kanonik yedek ilişki doğrulaması, veri temizliği başlamadan kontrol edilir; başarısız kontrol ana veri ve kurtarma noktalarını değiştirmez.

## Kabul kanıtı

- `app/tests/action-completion-ui.spec.ts`: gerçek uygulamada aktif silme/iptal/yenileme, eski önizlemeyi yenileyerek tamamlanan silme, arşiv silme/320 px, gözlem → başlık → plan → doğru haftayı açma.
- `app/tests/action-center-component.spec.ts`: 320 px seçim akışı, yazma kilidi, kayıt sonrası okuma hatasının doğru gösterimi, seçili hazırlık kaynakları.
- `app/tests/core/action-center-backup.spec.ts`: çevrimdışı IndexedDB, eşzamanlı tekrar ve şifreli yedek/geri yükleme.
- `app/tests/core/action-center-deletion.spec.ts`: iki çocuğun ortak haftalık planı ve geçmiş revizyonları; bir çocuk silindiğinde diğerinin desteğinin korunması; kurtarma temizliği ve şifreli geri yükleme eşitliği.
- `app/tests/core/student-permanent-deletion.spec.ts`: kalıcı silme, eski önizleme, atomik hata, ortak kayıtlar ve kurtarma temizliği.
- `app/tests/pwa/action-completion-offline.spec.ts`: üretim önbelleğinden internet kapalı ilk gözlem/plan işlemi, yeniden açma ve bağlı öğrenciyi silme.
- `app/output/action-completion-production/`: gerçek üretim ekranları; `category-and-options.png`, `saved-weekly-plan.png`, `permanent-delete-preview.png`.
- `app/output/action-completion-feature-tests.log`: genel özellik testleri; `app/output/action-completion-build.log`: üretim derlemesi.

Son doğrulama: 1.292/1.292 özellik testi; dört gerçek uygulama akışı; iki ActionCenter yedek/silme entegrasyonu; dört bileşen senaryosu üç tekrarda 12/12; kalıcı silme odak paketi 5/5; son kanonik kapıyla birleşik silme paketi 7/7; internet kapalı üretim akışı 1/1. TypeScript/derleme, lint, mobil çalışma zamanı bütünlüğü (36 dosya) ve paket boyutu sınırı geçti. Bileşen testlerinde IndexedDB'nin UUID sırasına bağlı iki beklenti, kayıt sayısını ve tam içeriği koruyarak sıra bağımsız yapıldı.

Testler yalnız kurgu sınıf/çocuk verileriyle yapıldı. Bu teslim yereldir; uzak yayın, commit veya push yapılmadı. Fiziksel telefon ve gerçek öğretmen pilotu bu teknik kabulün kapsamında değildir.

Kalıcı ders: Öneri, öğretmenin seçimiyle gerçek kaydı ve bağlantısını tamamlayıp sonucu gösterdiğinde iş yükünü azaltır.
