# Semantik tablo uzantıları — bağımsız kabul

Sahiplik: Noether üretim motoru ve sınıf belgesi; HALİS öğrenci ajanı yalnız bağımsız test ve kanıt. Denetim sırasında motor kaynağına müdahale edilmedi. Bütün veriler kurgudur.

İncelenen opt-in arayüz: `headerGroups?: {label:string;span:number}[]`, `rowDetails?: (string|null)[]`. Grup span toplamı yaprak sütun sayısıdır; ayrıntı dizisi gövde satırlarıyla eşleşir. İlk birleşik başlık satırı semantik TH/ColSpan, tam genişlikte ayrıntı TD/ColSpan; devam sayfalarındaki görsel başlıklar artifact olarak yinelenir. İçerik yükseklikleri, devam bağlamı ve bir sonraki satır için alan hesaplarına dahil edilir.

## Eski davranışın byte kanıtı

Yeni alanların hiç bulunmadığı dört sayfalık kurgu legacy belge; başlık, paragraf, 45 satır, değişken sütun ağırlığı, satır başlığı/gruplama, devam bağlamı, dengeleme ve imza içerir. Değişiklikten önce/sonra aynı kaynak, yazı tipi ve girdiden üretildi:

- Önce: **148767 byte**.
- Sonra: **148767 byte**.
- Her ikisi SHA-256: `0fe0257d09d19985dc03c6d69840fbce6d570ab36f5f60b07ba67668f1f028af`.
- Son motor SHA-256: `2552a3bc74451907b60db430fe2346429a40fe7147b44e719005dc1697c4aefe`.

Kanıt: `app/output/daily-routine-cards-2026-09-08/semantic-audit/legacy-before.pdf`, `legacy-after.pdf` ve eşlik eden JSON dosyaları. Yeniden çalıştırma: `node output/daily-routine-cards-2026-09-08/semantic-independent-audit.mjs after`.

## Bulunan ve düzeltilen iki kusur

1. İlk çocuğun ayrıntısı sayfadan uzunsa bütün grup kadar başlangıç alanı ayırma, başlığı tek başına ilk sayfada bırakıyordu. Opt-in büyük grupta ilk alan bütçesi başlıklar ve ilk veri satırıyla sınırlandı. Başlık ve ilk çocuk artık aynı sayfadadır.
2. Önceden hesaplanan sayfa dengeleme kırıkları, çok sayfaya bölünen ilk çocuğun son bandında yer varken sonraki kısa çocuğu yeni sayfaya itiyordu. Opt-in büyük gruplarda doğal sayfalama uygulanıyor. Kısa sonraki çocuk ve imza son ayrıntı bandının bulunduğu sayfada kalıyor.

Aynı 2400 benzersiz tokenlı kurgu örnek **7 sayfadan 5 sayfaya** indi. Önceki sayfa 1 yalnız başlık içeriyordu; sonraki kısa çocuk ayrı sayfa 7'deydi. Yeni sayfa 1 başlık ve ilk çocuğu birlikte, sayfa 5 son ayrıntı + sonraki çocuk + imzayı gösterir. Hiçbir token silinmedi veya çoğaltılmadı.

## Bağımsız testler

`tests/features/semantic-table-adversarial.test.mjs`: **3/3 geçti, son kaynakta 0,96 saniye; atlanan test yok**.

- Sayfadan yüksek birleşik ve yaprak başlık: ayrı Node işleminde 10 saniyelik üst sınırla çalıştırılır; motor kısa sürede açık Türkçe hatayla reddeder, sıfır ilerleme döngüsü oluşmaz.
- 2400 benzersiz ayrıntı tokenı: PDF bağımsız PyMuPDF ile okunur. Her token tam bir kez ve sırayla bulunur. Devam sayfalarında birleşik/yaprak başlıklar ile doğru çocuk bağlamı vardır. Sonraki çocuk ayrıntıdan sonra, imza tablodan sonra gelir. Hiçbir metin sınırı sayfa dışına çıkmaz. Başlık boş sayfaya düşmez; gereksiz son sayfa oluşmaz.
- 160 parçalı uzun çocuk bağlamı ve çok uzun ayrıntı: 25 sayfalık çıktı sonlanır, isim eksiksiz korunur, hiçbir metin sayfa dışına taşmaz. Bir satır dahi sığmayan devam bağlamının açıkça reddedilmesi de kabul ölçütüdür.

Log: `app/output/daily-routine-cards-2026-09-08/semantic-adversarial-final.txt`. Son örnek ve beş sayfanın renderları: `semantic-adversarial/long-detail-d5F3sA/`. Önceki kusurun yedi sayfalık kanıtı: `semantic-adversarial/long-detail-vxwROW/`. İlk ve son sayfalar görsel olarak da incelendi.

Sınır: Bu denetim PDF/UA uygunluk sertifikası değildir. Üretici kendi temel arayüz/ColSpan ve mevcut belge testlerini ayrıca çalıştırır. Bu rapor yeni opt-in mizanpajın adversarial sayfalama ve eski byte davranışının bağımsız kabulünü kaydeder.

Son dar düzeltme ayrıca incelendi: logo ve uzun kurum başlıklarından sonra ilk çocuk grubunun tümünü zorunlu olarak ayırmak yerine ilk tam contact satırı rezerve edilir. İlk grubun kalan satırları gerektiğinde doğal devam eder; sonraki taze sayfaya sığan gruplar birlikte tutulur. Taze sayfadan uzun gövde satırı da opt-in yolda önceden boş sayfaya itilmez. Bu değişiklikten sonra üç bağımsız test ve legacy byte karşılaştırması yeniden geçti.

İlk grup taze sayfaya sığsa da kurum başlığından sonraki ilk sayfa kapasitesini aşıyorsa, opt-in dengeleme ön kırıkları kullanılmaz. Son gerçek logolu yatay sınıf PDF'i 8 Eylül 2026 14:25:49 saatli, 234140 byte ve 6 sayfadır; önceki 14:22 üretimi 7 sayfaydı. Yeni örnekte ilk sayfada kurum başlığıyla ilk çocuk, ikinci sayfada kalan yakın/ayrıntı ile sonraki çocuklar birlikte bulunur. Kaynak: `app/output/new-workflows-2026-09-08/school-template/development/roster-styled-landscape.pdf`.
