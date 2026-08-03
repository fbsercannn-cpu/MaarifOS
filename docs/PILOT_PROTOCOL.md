# Hediye Alpha kapalı pilot protokolü

Bu belge gerçek öğretmen kanıtının yerine geçmez. Pilot uygulanıp imzalı sonuç
tablosu oluşmadan MaarifOS için geniş pilot veya üretim `GO` kararı verilemez.

## Kapsam ve sıra

1. Teknik smoke yalnız kurgu veriyle tamamlanır.
2. Restore tatbikatı üç kurgu öğrenciyle, kaynak cihazdan farklı temiz bir tarayıcı
   profiline yapılır; kayıt sayıları ve yoklama olayları eşleşmeden ilerlenmez.
3. Kurumsal KVKK/veri sorumlusu kararı ve cihaz kilidi doğrulanır.
4. İlk 10 okul gününde yalnız Kurulum → Sınıf → Yoklama → Plansız gözlem →
   Çocuk zaman çizelgesi → Şifreli yedek/restore → Uygulama kilidi kullanılır.
5. Google, genel medya, portfolyo, PDF, AI geri bildirimi ve kurum rolleri kapalı
   kalır. Kapsam yalnız aşağıdaki eşikler geçilirse ayrı kararla genişletilir.

## Ölçümler

| Ölçüm | GO eşiği | Otomatik durdurma |
|---|---|---|
| 20 çocukluk yoklama | Medyan ≤30 sn, P90 ≤45 sn | İki ardışık haftada P90 >60 sn |
| Plansız kısa gözlem | Medyan ≤15 sn, P90 ≤30 sn | Öğretmenin olayı kaydetmeyi ertelemesi |
| Veri kaybı | 0 | Tek doğrulanmış kayıp |
| Taslak geri kazanımı | %100 | Tek doğrulanmış kayıp |
| Başka öğrenci verisi sızıntısı | 0 | Tek olay |
| Şifreli restore tatbikatı | %100 kayıt/olay eşleşmesi | Tek eksik, fazla veya bozuk kayıt |
| Aktif kullanım | 10 okul gününün en az 8'i | 3 ardışık okul günü terk |

Görev süreleri yalnız işlem türü, UTC başlangıç/bitiş ve sonuç koduyla tutulur.
Çocuk adı/kimliği, gözlem metni, telefon, fotoğraf veya diğer kişisel veri ölçüm
günlüğüne yazılmaz. Ham notlar kurum dışı servise gönderilmez.

## Günlük kontrol fişi

Her okul günü için şu alanlar doldurulur:

- UTC tarih-saat ve öğretmenin sivil günü
- kullanılan cihaz/tarayıcı sürümü
- yoklama süresi ve öğrenci sayısı
- plansız gözlem süreleri
- çevrim dışı açılış ve yeniden bağlanma sonucu
- bekleyen yazma veya anlaşılmayan hata sayısı
- gün sonu şifreli yedek sonucu
- kapsam dışına çıkma isteği ve nedeni

## GO / NO-GO yetkisi

Teknik testlerin yeşil olması tek başına `GO` değildir. Pilot özeti; öğretmen,
ürün sorumlusu ve veri güvenliği sorumlusunun ayrı onayını taşır. P0/P1 olayında
pilot durur, veriler korunur, sorun kapatılıp restore yeniden doğrulanmadan devam
edilmez.
