# MaarifOS 0.44.0 — kümülatif uygulama ve kabul

12 Eylül 2026. Yerel geliştirme ve üretim derlemesi; canlı 0.41.0 / Sites 37 değişmedi. Önceki [ürün planı](KUMULATIF_URUN_PLANI_2026_09_12.md) bu uygulamanın tarihsel tasarım kaydıdır.

## Öğretmenin kullanacağı yollar

| Amaç | Yol ve kalıcı sonuç |
|---|---|
| Ders sırasında kayıt | Bugün → Hızlı gözlem → çocuk → görülen davranış/not → Kaydet. İlk çocuk kendiliğinden seçilmez; olay tarihi Bugün/Dün/Tarih seç ile değiştirilir. |
| Ana sayfayı sadeleştir | Ders modu ve iki sabit kısayol cihazda saklanır. Tek öncelik kuyruğu en çok üç işi gösterir; ek işler gerektiğinde açılır. |
| Sınıf yönetimi | Sınıfım → çocuk ekle / Excel'den ekle / sınıf ve eğitim yılı. Çocuk toplamı yoklama kapsamından ayrı gösterilir. |
| Meyve ve haftanın çocuğu | Sınıfım → Meyve günü ve haftanın çocuğu → ay/gün/çocuk seç → dengeli dağıt → kaydet. Kilit/değişim/erteleme/gerçekleşme aynı sürümlü çizelgede kaydolur; takvim bağlantısı iki ayrı kayıt gibi düzenlenemez. |
| Yeni ay ve tatil değişikliği | Önceki düzeni yeni aya taşı; yalnız seçili gelecekteki görevleri uygun günlere kaydır. Önceki ay ve gerçekleşmiş işler korunur. |
| Excel'de değiştir | Çizelgenin Excel'ini indir → Veri sayfasını düzenle → dosyayı geri al → değişen satırları seç → uygula → güncel PDF al. Eski kaynak ve yanlış kimlikte sessiz üzerine yazma olmaz. |
| İdare dosyası | Belgeler → İdareye sun → günlük/haftalık/aylık/dönemlik/yıllık dönem → gerçek kayıtları seç → PDF/Word/Excel/ZIP. Eksik plan, gözlem, kapanış veya değerlendirme için ilgili işi açan düğme vardır. |
| Aile ve arşiv | Belgeler → Aileye ver / Dosyala. Önceki ev oyunu, gerçek yanıt, kapak/içindekiler/ayraç, tarihçe ve ay sonu paketi aynı kaynaklarla sürer. |
| Yarın hazır mı? | Bugün → sonraki öğretim günü kartı → gerçek gün planı, materyal, küçük grup, meyve ve aile kartı. Aynı materyal hazırlığı ikinci defa eklenmez. |
| Şifreli dosya | Ayarlar → Google hesabı ve şifreli yedek → anahtar → şifreli dosya indir / geri getir. Google gerektirmez; geri getirmeden önce kurtarma noktası alınır. |
| Google / diğer cihaz | Sunucu yapılandırıldıktan sonra giriş → ayrı Drive izni → anahtar → farkları karşılaştır → seçerek eşitle. İki cihazdaki gerçek farklı metinler gösterilir; kalıcı silmeler eski yedekten dirilmez. |

## Belge düzeni

- Okul anteti, sınıf/dönem, öğretmen adı ve unvanı ortak kaynaklardan gelir. Alanlar kendiliğinden maskelenmez veya kısaltılmaz.
- Görevlerin tarih–isim listesi dikey A4; aylık takvim yatay A4; sınıf panosu ay/sürüm bağlamını devam sayfalarında korur. Normal20uzunad örneği uygulama PDF ve Word'de1sayfa, Excel baskısında2sayfa; veri kesilmez. Yatay uzun takvim3okunur sayfadır. Her belgeyi okunamaz biçimde tek sayfaya sıkıştırma yapılmaz.
- Haftalık idare Word'ü gerçek yatay A4'tür. Dönemlik/yıllık raporda gerçek ay/kategori/durum sayılarını veren yönetici özeti ve numaralı tam kaynaklar vardır. Excel Veri/Yazdırma ayrımı ve dönem/yıl için aynı sayılı Yönetici özeti kullanılır.
- Ek 4 çocuk beceri edinim hazırlığı ile Ek 18 aylık plan kontrolü ayrı tutulur. MaarifOS haftalık/yıllık özetleri zorunlu resmî form diye sunulmaz. MEB kaynakları önceki plan ve [rapor tasarımında](TYMM_IDARE_RAPOR_ONERILERI_2026_09_12.md) kayıtlıdır.
- Çocuğun haftalık katılım kartı ad/tarih/seçilmiş etkinlikleri kullanır; isteğe bağlı fotoğraflı afiş varyantı eklenmemiştir.

