# MaarifOS 0.24.0 — öğrenci dosyası ve sınıf belgeleri

7 Eylül 2026. Bu teslimat yerel uygulama geliştirmesidir; uzak yayın yapılmadı.

## Öğretmenin kullanacağı akış

Sınıfım ekranında **Çocuk ekle** ve **Excel'den ekle** bulunur. Bir öğrenciye dokunarak öğrenci dosyası, yakınlar ve bakım/özel bilgi alanlarına ulaşılır. Sınıf işlemlerindeki **Öğrenciyi sil** açık onaydan sonra geri alınabilir arşive taşır; **Geri al** aynı öğrenciyi geçmişiyle geri getirir.

Bugün ekranı, aktif sınıftaki öğrencinin doğum gününü üç gün önce, iki gün önce, bir gün önce ve doğum gününde gösterir. Bildirim öğrenci dosyasına açılır. Bu uygulama içi hatırlatmadır; kapalı uygulamaya işletim sistemi push bildirimi eklenmedi. 29 Şubat doğumluların artık olmayan yıllardaki hatırlatması 28 Şubat'ta, açık açıklamayla gösterilir. Doğum tarihi olmayan öğrenciler için tarih tahmin edilmez.

Belgeler ekranındaki **Okula uyum rehberi · 2026–2027** kaynağında bütün sayfalar, sayfa seçimi, tam metin arama, özgün sayfa/metin görünümü ve özgün PDF açma/indirme bulunur.

## Veri bir kez girilir

| Bölüm | Kaydedilen bilgiler | Yeniden kullanımı |
|---|---|---|
| Öğrenci | Ad soyad, öğrenci numarası, isteğe bağlı geçerli T.C. kimlik numarası, doğum tarihi, okula kayıt yılı | Dosya, sınıf listesi, doğum günü |
| Anne ve baba | Ayrı ad soyad, telefon, meslek | Yakınlar ve sınıf iletişim çizelgesi |
| Diğer yakınlar | Birden çok kişi, ad soyad, yakınlık/ünvan, telefon, meslek; açıkça girilen iletişim ve teslim yetkileri | Öğrenci dosyası, ek yakınlar çizelgesi |
| Adres | Açık ev adresi | Dosya ve sınıf listesi eki |
| Çocuğa özel bilgiler | Özel not, aile durumu açıklaması, ayrı yaşama, anne/baba vefatı, şehit/gazi çocuğu | Yetkili öğretmen dosyası ve şifreli yedek |
| Bakım/sağlık | Mevcut alerji, beslenme, ilaç, acil durum ve izin bilgileri | Mevcut bakım akışları |

Alanlar isteğe bağlıdır. Telefonu henüz bilinmeyen annenin/babanın adı ve mesleği saklanabilir. Öncelikli/acil iletişim olarak işaretlenen kişinin telefonu gerekir. Dosyada bulunan bir telefon ya da yakınlık, çocuğu teslim alma yetkisi üretmez. Aile durumuna ilişkin çıkarım yapılmaz.

Yeni bilgiler profil v9 ve yedek şemasına dahildir. Özel çocuk/aile notları toplu iletişim çizelgesine otomatik eklenmez. Öğretmenin istenen belge alanlarındaki kaynak kimlik, ad, telefon ve adres bilgileri kendiliğinden maskelenmez.

## Excel aktarımı

**Dosya seç → sayfa ve başlık → sütun eşleştirme → önizle/düzelt → satır seç → sınıfa ekle.**

Kullanıcının sağladığı `VELİ İLETİŞİM BİLGİLERİ 2025.xls` yerel olarak, değiştirilmeden incelendi. Üç çalışma sayfasının biri dolu; üçüncü Excel satırındaki 13 sütun, üstlerindeki öğrenci/anne/baba/üçüncü kişi gruplarıyla otomatik eşleşir. 21 öğrenci satırı doğrulanır. İki boş ve iki öğrenci dışı son satır öğrenci olarak eklenmez. Gerçek dosya uygulama deposuna ya da test verisine otomatik alınmadı.

Desteklenen biçimler XLS, XLSX, CSV ve TSV'dir. Türkçe UTF-8 ve eski Windows-1254 metin dosyaları okunur. Bir işlemde 10 MB, 20 sayfa, 80 sütun ve 1.000 öğrenci sınırı uygulanır. Daha büyük dosya sessizce kesilmez. Başka düzende başlıklar eşleştirme ekranından değiştirilebilir; adres/özel not gibi ek sütunlar seçilebilir.

- Eksik veya geçersiz ad, tarih, kimlik ve telefon satırda açıklanır; hatalı satır kaydedilemez. Bilgi önizlemede düzeltilebilir.
- Boş tarih ve iletişim bilgileri gerçek eksik olarak kalır. Eksik doğum tarihi için doğum günü üretilemeyeceği görünür.
- Mevcut sınıf, silinen/ayrılan öğrenciler ve aynı dosyadaki diğer satırlar ad soyad, kimlik ve öğrenci numarasıyla karşılaştırılır. Kimlik ve numara çevresindeki boşluklar eşleşmeyi atlatamaz.
- `_MUKERRER_INCELE` adayları önceden seçilmez. Öğretmen ayrı öğrenci olduğunu incelediğinde seçebilir. Başka satır değişikliği veya eşzamanlı kayıt yeni eşleşme yaratırsa önceki onay geçerli sayılmaz.
- Onaylanan mükerrer adayının kaynak satırı, aday UUID'leri, UTC inceleme zamanı ve açık kararının izi öğrenci kaydında ve yedekte korunur.
- Aktarımın tamamı tek IndexedDB işlemi içindedir. İkinci satırda disk hatası bütün aktarımı geri alır. Aktif sınıf değişmişse veya eğitim yılı bitmişse işlem durur. Aynı aktarım kimliğiyle tekrar kayıt, ikinci öğrenci kopyası üretmez.
- Yeni öğrenciler sınıf üyesidir; aktarım kendi başına yoklama veya gözlem oluşturmaz.

