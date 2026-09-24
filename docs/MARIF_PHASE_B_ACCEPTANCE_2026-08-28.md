# MARİF Aşama B Mühendislik ve Kabul Kanıtı

**Tarih:** 28 Ağustos 2026

**Sürüm adayı:** MaarifOS `0.20.0`

**Kaynak revizyonu:** `8b87d81a636461e2b1d58b4c928cc24418d1b4fe`

**Durum:** `AUTOMATED_ENGINEERING_PASS / HUMAN_EXPERT_ACCEPTANCE_PENDING`

Bu belge Aşama B'nin otomatik olarak doğrulanabilen yazılım dilimini kanıtlar.
İki bağımsız okul öncesi uzmanının sürüm/hash bağlı pedagojik onayı
bulunmadığı için MR-054 `VERIFIED` değildir ve bütün ürün için `10/10` iddiası
üretilmez.

## 1. Kanonik bütüncül TYMM grafiği

Resmî `2024programokuloncesiOnayli.pdf` kaynağından deterministik olarak
üretilen grafik şu değişmez kaynak kimliğine bağlıdır:

- Kaynak PDF SHA-256:
  `77c1ea4771d83cca5bceeb43912770d52bf62a49d45cbbd109e584828bb5ea09`
- Grafik içerik SHA-256:
  `3605c74ddc95970671cc54994d40702b6831ad46e92cfed4a9047597804d4d8a`
- Üretilen JSON dosyası SHA-256:
  `37c9e7dde71e08a36137ea0f038a0a07acb4feb6a0f44084e8ab928953e7b9b8`
- 1.143 temel düğüm + mevcut Ek-14 kataloğundan kopyasız 296 EDE düğümü
  = 1.439 düğüm.
- 210 kanonik öğrenme çıktısı; ayrıca kapsam kararı bekleyen altı tamamlayıcı
  `MYB.1/MYB.2` satırı ayrı türde korunmuştur.
- 851 alan matrisi ilişkisi; üç yaş bandı × yedi alan = 21/21 kapsam.
- Yetim referans, döngü ve semantik mükerrer sayısı `0`.

Her düğüm kod, tür, üst ilişki, yaş, kaynak URL, kaynak sayfa ve kaynak hash'i
taşır. Grafik derin dondurulur ve kaynak/hash uyuşmazlığında fail-closed
reddedilir.

## 2. Plan → etkinlik → gözlem → değerlendirme zinciri

Resmî ve eksiksiz bir TYMM öğrenme çıktısı seçildiğinde plan, etkinlik,
gözlem, değerlendirme ve belge bağlantısı aynı kompakt grafik referansını
korur: `graphId`, `graphVersion`, `catalogContentSha256`, `reviewStatus`,
`outcomeNodeId`, sıralı `relatedNodeIds` ve `sourceSha256`.

- Plan günü ile etkinlik kaynağı tarihi farklıysa kaynak, planın `civilDate`
  değerine atomik bağlanır; öğretmene tekrar tekrar başarısız uyarı verilmez.
- Elle yazılan hedefler `teacher-declared` ve `officialCatalogVerified:false`
  kalır; resmî hedefe yükseltilemez.
- Gözlem program bağı sonrası yarım bırakılırsa öğrenci profilinde kaybolmaz;
  `Değerlendirmeyi tamamla` eylemiyle kaldığı aşamadan sürer.
- Gözlem taslağı yüklenirken yazma kontrolleri kilitlidir ve öğretmen metni
  asenkron yükleme tarafından ezilmez.
- IndexedDB v6 gözlem için plan ve etkinlik indeksleri taşır; eski yedek
  şemaları kontrollü biçimde okunmaya devam eder.

## 3. Uyarı sözleşmesi

Plan tarihi, takvim, yaş, etkinlik ve kaynak bütünlüğü bulguları tek kararlı
sözleşmeye bağlandı. Her bulgu görünür önem, kısa öğretmen dili, kararlı destek
kodu ve uygulanabilir onarım eylemi taşır. Aynı neden için farklı ekranlarda
çelişkili veya sonsuz yeniden-deneme üreten serbest metin uyarıları kaldırıldı.

Öneriler yalnız kavram veya yeterli sözcük örtüşmesi varsa gösterilir. Yaş ya da
alan tek başına pedagojik uygunluk sayılmaz; arayüz bunları “kanıtlı” değil,
“semantik olası” ve “öğretmen karar verir” diye açıklar.

## 4. İnsan inceleme sınırı

Otomatik kapsam envanteri eksiksizdir, ancak pedagojik kabul üretilmemiştir:

| Kuyruk | Kapsam | Makine durumu | İnsan onayı |
|---|---:|---|---:|
| Etkinlik × yaş | 357/357 | `pending-human-review`, `mapping:null` | 0/714 |
| Yaş × ay | 30/30 | `pending-human-review`, `packageMapping:null` | 0/60 |

Her kayıt için iki bağımsız okul öncesi uzmanı gerekir. Uygulama puan, tanı,
kişilik/karakter hükmü veya uydurma onay üretmez. Bu kayıtlar doldurulup exact
grafik sürümü ve hash'ine imzalanmadan Aşama B pedagojik kabulü kapanmaz.

## 5. Otomatik kalite kanıtı

Kaynak revizyonunda aşağıdaki kapılar çıkış kodu `0` ile geçmiştir:

- Bütüncül grafik testleri `9/9`; ilgili müfredat/provenans/Ek-14 zinciri
  `26/26`; deterministik üretici `--check` geçmiştir.
- Aşama B odak birim test paketi `91/91`; gözlem akışı yeni paketi `6/6`;
  gözlem gerçek UI kabulü `2/2`; ilgili profil ve eski-akış regresyonları
  geçmiştir.
- Tam `npm run quality:gate`: politika lint'i, TypeScript, 805 testlik özellik
  coverage kapısı, runtime/PWA paketleri, production build ve parça bütçesi
  geçmiştir. Satır kapsamı `%91,57`, dal kapsamı `%77,99`, işlev kapsamı
  `%93,44` ölçülmüştür.
- Chromium + WebKit telefon smoke matrisi `54/54`, Sites sözleşmesi `27/27`,
  production PWA çevrim içi/çevrim dışı güncelleme ve soğuk başlangıç `3/3`
  geçmiştir.
- 320/360/390/412/430 px telefon hedefleri en az 44×44 px; ilgili Axe
  taramasında ciddi/kritik ihlal görülmemiştir.

Bu kanıtlar otomatik yazılım doğrulamasıdır; iki gerçek uzmanı, fiziksel
iOS/Android cihazı veya yardımcı teknoloji kullanan gerçek öğretmeni temsil
etmez.

## 6. GO / NO-GO hükmü

- `GO — mühendislik dilimi`: kanonik grafik, kaynak bütünlüğü, immutable zincir,
  uyarı politikası, gözlem devamlılığı ve otomatik regresyon kapıları geçmiştir.
- `NO-GO — MR-054 VERIFIED`: 357 etkinlik×yaş ve 30 yaş×ay eşlemesine bağlı
  toplam 774 bağımsız uzman imzası henüz yoktur.
- `NO-GO — bütünsel 10/10`: MR-055 erişilebilir PDF, MR-056 bütün yerel kasa ve
  MR-057 fiziksel öğretmen/çocuk saha kabulü ayrıca kapanmalıdır.
