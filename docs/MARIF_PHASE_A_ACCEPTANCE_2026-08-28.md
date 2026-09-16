# MARİF Aşama A Koordinasyon ve Kabul Özeti

**Tarih:** 28 Ağustos 2026

**Kanonik canlı sürüm:** MaarifOS `0.19.1`

**Kaynak revizyonu:** `agent/maarif-reform` / `11b5913568b90860ccd76c1a5b845030d2bae307`

**Durum:** `VERIFIED` — Aşama A otomatik, paket ve canlı kabul kapıları aynı kaynak revizyonunda geçmiştir.

## Öğretmen-gölge bağlamı

Emine Öğretmen, sınıf içindeki kısa telefon kullanımında yalnız kanıtlı hedefi
görmek, üretilen belgenin gerçek biçimini doğru anlamak ve sınıf/yaş/program
bilgisini yakınlaştırmadan eksiksiz okumak ister.

## Karar ve bağımlılık

Aşama A veri şeması, PDF bayt üreticisi veya şifreleme mimarisini değiştirmeyen
en düşük riskli güven dilimidir. Üç iş paketi birbirinden bağımsız uygulanabilir;
ancak tek bir sürüm adayında birlikte geçmeden yayınlanmış sayılmaz:

1. `MR-050` — `score <= 0` hedef önerilerini fail-closed kapatmak.
2. `MR-051` — raster uygulama çıktılarını bütün görünür yüzeylerde `görsel PDF`
   diye doğru adlandırmak.
3. `MR-052` — Bugün sınıf/yaş/TYMM alt bilgisini 390 px'de kırpmadan akıtmak.
4. `MR-053` — üç düzeltmeyi test, sürüm, paket, yayın ve canlı yeniden kabul
   kapılarından birlikte geçirmek.

Bu dilim Aşama B'nin holistik TYMM grafiğini, Aşama C'nin etiketli PDF motorunu,
Aşama D'nin bütün depo şifrelemesini veya Aşama E'nin fiziksel saha kabulünü
tamamlamaz. Bütünsel `10/10` etiketi bu nedenle Aşama A sonunda da kapalıdır.

## Değişiklik sınırı

| Paket | Uygulama bağımlılığı | Korunacak sınır |
|---|---|---|
| Pedagojik öneri | `PlanCreationFlow` semantik sıralama ve plan oluşturma UI'sı | Manuel alan/kod seçimi, üç adımlı akış, öğretmen kararı ve kayıt kimlikleri korunur. |
| PDF iddiası | Sınıf listesi, plan, Ek 18 ve anekdot CTA/durum/paylaşım metinleri | MIME, `.pdf`, dosya adı, üretici, resmî MEB PDF bağlantıları ve DOCX davranışı değişmez. |
| 390 px reflow | Bugün bağlam kartının sınıf alt satırı ve mevcut mobil kabul testi | Tarih sütunu, 360 px tek-sütun kırılımı, kartın doğal yüksekliği ve `>=44 px` hedefler korunur. |

## Ölçülebilir kabul matrisi

| Kimlik | Geçme koşulu | Zorunlu kanıt |
|---|---|---|
| `A-PED-01` | Bütün adayların skoru `<=0` ise öneri sayısı `0`; “güvenli genel seçenek” sayısı `0`. | Üç yaş bandını ve anlamsız etkinlik/amaç girdisini kapsayan birim negatifleri. |
| `A-PED-02` | Boş durumda exact yönlendirme görünür; alan/kodla manuel seçim çalışır; öğretmen hedef seçmeden yazım sayısı `0`. | 390×844 gerçek UI: boş durum → manuel hedef → kontrol → kaydetmeye hazır; reload kimlik regresyonu. |
| `A-PDF-01` | Uygulamanın raster CTA, durum ve paylaşım metinleri `görsel PDF` der; `gerçek PDF` iddiası `0`. | Kaynak sözleşme taraması ve sınıf listesi/plan/Ek 18/anekdot odak testleri. |
| `A-PDF-02` | Dış MEB PDF CTA'sı, MIME, uzantı ve dosya adı değişmez; erişilebilir PDF iddiası oluşmaz. | Allowlist negatif testi ve indirme/paylaşma regresyonu. |
| `A-UI-01` | `0 çocuk · 60–72 ay · TYMM` 390 px'de exact görünür, `white-space: normal`, iç yatay/dikey kırpma `0`. | DOM geometri ölçümü ve güncel 390×844 ekran kanıtı. |
| `A-UI-02` | 320/360/390/430 px matrisinde yatay taşma `0`, görünür hedefler `>=44×44 px`. | Chromium+WebKit mobil matrisi ve Axe ciddi/kritik ihlal `0`. |
| `A-REL-01` | Odak testleri ile tam kanonik kalite kapısı aynı kaynakta geçer. | Komut, çıkış kodu, test sayıları, coverage ve bundle bütçesi. |
| `A-REL-02` | Sürüm kaynakları eşzamanlı; founder build ve taze Sites paketi sözleşmeye uygun. | Sürüm testi, attestation, tek opaque shell, `dist/client/index.html=0`. |
| `A-LIVE-01` | Yeni sürüm production'da üç Aşama A davranışını taşır; konsol hata/uyarı `0`. | Canlı 320/390/430 px akış, service-worker sürümü ve varlık SHA/boyut eşitliği. |

