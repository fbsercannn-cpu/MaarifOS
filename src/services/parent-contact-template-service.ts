/**
 * Kullanıcının sağladığı `veli iletişim bilgileri- ŞABLON.xls` sözleşmesine
 * göre 13 sütunlu, 20 öğrencilik yatay A4 sayfalar üretir.
 */

export interface ParentContactStudentRow {
  no: string | number;
  fullName: string;
  nationalId: string;
  birthDate: string;
  motherName: string;
  motherPhone: string;
  motherOccupation: string;
  fatherName: string;
  fatherPhone: string;
  fatherOccupation: string;
  thirdPersonName: string;
  thirdPersonPhone: string;
  thirdPersonRelation: string;
}

export interface ClassroomHeaderInfo {
  classroomName?: string;
  teacherName?: string;
  schoolName?: string;
  academicYear?: string;
}

type ContactLike = {
  kind?: string;
  role?: string;
  relationship?: string;
  relation?: string;
  name?: string;
  fullName?: string;
  occupation?: string;
  phone?: string;
};

type StudentLike = {
  name?: string;
  displayName?: string;
  fullName?: string;
  firstName?: string;
  lastName?: string;
  studentNumber?: string | number;
  optionalCode?: string;
  sequenceNumber?: string | number;
  nationalIdentityNumber?: string;
  tcKimlikNo?: string;
  birthDate?: string;
  contacts?: readonly ContactLike[];
  motherName?: string;
  motherPhone?: string;
  motherOccupation?: string;
  fatherName?: string;
  fatherPhone?: string;
  fatherOccupation?: string;
};

// Kaynak şablonda çerçeveli veri alanı A4:M22, yani sayfa başına 19 çocuktur.
const PAGE_STUDENT_COUNT = 19;

function valueOrEmpty(value: unknown): string {
  return typeof value === "string" && value.trim() ? value.trim() : "";
}

function phoneForDocument(value: unknown): string {
  const source = valueOrEmpty(value);
  if (!source) return "";
  let digits = source.replace(/\D/gu, "");
  if (digits.startsWith("0090")) digits = digits.slice(4);
  else if (digits.startsWith("90")) digits = digits.slice(2);
  if (digits.length === 10 && digits.startsWith("5")) digits = `0${digits}`;
  if (digits.length !== 11) return source;
  return `${digits.slice(0, 4)} ${digits.slice(4, 7)} ${digits.slice(7, 9)} ${digits.slice(9, 11)}`;
}

export function formatParentContactDate(value: unknown): string {
  const source = valueOrEmpty(value);
  const match = /^(\d{4})-(\d{2})-(\d{2})$/u.exec(source);
  return match ? `${match[3]}/${match[2]}/${match[1]}` : source.replace(/\./gu, "/");
}

function dateForExcel(value: string): Date | string {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/u.exec(value);
  if (!match) return value;
  return new Date(Date.UTC(Number(match[3]), Number(match[2]) - 1, Number(match[1]), 12));
}

/** Ham öğrenci listesinden şablonun on üç sütununu eksiksiz çıkarır. */
export function mapStudentsToParentContactRows(
  students: readonly StudentLike[] | undefined,
): ParentContactStudentRow[] {
  return (students ?? []).map((student, index) => {
    const contacts = Array.isArray(student.contacts) ? student.contacts : [];
    const mother = contacts.find((contact) => contact.kind === "mother" || contact.role === "mother");
    const father = contacts.find((contact) => contact.kind === "father" || contact.role === "father");
    const other = contacts.find((contact) => contact.kind === "other" || contact.role === "other");
    const composedName = [student.firstName, student.lastName].map(valueOrEmpty).filter(Boolean).join(" ");
    return {
      no: student.studentNumber ?? student.optionalCode ?? student.sequenceNumber ?? index + 1,
      fullName: valueOrEmpty(student.displayName) || valueOrEmpty(student.name) || valueOrEmpty(student.fullName) || composedName,
      nationalId: valueOrEmpty(student.nationalIdentityNumber) || valueOrEmpty(student.tcKimlikNo),
      birthDate: formatParentContactDate(student.birthDate),
      motherName: valueOrEmpty(mother?.name) || valueOrEmpty(mother?.fullName) || valueOrEmpty(student.motherName),
      motherPhone: phoneForDocument(mother?.phone ?? student.motherPhone),
      motherOccupation: valueOrEmpty(mother?.occupation) || valueOrEmpty(student.motherOccupation),
      fatherName: valueOrEmpty(father?.name) || valueOrEmpty(father?.fullName) || valueOrEmpty(student.fatherName),
      fatherPhone: phoneForDocument(father?.phone ?? student.fatherPhone),
      fatherOccupation: valueOrEmpty(father?.occupation) || valueOrEmpty(student.fatherOccupation),
      thirdPersonName: valueOrEmpty(other?.name) || valueOrEmpty(other?.fullName),
      thirdPersonPhone: phoneForDocument(other?.phone),
      thirdPersonRelation: valueOrEmpty(other?.relationship) || valueOrEmpty(other?.relation),
    };
  });
}