## Hesap hizmetinin gerçek sınırı

[account-api](../account-api/README.md) ayrı Node/SQLite sunucusudur; mevcut statik Sites worker değiştirilmedi. PKCE, nonce, gerçek RS256 doğrulaması, HttpOnly oturum, hesap ve önceki sürüme bağlı yazım, tekrar denemede aynı Drive dosya kimliği ve atomik kayıt uygulanmıştır. Çocuk yedeği istemcide AES-GCM ile şifrelenir; sunucuya anahtar gitmez. Cihaz eşitleme tabanı yalnız hash tutar.

OAuth proje kimliği/sırrı, tam dönüş adresi ve canlı HTTPS sunucu yapılandırması sağlanmadı. Dolayısıyla gerçek Google hesabıyla giriş/Drive/kota/izin iptali ve ikinci cihaz uçtan uca kabulü tamamlanmış değildir. Testlerde gerçek RSA/SQLite ve sahte Google taşıyıcısı kullanıldı. Kurulum tamamlanana kadar arayüz bağlantıyı açıkça yapılandırılmamış gösterir. Anahtar ayrı saklanır; Google şifresi yedek anahtarı değildir. Otomatik yedek yalnız açık oturum boyunca çalışır.

## Doğrulama kanıtı

- 1.377 özellik testi başarılı; 53 sürüm/PWA/Sites/runtime/arayüz sözleşmesi başarılı.
- 36 yedek/silme/çakışma/yarın hazırlığı veri testi ve sabit öğretim gününe düzeltilen gün kapanışı yedek testi başarılı: toplam37senaryo.
- Hesap servisi14test: gerçek RSA, SQLite rollback, hesabın değişmesi, eşzamanlı cihazlar, kayıp yanıt ve aynı ayrılmış kimlikle geri kazanım.
- Cloud panel3tarayıcıtesti: yerel şifreli dosya geri getirme, hash tabanı/hesap bağı, 320px gerçek fark seçimi ve kalıcı kayıt.
- Çizelge6model+5tarayıcıtesti. PDF görselleri, gerçek Excel açma/hesaplama/baskı ve gerçek Word açma/korumasız tablo/sayfalama kontrol edildi. Görev Word'ünün Office PDF dönüşümü yanıt vermedi; bu işlem başarılı diye sayılmadı.
- İdare raporu4tarayıcıtesti, PDF/Word/Excel kaynak eşliği; gerçek Word yatay baskı PDF'si ve ekranı incelendi.
- Ana sayfa320/390px ve aktif hızlı gözlem3senaryo; yarın hazırlığı gerçek IndexedDB stale/idempotency/şifreli yedek kabulü geçti.
- ÜretimPWA3test: çevrimdışı yeniden açılış, 0.43→0.44 güncellemede veri koruma, yeni tarayıcı sürecinde ağsız soğuk açılış.

Kanıt klasörleri: [kümülatif QA](../app/output/cumulative-2026-09-12), [çizelgeler](../app/output/class-duty-qa), [raporlar](../app/output/teacher-report-center/final).

## Performansın ölçülen kısmı

Kapalı belge modülleri çalıştırılmaz; yalnız seçili panel monte edilir. Rapor, hesap ve belge üretimi gerektiğinde yüklenir. Üretim önbellek manifestosu yaklaşık9,05MB; yayımlanmış0.41.0'daki28,31MB'a göre yaklaşık%68küçük. Bu indirme/önbellek hacmidir; aynı oranda hızlanma iddiası değildir.177JavaScript parçasının her biri gzip180KiB sınırını geçti. Gerçek düşük/orta donanımlı telefon pilotu yapılmadı.

## Sonraki yeni öneriler

1. **Devamsızlıktan dönüş kartı:** Çocuğun gelmediği günlerdeki gerçek etkinliklerden iki kısa tekrar seçeneği hazırla; seçileni uygun güne yerleştir. Eksik gözlemi başarısızlık gibi yorumlama.
2. **Belge teslim defteri:** İdareye verilen ay/sürüm/ekleri tek satırda sakla. Sonradan revizyon varsa hangi dosyanın değiştiğini göster; güncel paketi yeniden hazırla.
3. **Vekâlet günü paketi:** Seçilen günün planı, malzemeleri ve yetkili teslim bilgileriyle görevli öğretmene verilecek seçmeli dosya. Paylaşılacak alanlar önizlemede açık; gönderim kullanıcının seçimiyle.

Kalıcı ders: Hazır önerinin değeri, seçildiğinde doğru tarih ve gerçek kaynağa bağlı işi kalıcı olarak tamamlamasıdır.
