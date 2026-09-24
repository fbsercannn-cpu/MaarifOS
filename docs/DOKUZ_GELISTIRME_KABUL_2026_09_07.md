# MaarifOS — dokuz geliştirme uygulama ve kabul kaydı

İstek: Dokuz ek önerinin tamamını uygula, test et ve mevcut yayın adresinde yayımla. Başlangıç sürümü 0.26.0 / Sites 34. Bu dosya, test sonucu oluşmadan başarı beyan etmez.

| Kimlik | Zorunlu kapsam | Gözlenebilir kabul ölçütü |
|---|---|---|
| MR-087 | Yedek ve kurtarma güvencesi | Bütün koleksiyonlar ve kurtarma depoları cihazda şifreli; eski veri geçişi kesintiye dayanıklı; fotoğraflı yedek gerçek geri yükleme yolu ile sayım/SHA-256 mutabakatından geçer; kapasite sınırı kayıt kaybetmeden açıklanır. |
| MR-088 | Açıklanabilir devam hesapları | Ortak takvim ve üyelik çözümleyicisi bütün devam paydalarında kullanılır; gün bazında sayılan, dışlanan ve işaretlenmeyen kayıtlar ile gerekçeleri açılır. |
| MR-089 | Gerçek PDF önizleme | Çıktıların gerçek PDF Blob'u önizlenir, aynı Blob indirilir/paylaşılır; kapsam değişimi eski önizlemeyi geçersiz kılar; iletişim, acil durum ve bireysel dosya şablonları test edilir. |
| MR-090 | İletişim güncelliği | Telefon/adres/teslim kişisi ayrı doğrulanır; veli güncelleme kaynağı ve tarih saklanır; sonraki değişiklik eski doğrulamayı geçersiz gösterir; eksikler doğrudan profile açılır. |
| MR-091 | Günlük teslim | Yalnız güncel yetkili kişiyle gerçek tarih-saatli teslim; ikinci teslim gerekçeli düzeltme gerektirir; profil yetki değişiklikleri aynı transaction içinde tarihçelenir. |
| MR-092 | Veli görüşmesi ve takip | Katılanlar, görüşme, karar ve takip tarihi çocukla saklanır; sonuç eklenince hatırlatma kapanır veya yeni tarihe taşınır; önceki kayıt korunur. |
| MR-093 | Haftalık hazırlık | Seçilen gerçek plan/etkinlik malzemeleri kaynakları korunarak birleştirilir; ön hazırlık, son tarih ve tamamlama saklanır; eksik malzeme bilgisi uydurulmaz. |
| MR-094 | Uyum rehberi takibi | Öğretmenin seçtiği adım özgün 35 sayfalık rehberin sayfa ve SHA-256 bilgisine bağlanır; tarihli gözlem, devam/tamamlama ve takip işlenir. |
| MR-095 | Gözlemden sonraki adım | Mevcut çocuk gözlemlerinden öğretmen kararı oluşturulur; gelecek hafta taslağına açık seçimle taşınır; plan revizyonu ve bağlantı atomiktir; uygulama sonrasında değerlendirme yazılır. |
| MR-096 | Son yayın | Güncel kaynakta gerekli testler ve mobil/çevrim dışı kontroller tamamlanır; sabit kaynak commit'inden üretilmiş paket mevcut Sites projesinde yayınlanır; canlı sürüm doğrulanır. |

Veri tasarımı: MR-090–095 kayıtları `settings` koleksiyonunda `teacher-followup-v1` ayar türü ve 13 ayrık, kesin alanlı olay sözleşmesiyle saklanır. Yedek veri şeması 9; eski 1–8 yedekleri kontrollü geçişten sonra açılır. Öğretmen olayları değiştirilmez; düzeltme ve sonuç yeni olaydır. Kaynak gözlemler ve önceki plan revizyonları korunur.

Etki zinciri: alan sözleşmesi → repository → şifreli cihaz deposu → yedek/geri yükleme → öğretmen takip ekranları → bugün hatırlatmaları/haftalık plan → belge çıktıları → PWA önbelleği → yayın paketi.

Yerel ve canlı kabul tamamlandı: MR-087–096 için SHA-256 ile doğrulanan on gereksinim paketi READY. Son kaynakta on bileşen ve 113 değişen dosyayı kapsayan etki haritası VALID; gerekli test kümeleri kanıtlara bağlıdır. 0.27.0 / Sites 35 mevcut adreste yayımlandı; dağıtım succeeded. Canlı manifest, ana uygulama dosyası ve PDF worker hashleri test edilen üretim derlemesiyle eşleşti; sınıf HTML rotası 200 ve PDF worker MIME türü text/javascript.

## Kullanım ve teslim

