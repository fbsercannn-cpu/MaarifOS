import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const componentSource = await readFile(
  new URL(
    "../../src/features/simple-experience/SimpleObservationOutputSheet.tsx",
    import.meta.url,
  ),
  "utf8",
);
const cssSource = await readFile(
  new URL(
    "../../src/features/simple-experience/simple-observation-output-sheet.css",
    import.meta.url,
  ),
  "utf8",
);

test("gözlem çıktı sheet'i çocuk, hedef kitle ve dönemden tek istek üretir", () => {
  assert.match(componentSource, /<BottomSheet/u);
  assert.match(componentSource, /title="Gözlem özeti"/u);
  assert.match(componentSource, /<select[\s\S]*value=\{studentId\}/u);
  assert.match(componentSource, /value="parent"/u);
  assert.match(componentSource, /value="administration"/u);
  assert.equal((componentSource.match(/type="date"/gu) ?? []).length, 2);
  assert.match(
    componentSource,
    /const request: SimpleObservationOutputRequest = \{[\s\S]*studentId,[\s\S]*audience,[\s\S]*startCivilDate,[\s\S]*endCivilDate/u,
  );
});

test("yalnız tek ana CTA vardır ve callback gerçekten await edilir", () => {
  assert.equal((componentSource.match(/type="submit"/gu) ?? []).length, 1);
  assert.equal((componentSource.match(/Belgeyi hazırla/gu) ?? []).length, 1);
  assert.match(componentSource, /await onGenerate\(request\)/u);
  assert.match(componentSource, /setBusy\(true\)/u);
  assert.match(componentSource, /finally \{[\s\S]*setBusy\(false\)/u);
  assert.match(componentSource, /disabled=\{unavailable\}/u);
  assert.doesNotMatch(componentSource, /onay/iu);
});

test("hata, ilerleme ve başarı erişilebilir canlı bölgelerde gösterilir", () => {
  assert.match(componentSource, /role="alert"/u);
  assert.match(componentSource, /role="status"/u);
  assert.match(componentSource, /aria-live="polite"/u);
  assert.match(componentSource, /aria-busy=\{busy\}/u);
  assert.match(componentSource, /Belge hazırlanıyor…/u);
  assert.match(componentSource, /Belge bu cihazda hazırlandı\./u);
  assert.match(componentSource, /onOpenChange=\{onOpenChange\}/u);
});

test("tarih ve aktif öğrenci doğrulaması eksik koşulu açıklar", () => {
  assert.match(componentSource, /Aktif sınıftan bir çocuk seçin\./u);
  assert.match(componentSource, /Başlangıç ve bitiş tarihlerini seçin\./u);
  assert.match(componentSource, /Bitiş tarihi başlangıçtan önce olamaz\./u);
  assert.match(componentSource, /studentIds\.includes\(request\.studentId\)/u);
  assert.match(componentSource, /students\.length === 0/u);
  assert.match(componentSource, /Önce sınıfa bir öğrenci ekleyin\./u);
});

test("veli ve idare kapsamı hassas veri politikasını doğrudan açıklar", () => {
  assert.match(
    componentSource,
    /Veli belgesine T\.C\. kimlik, telefon ve başka çocuk bilgisi eklenmez\./u,
  );
  assert.match(
    componentSource,
    /İdare belgesi yalnız seçili çocuğu, öğretmen adını ve imza alanını içerir\./u,
  );
});

test("320 piksel düzeni tek sütuna iner ve dokunma hedeflerini korur", () => {
  assert.match(cssSource, /@media \(max-width: 350px\)/u);
  assert.match(
    cssSource,
    /\.simple-observation-output__audience > div,[\s\S]*\.simple-observation-output__dates > div[\s\S]*grid-template-columns: 1fr/u,
  );
  assert.match(
    cssSource,
    /\.simple-observation-output__field select,[\s\S]*min-height: 50px/u,
  );
  assert.match(
    cssSource,
    /\.simple-observation-output__actions button[\s\S]*min-height: 52px/u,
  );
  assert.match(cssSource, /min-width: 0/u);
  assert.doesNotMatch(
    cssSource,
    /\n\s+min-width:\s*(?:3[2-9]\d|[4-9]\d\d|\d{4,})px/u,
  );
});

test("metin ve tarih girdileri mobil klavye sözleşmesini korur", () => {
  assert.match(componentSource, /BottomSheet, KeyboardInput/u);
  assert.equal((componentSource.match(/<KeyboardInput/gu) ?? []).length, 2);
  assert.doesNotMatch(componentSource, /<input[^>]+type="(?:text|date)"/u);
  assert.match(componentSource, /<fieldset[\s\S]*<legend>Kimin için\?<\/legend>/u);
  assert.match(componentSource, /<fieldset[\s\S]*<legend>Gözlem dönemi<\/legend>/u);
});