Excel okuma bağımlılığı cihazdaki pakete dahildir; kullanıcı dosyası haricî servise gönderilmez. [SheetJS resmî kurulum ve sürüm kaynağı](https://docs.sheetjs.com/docs/getting-started/installation/nodejs/).

## Belge tasarımı

Sınıf listesi şablonu 3.0, A4 yataydır. İlk çizelgede öğrenci numarası/adı, anne adı/telefonu/mesleği ve baba adı/telefonu/mesleği ayrı sütunlardır. Devam çizelgesinde kimlik, doğum tarihi, kayıt yılı, üçüncü ve sonraki yakınlar, yakınlık/ünvan, telefon, meslek ve açık adres bulunur. Bir öğrencinin birden çok ek yakını varsa her biri kendi satırında hizalanır.

Başlık, sınıf/eğitim yılı, tarih, sütun başlıkları, sayfa numarası ve öğretmen imzası düzenlenmiştir. Ünvan **Okul Öncesi Öğretmeni** olarak düzeltilmiştir. Uzun içerik kaybolmaz; yazı ölçümüne göre devam sayfası oluşturulur. HTML mobil önizleme ve gerçek PDF indirme aynı alan sözleşmesine bağlıdır.

Örnekler tamamen kurgu verilerdir. [Belge kabul raporu](SINIF_LISTESI_MIZANPAJ_2026_09_07.md).

## Rehberin tamamlık kanıtı

- Kaynak: kullanıcının yerel `Okul Öncesi Eğitim Okula Uyum Rehberi 2026-2027.pdf` dosyası.
- Özgün PDF: **35 sayfa**, **13.514.036 bayt**.
- SHA-256: `353b9e91e3f140b96dc3e3f110815e5592a809750caa6bbb8575274a100059a4`.
- 35 sayfanın bütün görselleri ve **44.316 karakter** çıkarılmış sayfa metni; metin görünümü görsel mizanpajın yerini almaz.
- PDF, manifest ve görseller dahil 38 kaynak dosyası son derlemenin hash doğrulanan önbellek listesine dahildir. Kurulum tamamlandıktan sonra okuyucuyu ilk kez çevrim dışıyken açmak mümkündür.
- Kaynak PDF içindeki dış bağlantılar ayrıca gösterilir; dış sayfa/video içeriklerinin çevrim dışı olduğu iddia edilmez.

[Ayrıntılı rehber kabul raporu](ORIENTATION_GUIDE_INTEGRATION_2026_09_07.md).

## Doğrulama

| Denetim | Sonuç |
|---|---|
| Bütün özellik/alan testleri | 1.009 / 1.009 geçti |
| Import ve doğum günü alan testleri | 14 / 14 geçti |
| Üretim derlemesinde internet kapalı XLS aktarımı, düzeltme, yeniden açma, mükerrer ve doğum günü | 320/390 px, 3 / 3 geçti |
| Sürüm güncelleme arayüzü | 5 / 5 geçti |
| Gerçek IndexedDB çekirdek yedek testleri | 26 / 26 geçti |
| Aile/meslek/inceleme izi: şifreleme → yedek → başka depo → geri alma | 1 / 1 geçti |
| Telefon öğrenci özel bilgi ve silme/geri alma | 320 px canlı akış geçti |
| Sınıf belgesi | 33 alan/çıktı testi, Chromium/WebKit 8 / 8 |
| Belge görsel inceleme | 19 / 19 uygulama PDF sayfası; HTML baskıları dahil 42 sayfada taşma 0 |
| Rehber mobil | 320/390/430 px geçti |
| Son üretimde ilk offline rehber açılışı, 35 sayfa/metin hash, PDF indirme/görüntüleme ve engellenmiş pencere yedeği | Tam Chromium, 1 / 1 geçti; özgün PDF bütünlüğü korundu |
| PWA üretim: offline yeniden açma, 0.23.0 → 0.24.0 güncelleme, ağsız yeni süreç | 3 / 3 geçti |
| TypeScript / politika lint / runtime | Temiz; 36 korunan dosya doğrulandı |
| Derleme ve boyut bütçesi | Geçti; 74 JavaScript parçası, her biri ≤180 KiB gzip |

Sürüm paket/lock, release metadata, service worker ve runtime hashleri **0.24.0** olarak eşzamanlıdır. Yerel önizleme kullanıcı incelemesine hazırdır. Bu görev, önceki gereksinim defterindeki fiziksel iPhone/Android ve gerçek öğretmen pilotunun bütün ürün kabulü yerine geçmez.

Kalıcı ders: Bir Excel satırının yeniden düzenlenmesi diğer satırların mükerrer durumunu değiştirebilir; onay, seçildiği andaki eşleşme kümesine bağlanmalı ve yeni eşleşmede yenilenmelidir.