- Bugün ve Sınıfım ekranlarındaki **Öğretmen takipleri** iletişim, teslim, görüşme, hazırlık, uyum rehberi ve öğretmen kararlarını tek defterde açar. Çocuk profilindeki **İletişim ve öğretmen takibi** seçili çocukla açılır.
- Telefon, adres ve teslim kişileri ayrı doğrulanır. Değişen alan eski doğrulamayı güncel saymaz. Günlük teslim yalnız mevcut yetkiliyle yapılır; düzeltme gerekçesi ve geçmiş korunur.
- Veli görüşmesi, rehber adımı ve hazırlık son tarihleri uygulama içi Bugün hatırlatmalarına bağlanır. Bunlar işletim sistemi push bildirimi veya otomatik veli mesajı değildir.
- Haftalık hazırlık gerçek seçili plan/etkinlik kaynaklarından gelir; ölçü veya miktar uydurulmaz. Kaynaklar, kontrol listesi ve tamamlanma kaydedilir.
- Gözlemden öğretmenin yazdığı destek kararı oluşturulur, açık eylemle gelecek hafta planının revizyonuna eklenir ve uygulama sonrası öğretmen değerlendirmesi alınır. Çocuk hakkında otomatik gelişim hükmü üretilmez.
- Yoklama açıklamasında takvim, sınıf üyeliği, işaretlenen/eksik/dışlanan günler görünür. Eksik yoklama otomatik devamsızlık sayılmaz.
- Belge oluşturma gerçek PDF önizlemesini açar. Şablon, alan, çocuk ve dönem seçimi yeni dosya üretir; eski dosyadan indirme engellenir. Tek öğrenci tek A4, uzun veli ve ek yakın bilgileri çok sayfada okunaklı satır gruplarıyla basılır.
- Hesap ve veri güvenliğindeki kurtarma alanı kapasiteyi, koleksiyon sayılarını ve gerçek yedek doğrulamasını gösterir. Bütün koleksiyonlar ve kurtarma gövdeleri cihazda şifrelidir. Kalıcı öğrenci silme ilgili destek adımlarını planların bütün revizyonlarından temizler.

## Nihai yerel test kanıtı

| Kontrol | Sonuç |
|---|---:|
| Özellik testleri, çalışma alanı | 1075 / 1075 |
| Aynı özellik testleri, izole yayın kaynağı | 1075 / 1075 |
| Sites/PWA/arayüz/runtime sözleşmeleri | 48 / 48 |
| Şifreli kasa, yedek, silme, mobil kurtarma | 51 benzersiz tarayıcı testi |
| Öğretmen takiplerinin altı gerçek kayıt akışı | 6 / 6 |
| Takvim ve yükleme yerleşimi, mobil | 5 / 5 |
| Gerçek PDF önizleme, kapsam, yarış ve hata | 7 / 7; son mizanpaj tekrarı 2 / 2 |
| Adres/soyadı/Excel, üretimde ve çevrimdışı | 11 / 11 |
| Üretim yoklama ve PDF | 2 / 2 |
| 13 tür yedeği → üretim UI → çevrimdışı kayıt → aynı PDF | 1 / 1 |
| Üretim PWA, sürüm geçişi ve ağsız soğuk başlangıç | 3 / 3 |
| Son sürüm UI, öğretmen planı/Word/PDF ve küçük şifreli yedek regresyonu | 9 / 9 |
| TypeScript, dört lint kuralı, 36 korunan runtime dosyası, bundle bütçesi | Geçti |

Satırlar örtüşen regresyon tekrarları içerir; toplam bağımsız test sayısı diye toplanmaz. Yedek gerçek ayrı IndexedDB deposunda 60 sentetik çocuk/fotoğraf ve yaklaşık 24 MB içerikle; bütün 20 koleksiyonda sayım/hash eşitliğiyle doğrulandı. Özgün 35 sayfalık rehberin içerik ve hash bağı korunur.

Kanıtlar `app/output/completion-2026-09-07/` altında; merkezi son kabul `acceptance-live/`, yayın öncesi kabul `acceptance-local-final/`, alt raporlar `security/`, `documents/`, `calendar/`, `teacher-followup/` dizinlerindedir. Eski başarısız koşular teşhis izidir; nihai PASS sonuçları merkezi dosyada seçili ve hash ile sabittir. Yayın makbuzu `app/output/publish-0.27.0-receipt.json`; yayın özeti `YAYIN_0.27.0_2026_09_07.md`.

Test sınırı: Tarayıcı otomasyonu ve sentetik verilerle doğrulama yapıldı. Fiziksel düşük bellekli telefon pilotu ve dış güvenlik sertifikasyonu bu çalışmanın sonucu olarak iddia edilmez. Hiçbir yazılım için sıfır hata garantisi verilmez; belirtilen kabul kapsamındaki bilinen hatalar kapatıldı.
