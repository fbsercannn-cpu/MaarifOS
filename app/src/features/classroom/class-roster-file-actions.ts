import { downloadBrowserFile } from "../documents/browser-file-download.ts";
import { shareSensitivePdfWithDownloadFallback } from "../documents/sensitive-pdf-share.ts";
import {
  createSimpleClassRosterPdfDocument,
  type SimpleClassRosterDocumentInput,
} from "../students/simple-class-roster-document.ts";

export interface ClassRosterPdfActionSummary {
  readonly rowCount: number;
  readonly pageCount: number;
}

/** PDF üretim zincirini ana uygulama kabuğundan ayırır; yalnız eylemde yüklenir. */
export async function downloadSimpleClassRosterPdf(
  input: SimpleClassRosterDocumentInput,
): Promise<ClassRosterPdfActionSummary> {
  const file = await createSimpleClassRosterPdfDocument(input);
  downloadBrowserFile(file);
  return { rowCount: file.rowCount, pageCount: file.pageCount };
}

/** Aynı gerçek PDF'yi açık hassas-veri onayıyla paylaşır veya güvenli indirir. */
export async function shareSimpleClassRosterPdf(
  input: SimpleClassRosterDocumentInput,
): Promise<"shared" | "downloaded" | "cancelled"> {
  const file = await createSimpleClassRosterPdfDocument(input);
  return shareSensitivePdfWithDownloadFallback(file);
}
