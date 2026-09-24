# MaarifOS 0.23.0 yayın kaydı · 1 Eylül 2026

## Durum

**Sürüm adayı — doğrulama ve production dağıtımı bekliyor.**

Bu belge yayın hazırlık kaydıdır. Sites sürüm kimliği, deployment kimliği, exact kaynak commit'i, yayın arşivi özeti ve yayımdan sonraki canlı kabul henüz bu kayda eklenmemiştir. Bu alanlar doğrulanmadan `0.23.0 yayımlandı` denemez. Son doğrulanmış production sürümü bu kayıt hazırlanırken `0.22.0` / Sites sürüm 32'dir.

## Sürümün amacı

`0.23.0`, öğretmenin resmî TYMM okul öncesi programı, kitapları, kılavuzları, broşürleri, raporları, örnek planları, ortak model bileşenlerini ve eğitim videolarını tek kaynak kütüphanesinde bulmasını sağlar. Kaynağı görüntülemek plan, gözlem veya çocuk kaydını değiştirmez. Resmî MEB başlığı ve bağlantısı ile MaarifOS sınıflandırma, özet ve öneri metadata'sı ayrı tutulur.

## Kaynak envanteri

| Kaynak sınıfı | Sayı / durum |
|---|---:|
| Kaynak izi | 140 |
| Tekil kanonik MEB URL'si | 137 |
| HTTP 200 | 134 |
| Beklenen HTTP 500 | 3 |
| PDF | 38 toplam; 35 canlı, 3 erişilemez |
| Erişilebilir PDF toplamı | 923.871.742 bayt |
| Okul öncesi kitap/kılavuz | 17 |
| Yaş sayfası | 3 |
| Plan örneği | 12 |
| Doğrudan okul öncesi video | 15 |
| Ortak TYMM çerçeve sayfası | 21 |
| Ortak eğitim videosu | 11 |

Kaynak makbuzu:
`app/output/live-audit-2026-09-01/tymm-official-library-receipt.json`

SHA-256:
`73e6aa2b6debcbeda17cbf09fb32e11acd1854fdb57a9481429d2f94552f495f`

Beş öğretmen kılavuzunun üç yaş bandını PDF metninden doğrulayan ikinci makbuz:
`app/output/live-audit-2026-09-01/tymm-teacher-guide-age-evidence-receipt.json`

SHA-256:
`213066e4b8c8bab5ea08fbdd9e999750ef121ab13ed1f1a55c190fb2ffae573f`

## Görünür davranış

- Planlar yüzeyinde resmî TYMM kaynak kütüphanesi açılır.
- Öğretmen metin araması, yaş, belge türü ve alan filtresi kullanabilir.
- Planın yaş bandı ve ilk öğrenme alanı ilgili kaynakları öne taşır; öneri sessizce uygulanmaz.
- 35 erişilebilir PDF yalnız seçilince MEB kaynağından uygulama içinde açılır.
- Her PDF için ayrı aç/indir ve resmî ayrıntı sayfası yedeği vardır.
- Sosyal Alan, Sosyal Duygusal Öğrenme Becerileri ve Değerler ile Sanat Alanı kılavuz PDF'leri MEB'de HTTP 500 verdiğinden okuyucu kurulmaz; erişim sorunu açıkça gösterilir.
- 21 ortak çerçeve sayfası, 15 okul öncesi video ve 11 ortak eğitim videosu ayrı bölümlerde görünür.
- Dosyalar uygulama paketine, PWA önbelleğine veya yedeğe kopyalanmaz; PDF içeriği çevrim dışı vaat edilmez.

## Kapsam ve yaş korumaları

- Erişilebilen beş öğretmen kılavuzunun PDF içeriği üç yaş bandını doğrular. MEB kartındaki `36–48 ay` yayıncı etiketi ayrı metadata olarak korunur.
- Temel eğitim veli bilgilendirme kılavuzunda okul öncesi uygulanırlığı doğrulanmadı; kütüphanede bu sınırla gösterilir ve önerilere girmez.
- Farklılaştırma Etkinlik Kitapları ve Öğretim Materyalleri uçları üç yaş bandında boş döner; katalog kaydı uydurulmaz.
- Ortak TYMM bileşenleri doğrudan okul öncesi belge gibi etiketlenmez.
- Üç erişilemeyen PDF üçüncü taraf kopyayla veya yapay içerikle tamamlanmaz.

## Güvenlik ve paketleme

