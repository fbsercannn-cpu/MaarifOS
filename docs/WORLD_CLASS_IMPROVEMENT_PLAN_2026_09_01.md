# MaarifOS dünya standardı iyileştirme planı · 1 Eylül 2026

## Ürün ilkesi

MaarifOS öğretmene daha çok kart ve seçenek göstermemeli; doğru sıradaki işi,
resmî kaynağı ve çocuğa ait kanıtı aynı zincirde güvenilir biçimde bağlamalıdır.
Resmî program, MEB'de yayımlanmış örnek, MaarifOS özgün önerisi ve öğretmen
kaydı her ekranda birbirinden ayırt edilmelidir.

## Bu turda uygulanan sıra

1. **Ana öğretmen yolu:** Alt menü beş kalıcı işe indirildi; `Kayıt Ekle`
   doğrudan gözlem akışını açıyor.
2. **Kompakt yıl geçişi:** Sınıfı hazır öğretmen ilk ekranda resmî dönem özeti
   ve tek `Yeni eğitim yılına geç` eylemini görüyor; ileri ayarlar kapalı kalıyor.
3. **Adla hızlı çocuk ekleme:** İlk adım yalnız ad ve `Kaydet ve kapat`;
   doğum tarihi ile çocuk/veli ayrıntıları isteğe bağlı kapalı bölümde tutuluyor.
4. **Görünür gelişim eylemi:** Her çocuk satırındaki adıyla erişilebilir
   `Gelişim` eylemi, üç yaş bandı × yedi alan × üç örnekten oluşan 63 puansız
   gözlem davranışını açık kaydetme akışına bağlıyor.
5. **Etkinlikten kanıta geçiş:** Etkinliğin doğrulanmış TYMM alanı gelişim
   seçicisine taşındı; resmî hedef yalnız exact kaynak eşleşmesiyle görünür.
6. **Kanıttan tamamlamaya geçiş:** Gözlem sonrası etkinlik kalıcı biçimde
   tamamlanabiliyor ve Bugün sıradaki işe ilerliyor.
7. **Eğitim yılı bütünlüğü:** Bitmiş/hazırlık/dış tarih yazıları ve eşzamanlı
   sınıf değişimleri aynı transaction içinde reddediliyor.
8. **Pedagojik doğruluk:** Döngü aşamaları genel sayaçlarla değil aynı çocuğun
   exact kanıt zinciriyle ilerliyor.
9. **Mobil sadelik:** Yedi aşamalı döngü ana ekranda iki satıra indirildi;
   ayrıntı isteğe bağlı dikey listede kaldı.
10. **Tek resmî kaynak girişi:** Planlar ana yüzeyinde yalnız `Resmî TYMM
    kaynakları` eylemi kaldı; öneriler ve MEB plan örnekleri diyalog içine,
    ileri plan araçları kapalı destek bölümüne taşındı.
11. **Resmî kaynak hattı:** 140 kaynak izi 137 tekil MEB adresinde denetlendi;
   38 PDF, 17 okul öncesi kitap/kılavuz, üç yaş sayfası, 12 plan örneği,
   15 doğrudan okul öncesi video, 21 ortak çerçeve sayfası ve 11 ortak eğitim
   videosu izlenebilir kaynak kataloğuna alındı.
12. **Erişilebilirlik ve kaydırma:** 320 px profil sekmeleri, odak göstergeleri
    ve 44 px dokunma hedefleri düzeltildi. Kütüphane dar görünümde WebKit için
    tek dikey kaydırıcı kullanıyor; belge başlığına ve kapatınca açan düğmeye
    odak dönüşü tanımlı.
13. **Kaynak odaklı çeşitlendirme:** 35 canlı PDF uygulama paketine kopyalanmadan
   MEB kaynağından okunabilir hâle getirildi; yaş, tür, alan ve arama filtreleri
   ile plan bağlamına göre açıklanabilir öneri sırası eklendi. Üç HTTP 500 PDF
   açıkça erişilemez tutuldu ve sahte içerikle tamamlanmadı.
14. **Açılış yükü:** Gelişim seçici `React.lazy` ile ayrı parçaya alındı;
    erişilebilir yükleniyor durumu korunurken ana parça yaklaşık 157,9 KiB gzip
    düzeyine indi ve 180 KiB bütçesi yükseltilmedi.

## Bir sonraki gerçek kalite kapıları

