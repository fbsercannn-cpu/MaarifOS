# MaarifOS Canlı Kabul ve Kalan İşler Şablonu

Bu şablon, bir işin yalnız kodda bulunmasını değil; gerçek öğretmen akışında hızlı, anlaşılır, veri koruyan ve yayımlanabilir olmasını kanıtlamak için kullanılır. Her satır kanıt görmeden **Tamamlandı** yapılamaz.

## 1. Sürüm kimliği

| Alan | Değer |
|---|---|
| Sürüm / commit | |
| Test tarihi ve saati | |
| Test eden | |
| Ortam | Yerel / Önizleme / Canlı |
| Alan adı | maarifos.com / www.maarifos.com / maarifos.net / www.maarifos.net |
| Cihaz ve işletim sistemi | |
| Tarayıcı / uygulama sürümü | |
| Ekran ölçüsü | 320×568 / 390×844 / 412×915 / tablet / masaüstü |
| Veri profili | Boş / 1 çocuk / 22 çocuk / yoğun arşiv |

## 2. Eylem kabul matrisi

Her buton, sekme, kart, bağlantı ve klavye eylemi için bir satır açılır.

| Kimlik | Ekran | Eylem | Ön koşul | Beklenen görünür sonuç | İlk geri bildirim | Kullanılabilir duruma geliş | Kalıcı kayıt kanıtı | Yenileme sonrası | Geri dönüş / hata yolu | Sonuç | Kanıt |
|---|---|---|---|---|---:|---:|---|---|---|---|---|
| Örnek | Gözlem | Kaydet | Çocuk + not seçili | Kayıt görünür, sonraki adım açılır | ≤100 ms | ≤1.000 ms | IndexedDB kayıt kimliği | Korunur | Çift tıklama tek kayıt | Bekliyor | ekran görüntüsü + test |

Performans eşikleri:

- Dokunma sonrası basılı/çalışıyor geri bildirimi: en geç 100 ms.
- Yerel ekran veya sekme değişimi: p95 en fazla 1.000 ms.
- Ağ veya belge üretimi gibi ağır eylem: 100 ms içinde durum; hedef p95 en fazla 2.000 ms.
- 200 karakter gözlem yazımı: düşük segment cihazda takılma olmadan; otomatik test bütçesi 1.500 ms.
- Hiçbir durumda aynı eylem iki kayıt oluşturmamalı; bekleyen eylem tekrar tıklamaya kapanmalı.

## 3. Öğretmenin uçtan uca çalışma zinciri

Her zincir gerçek veriyle baştan sona tamamlanır:

1. Sınıfı kur → çocuğu ekle → aile iletişim alanlarını doldur.
2. Planla → günlük akışı aç → uygulanacak adımı seç.
3. Uygula → gözlem yaz / sesle dikte et → taslağı kapat ve geri aç.
4. Kaydet → çocuğun profilinde kanıtı bul → değerlendirmeye bağla.
5. Belge hazırla → gerçek kayıtları çek → GG/AA/YYYY tarihlerini doğrula.
6. Excel / Word / PDF indir → gerçek Microsoft Office ve yazdırma önizlemesinde denetle.
7. Uygulamayı yenile → çevrimdışı aç → bağlantı gelince veri kaybı ve mükerrer olmadığını doğrula.
8. Yedek al → geri yükle → kayıt sayıları ve parmak izlerini karşılaştır.

## 4. Mobil ve erişilebilirlik kontrolü

- 320, 390 ve 412 px genişlikte yatay taşma yok.
- Uzun okul, öğretmen, çocuk ve belge adlarıyla taşma yok.
- Dolu uzun form, açılır panel, modal, klavye açık ve hata mesajlı durum ayrı ayrı denenmiş.
- Alt menü klavye veya tam ekran çalışma alanı tarafından kalıcı olarak örtülmüyor.
- Bir tam ekran çalışma alanından başka sekmeye geçince önceki katman DOM ve erişilebilirlik ağacından kalkıyor.
- Odak sırası anlamlı; Escape/geri tuşu veri kaybetmeden en yakın katmanı kapatıyor.
- Dokunma hedefleri en az 44×44 px; yalnız renk ile anlam verilmiyor.
- Ekran okuyucu adı, rolü, durum mesajı ve hata ilişkisi doğrulanmış.

## 5. Kurumsal dil ve ürün sınırı

- Kullanıcı unvanı varsayılan olarak **Okul Öncesi Öğretmeni**; yalnız kullanıcı seçerse Uzman Öğretmen veya Başöğretmen.
- Maliye, vergi, GİB veya ilgisiz kamu unvanı/metni yok.
- Resmî kurum tarafından üretilmiş/onaylanmış izlenimi veren doğrulanmamış ifade yok.
- Web sitesi tanıtım ve merak uyandırma yüzeyi; PWA/APK kurulum veya teknik barındırma kökeni göstermiyor.
- Kullanıcıya yalnız maarifos.com ve maarifos.net görünür; geliştirici hesabı ve GitHub Pages bağlantısı görünmez.
- Uygulama mağazaları hazır değilse “indir” değil, bekleme listesi / haberdar ol çağrısı kullanılır.

## 6. Yapay zekâ, hesap ve gizlilik

- DeepSeek anahtarı istemci paketine gömülü, loglanmış veya dışa aktarılmış değil.
- Varsayılan geçit ve gelecekteki kullanıcıya ait anahtar modu ayrı; bağlantı testi, kota/maliyet ve anahtar silme açıktır.
- Yapay zekâ önerisi kendiliğinden öğrenci kaydını değiştirmez; öğretmen önizleme ve açık onay görür.
- Google ve telefonla giriş gerçek sağlayıcı dönüşü, iptal, çevrimdışı ve hesap çakışmasıyla test edilir.
- Çocuk verisi için asgari veri, amaç, saklama, silme ve yedek davranışı görünürdür.

## 7. Hata sınıfları ve yayın kapısı

| Seviye | Tanım | Yayın kararı |
|---|---|---|
| P0 | Veri kaybı, güvenlik, yanlış öğrenci, giriş/kayıt tamamen çalışmıyor | Yayın durur |
| P1 | Ana öğretmen akışı çalışmıyor, buton yanıtsız, ciddi gecikme/taşma | Yayın durur |
| P2 | Alternatif yol var; dil, erişilebilirlik veya ikincil akış kusuru | Sahibi ve tarihi olmadan yayınlanmaz |
| P3 | Kozmetik iyileştirme | Sonraki sürüme planlanabilir |

Yayın ancak şu kanıtlarla açılır:

- Hedefli regresyon testleri, tip kontrolü, lint ve üretim derlemesi geçti.
- Mobil gerçek akış ve dokunma süreleri kaydedildi.
- Dört resmî alan adı aynı sürüm kimliğini gösterdi.
- Konsolda açıklanmamış hata yok; ağ çağrıları gizli anahtar/PII taşımıyor.
- Excel/Word/PDF gerekiyorsa indirilen gerçek dosya açıldı ve görsel kontrol edildi.
- Açık P0/P1 sayısı sıfır.

## 8. Kalan iş kaydı

| No | Bulgu | Seviye | Kök neden | Kabul ölçütü | Sahip | Hedef sürüm | Durum | Bağımlılık | Kanıt |
|---|---|---|---|---|---|---|---|---|---|

Durum sözlüğü: **Tespit**, **Kök neden bulundu**, **Düzeltildi**, **Otomatik test geçti**, **Canlı test geçti**, **Yayımlandı**, **Doğrulandı**. “Düzeltildi” tek başına tamamlanma değildir.
