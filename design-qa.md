# Design QA — Maarif günlük öğretmen deneyimi 0.22.0

## Source visual truth

User delegated the visual choice to HALİS. Selected content targets are:

- app/output/design-audit-2026-08-31/concept-1.png — daily activity hierarchy.
- app/output/design-audit-2026-08-31/concept-2.png — practical teaching guide.
- app/output/design-audit-2026-08-31/concept-3.png — child-linked observation.

Each source is 853 × 1844 pixels, intended for a 390 × 844 CSS-pixel mobile viewport. Sources were inspected in the ideation turn; the new independently generated teaching-table image was inspected in this implementation turn. The user authorized choosing and improving the direction; a smaller image, real record-driven content, five existing navigation targets, and unchanged mobile runtime are intentional product constraints.

## Implementation capture

- URL context: localhost:4175, native mode.
- Implementation screenshot: unavailable for 0.22.0.
- CSS viewport target: 390 × 844; additional 320 and 430 px checks pending.
- Implementation pixel dimensions / device density: not measured.
- Density normalization: not performed because capture is blocked.
- State: synthetic active class, actual plan / no-plan suggestion / preparation, selected activity guide, single-child observation.
- Browser block: Browser URL security policy rejected access to the existing tab. No alternative browser, port, raw command or CLI bypass was attempted.

The old passing 0.15.0 QA report is preserved at app/output/design-audit-2026-08-31/design-qa-before-0.22.0.md. It is not evidence for this release.

## Required fidelity surfaces

1. Fonts/typography: local Roboto regular/medium/bold and Latin Extended glyphs implemented. Actual wrapping, fallback and weight still need browser inspection.
2. Spacing/layout: smaller header/context, small decorative photograph, single primary action and two follow-ups implemented. Long real titles/material lists may push the primary action below the initial phone viewport; this is unmeasured and must be checked.
3. Colors/tokens: existing ivory/navy/teal tokens retained. Rendered contrast/focus/disabled states not checked in this run.
4. Image quality: new 1280 × 512 WebP inspected, 57,034 bytes, no people or user data. Decorative only. Rendered crop and density remain unverified.
5. Copy/content: recommendation versus persisted plan and teacher-authored example versus official target are separated in code. Current rendered reading order/density remain unverified.

## Findings

- [P1] Visual acceptance cannot be established without a current implementation capture. Fix: restore authorized browser access, capture each target state, compare source and implementation together.
- [P2, unconfirmed risk] Long actual activity titles and material lists could place Today’s primary action too low. Teacher-prompt duplication was removed from Today and remains in the guide; still measure CTA position at 320/390/430 px.
- Independent code review found a plan-integrity priority bug. It was fixed by blocking the new teaching focus for conflicting or mismatched plans, pending observations and day-review priority, and by keeping empty saved plans distinct from no plan. Domain tests passed; this is code evidence, not a visual QA pass.

## Comparison history

- No source/implementation full-view pair could be produced for 0.22.0.
- Focused-region comparison is pending for typography, Today CTA, guide footer and observation selection.
- No visual pass or post-fix screenshot is claimed.

## Verification boundary

922 feature tests, 14 PWA/runtime/keyboard contracts, strict typecheck, lint, build and bundle budget passed. Public asset hashes/lengths in the generated precache manifest match. These do not replace live UI, IndexedDB/reload, offline, assistive-technology or teacher acceptance tests.

## Implementation checklist

- [x] Selected source direction resolved without another design-choice question.
- [x] Existing app and protected mobile runtime retained.
- [x] Real activity/plan identity, draft and explicit-save contracts preserved in code.
- [x] Generated decorative asset and Turkish fonts included in static precache manifest.
- [ ] Capture and jointly compare current implementation and source.
- [ ] Verify responsive layout and primary controls.
- [ ] Verify guide → child → observation → reload and offline persistence.
- [ ] Check browser errors and focus/back/keyboard behavior.

final result: blocked

## 0.23.0 aday eki — resmî TYMM kaynak kütüphanesi

Önceki `0.22.0` görsel kabul engeli tarihsel kayıt olarak yukarıda korunur.
`0.23.0` adayı Planlar yüzeyine tek bir “Resmî TYMM kaynakları” giriş noktası
ekler; bütün kaynakları ana akışa kart olarak yaymaz. Program ayrıntıları kapalı
başlar, filtreler ikincil yüzeyde kalır ve öğretmenin yaş/alan bağlamı öneri
sırasını açıklar.

### Tasarım kapsamı

- Özet sayaçlar 38 PDF'nin 35'inin erişilebilir, üçünün MEB'de erişilemez
  olduğunu saklamadan gösterir.
- Arama, yaş, belge türü ve alan filtreleri aynı modal içinde kalır.
- Belge seçilmeden `iframe` kurulmaz; kapatılınca kaldırılır. Gömülü okuyucunun
  yanında PDF aç/indir ve resmî sayfa yedeği her zaman görünürdür.
- 21 ortak çerçeve sayfası, 15 doğrudan okul öncesi videosu ve 11 ortak eğitim
  videosu PDF listesinden ayrı, isteğe bağlı bölümlerde sunulur.
- MEB başlığı ile MaarifOS özeti görsel ve anlamsal olarak ayrı tutulur.
- Üç erişilemeyen PDF devre dışı bırakılmış sahte belge gibi görünmez; erişim
  sorunu ve resmî ayrıntı sayfası birlikte gösterilir.
- Mobil dialog 760 px altında ekranı kullanır; 320 px yatay taşma koruması ve
  en az 44 px eylem hedefleri CSS sözleşmesine dahildir.

### Kaynak yoğunluğu kararı

Erişilebilir PDF kümesi 923.871.742 bayttır. Dosyaları yerel pakete gömmek ilk
yükü ve PWA kotasını bozacağı için içerik MEB'den uzaktan okunur. Uygulamaya
gömülen parça kaynak metadata'sı ve okuyucu yüzeyidir; resmî dosyanın kopyası
değildir. Çevrim dışıyken kütüphane listesi görülebilir, PDF gövdesi için ağ
gerekir.

### Aday doğrulama durumu

- [x] 140 kaynak izi / 137 tekil URL makbuzu `PASS`.
- [x] 134 HTTP 200 ile üç beklenen HTTP 500 ayrıştırıldı.
- [x] Erişilebilir ve erişilemez belge durumları için bileşen sözleşmeleri var.
- [x] `iframe` sandbox kullanmama, `no-referrer`, açık/indir yedeği ve dar CSP
  kaynak yolları kod sözleşmesinde korunuyor.
- [ ] Yerel uygulamada 320/390/430 px ekran görüntüleri birlikte incelenecek.
- [ ] Gerçek MEB PDF'si açma, kapatma, tekrar açma ve HTTP 500 yedeği görünür
  tarayıcı akışında doğrulanacak.
- [ ] Production yayını sonrasında aynı tur, konsol hatası ve yatay taşma
  ölçümüyle tekrarlanacak.
- [ ] Fiziksel iOS/Android ile VoiceOver/TalkBack ve yüzde 200 büyütme kabulü
  ayrı kalacak.

final result: pending live QA
