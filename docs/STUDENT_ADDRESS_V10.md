# Ev adresi tasarımı — 7 Eylül 2026

Kapsam: Öğrencinin ev adresini dört dikey alanda girmek, yeniden açıldığında aynı alanlarda düzenlemek ve bütün belgelerde tek bir tam adres olarak kullanmak. Yerel uygulama sürümü 0.26.0; öğrenci profil şeması v10.

## Giriş sırası ve görünüm

| Satır | Alan | Başlangıç | Davranış |
|---|---|---|---|
| 1 | İlçe | Acıpayam | Elle değiştirilebilir veya silinebilir. |
| 2 | İl | Denizli | Elle değiştirilebilir veya silinebilir. |
| 3 | Mahalle | Boş | Yalnız mahalle adı girilir. |
| 4 | Cadde / sokak ve no | Boş | Cadde, sokak, bina ve daire numarası öğretmenin yazdığı biçimde girilir. |

Canlı önizleme sırası: **cadde/sokak ve numara → mahalle → ilçe → il**.

Örnek alanlar: Acıpayam; Denizli; Aşağı; Pancar Caddesi No: 12 / 2.

Sonuç: **Pancar Caddesi No: 12 / 2 Aşağı Mahalle Acıpayam Denizli**.

Mahalle adının sonunda Mahalle, Mahallesi veya Mah. varsa yeniden eklenmez. Türkçe büyük harfle MAHALLESİ de tanınır. Yalnız Aşağı yazıldığında önizlemeye Mahalle eklenir; kaynak mahalle alanı Aşağı olarak kalır. Bina/daire numarasının anlamı tahmin edilmez; eğik çizgi ve No: öğretmenin yazdığı biçimde korunur.

Formu açmak veya boş adresle kaydetmek, yalnız görünür varsayılanlardan adres kaydı oluşturmaz. İlk adres alanı değişikliği parçaları taslağa aktarır. Yeni öğrenciye geçildiğinde form adres modu da sıfırlanır.

## Tek kaynaktan kayıt ve belge

`careDetails.homeAddressParts` dört string alanı saklar: `district`, `province`, `neighborhood`, `streetAddress`. Aynı kayıttaki `careDetails.homeAddress`, bu parçalardan üretilmiş tam metindir. Parçalar varsa kayıtta otorite onlardır; ikisi tek değişiklikte güncellenir.

Yeni öğrenci, profil Bilgiler/Yakınlar/Güvenlik sekmeleri ve Excel satır düzenleyicisi ortak `StudentAddressField` bileşenini kullanır. Sınıf çizelgesi ve öğrenci dosyası mevcut `homeAddress` alanından aynı tam adresi okur. Öğrenci veya adres tahmini yapılmaz.

Excel dosyasındaki mevcut tek adres sütunu değişmeden aktarılabilir. Öğretmen önizlemede dört alana geçip düzenlerse `ImportCandidate.homeAddressParts`, doğrulama ve atomik toplu kayıt sırasında korunur. Satır değişikliği önceki seçimi geçersiz kılar; öğretmen düzeltilmiş satırı yeniden seçer.

## Önceki adreslerle uyumluluk

v9 ve önceki serbest metin adreslerin il/ilçe/mahalle parçaları otomatik tahmin edilmez. Bu adresler aynı metin alanında açılır. “Alanlara ayırarak düzenle” eylemi mevcut metnin tamamını cadde/sokak alanına taşır; il, ilçe ve mahalle boş başlar. İstenirse “Acıpayam / Denizli kullan” seçilebilir. “Tek metin olarak düzenle” birleşik metni koruyarak parçaları kaldırır.

Eski adres 300 karakterden uzunsa alanlara dönüşüm hiçbir karakteri kesmez. Görünür uyarı metni diğer alanlara dağıtmayı veya tek metne dönmeyi açıklar. Geçersiz taslak kaydedilmez; mevcut öğrenci kaydı korunur.

## Doğrulama ve kalıcılık

