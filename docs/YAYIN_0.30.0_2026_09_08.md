# MaarifOS 0.30.0 — sınıf belgeleri ve yayın kabulü

8 Eylül 2026. Sites sürümü **36**, dağıtım **succeeded**. Mevcut site ve public erişim politikası korundu: https://maarifos-emine-akis-pusulasi.fbsercannn.chatgpt.site

## Kullanıcının istediği sıra

0.29 işlevsel aşaması, 914 dosyalık kabul manifestosu kapandıktan sonra görsel kod değişikliğine geçildi. Ayrı okul numarası, başlangıçta seçili 20 alan, öğrenci/dönem seçimi, PDF/yazdırma/Excel kapsam eşliği ve Türkçe belge hiyerarşisi önce tamamlandı. Ardından 0.30 canlı renkler ve font ağırlıkları uygulandı; son kontrollerden sonra mevcut siteye yayın yapıldı. Önceki 0.28 sınıf yönetimi modülleri de bu kaynak sürümünün içindedir.

“Quantum zekâ ve mantık” vurgusu; alternatiflerin karşılaştırılması, varsayımların sınanması, aralık/seçim sınırları, değişmez veri kuralları ve bağımsız doğrulama olarak uygulandı. Kuantum donanımı veya kuantum hesaplama kullanıldığı iddia edilmez.

## Son davranış ve görünüm

- Sınıf listesinde ayrı okul numarası ve bağımsız seçilebilir 20 alan bulunur. Başlangıçta tamamı seçilidir. Anne/baba/diğer yakınların adları, telefonları, meslekleri ve iletişim/adres ayrıntıları kendi alanlarıdır.
- PDF önizlemesi, PDF indirme, yazdırma ve Excel aynı öğrenci/dönem/alan seçimini kullanır. Seçilmeyen veri başlık, metadata veya rol alanından geri gelmez; boş seçim çıktı vermez. Kaynak değişimi veya pencere kapanışı geciken eski indirmeyi iptal eder.
- Belge metni koyu laciverttir. Öğrenci turkuaz, anne mavi, baba mercan, diğer yakınlar sarı ile ayrılır; grup adları ayrıca yazılıdır. Örnek kurumun logosu alınmadı.
- PDF'de gerçek gömülü Roboto 400 ve 700 kullanılır. XLSX Roboto ailesi ve kalın hücre stilleri içerir; bu bilgisayardaki Excel PDF çıktısı font adını Roboto-Regular olarak bildirir. İkisi aynı teknik font kanıtı sayılmaz.
- Türkçe başlık/etiket ve ad gösterimi bağlama göre düzenlenir; okul numarası, kimlik ve telefonlarda baştaki sıfırlar korunur. Özel aile/sağlık notları genel listeye kendiliğinden eklenmez.

## Son doğrulamalar

| Kontrol | Sonuç |
|---|---|
| Tüm özellik testleri | 1.214 geçti; hata/skip 0 |
| Sözleşmeler | 48 geçti |
| Tür, lint, korunan runtime | Geçti; 36 dosya |
| Founder üretim derlemesi ve paket bütçesi | Geçti; 128 JavaScript parçası |
| Ortak PDF arayüzü ve geciken çıktı iptali | 10 geçti |
| Bağımsız tema/font/kontrast/legacy | 4 geçti; tema kullanmayan eski PDF baytları aynı |
| Roster/engine ve belge tarayıcı dilimi | 58 Node, 7 tarayıcı geçti |
| Gerçek PDF geometri/veri kontrolü | 7 belge, 33 sayfa, 2.428 değer; kayıp/taşma/örtüşme 0 |
| XLSX ve ayrı Excel render | 5 birim; 2 dosya, toplam 16 A4 yatay sayfa; veri ve uzun adres sonu tam |
| PWA üretim | 3 geçti; çevrim dışı yeniden açılış ve yeni süreçte soğuk açılış dahil |
| Gerçek eski 0.27 → 0.30 yükseltmesi | 1 geçti; eski UI'da üretilen 2 şifreli kaydın karması aynı |
| Yükseltme sonrası çevrim dışı çıktı | 20→17→2 alan, tek öğrenci, PDF/XLSX/yazdırma ve 320/390 px geçti |
| Yayın paketine ait Sites testleri | 28 geçti |
| Canlı HTTP ve varlık eşliği | 229 varlık, manifest ve worker aynı; 3 belge rotası 200 |