Gömülü PDF okuyucusu tarayıcının yerleşik PDF desteğini kullanır. `iframe` sandbox uygulanmaz; Chrome PDF görüntüleyicisi sandbox altında çalışmadığı için güven sınırı dar Content Security Policy ile kurulur:

- `frame-src 'self' https://tymm.meb.gov.tr/assets/pdf/ https://tymm.meb.gov.tr/upload/brosur/`
- `referrerPolicy="no-referrer"`
- İsteğe bağlı yükleme ve dialog kapanınca `iframe` kaldırma
- Genel MEB alanına veya üçüncü taraf video barındırıcısına geniş frame/connect izni yok

923.871.742 baytlık resmî PDF kümesinin paketlenmemesi uygulama boyutunu, kaynak yetkisini ve MEB güncelliğini korur. Bunun bedeli, PDF okumada ağ ve MEB erişilebilirliği gereksinimidir; aç/indir yedeği aynı bağımlılığı açıkça gösterir.

## Tamamlanan aday kanıtları

- Kaynak makbuzu sonucu: `PASS`.
- Kaynak durumu: 134 HTTP 200, üç beklenen HTTP 500.
- 1 Eylül menü/API envanteri: 36/36 GET ve 13/13 katalog karşılaştırması `PASS`.
- PDF boyut sözleşmesi: 35 erişilebilir kaynakta toplam 923.871.742 bayt.
- Beş kılavuzun tam PDF hashleri, sayfa sayıları ve 36–48/48–60/60–72 ay
  metin kanıtları: `PASS`.
- Kütüphane model/sunum sözleşmeleri, atomik audit makbuzu ve katalog–CSP yolu
  testi mevcut.
- Sürüm metadata'sı, PWA kimliği ve paket sürümü `0.23.0` olarak eşzamanlandı.

Bu maddeler production kabulü değildir. Otomatik test sonucu insan kullanılabilirliği veya pedagojik kurul onayı sayılmaz.

## Yayın öncesi zorunlu kapılar

- [ ] Tam kanonik kalite kapısı çıkış kodu 0.
- [ ] Kurucu production build'i, bundle ve Sites/PWA sözleşmeleri.
- [ ] Exact kaynak commit'i, arşiv SHA-256'i ve Sites içerik özeti.
- [ ] Sites sürüm ve deployment kimliği ile `succeeded` durumu.
- [ ] Production CSP'de yalnız onaylı iki MEB PDF yolunun bulunması.
- [ ] Canlı 320/390/430 px kütüphane, arama/filtre, PDF aç/kapat, aç/indir yedeği ve erişilemez belge akışı.
- [ ] Service worker `0.23.0`, derin rota, reload ve çevrim dışı uygulama kabuğu.
- [ ] Gözlem → etkinliği tamamla → reload zinciri ve yeni console error/warn olmaması.

## Yayın sonrası doldurulacak makbuz

| Alan | Değer |
|---|---|
| Production URL | `https://maarifos-emine-akis-pusulasi.fbsercannn.chatgpt.site` |
| Kaynak commit'i | Doğrulama bekliyor |
| Yayın arşivi SHA-256 | Doğrulama bekliyor |
| Sites içerik özeti / dosya sayısı | Doğrulama bekliyor |
| Sites sürümü | Doğrulama bekliyor |
| Deployment kimliği | Doğrulama bekliyor |
| Deployment durumu | Doğrulama bekliyor |
| Canlı kabul sonucu | Doğrulama bekliyor |

## Değişmeyen kabul sınırları

- Gerçek çocuk verisi; gözlem, çocuk sözü, yoklama notu, medya, portfolyo ve rapor koleksiyonlarının tamamı cihaz içinde korunmadan `NO-GO`dur.
- 1.439 düğümlü bütüncül TYMM grafiği `pending-human-review` durumundadır.
- İki bağımsız okul öncesi/TYMM uzmanının içerik eşleme kararı yoktur.
- Fiziksel iOS/Android, VoiceOver/TalkBack, yüzde 200 büyütme ve gerçek öğretmen görev süresi kabulü açık kalır.
- Bu sürüm için “dünyanın en iyisi”, “10/10” veya “hatasız” iddiası yapılmaz.

## İlgili kanıt belgeleri

- `docs/TYMM_OFFICIAL_SOURCE_INTEGRATION_2026_09_01.md`
- `docs/LIVE_AUDIT_2026_09_01.md`
- `docs/WORLD_CLASS_IMPROVEMENT_PLAN_2026_09_01.md`
- `docs/MARIF_REQUIREMENT_LEDGER.md`
- `design-qa.md`