- İlçe ve il ayrı ayrı 80, mahalle 120, cadde/sokak–numara 300 karakterle sınırlıdır. Birleşik adres en fazla 500 karakterdir; uzun adres kesilmez.
- Yapılandırılmış girişte NFC, baş/son boşluk temizliği ve aradaki boşlukların birleştirilmesi uygulanır. Canlı biçimlendirici uzunluk nedeniyle hata fırlatmaz; kayıt sınırı hata mesajı verir.
- Kaydedilmiş parça nesnesi tam dört anahtarlı ve kanonik olmalıdır. Eksik/bilinmeyen alan, yanlış tip, kontrol karakteri veya parçalarla çelişen tam metin reddedilir.
- Parçalar şifreli öğrenci kaydında ve şifreli yedekte korunur. Kurtarma görüntüsü, uygulamayı yeniden açma ve farklı yerel kasaya geri yükleme aynı içeriği verir.
- Profil v10, önceki ad/soyad ve yakın bilgisi doğrulamalarını sürdürür. Genel yedek zarfı sürümü 8 olarak kalır; öğrenci profil sürümü bağımsızdır. v10'u tanımayan eski uygulamalar bu profil sürümünü kabul etmez.

## Doğrulanmış veri kanıtı

- `app/tests/features/student-home-address.test.mjs`: 8/8; örnek adres, Türkçe mahalle ekleri, NFC/boşluklar, bireysel sınırlar, 500/501, önceki profil, kayıt sınırı ve sınıf belgesinin tam adres hücresi.
- `app/tests/core/student-address-parts.spec.ts`: gerçek IndexedDB ve şifreli yedek testleri 2/2. Başlangıç, yeniden açma, kurtarma görüntüsü ve farklı kasaya geri yükleme boyunca v9/v10 değerleri korunur.
- Bağımsız incelemede bulunan v10 ad/soyad sürüm kapısı düzeltildi. Genişletilmiş negatif test 1/1; doğru checksum taşıyan yedi bozuk adres/kimlik varyantı reddedilir.
- Ayrıntılı veri kanıtı: `app/output/address-vault/address-roundtrip.json`. Kurgu test verileri kullanılmıştır.

## Son uygulama kabulü — 0.26.0

| Kontrol | Sonuç |
|---|---|
| Tüm özellik testleri | 1038/1038 geçti; `app/output/address-features.log`. |
| TypeScript ve üretim derlemesi | Geçti; `app/output/address-build.log`. |
| Korunan çalışma zamanı | 36/36 dosya; yalnız izinli sürüm metaverisi yenilendi. |
| Paket boyutu ve kod ilkeleri | 76 JS parçası, her biri gzip ≤180 KiB; dört lint kuralı geçti. |
| Üretim çıktısı ile internet kapalı gerçek arayüz | 11/11 geçti: yedi yeni adres ve dört mevcut adres/soyadı akışı; `app/output/address-production-final.log`. |
| Üretim PWA | 3/3: çevrim dışı yeniden açma, 0.25.0→0.26.0 kullanıcı kontrollü worker geçişi ve verinin korunması, internetsiz yeni tarayıcı süreci. |
| Geliştirme arayüzü | Yedi yeni adres ve sekiz mevcut hızlı kayıt/soyadı/sağlık-arşiv akışı geçti. |
| Sürüm arayüzü | Beş senaryo geçti; yeni sürüme uyarlanan bir eski test beklentisi düzeltildi. |
| Mobil mizanpaj | 320/390 px profil ve Excel ekran görüntüleri incelendi; yatay taşma yok. 320×568 ve 390×844 hızlı kayıtta Kaydet düğmesinin tamamı görünür: 2/2 kontrol geçti. `app/output/address-2026-09-07/` ve `production/`. |

Seri kayıt testinin ilk üretim koşumunda ikinci öğrenci kaydından sonra kapalı pencere görünür kalıyordu. Uygulamaya ait Çocuk ekle penceresine açık/kapalı React anahtarı eklenerek çıkış geçişi temizlendi; korunan BottomSheet bileşeni değiştirilmedi. Kapanış testinin özgün 5 saniyelik sınırı korundu; son 11 senaryonun tamamı geçti. Ayrı arşiv testindeki eksik menüyü yeniden açma adımı düzeltildi; arşiv davranışı için gereksiz üretim değişikliği bırakılmadı.

Yerel önizleme `http://127.0.0.1:4190` sürüm 0.26.0 varlık manifestini sunuyor. Kullanıcının açık formu zorla yeniden yüklenmedi. Sonraki “yayınla” talimatıyla aynı gün uzak yayın tamamlandı: [yayın makbuzu](YAYIN_0.26.0_2026_09_07.md).

Bu belge, 0.25.0 master raporunun adres alanına ilişkin uygulama ekidir. Önceki master raporunun diğer açık yol haritası maddelerini veya uzak yayın durumunu değiştirmez.