Test dilimleri kısmen örtüşür; sayılar benzersiz bir toplam gibi toplanmaz. Küçük metin kontrastı en düşük **5,49:1**. Excel içerik fontu gerçek baskıda en az 8,40 pt; altbilgi dahil en az 8,04 pt. Fiziksel yazıcı veya gerçek telefon/öğretmen pilotu yapılmadı.

Gerçek yükseltme testinin ilk test sunucusu bütün yanıtlarda `no-store` gönderdiği için worker, tasarlandığı gibi önbelleği reddetti. Test sunucusunun kamuya açık dosya başlıkları düzeltildi; ürün kaynakları değiştirilmeden aynı eski/yeni dosya baytlarıyla kontrol geçti. Eski HTML, JavaScript, worker veya manifest sürüm metinleri testte yeniden yazılmadı.

## Yayın zinciri

- Kaynak commit: `5a78eb20ac0b41ef1bb617b5cce2fcd8e420df6e`.
- Sites sürümü: `appgprj_6a60733e774c8191bbeeb1cca335281d~appgver_9086f9573cb48191bbbcb994acfe8e36`.
- Dağıtım: `appgdep_6aa018814a9c81919013846e146ea5f9`; başarı zamanı `2026-09-08T14:15:41.110379+00:00`.
- Yerel gzip arşivi SHA-256: `f2f0ed124ca30abef5bc2d9e8a6eeaa8ca97baa34f2c7e1e6fc3ac9abfeaa333`; 24.067.883 bayt, 238 dosya.
- Sites depolaması açılmış tarı tutar: `sha256:3cd8701a595257aad35cd8672e51069bfdd86c4d31f61836b18c71ba489e51d8`; 30.607.360 bayt. Farklı sıkıştırma katmanlarının karması aynı olmak zorunda değildir.

Kaynak 793 dosya olarak ayrı Sites deposuna birebir kopyalandı, derleme sonrası kaynak eşliği kontrol edildi ve özel kaynak dalına itildi. Ana GitHub deposuna push yapılmadı. Yayın derlemesinin 237 çalışma dosyası doğrulanan derleme ile aynıdır. Yalnız boş `client/resources` dizininin kopyada bulunmaması dizinleri de sayan build attestation karmasını farklılaştırır; her iki attestation kendi gerçek ağacına karşı doğrulandı.

Paket, proje kuralına uygun ayrı staging alanında oluşturuldu. Tek opak HTML shell vardır; kamuya açık `dist/client/index.html`, kaynak/test dosyaları, gerçek öğrenci XLS'si veya gizli anahtarlar pakete alınmadı. Kullanıcının örnek XLS dosyası okunur kaynak olarak kaldı ve karması değişmedi.

## Kanıtlar

Kanonik sonuçlar `app/output/class-roster-vibrant-2026-09-08/final/acceptance-receipt.json` ve `sha256-manifest.json` dosyalarında toplanır. Canlı kanıtlar aynı kökün `live/` dizinindedir. Önceki 0.29 makbuzları tarihsel kanıt olarak korunur.

- [İşlevsel sınıf listesi kabulü](SINIF_LISTESI_V5_KABUL_2026_09_08.md)
- [Canlı tasarım ve mantık değerlendirmesi](SINIF_BELGELERI_CANLI_TASARIM_2026_09_08.md)
- [PDF görsel kabulü](CLASS_ROSTER_V6_VIBRANT_QA_2026_09_08.md)
- [Excel gerçek baskı kabulü](CLASS_ROSTER_VIBRANT_XLSX_2026_09_08.md)

Kalıcı ders: Görsel iyileştirme, tamamlanmamış işlevsel kabulün önüne geçirilmez; ikisi ayrı kanıtlarla kapanıp birlikte yayımlanır.

Canlı arayüz kapanışı: mevcut yetkili in-app sekmede 0.27 güncelleme düğmesiyle 0.30 açıldı. Bir kayıtlı çocuk görünümü korundu; yirmi alanın başlangıçta seçili olduğu, okul numarası, yakın/adres grupları, etkin Yazdır/Excel/PDF düğmeleri ve gerçek tek sayfalı renkli v6 PDF önizlemesi görüldü. Öğrenci kayıtları düzenlenmedi. Yeni yalıtılmış tarayıcı bağlamı beklenen davet kodu kapısında durduğu için o bağlamdaki giriş sonrası canlı akış NOT_RUN_ACCESS_GATE olarak ayrılır; erişim kapısı aşılmadı. Çevrim dışı tam dışa aktarma kabulü gerçek founder üretim derlemesinde geçti.
