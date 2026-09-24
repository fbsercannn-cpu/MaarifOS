import { downloadBrowserFile } from "../documents/browser-file-download.ts";
import { pdfPreviewRecipe, registerPdfPreviewRecipe, type PdfPreviewRecipe } from "../documents/pdf-preview-model.ts";
import { isClassRosterLayoutId } from "./class-roster-layouts.ts";
import { CLASS_ROSTER_COLUMNS } from "./class-roster-columns.ts";
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
async function prepareRosterWithRefresh(
  input: SimpleClassRosterDocumentInput,
  readFreshInput?: () => Promise<SimpleClassRosterDocumentInput>,
) {
  const file = await createSimpleClassRosterPdfDocument(input);
  const decorate = (recipe: PdfPreviewRecipe): PdfPreviewRecipe => ({ ...recipe,
    ...(readFreshInput ? { async refresh(selection) {
      const fresh = await readFreshInput();
      if (fresh.scope.classroomId !== input.scope.classroomId || fresh.scope.academicYearId !== input.scope.academicYearId) throw new Error("Sınıf değişti; belgeyi ilgili sınıftan yeniden açın.");
      const rebuilt = await createSimpleClassRosterPdfDocument({ ...fresh,
        layout: isClassRosterLayoutId(selection.layout) ? selection.layout : undefined,
        template: selection.template as SimpleClassRosterDocumentInput["template"],
        studentIds: selection.studentIds,
        ...(selection.template === "contact-list"
          ? { columns: CLASS_ROSTER_COLUMNS.filter(column => selection.fields.includes(column.id)).map(column => column.id), fields: undefined }
          : { columns: undefined, fields: selection.fields as SimpleClassRosterDocumentInput["fields"] }),
        ...(selection.periodStart && selection.periodEnd ? { period: { start: selection.periodStart, end: selection.periodEnd } } : {}),
      });
      const next = pdfPreviewRecipe(rebuilt.bytes);
      if (!next) throw new Error("Güncel belge hazırlanamadı.");
      return decorate(next);
    } } : {}),
  });
  const recipe = pdfPreviewRecipe(file.bytes);
  if (recipe) registerPdfPreviewRecipe(file.bytes, decorate(recipe));
  return file;
}

export async function downloadSimpleClassRosterPdf(
  input: SimpleClassRosterDocumentInput,
  readFreshInput?: () => Promise<SimpleClassRosterDocumentInput>,
): Promise<ClassRosterPdfActionSummary> {
  const file = await prepareRosterWithRefresh(input, readFreshInput);
  downloadBrowserFile(file);
  return { rowCount: file.rowCount, pageCount: file.pageCount };
}

/** Aynı gerçek PDF'yi açık hassas-veri onayıyla paylaşır veya güvenli indirir. */
export async function shareSimpleClassRosterPdf(
  input: SimpleClassRosterDocumentInput,
  readFreshInput?: () => Promise<SimpleClassRosterDocumentInput>,
): Promise<"shared" | "downloaded" | "cancelled"> {
  const file = await prepareRosterWithRefresh(input, readFreshInput);
  return shareSensitivePdfWithDownloadFallback(file);
}
