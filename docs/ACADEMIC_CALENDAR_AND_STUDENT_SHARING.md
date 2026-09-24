# 2026–2027 Eğitim Takvimi ve Öğrenci Paylaşım Merkezi

## Kapsam

Bu dikey dilim MaarifOS’a şu yetenekleri ekler:

- MEB 2026–2027 çalışma takviminin kaynaklı görünümü
- Okul öncesi uyum günlerini öğretmen tarafından işaretleme
- Veli toplantısı, meyve günü, etkinlik ve genel sınıf notları
- Eğitim yılı değişiminde eski kapsamı arşivleyip öğrencileri yeni kapsama taşıma
- Öğrenciyi geri alınabilir biçimde arşivleme veya açık ad doğrulamasıyla kalıcı silme
- WhatsApp, okul idaresi, rehberlik, veli, ChatGPT ve Gemini amaçlarına göre öğrenci dosyası
- Haricî yapay zekâ geri bildirimini ayrı ve değişmez kaynak metin olarak öğrenciye kaydetme

## Resmî 2026–2027 tarihleri

Kanonik kaynak MEB’in “2026–2027 Eğitim Öğretim Yılı Takvimi Açıklandı”
duyurusudur:

<https://meb.gov.tr/2026-2027-egitim-ogretim-yili-takvimi-aciklandi/haber/41057/tr>

Uygulamada kullanılan temel tarihler:

- Öğretmenlerin mesleki çalışmaları: 1 Eylül 2026
- Okul öncesi uyum eğitimi: 7–11 Eylül 2026
- Birinci dönem: 14 Eylül 2026–22 Ocak 2027
- Birinci ara tatil: 16–20 Kasım 2026
- Yarıyıl tatili: 25 Ocak–5 Şubat 2027
- İkinci dönem: 8 Şubat–25 Haziran 2027
- İkinci ara tatil: 8–12 Mart 2027
- Eğitim öğretim yılı sonu: 25 Haziran 2027

Kaynak kontrol tarihi 29 Temmuz 2026’dır. İl veya okul düzeyindeki ek kararlar
öğretmen takvim notu olarak ayrıca kaydedilir; resmî MEB olayı gibi gösterilmez.

## Eğitim yılı geçiş sözleşmesi

Kullanıcı etkin eğitim yılının adını veya tarih aralığını değiştirdiğinde aynı
veri kapsamı üzerine yazılmaz. Açık onaydan sonra tek transaction içinde:

1. Önceki eğitim yılı ve sınıf arşivlenir.
2. Önceki üyelikler kapanır.
3. Yeni UUID değerleriyle eğitim yılı ve sınıf oluşturulur.
4. Seçilen etkin öğrenciler yeni üyelikle taşınır.
5. Etkin sınıf ayarı yeni kapsama geçirilir.

Eski gözlem, portfolyo, değerlendirme ve dışa aktarım kayıtları önceki kapsamı
korur. Transaction başarısız olursa hiçbir kısmi geçiş kalmaz.

## Takvim veri modeli

`calendarEntries` öğretmen kayıtlarını tutar. Türler:

- `general_note`
- `parent_meeting`
- `fruit_day`
- `activity`
- `adaptation_day`
- `official_marker`

Durumlar `planned`, `completed` ve `cancelled` değerlerinden biridir. Her kayıt
etkin `academicYearId` ve `classroomId` kapsamına bağlıdır; tarih aralığı etkin
eğitim yılı dışına çıkamaz.

Resmî MEB olayları uygulama kodunda kaynak bağlantısı ve kontrol tarihiyle
salt-okunur profil olarak tutulur. “İşaretle” eylemi resmî olayı değiştirmez;
öğretmenin ayrı takvim kaydını oluşturur.

## Öğrenci yaşam döngüsü

“Sınıftan ayır” geri alınabilir arşivleme işlemidir. Kalıcı silme yalnız
arşivlenmiş öğrenci için açılır ve şu korumaları uygular:

- Silme etkisi kayıt türlerine göre gösterilir.
- Paylaşımlı gözlem ve medya sayısı ayrıca belirtilir.
- Paylaşımlı gözlem ve medya diğer öğrenciler için korunur; yalnız silinen
  öğrencinin üyeliği çıkarılır. Münhasır kanıtlar ve bunların ilişkileri
  kaldırılır.
- Kullanıcı öğrencinin tam adını aynen yazmadan işlem etkinleşmez.
- İşlem öğrenci ve ilişkili kayıtları tek transaction içinde fiziksel olarak
  kaldırır.
- Öğrenciyi içeren cihaz içi kurtarma snapshot’ları kalıcı silmeden önce toplu
  temizlenir. Daha önce indirilmiş veya haricî ortamda tutulan yedekler
  değiştirilemeyeceği için kullanıcı açıkça uyarılır.

Kalıcı silme, kullanıcının açık ve geri alınamaz silme talebidir; normal kayıt
temizliği için kullanılmaz.

## Paylaşım ve haricî yapay zekâ

Öğrenci dosyası için kullanıcı hedefi, alıcıyı, tarih aralığını, kimlik kipini
ve veri bölümlerini seçer. Tam kimlikli kurum/WhatsApp dosyası açık seçimle ad,
okul numarası, yakınlar ve telefonları içerebilir.

ChatGPT veya Gemini hedefinde varsayılan kimlik kipi takma addır ve yakın
telefonları kapalıdır. Tam kimlikle haricî yapay zekâya geçiş ek açık onay
gerektirir. MaarifOS yapay zekâ API’sine veri göndermez; metni panoya kopyalar
ve seçilen hizmeti açar.

Haricî yanıtlar `externalFeedback` koleksiyonunda saklanır:

- sağlayıcı ve amaç
- değerlendirme tarih aralığı
- değişmez kaynak metin
- SHA-256 içerik özeti
- öğretmen notu
- dönem/yıl sonu kapsam işaretleri
- varsa bağlı dışa aktarım paketi

Öğrenci dosyaları `student_dossier` türüyle saklanır. Manifest hedef,
sağlayıcı, alıcı/amaç, dönem, eğitim yılı ve sınıf kapsamını taşır. ChatGPT ve
Gemini yanıtında bağlı paket zorunludur; bu provenans alanları birebir
eşleşmeden geri bildirim kaydedilmez. Yedek doğrulaması hem zarf checksum’ını
hem de her geri bildirimin SHA-256 içerik özetini yeniden hesaplar.

Haricî yanıt gözlem veya öğretmen değerlendirmesiyle birleştirilmez. Toplu
dönem ve yıl sonu çalışmaları yalnız öğretmenin açıkça işaretlediği kayıtları
kullanır; toplama API’si eğitim yılı ve tarih aralığı dışındaki kayıtları
reddeder.

## Veri dayanıklılığı

`calendarEntries` ve `externalFeedback` veri şeması V4 kapsamındadır. IndexedDB
V2/V3 kurulumları kayıpsız biçimde V4’e taşınır. JSON ve şifreli yedeklerde iki
koleksiyon da sayaç, semantik doğrulama, ilişki doğrulama ve restore
transaction kapsamındadır.
