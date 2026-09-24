import * as pdfjs from "pdfjs-dist";
import workerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;
export async function pdfText(blob: Blob): Promise<string> {
  const loading = pdfjs.getDocument({ data: new Uint8Array(await blob.arrayBuffer()), useWasm: false, enableXfa: false });
  const document = await loading.promise;
  try {
    const pages: string[] = [];
    for (let index = 1; index <= document.numPages; index++) {
      const page = await document.getPage(index), content = await page.getTextContent();
      pages.push(content.items.map(item => "str" in item ? item.str : "").join(" "));
    }
    return pages.join("\n");
  } finally { await loading.destroy(); }
}