## Test kapısı

Odak testleri değişen davranışın yanında yazılır; yalnız kaynak metni aramak
işlev kanıtı sayılmaz. Asgari sıra:

1. Semantik sıralama birim negatifleri ve
   `npm run test:runtime:ui:workflows:plan-creation-readiness`.
2. Sınıf listesi, hassas paylaşım, öğretmen planı, Ek 18 ve anekdot belge
   sözleşmeleri.
3. Bugün 390 px iç-kırpma regresyonu ile 320/360/390/430 responsive matrisi.
4. `npm run check:runtime`, `npm run lint`, `npm run test:typecheck`.
5. Tek, kesintisiz `npm run quality:gate`.

Odak testinin geçmesi yayın yetkisi vermez. `quality:gate` çıkış kodu `0`
olmadan sürüm, paket veya production adımına geçilmez.

## Sürüm ve yayın kapısı

1. `CURRENT_RELEASE`, `package.json`, `package-lock.json`, yedek uygulama sürümü,
   `sw.js` ve runtime lock aynı yeni SemVer'i taşır; kullanıcıya dönük sürüm notu
   Aşama A'nın üç somut düzeltmesini anlatır.
2. `npm run build:sites:founder` ve `npm run test:sites` geçer; kaynak
   `.openai/hosting.json`, `dist/client/index.html`, `dist/server/index.js`,
   `dist/.openai/hosting.json` ve `dist/.openai/founder-build.json` doğrulanır.
3. `node scripts/prepare-sites-package.mjs <fresh-temp-project>` yalnız yeni ve
   depo dışındaki taze staging klasörüne çalıştırılır. Kaynak `app/` veya `dist/`
   doğrudan paketlenmez.
4. Son arşiv tam bir opak shell taşır; public `index.html` ve
   `dist/client/index.html` taşımaz. Arşiv SHA-256, dosya sayısı, kaynak commit'i
   ve attestation kayda alınır.
5. Production yayını sonrası service-worker sürümü, manifest ve bütün precache
   varlıkları yerel founder build ile boyut ve SHA-256 düzeyinde eşleşir.

## Canlı yeniden kabul

Production kabulü aynı temiz telefon profili üzerinde şu sırayla yapılır:

1. Davet erişimi → Bugün; sınıf alt bilgisinin tamamı 390 px'de görünür.
2. Günlük plan → anlamsız etkinlik/amaç; öneri boş ve exact yönlendirme görünür.
3. Alan/kodla manuel hedef seçimi → kontrol; plan tarihi değişmeden
   `Kaydetmeye hazır` olur. Denetim kaydı yaratılmayacaksa final kayıt yapılmaz.
4. Belgeler; sınıf listesi, plan, Ek 18 ve anekdot yüzeylerindeki görünür ve
   erişilebilir adlar `görsel PDF` der; resmî kaynak PDF bağlantısı değişmez.
5. 320, 390 ve 430 px'te yatay taşma, 44 px altı etkin hedef, ciddi/kritik Axe
   ihlali, tarayıcı uyarısı veya hatası bulunmaz.
6. Çevrim dışı ikinci açılış yeni service worker'dan gelir; mevcut IndexedDB
   verisi korunur.

## GO / NO-GO

- `GO`: `A-PED-01`–`A-LIVE-01` ölçütlerinin tamamı aynı sürüm ve kaynak commit'i
  için `PASS` kanıtlıdır.
- `NO-GO`: Skoru sıfır hedef gösterilmesi, raster belgenin erişilebilir/gerçek
  PDF diye sunulması, 390 px bilgi kırpılması, sürüm kaynaklarının ayrışması,
  kalite/paket/live kapılarından herhangi birinin başarısız veya çalıştırılmamış
  olması.

## Gerçekleşen kabul kanıtı

`0.19.1` sürümünde skoru sıfır hedef önerisi fail-closed kapatıldı; öğretmen
alan veya kodla hedef seçmeden plan yazımı açılmadı. Uygulama üretimi raster
belgelerin görünür adları `görsel PDF` olarak düzeltildi ve resmî MEB kaynak PDF
bağlantısı değişmeden korundu. Bugün sınıf bağlamı 320/390/430 px telefon
matrisinde kırpılmadan aktı; görünür kritik hedeflerin 44×44 px altına düşmediği
ve ciddi/kritik Axe ihlali olmadığı doğrulandı.

Korunan runtime, politika lint'i, TypeScript, tam `quality:gate`, founder build,
Sites sözleşmesi ve production PWA yeniden başlatma kapıları çıkış kodu `0` ile
geçti. Taze Sites arşivi
`maarifos-0.19.1-20260828-115851-sites.tar.gz` için SHA-256
`7c0cdadb7417bb24da527cb59182945d4f4dbe53e1450afbc4b65bac7c8e893b8`
olarak sabitlendi. Production Sites sürüm kimliği
`appgprj_6a60733e774c8191bbeeb1cca335281d~appgver_8a2adbfdc2c881918b319dc710dbae8b`
üzerinde aynı telefon akışı yeniden kabul edildi.

Aşama A yalnız MR-050–MR-053 kapsamını kapatır; Aşama B–E veya bütünsel
`10/10` iddiası üretmez.