const TEMPLATE_PATH = "/templates/veli-iletisim-sablonu.xlsx";
const COLUMN_NAMES = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M"] as const;

function xmlText(value: unknown): string {
  return String(value ?? "").replace(/[&<>"']/gu, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;",
  })[character] ?? character);
}

function excelSerial(value: string): number | null {
  const date = dateForExcel(value);
  return date instanceof Date ? Math.floor(date.getTime() / 86_400_000) + 25_569 : null;
}

function replaceCell(xml: string, reference: string, value: unknown, numeric = false): string {
  const pattern = new RegExp(`<c([^>]*\\br="${reference}"[^>]*?)(?:\\/>|>[\\s\\S]*?<\\/c>)`, "u");
  if (!pattern.test(xml)) throw new Error(`Excel şablonunda ${reference} hücresi bulunamadı.`);
  return xml.replace(pattern, (_cell, rawAttributes: string) => {
    const attributes = rawAttributes.replace(/\s+t="[^"]*"/gu, "");
    return numeric
      ? `<c${attributes}><v>${String(value ?? "")}</v></c>`
      : `<c${attributes} t="inlineStr"><is><t xml:space="preserve">${xmlText(value)}</t></is></c>`;
  });
}

async function loadTemplateBytes(): Promise<Uint8Array> {
  const response = await fetch(TEMPLATE_PATH, { credentials: "same-origin" });
  if (!response.ok) throw new Error("Veli iletişim Excel şablonu yüklenemedi.");
  return new Uint8Array(await response.arrayBuffer());
}

export async function createParentContactWorkbookBuffer(
  students: readonly StudentLike[] | undefined,
  info?: ClassroomHeaderInfo,
  templateBytes?: Uint8Array,
): Promise<Uint8Array> {
  const rows = mapStudentsToParentContactRows(students);
  if (rows.length > PAGE_STUDENT_COUNT * 3) {
    throw new Error("Veli iletişim şablonu en çok 57 öğrenciyi üç sayfada destekler.");
  }
  const JSZip = (await import("jszip")).default;
  const archive = await JSZip.loadAsync(templateBytes ?? await loadTemplateBytes());
  const classroomName = valueOrEmpty(info?.classroomName) || "……...";
  const teacherName = valueOrEmpty(info?.teacherName) || "Öğretmenin Adı Soyadı";
  for (let pageIndex = 0; pageIndex < 3; pageIndex += 1) {
    const path = `xl/worksheets/sheet${pageIndex + 1}.xml`;
    const entry = archive.file(path);
    if (!entry) throw new Error("Veli iletişim Excel şablonu eksik veya bozuk.");
    let xml = await entry.async("string");
    xml = replaceCell(xml, "A1", `${classroomName}  S I N I F I  V E L İ  İ L E T İ Ş İ M  B İ L G İ L E R İ  ( ${teacherName})`);
    xml = replaceCell(xml, "I25", teacherName);
    xml = replaceCell(xml, "I26", "Okul Öncesi Öğretmeni");
    for (let slot = 0; slot < PAGE_STUDENT_COUNT; slot += 1) {
      const row = rows[pageIndex * PAGE_STUDENT_COUNT + slot];
      const values: unknown[] = row ? [row.no, row.fullName, row.nationalId, row.birthDate, row.motherName,
        row.motherPhone, row.motherOccupation, row.fatherName, row.fatherPhone, row.fatherOccupation,
        row.thirdPersonName, row.thirdPersonPhone, row.thirdPersonRelation] : Array(13).fill("");
      for (let column = 0; column < COLUMN_NAMES.length; column += 1) {
        const reference = `${COLUMN_NAMES[column]}${slot + 4}`;
        const serial = column === 3 && row ? excelSerial(row.birthDate) : null;
        xml = replaceCell(xml, reference, serial ?? values[column], serial !== null);
      }
    }
    archive.file(path, xml);
  }
  return archive.generateAsync({ type: "uint8array", compression: "DEFLATE" });
}