| Sıra | Kapı | Ölçülebilir kabul | Bugünkü durum |
|---|---|---|---|
| 1 | Bütün yerel veri kasası | Gözlem, çocuk sözü, yoklama notu, plan, değerlendirme, medya, portfolyo ve rapor AES-256-GCM zarfında; kesinti/rollback/anahtar kaybı testli. | Açık; gerçek veri `NO-GO`. |
| 2 | Bağımsız pedagojik kurul | Her yaş×alan ve değer/eğilim bağı için iki bağımsız okul öncesi uzmanı onayı; karar kaydı sürümlü. | Açık; onay uydurulmadı. |
| 3 | Öğretmen saha kabulü | 5–8 öğretmen; sıradaki işi bulma medyanı ≤10 sn, günlük plan ≤90 sn, gözlem ≤45 sn, kritik hata 0. | Fiziksel çalışma yapılmadı. |
| 4 | Yardımcı teknoloji ve cihaz | iOS/Android, VoiceOver/TalkBack, yüzde 200 büyütme, gerçek yazdırma ve PWA güncelleme. | Tarayıcı matrisi var; fiziksel kabul açık. |
| 5 | Temiz cihaz geri yükleme | Şifreli yedeğin ikinci cihazda öğretmen kontrollü ve tam veri mutabakatlı geri yüklenmesi. | Kısmi; bağımsız cihaz tatbikatı açık. |
| 6 | Gizlilik korumalı üretim gözlemi | PII içermeyen hata sınıfları, performans bütçesi ve sürüm bazlı regresyon alarmı. | Console/smoke var; saha telemetrisi yok. |
| 7 | Resmî kaynak sürekliliği | 137 kanonik URL için sürüm bazlı makbuz; yeni/kaldırılan/değişen kaynak farkı; erişilemez PDF uyarısı ve güvenli yedek bağlantı. | 1 Eylül 2026 makbuzu `PASS`; üç beklenen HTTP 500 açık, periyodik otomasyon ve kaynak değişim alarmı açık. |

## Kullanılmayacak kısa yollar

- MEB sayfalarının metnini kopyalayıp MaarifOS içeriği gibi yeniden yayımlamak.
- Bir plan örneğindeki bileşen birlikteliğini bütün çocuklar için evrensel
  gelişim ilişkisi saymak.
- Gözlem sayısını başarı, düzey, tanı veya çocuk sıralaması olarak kullanmak.
- İnsan uzman onayı, fiziksel cihaz testi veya gerçek öğretmen kabulü varmış
  gibi “10/10” ilan etmek.

## 0.23.0 adayının ölçülen kaynak kapısı

- 140 katalog izi, 137 tekil URL, 134 HTTP 200 ve üç beklenen HTTP 500 sonuçla
  makine-okunur makbuza bağlandı.
- 35 erişilebilir PDF'nin 923.871.742 baytlık toplamı paketlenmedi; uygulama
  küçük kalırken resmî kaynak yetkisi MEB'de tutuldu.
- Erişilebilen beş öğretmen kılavuzunun üç yaş bandını kapsadığı PDF içinden
  doğrulandı; MEB kartındaki `36–48 ay` yayıncı etiketi ayrı alanda korundu.
- Okul öncesi kapsamı doğrulanmayan temel eğitim veli kılavuzu önerilerden,
  boş dönen farklılaştırma ve öğretim materyali uçları katalogdan çıkarıldı.
- 1 Eylül menü/API envanterindeki 36 GET yüzeyi ve 13 katalog karşılaştırması
  eksiksiz eşleşti.
- Kaynak makbuzu SHA-256:
  `73e6aa2b6debcbeda17cbf09fb32e11acd1854fdb57a9481429d2f94552f495f`.
- Beş öğretmen kılavuzu için yaş-bandı metin makbuzu SHA-256:
  `213066e4b8c8bab5ea08fbdd9e999750ef121ab13ed1f1a55c190fb2ffae573f`;
  exact kaynak kümesi SHA-256:
  `ff0873d1f2a700bb71908c8b493f46673a32a114c55f34843ac3fbacdc576eb2`.
- 60 resmî başlık kaydında açık provenans incelemesi `0`dır; resmî MEB
  başlığı/bağlantısı ile MaarifOS özet, kapsam, alan ve öneri metadata'sı ayrı
  katmanlarda tutulur.
- Program erişim URL'si exact kaynak URL'si + PDF digest + güvenli `1..353`
  sayfa koşuluyla fail-closed üretilir. Üç erişilemez PDF `iframe` veya indir
  bağlantısı oluşturmaz; geçersiz dışa aktarım ham URL yerine doğrulanamadı
  mesajı verir.

## 0.23.0 adayının mühendislik durumu

- Kompakt yıl geçişi, adla hızlı çocuk ekleme, görünür çocuk `Gelişim` eylemi
  ve Planlar'daki tek resmî kaynak CTA'sı uygulanmıştır.
- Hedefli 320/390/430 px kütüphane testleri tek dikey kaydırıcı, yatay taşma
  olmaması, 44 px hedefler, belge başlığı odağı ve kapatma sonrası odak dönüşünü
  doğrulamıştır. Fiziksel Safari/VoiceOver testi bu kanıta dahil değildir.
- Gelişim seçicisinin geç yüklenmesi sonrasında hedefli build, 180 KiB bundle
  bütçesi ve gelişim akışı testleri geçmiştir.
- Tam temiz kalite kapısı, kurucu Sites paketi, production deployment ve yayın
  sonrası çevrim dışı/derin rota/mobil kabul henüz tamamlanmış sayılmaz.

Bu kapı resmî içeriğin bulunabilirliğini ve erişim gerçeğini güçlendirir. İnsan
uzman eşlemesi, gerçek öğretmen görevi, fiziksel cihaz ve bütün yerel veri kasası
kapıları açık olduğu için ürünün bütününe mutlak kalite hükmü verilmez.
