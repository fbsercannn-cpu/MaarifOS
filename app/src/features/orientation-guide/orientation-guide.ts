export const ORIENTATION_GUIDE_BASE = "/assets/resources/orientation-guide-2026-2027";
export const ORIENTATION_GUIDE_MANIFEST_URL = `${ORIENTATION_GUIDE_BASE}/manifest.json`;
export const ORIENTATION_GUIDE_PDF_URL = `${ORIENTATION_GUIDE_BASE}/okula-uyum-rehberi-2026-2027.pdf`;
export const ORIENTATION_GUIDE_SHA256 = "353b9e91e3f140b96dc3e3f110815e5592a809750caa6bbb8575274a100059a4";
export const ORIENTATION_GUIDE_PAGE_COUNT = 35;

export interface OrientationGuidePage {
  number: number;
  printedPage: number | null;
  title: string;
  text: string;
  textSha256: string;
  imageUrl: string;
  imageSha256: string;
  imageBytes: number;
  imageWidth: number;
  imageHeight: number;
  links: { url: string; label: string }[];
}

export interface OrientationGuide {
  schemaVersion: 1;
  id: string;
  title: string;
  sourceFileName: string;
  sourceOrigin: "user-supplied-pdf";
  publisherAsPrinted: string;
  officialPublicationVerified: false;
  sourceSha256: string;
  pdfUrl: string;
  pdfBytes: number;
  pageCount: number;
  importedOn: string;
  pages: OrientationGuidePage[];
}

export const orientationGuideTr = {
  shortTitle: "Okula uyum rehberi",
  title: "Okula uyum rehberi · 2026–2027",
  cardDetail: "35 sayfanın tamamı · 25 etkinlik · aile ekleri",
  cardAction: "Rehberi aç",
  badge: "2026–2027 · EK KAYNAK",
  description: "Uyum süreci, ilk hafta çizelgesi, etkinlikler ve aile ekleri aynı kaynakta.",
  close: "Rehberi kapat",
  loading: "Rehber hazırlanıyor…",
  loadError: "Rehber yüklenemedi. Bağlantı varken yeniden deneyin; özgün PDF’yi de açabilirsiniz.",
  retry: "Yeniden dene",
  search: "Rehberin tamamında ara",
  searchPlaceholder: "Örneğin: okul postanesi, aile, 5. gün",
  clearSearch: "Aramayı temizle",
  noResults: "Bu ifadeyi içeren sayfa bulunamadı.",
  contents: "Bölümler ve bütün sayfalar",
  section: "Bölüme git",
  page: "PDF sayfası",
  previous: "Önceki sayfa",
  next: "Sonraki sayfa",
  previousShort: "Önceki",
  nextShort: "Sonraki",
  resultCount: (count: number) => `${count.toLocaleString("tr-TR")} sayfada bulundu`,
  imageView: "Özgün sayfa",
  textView: "Okunabilir metin",
  displayMode: "Okuma görünümü",
  textNote: "Metin PDF’den otomatik çıkarılmıştır. Görsel yazılar ve tabloların düzeni için özgün sayfa görünümünü kullanın.",
  imageNote: "Sayfanın tamamı özgün PDF’den görüntülenir. Küçük yazılar için okunabilir metni veya PDF’yi açın.",
  imageError: "Sayfa görseli yüklenemedi. Okunabilir metne geçebilir veya özgün PDF’yi açabilirsiniz.",
  openPdf: "Özgün PDF’yi aç",
  downloadPdf: "PDF indir · 12,9 MB",
  sourceDetails: "Kaynak bilgisi ve bütünlük",
  sourceOrigin: "Kullanıcının sağladığı ek rehber. Kapaktaki kurum beyanı aşağıdadır; internet üzerinden resmî yayımlanma doğrulaması yapılmamıştır.",
  sourceComplete: "Özgün dosyanın 35 sayfası değiştirilmeden korunmuştur. Arama ve bölüm adları okuma yardımcılarıdır.",
  sourceLinks: "Bu sayfadaki kaynak bağlantıları",
  externalNote: "PDF içindeki özgün bağlantılar. Haricî materyalleri açmak internet gerektirir.",
  offlineNote: "Rehberin sayfaları, tam metni ve PDF’si uygulamanın çevrim dışı paketine dahildir. İlk kurulum veya güncellemenin tamamlanması gerekir.",
  fullText: "Sayfanın tam metni",
  sourceFile: "Kaynak dosya",
  sourceSize: "Dosya boyutu",
  sourceDigest: "SHA-256",
  bytes: "bayt",
  pdfPreparing: "Özgün PDF hazırlanıyor…",
  pdfDownloaded: "Özgün PDF eksiksiz indirildi.",
  pdfOpened: "Özgün PDF yeni sekmede açıldı.",
  pdfFallback: "Yeni sekme açılamadığı için özgün PDF indirildi.",
  pdfError: "Özgün PDF hazırlanamadı. İnternet bağlantısıyla yeniden deneyin.",
} as const;