export async function exportParentContactExcel(
  students: readonly StudentLike[] | undefined,
  info?: ClassroomHeaderInfo,
): Promise<void> {
  const bytes = await createParentContactWorkbookBuffer(students, info);
  const blob = new Blob([bytes.slice().buffer as ArrayBuffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  const today = formatParentContactDate(new Date().toISOString().slice(0, 10)).replace(/\//gu, "-");
  link.href = url;
  link.download = `veli_iletisim_bilgileri_${today}.xlsx`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
}

function escapeHtml(value: unknown): string {
  return String(value ?? "").replace(/[&<>"']/gu, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[character] ?? character);
}

export function printDocumentSecurely(htmlContent: string): void {
  let frame = document.getElementById("__maarif_print_frame__") as HTMLIFrameElement | null;
  if (!frame) {
    frame = document.createElement("iframe");
    frame.id = "__maarif_print_frame__";
    Object.assign(frame.style, { position: "fixed", right: "0", bottom: "0", width: "0", height: "0", border: "none" });
    frame.setAttribute("aria-hidden", "true");
    document.body.appendChild(frame);
  }
  const doc = frame.contentWindow?.document;
  if (!doc) throw new Error("Yazdırma alanı açılamadı.");
  doc.open();
  doc.write(htmlContent);
  doc.close();
  frame.contentWindow?.focus();
  window.setTimeout(() => frame?.contentWindow?.print(), 350);
}

export function printParentContactA4(students: readonly StudentLike[] | undefined, info?: ClassroomHeaderInfo): void {
  const rows = mapStudentsToParentContactRows(students);
  const className = (valueOrEmpty(info?.classroomName) || "ANAOKULU").toLocaleUpperCase("tr-TR");
  const teacherName = valueOrEmpty(info?.teacherName) || "Okul Öncesi Öğretmeni";
  const schoolName = valueOrEmpty(info?.schoolName) || "T.C. MİLLÎ EĞİTİM BAKANLIĞI";
  const body = rows.map((row) => `<tr>${[row.no, row.fullName, row.nationalId, row.birthDate, row.motherName,
    row.motherPhone, row.motherOccupation, row.fatherName, row.fatherPhone, row.fatherOccupation,
    row.thirdPersonName, row.thirdPersonPhone, row.thirdPersonRelation]
    .map((value) => `<td>${escapeHtml(value)}</td>`).join("")}</tr>`).join("");
  const headers = ["No", "Adı Soyadı", "TC No", "D. Tarihi (gg/aa/yyyy)", "Adı", "Telefonu", "Mesleği",
    "Adı", "Telefonu", "Mesleği", "Adı", "Telefonu", "Yakınlığı"];
  const html = `<!doctype html><html lang="tr"><head><meta charset="utf-8"><title>Veli İletişim Bilgileri</title><style>
  @page{size:A4 landscape;margin:8mm 6mm}*{box-sizing:border-box}body{font-family:Calibri,Arial,sans-serif;margin:0;color:#000;font-size:8pt}h1,h2{text-align:center;margin:0 0 5px}h1{font-size:11pt}h2{font-size:10pt}table{width:100%;border-collapse:collapse;table-layout:fixed}th,td{border:1px solid #000;padding:4px 3px;text-align:center;vertical-align:middle;overflow-wrap:anywhere}th{font-weight:400}.signature{margin:18px 23% 0 63%;text-align:center;page-break-inside:avoid}.toolbar{background:#0f172a;color:#fff;padding:10px;display:flex;justify-content:space-between}.toolbar button{min-height:44px;padding:8px 14px}@media print{.toolbar{display:none}}
  </style></head><body><div class="toolbar"><span>Veli iletişim çizelgesi</span><button onclick="window.print()">Yazdır / PDF kaydet</button></div><h1>${escapeHtml(schoolName)}</h1><h2>${escapeHtml(className)} SINIFI VELİ İLETİŞİM BİLGİLERİ</h2><table><thead><tr><th colspan="4">Ö Ğ R E N C İ N İ N</th><th colspan="3">A N N E N İ N</th><th colspan="3">B A B A N I N</th><th colspan="3">Aranacak 3. kişi</th></tr><tr>${headers.map((label) => `<th>${label}</th>`).join("")}</tr></thead><tbody>${body}</tbody></table><div class="signature">${escapeHtml(teacherName)}<br>Okul Öncesi Öğretmeni</div></body></html>`;
  printDocumentSecurely(html);
}
