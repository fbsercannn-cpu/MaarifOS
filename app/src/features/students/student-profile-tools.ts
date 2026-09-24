import {
  normalizeStudentPhone,
  type StudentContact,
} from "../../core/domain/student.ts";
import type { EvidenceObservationSummary } from "../evidence/evidence-workspace.ts";

const MAX_SOURCE_PHOTO_BYTES = 15 * 1024 * 1024;
const MAX_PROFILE_PHOTO_DATA_URL_LENGTH = 400_000;
const SUPPORTED_PROFILE_PHOTO_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

export type ObservationExportStudent = {
  id: string;
  name: string;
  preferredName?: string;
};

function safeFileStem(value: string): string {
  const normalized = value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("tr-TR")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return normalized || "ogrenci";
}

export function studentObservationExportFileName(
  student: ObservationExportStudent,
  civilDate: string,
): string {
  return `${safeFileStem(student.preferredName ?? student.name)}-gozlem-arsivi-${civilDate}.txt`;
}

export function classroomObservationExportFileName(civilDate: string): string {
  return `sinif-gozlem-arsivi-${civilDate}.txt`;
}

export function phoneTelHref(phone: string): string {
  return `tel:${phone.replace(/[^\d+]/g, "")}`;
}

export function phoneWhatsAppHref(phone: string): string {
  let digits = phone.replace(/\D/g, "");
  if (digits.startsWith("00")) digits = digits.slice(2);
  if (digits.length === 11 && digits.startsWith("0")) {
    digits = `90${digits.slice(1)}`;
  } else if (digits.length === 10 && digits.startsWith("5")) {
    digits = `90${digits}`;
  }
  return `https://wa.me/${digits}`;
}

export function contactActionLinks(
  phone: string,
): { tel: string; whatsapp: string } | null {
  try {
    const normalized = normalizeStudentPhone(phone);
    return {
      tel: phoneTelHref(normalized),
      whatsapp: phoneWhatsAppHref(normalized),
    };
  } catch {
    return null;
  }
}

export function contactDisplayLabel(contact: StudentContact): string {
  return contact.name
    ? `${contact.relationship} · ${contact.name}`
    : contact.relationship;
}

export function formatObservationDateTime(utcIso: string): string {
  const parsed = new Date(utcIso);
  if (Number.isNaN(parsed.getTime())) return utcIso;
  return new Intl.DateTimeFormat("tr-TR", {
    timeZone: "Europe/Istanbul",
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(parsed);
}

function observationBlock(
  observation: EvidenceObservationSummary,
  index: number,
): string {
  const status =
    observation.confirmedCurriculumLinkIds.length > 0
      ? "Program bağlantısı tamamlandı"
      : "Program bağlantısı bekliyor";
  return [
    `${index + 1}. ${formatObservationDateTime(observation.observedAt)}`,
    `Etkinlik: ${observation.activityTitle}`,
    `Durum: ${status}`,
    `Gözlem: ${observation.rawText.trim()}`,
    ...(observation.context?.trim()
      ? [`Bağlam: ${observation.context.trim()}`]
      : []),
    ...(observation.childQuote?.trim()
      ? [`Çocuğun sözü: ${observation.childQuote.trim()}`]
      : []),
  ].join("\n");
}

export function buildStudentObservationExport(
  student: ObservationExportStudent,
  observations: readonly EvidenceObservationSummary[],
  generatedAt = new Date(),
): string {
  const selected = observations
    .filter((observation) => observation.studentId === student.id)
    .sort(
      (left, right) =>
        left.observedAt.localeCompare(right.observedAt) ||
        left.id.localeCompare(right.id),
    );
  const name = student.preferredName ?? student.name;
  return [
    "MAARİFOS ÖĞRENCİ GÖZLEM ARŞİVİ",
    `Çocuk: ${name}`,
    ...(student.preferredName ? [`Kayıtlı adı: ${student.name}`] : []),
    `Toplam gözlem: ${selected.length}`,
    `Dışa aktarım zamanı: ${formatObservationDateTime(generatedAt.toISOString())}`,
    "Not: Aile iletişim bilgileri ve profil fotoğrafı bu metne güvenlik amacıyla dahil edilmez.",
    "",
    ...(selected.length > 0
      ? selected.map(observationBlock)
      : ["Henüz kayıtlı gözlem bulunmuyor."]),
  ].join("\n\n");
}

export function buildClassObservationExport(
  students: readonly ObservationExportStudent[],
  observations: readonly EvidenceObservationSummary[],
  generatedAt = new Date(),
): string {
  const orderedStudents = [...students].sort((left, right) =>
    (left.preferredName ?? left.name).localeCompare(
      right.preferredName ?? right.name,
      "tr-TR",
    ),
  );
  return [
    "MAARİFOS SINIF GÖZLEM ARŞİVİ",
    `Çocuk sayısı: ${orderedStudents.length}`,
    `Toplam gözlem: ${observations.length}`,
    `Dışa aktarım zamanı: ${formatObservationDateTime(generatedAt.toISOString())}`,
    "Not: Aile iletişim bilgileri ve profil fotoğrafları bu metne güvenlik amacıyla dahil edilmez.",
    "",
    ...orderedStudents.map((student) =>
      buildStudentObservationExport(student, observations, generatedAt),
    ),
  ].join("\n\n==============================\n\n");
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener("load", () => {
      if (typeof reader.result === "string") resolve(reader.result);
      else reject(new Error("Fotoğraf okunamadı."));
    });
    reader.addEventListener("error", () =>
      reject(reader.error ?? new Error("Fotoğraf okunamadı.")),
    );
    reader.readAsDataURL(file);
  });
}

function loadImage(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener("load", () => resolve(image), { once: true });
    image.addEventListener(
      "error",
      () => reject(new Error("Fotoğraf görüntü olarak açılamadı.")),
      { once: true },
    );
    image.src = dataUrl;
  });
}

export async function prepareStudentProfilePhoto(file: File): Promise<string> {
  if (!SUPPORTED_PROFILE_PHOTO_TYPES.has(file.type)) {
    throw new Error("Yalnız JPEG, PNG veya WebP fotoğrafları kullanılabilir.");
  }
  if (file.size > MAX_SOURCE_PHOTO_BYTES) {
    throw new Error("Fotoğraf 15 MB'den büyük olamaz.");
  }
  const source = await readFileAsDataUrl(file);
  const image = await loadImage(source);
  const attempts = [
    { edge: 512, quality: 0.8 },
    { edge: 448, quality: 0.7 },
    { edge: 384, quality: 0.6 },
  ] as const;
  for (const attempt of attempts) {
    const scale = Math.min(1, attempt.edge / Math.max(image.width, image.height));
    const width = Math.max(1, Math.round(image.width * scale));
    const height = Math.max(1, Math.round(image.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Fotoğraf işleme alanı açılamadı.");
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, width, height);
    context.drawImage(image, 0, 0, width, height);
    const result = canvas.toDataURL("image/jpeg", attempt.quality);
    if (result.length <= MAX_PROFILE_PHOTO_DATA_URL_LENGTH) return result;
  }
  throw new Error("Fotoğraf profil için küçültülemedi. Daha küçük bir görsel seçin.");
}
