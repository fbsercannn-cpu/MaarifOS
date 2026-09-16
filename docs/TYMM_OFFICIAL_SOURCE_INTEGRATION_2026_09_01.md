# TYMM resmî kaynak entegrasyonu · 1 Eylül 2026

## Karar ve kapsam

Kanonik erişim girişi [TYMM Okul Öncesi Eğitim Programı](https://tymm.meb.gov.tr/ogretim-programlari/ders/okul-oncesi) sayfasıdır. MaarifOS `0.23.0` adayı, bu sayfadaki okul öncesi kaynaklarla birlikte okul öncesinde kullanılan ortak TYMM çerçevesini ayrı kaynak sınıflarıyla gösterir.

Resmî başlık ve bağlantı MEB kaydıdır. Kaynak türü, filtre etiketi, kısa açıklama ve bağlamsal öneri sırası MaarifOS sunum metadata'sıdır. Bu iki katman birbirine karıştırılmaz; bağlantıya dokunmak plan, gözlem veya çocuk kaydı yazmaz. Planlar ana yüzeyinde kaynaklar için tek `Resmî TYMM kaynakları` eylemi bulunur; öneriler ve MEB plan örnekleri bu diyaloğun içinde, başlangıçta kapalı bölümlerde gösterilir.

## 1 Eylül 2026 kaynak makbuzu

Salt `tymm.meb.gov.tr` yetki alanında yapılan HEAD ve kapalı evren GET denetimi
şu sonucu verdi:

| Ölçü | Doğrulanmış sonuç |
|---|---:|
| Kaynak izi | 140 |
| Tekil kanonik URL | 137 |
| HTTP 200 | 134 |
| Beklenen erişilemez HTTP 500 | 3 |
| PDF | 38 |
| Erişilebilir PDF | 35 |
| Erişilemeyen PDF | 3 |
| Erişilebilir PDF toplam boyutu | 923.871.742 bayt |
| Okul öncesi kitap/kılavuz | 17 |
| Resmî plan örneği | 12 |
| Resmî yaş sayfası | 3 |
| Doğrudan okul öncesi video sayfası | 15 |
| Ortak TYMM çerçeve sayfası | 21 |
| Ortak eğitim videosu | 11 |
| Menü/API/index GET yüzeyi | 36/36 doğrulandı |
| Katalog karşılaştırması | 13/13 eşleşti |
| Resmî başlık kaydı | 60 |
| Açık başlık/provenans incelemesi | 0 |

Makbuz sonucu `PASS`tir. Dosya:
`app/output/live-audit-2026-09-01/tymm-official-library-receipt.json`.
Dosyanın SHA-256 özeti:

`73e6aa2b6debcbeda17cbf09fb32e11acd1854fdb57a9481429d2f94552f495f`

Makbuz; kanonik URL birleştirmesini, beklenen içerik türünü, PDF bayt boyutunu,
HTTP durumunu, son URL'yi, her URL'ye giden katalog izlerini, GET gövde hashlerini
ve keşfedilen evren karşılaştırmalarını taşır. Ana menüdeki 15 ortak çerçeve
adayının tamamı katalogda bulunur. Ana menü kabuğunda görünmeyen fakat katalogda
doğrudan resmî URL olarak beyan edilen altı ortak sayfa ayrıca GET 200 ile
doğrulanmıştır; bunlar katalogdaki beyanlı üst kümedir ve menüde keşfedilmiş gibi
sunulmaz. Üç HTTP 500 kaydı hata gibi gizlenmez; katalogda
`expected-unavailable` olarak korunur.

Başlık denetimi resmî MEB kart başlığını ve resmî bağlantıyı kaynak katmanında;
özet, uygulanırlık, yaş/alan sınıflaması ve öneri gerekçesini MaarifOS editoryal
katmanında tutar. Makbuzdaki 60 resmî başlık kaydının açık inceleme sayısı
`0`dır. Bu sonuç, MaarifOS açıklamalarının MEB tarafından yazıldığı veya
onaylandığı anlamına gelmez.

Bu makbuz bütün `tymm.meb.gov.tr` sitesinin sınırsız taraması değildir. Kapsamı,
1 Eylül 2026 tarihinde tanımlanan okul öncesi menü/API/index yüzeyleri ile
uygulama kataloğundaki 137 tekil URL'nin kapalı evrenidir. İlk gövde/evren
baseline'ı bu koşumda kurulmuştur; sonraki koşumlarda onaylı önceki makbuzla
hash farkı ayrıca değerlendirilmelidir.

## Kütüphane içeriği

### Doğrudan okul öncesi

- [2024 Okul Öncesi Eğitim Programı PDF'si](https://tymm.meb.gov.tr/assets/pdf/2024programokuloncesiOnayli.pdf), üç resmî yaş bandı ve yedi öğrenme alanı.
- 36–48, 48–60 ve 60–72 ay sayfaları.
- Her yaş için Eylül, Aralık, Mayıs aylık planı ve bir günlük plan; toplam 12 resmî örnek.
- Sekiz alan/tema öğretmen kılavuzu ile dokuz 3, 4 ve 5 yaş çekirdek etkinlik kitabı; toplam 17 kitap/kılavuz.
- 15 doğrudan okul öncesi eğitim videosu.

### Ortak TYMM çerçevesi

21 ortak sayfa; içerik çerçevesi, kavramsal beceriler, alan becerileri, eğilimler, sosyal-duygusal öğrenme, Erdem–Değer–Eylem, okuryazarlık becerileri ve ortak metin gibi okul öncesi programının beslendiği model bileşenlerini kapsar. Bunlar doğrudan okul öncesi belgesi gibi etiketlenmez; `ortak TYMM çerçevesi` kapsamında tutulur.

Kütüphane ayrıca yedi program okuryazarlığı kılavuzu, altı broşür, beş rapor, ortak metin PDF'si ve 11 ortak eğitim videosunu ayrı türlerle sunar. Ortak içerik plan veya çocuk gözlemine otomatik aktarılmaz.

## Uygulamadaki katmanlar

| Katman | Kapsam | İddia sınırı |
|---|---|---|
| Resmî program kataloğu | Üç yaş bandı, yedi alan ve 210 öğrenme çıktısı; kaynak sayfası ve PDF SHA-256 izi. | MEB program içeriği. |
| Bütüncül grafik | Alan becerileri, süreç bileşenleri, SDB, değer, eğilim, okuryazarlık ve kavramsal beceriler dâhil 1.439 düğüm. | `pending-human-review`; uzman onayı tamamlanmış sayılmaz. |
| Gelişim seçici | Yaş başına yedi alanda 21, toplam 63 tıklanabilir öğretmen gözlem örneği. | MaarifOS özgün örneği; resmî kontrol listesi, puan veya tanı değildir. |
| Resmî kaynak kütüphanesi | 38 PDF, üç yaş sayfası, 12 plan örneği, 26 video sayfası ve 21 ortak çerçeve sayfası. | MEB içeriği bağlantı/uzak okuma ile sunulur; `importable:false`, planı veya gözlemi değiştirmez. |
| Öğretmen planı | Öğretmenin seçip düzenlediği kalıcı plan. | Resmî sisteme gönderilmiş veya onaylanmış plan değildir. |

## Yaş ve kapsam doğruluğu

- Erişilebilen beş öğretmen kılavuzunun PDF içeriğinde 36–48, 48–60 ve 60–72 ay bantlarının üçü de doğrulanmıştır. MEB kitap kartlarındaki yayıncı etiketi `36–48 ay` olarak ayrıca korunur; uygulama yayıncı etiketini içerik doğrulaması gibi yorumlamaz.
- Temel eğitim veli bilgilendirme kılavuzunda okul öncesi veya üç yaş bandı doğrulanamadı. Kayıt kütüphanede `okul öncesi uygulanırlığı doğrulanmadı` açıklamasıyla bulunur; yaş/alan önerilerine girmez.
- Sosyal Alan, Sosyal Duygusal Öğrenme Becerileri ve Değerler ile Sanat Alanı kılavuz PDF'leri MEB'de HTTP 500 döndürmektedir. MaarifOS sahte veya üçüncü taraf PDF üretmez; resmî ayrıntı sayfasını ve açık erişim durumunu gösterir.
- Üç yaş bandı için ayrı Farklılaştırma Etkinlik Kitapları ve Öğretim Materyalleri uçları boş dönmektedir. Boş koleksiyonlar varmış gibi kayıt üretilmez.

Beş kılavuzdaki yaş iddiası yalnız katalog metadata'sına dayanmaz. Tam resmî PDF
baytları SHA-256 ile sabitlendi; her yaş bandının ilk `YAŞ GRUBU` satırı PDF
sayfası ve sayfa metni özetiyle kaydedildi. Atomik makbuz:
`app/output/live-audit-2026-09-01/tymm-teacher-guide-age-evidence-receipt.json`.
Makbuz SHA-256 özeti
`213066e4b8c8bab5ea08fbdd9e999750ef121ab13ed1f1a55c190fb2ffae573f`,
kaynak kümesi özeti
`ff0873d1f2a700bb71908c8b493f46673a32a114c55f34843ac3fbacdc576eb2`dir.
Bu otomatik metin kanıtı pedagojik uygunluk veya insan uzman onayı değildir.

## Uygulama içi okuma biçimi

35 erişilebilir PDF, uygulama paketine kopyalanmadan MEB kaynağından `iframe` içinde açılır. Bu tercih 923.871.742 baytlık resmî dosya kümesini uygulama paketine çoğaltmadan kaynağın güncel ve değişmez yetki alanında kalmasını sağlar.

- Okuyucu yalnız öğretmen belgeyi seçince yüklenir; kapanınca `iframe` kaldırılır.
- Her belgede `PDF'yi aç / indir` ve resmî MEB sayfasını aç yedeği vardır.
- Tarayıcı PDF görüntüleyicisini bozmamak için `iframe` sandbox kullanılmaz.
- `referrerPolicy="no-referrer"` ve yalnız iki MEB PDF yolu için dar `frame-src` izni kullanılır: `/assets/pdf/` ve `/upload/brosur/`.
- Uzak PDF'ler PWA önbelleğine veya şifreli yedeğe alınmaz. Çevrim dışıyken kütüphane metadata'sı görünür; belgenin kendisi ağ gerektirir.
- Arama ile yaş, belge türü ve alan filtreleri öğretmenin kaynağı bulmasını kolaylaştırır. Plan yaşı ve ilk öğrenme alanı yalnız öneri sırasını etkiler; belge hiçbir planı sessizce değiştirmez.

### Fail-closed erişim ve provenans

- Gömülü okuyucu yalnız katalogda `verified-available` durumundaki ve dar MEB
  PDF yollarından birine uyan kaynak için kurulur. Üç `expected-unavailable`
  kayıtta `iframe` veya PDF indir bağlantısı üretilmez; yalnız resmî MEB ayrıntı
  sayfası ve 1 Eylül 2026 tarihli erişim uyarısı gösterilir.
- Program PDF'sine sayfa bağlantısı yalnız exact tarihsel kaynak URL'si, exact
  program SHA-256 özeti ve `1..353` aralığında güvenli tam sayı `sourcePage`
  birlikte doğrulandığında üretilir. URL, özet veya sayfa koşulundan biri
  geçersizse resolver `null` döndürür.
- Geçersiz bir kaynak dışa aktarım katmanına ulaşsa bile ham URL belgeye
  yazılmaz; `Güncel erişim: doğrulanamadı.` metni kullanılır.
- Resmî başlık ve bağlantı değiştirilemez kaynak alanlarıdır. MaarifOS açıklaması,
  kapsamı, alanı ve öneri sırası açıkça editoryal sunum metadata'sı olarak kalır.

### Dar ekran, WebKit kaydırma ve odak

320/390/430 px görünümünde filtreler, sonuç listesi ve belge sahnesi ayrı dikey
kaydırıcılar oluşturmaz; `.tymm-library-dialog__body` tek dikey kaydırma alanıdır.
Bu düzen, WebKit'in iç içe `overflow` bölgelerinde oluşturabildiği kaydırma
kilidini önlemek için seçildi. Belge açılınca belge başlığına odak verilip başlık
görünüme taşınır; diyalog kapanınca odak onu açan `Resmî TYMM kaynakları`
düğmesine döner. Hedefli 320/390/430 px senaryoları tek kaydırıcıyı, yatay taşma
olmamasını, en az 44 px kontrol hedeflerini ve odak dönüşünü doğrular. Fiziksel
Safari/VoiceOver kabulü ayrıca açıktır.

## Neden plan örnekleri otomatik kurulmadı?

MEB sayfalarındaki Eylül, Aralık, Mayıs ve günlük planlar yayımlanmış resmî örneklerdir. Bunları bağlamdan koparıp otomatik tam-yıl paketine dönüştürmek yaş, sınıf, çocuk gereksinimi ve öğretmen kararını örter. Programdaki örnek birliktelikleri de bütün çocuklar için evrensel gelişim ilişkisi değildir. MaarifOS bu nedenle örneği açar, kaynağını gösterir ve öğretmenin kendi planını düzenlemesine izin verir; bağlantıya dokunmak hiçbir plan, gözlem veya çocuk kaydı yazmaz.

## Program PDF'sinin tarihsel kimliği

Program PDF'si 8.333.712 bayt, 353 sayfa ve şu SHA-256 özetine sahiptir:

`77c1ea4771d83cca5bceeb43912770d52bf62a49d45cbbd109e584828bb5ea09`

Eski `/upload/program/...` takma yolu HTTP 500 verse de geçmiş kayıtların ve imzalı katalogların kaynak kimliği değiştirilmedi. Çalışan `/assets/pdf/...` adresi erişim URL'si olarak ayrı tutuldu. Önceki 17 adreslik okul öncesi çekirdek makbuz da tarihsel kanıt olarak korunur:
`app/output/live-audit-2026-09-01/tymm-official-source-receipt.json`.

## Uygulama ve test kanıtları

- Kaynak modeli: `app/src/features/curriculum/tymm-official-library.ts`
- Okuyucu ve filtre yüzeyi: `app/src/features/curriculum/TymmOfficialLibraryPanel.tsx`
- Mevcut okul öncesi kaynak kataloğu: `app/src/features/curriculum/tymm-official-resource-catalog.ts`
- Yeniden üretilebilir ağ denetimi: `app/scripts/audit-tymm-official-library.mjs`
- Kütüphane sözleşmesi: `app/tests/features/tymm-official-library.test.mjs`
- Makbuz sözleşmesi: `app/tests/features/tymm-official-library-audit.test.mjs`
- Program URL/digest/sayfa fail-closed sözleşmesi: `app/tests/features/tymm-official-resource-catalog.test.mjs`
- Gelişim raporu ve dışa aktarım güvenli erişim yüzeyi: `app/tests/features/tymm-official-resource-surfaces.test.mjs`
- 320/390/430 px, tek kaydırma ve odak akışı: `app/tests/tymm-official-library-ui.spec.ts`
- Worker CSP–katalog yolu sözleşmesi: `app/tests/sites-worker.test.mjs`
- Görsel kaynak yakalaması: `app/output/live-audit-2026-09-01/00-tymm-official-source.png`

Gelişim seçici de ana çalışma alanından `React.lazy` ile ayrılmıştır. Erişilebilir
`Gelişim bilgileri hazırlanıyor…` durumu korunurken ana JavaScript parçası
yaklaşık 180,2 KiB'den 157,9 KiB gzip düzeyine indi ve 180 KiB bütçesi
yükseltilmeden hedefli bundle denetimi geçti. Tam temiz sürüm kapısı ve
production yayını bu belge hazırlanırken hâlâ beklemektedir.

## Kabul sınırı

Kaynakların erişimi ve uygulamadaki sınıflandırması doğrulanmıştır. 1.439 düğümlü bütüncül beceri grafiği `pending-human-review` durumunu korur; iki bağımsız okul öncesi/TYMM uzmanının pedagojik eşleme kararı yerine geçmez. Gerçek çocuk verili pilot, bütün yerel çocuk verisi koleksiyonları cihaz içinde korunmadan `NO-GO`dur. `0.23.0` bu belge hazırlanırken sürüm adayıdır; production yayını ve yayımdan sonraki mobil kabul ayrı kanıt gerektirir.
