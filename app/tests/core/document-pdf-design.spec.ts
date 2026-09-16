import { expect, test } from "@playwright/test";

test.describe.configure({ timeout: 90_000 });

test("HTML metin PDF'si başlık hiyerarşisi, tekrar eden tablo başlığı, Türkçe metin ve URI anotasyonunu korur", async ({ page }) => {
  await page.goto("/tests/runtime-fixture.html");
  const result = await page.evaluate(async () => {
    const htmlPdf = await import("/src/features/documents/html-document-pdf.ts");
    const semantic = await import("/src/features/documents/semantic-tagged-pdf.ts");
    const pdfText = await import("/tests/fixtures/pdf-text-browser.ts");
    const rows = Array.from({ length: 75 }, (_, index) => `
      <tr><th>Kurgu Çocuk ${String(index + 1).padStart(2, "0")}</th><td>Eylül 2026</td><td>İrem Işık - ğüşöçı ${index + 1}</td></tr>
    `).join("");
    const html = `<!doctype html><html lang="tr"><body>
      <h1>Kurgu Sınıf İzleme Belgesi</h1>
      <p>Resmî kaynak: <a href="https://example.test/tymm">TYMM kurgu kaynağı</a></p>
      <table data-pdf-page-break-before="true">
        <caption>Kurgu çocuk ve dönem çizelgesi</caption>
        <thead>
          <tr><th colspan="2">Kayıt bağlamı</th><th colspan="1">Öğretmen notu</th></tr>
          <tr><th>Çocuk</th><th>Dönem</th><th>Gözlem</th></tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </body></html>`;
    const nodes = htmlPdf.semanticNodesFromHtml(html);
    const file = await htmlPdf.createHtmlTextPdfDocument({
      html,
      title: "Kurgu Sınıf İzleme Belgesi",
      fileName: "kurgu-izleme.html",
      appearance: "ink-saving",
      context: {
        schoolName: "Kurgu Anaokulu",
        classroomName: "Kurgu Sınıfı",
        periodLabel: "Eylül 2026",
      },
    });
    const text = await pdfText.pdfText(new Blob([file.bytes.slice()], { type: "application/pdf" }));
    const decoded = new TextDecoder("latin1").decode(file.bytes);
    const table = nodes.find(node => node.kind === "table");
    return {
      fileName: file.fileName,
      pageCount: semantic.semanticTaggedPdfPageCount(file.bytes),
      text,
      linkPreserved: decoded.includes("/URI (https://example.test/tymm)"),
      repeatedHeaderCount: text.split("Gözlem").length - 1,
      firstNode: nodes[0],
      table,
    };
  });

  expect(result.fileName).toBe("kurgu-izleme.pdf");
  expect(result.pageCount).toBeGreaterThan(1);
  expect(result.repeatedHeaderCount).toBe(result.pageCount);
  expect(result.text).toContain("İrem Işık - ğüşöçı 75");
  expect(result.linkPreserved).toBe(true);
  expect(result.firstNode).toMatchObject({ kind: "heading", level: 1, text: "Kurgu Sınıf İzleme Belgesi" });
  expect(result.table).toMatchObject({
    kind: "table",
    headers: ["Çocuk", "Dönem", "Gözlem"],
    headerGroups: [
      { label: "Kayıt bağlamı", span: 2, colorIndex: 0 },
      { label: "Öğretmen notu", span: 1, colorIndex: 1 },
    ],
    rowHeaderColumn: 0,
    continuationContextColumns: [0],
    preserveContinuationContext: true,
    balancePages: true,
    pageBreakBefore: true,
  });
});

test("raster HTML çalışma belgesi her kaynak satırı bir kez taşır ve devam sayfalarında THEAD'i yineler", async ({ page }) => {
  await page.goto("/tests/runtime-fixture.html");
  const result = await page.evaluate(async () => {
    const htmlPdf = await import("/src/features/documents/html-document-pdf.ts");
    const preview = await import("/src/features/documents/pdf-preview-model.ts");
    const pdfText = await import("/tests/fixtures/pdf-text-browser.ts");
    const rows = Array.from({ length: 58 }, (_, index) => `
      <tr><td>Kurgu Çocuk ${String(index + 1).padStart(2, "0")}</td><td>Eylül 2026</td><td>KANIT_${String(index + 1).padStart(3, "0")}</td></tr>
    `).join("");
    const html = `<!doctype html><html lang="tr"><head><style>
      body{font:16px Arial;color:#172a3a;background:white}
      h1{font-size:26px;margin:0 0 20px}
      table{width:100%;border-collapse:collapse}
      th,td{border:2px solid #4b5963;padding:12px 9px;text-align:left}
      thead{background:#fff;font-weight:700}
      tr{break-inside:avoid}
    </style></head><body>
      <h1>Kurgu Çok Sayfalı Çizelge</h1>
      <table><thead><tr><th>Çocuk</th><th>Dönem</th><th>Kanıt</th></tr></thead><tbody>${rows}</tbody></table>
    </body></html>`;
    let captured: import("/src/features/documents/pdf-preview-model.ts").PdfPreviewRequest | undefined;
    const uninstall = preview.installPdfPreviewPresenter(request => { captured = request; });
    const pending = htmlPdf.previewHtmlPrintDocument({
      html,
      title: "Kurgu Çok Sayfalı Çizelge",
      fileName: "kurgu-cizelge.html",
    });
    try {
      if (!captured?.recipe) throw new Error("Kurgu HTML baskı tarifi yakalanamadı.");
      const file = await captured.recipe.build(captured.recipe.initial);
      captured.complete("cancelled");
      await pending;
      const text = await pdfText.pdfText(new Blob([file.bytes.slice()], { type: "application/pdf" }));
      const decoded = new TextDecoder("latin1").decode(file.bytes);
      const pageCount = Number(decoded.match(/\/Type\s*\/Pages\s*\/Count\s+(\d+)/u)?.[1]);
      return {
        pageCount,
        repeatedPeriodHeaders: text.split("Dönem").length - 1,
        repeatedEvidenceHeaders: text.split("Kanıt").length - 1,
        tokens: Array.from({ length: 58 }, (_, index) => {
          const token = `KANIT_${String(index + 1).padStart(3, "0")}`;
          return text.split(token).length - 1;
        }),
      };
    } finally {
      uninstall();
      captured?.complete("cancelled");
    }
  });

  expect(result.pageCount).toBeGreaterThan(1);
  expect(result.repeatedPeriodHeaders).toBe(result.pageCount);
  expect(result.repeatedEvidenceHeaders).toBe(result.pageCount);
  expect(result.tokens.every(count => count === 1)).toBe(true);
});