export function orientationPageImageUrl(number: number): string {
  if (!Number.isInteger(number) || number < 1 || number > ORIENTATION_GUIDE_PAGE_COUNT) {
    throw new Error("Geçerli bir rehber sayfası seçin.");
  }
  return `${ORIENTATION_GUIDE_BASE}/page-${String(number).padStart(2, "0")}.webp`;
}

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

const SOURCE_LINKS = new Set([
  "mailto:tegm@meb.gov.tr", "https://meb.ai/U7vBvxg", "https://meb.ai/w0rfM8",
  "https://meb.ai/IdwAz9", "https://meb.ai/Ifajow", "https://meb.ai/reC9pj",
  "https://meb.ai/UbztYia", "https://meb.ai/3Pit0v", "https://meb.ai/cieb40",
  "https://meb.ai/z1UsZW", "https://meb.ai/UTFWpqc",
]);

export function parseOrientationGuide(value: unknown): OrientationGuide {
  const error = () => new Error("Rehber dosyası eksik veya beklenen kaynak sürümüyle uyuşmuyor.");
  if (!record(value) || value.schemaVersion !== 1 || value.id !== "orientation-guide-2026-2027"
    || value.sourceSha256 !== ORIENTATION_GUIDE_SHA256 || value.sourceOrigin !== "user-supplied-pdf"
    || value.officialPublicationVerified !== false || value.pdfUrl !== ORIENTATION_GUIDE_PDF_URL
    || value.pdfBytes !== 13_514_036 || value.pageCount !== ORIENTATION_GUIDE_PAGE_COUNT
    || !Array.isArray(value.pages) || value.pages.length !== ORIENTATION_GUIDE_PAGE_COUNT
    || ![value.title, value.sourceFileName, value.publisherAsPrinted, value.importedOn].every((item) => typeof item === "string" && item.length > 0)) {
    throw error();
  }
  for (const [index, page] of value.pages.entries()) {
    if (!record(page) || page.number !== index + 1 || page.printedPage !== (index === 0 ? null : index)
      || page.imageUrl !== orientationPageImageUrl(index + 1)
      || typeof page.text !== "string" || page.text.trim().length === 0
      || typeof page.title !== "string" || page.title.length === 0
      || ![page.imageWidth, page.imageHeight, page.imageBytes].every((size) => Number.isSafeInteger(size) && Number(size) > 0)
      || ![page.textSha256, page.imageSha256].every((hash) => typeof hash === "string" && /^[a-f0-9]{64}$/u.test(hash))
      || !Array.isArray(page.links) || !page.links.every((link) => record(link) && typeof link.url === "string"
        && SOURCE_LINKS.has(link.url) && typeof link.label === "string" && link.label.length > 0)) {
      throw error();
    }
  }
  return value as unknown as OrientationGuide;
}

export async function loadOrientationGuide(signal?: AbortSignal): Promise<OrientationGuide> {
  const response = await fetch(ORIENTATION_GUIDE_MANIFEST_URL, { signal });
  if (!response.ok) throw new Error(orientationGuideTr.loadError);
  return parseOrientationGuide(await response.json());
}

/** Full fetch avoids offline browser-PDF Range requests outside the PWA cache. */
export async function loadOrientationGuidePdf(): Promise<Uint8Array<ArrayBuffer>> {
  const response = await fetch(ORIENTATION_GUIDE_PDF_URL);
  if (!response.ok) throw new Error(orientationGuideTr.pdfError);
  const bytes = new Uint8Array(await response.arrayBuffer());
  if (bytes.byteLength !== 13_514_036) throw new Error(orientationGuideTr.pdfError);
  const hash = [...new Uint8Array(await crypto.subtle.digest("SHA-256", bytes))]
    .map((byte) => byte.toString(16).padStart(2, "0")).join("");
  if (hash !== ORIENTATION_GUIDE_SHA256) throw new Error(orientationGuideTr.pdfError);
  return bytes;
}

function searchText(text: string): string {
  return text.normalize("NFC").toLocaleLowerCase("tr-TR").replace(/\s+/gu, " ").trim();
}

export interface OrientationSearchResult {
  page: OrientationGuidePage;
  excerpt: string;
}

export function searchOrientationGuide(guide: OrientationGuide, query: string): OrientationSearchResult[] {
  const normalizedQuery = searchText(query);
  if (!normalizedQuery) return [];
  return guide.pages.flatMap((page) => {
    const searchable = searchText(`${page.title} ${page.text}`);
    const index = searchable.indexOf(normalizedQuery);
    if (index < 0) return [];
    const original = `${page.title} ${page.text}`.normalize("NFC").replace(/\s+/gu, " ").trim();
    const start = Math.max(0, index - 52);
    const end = Math.min(original.length, index + normalizedQuery.length + 120);
    return [{ page, excerpt: `${start > 0 ? "…" : ""}${original.slice(start, end)}${end < original.length ? "…" : ""}` }];
  });
}

export function orientationPageLabel(page: OrientationGuidePage): string {
  return page.printedPage === null
    ? "PDF 1 / 35 · Kapak"
    : `PDF ${page.number} / 35 · Basılı sayfa ${page.printedPage}`;
}
