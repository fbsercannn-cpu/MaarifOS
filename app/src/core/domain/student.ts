import type { StoredRecord } from "./model.ts";

export const STUDENT_PROFILE_SCHEMA_VERSION = 5 as const;

const CIVIL_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const NATIONAL_IDENTIFIER_PATTERN = /^\d{10,11}$/;
const CONTACT_ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const PROFILE_PHOTO_PATTERN =
  /^data:image\/(?:jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/;
const MAX_PROFILE_PHOTO_DATA_URL_LENGTH = 400_000;

export type StudentContactKind = "mother" | "father" | "other";

export type StudentContactInput = {
  id: string;
  kind: StudentContactKind;
  relationship: string;
  name?: string;
  phone: string;
  isPrimary?: boolean;
};

export type StudentContact = {
  id: string;
  kind: StudentContactKind;
  relationship: string;
  name?: string;
  phone: string;
  isPrimary: boolean;
};

export type StudentProfileInput = {
  displayName: string;
  firstName?: string;
  lastName?: string;
  preferredName?: string;
  birthDate?: string;
  optionalCode?: string;
  enrollmentDate?: string;
  homeLanguages?: string;
  interests?: string;
  strengths?: string;
  /** Öğretmenin sunduğu desteği betimler; tanı veya gelişim hükmü değildir. */
  supportPreferences?: string;
  contacts?: readonly StudentContactInput[];
  profilePhotoDataUrl?: string;
};

export type StudentProfile = {
  displayName: string;
  firstName: string;
  lastName?: string;
  preferredName?: string;
  birthDate?: string;
  optionalCode?: string;
  enrollmentDate?: string;
  homeLanguages?: string;
  interests?: string;
  strengths?: string;
  supportPreferences?: string;
  contacts?: StudentContact[];
  profilePhotoDataUrl?: string;
  profileSchemaVersion: typeof STUDENT_PROFILE_SCHEMA_VERSION;
};

function optionalTrimmed(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

export function splitStudentDisplayName(displayName: string): {
  firstName: string;
  lastName: string;
} {
  const parts = displayName.trim().split(/\s+/).filter(Boolean);
  if (parts.length <= 1) {
    return { firstName: parts[0] ?? "", lastName: "" };
  }
  return {
    firstName: parts.slice(0, -1).join(" "),
    lastName: parts.at(-1) ?? "",
  };
}

export function composeStudentDisplayName(
  firstName: string,
  lastName: string,
): string {
  return [firstName.trim(), lastName.trim()].filter(Boolean).join(" ");
}

export function normalizeTurkishSearchText(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("tr-TR")
    .replace(/[çÇ]/g, "c")
    .replace(/[ğĞ]/g, "g")
    .replace(/[ıİ]/g, "i")
    .replace(/[öÖ]/g, "o")
    .replace(/[şŞ]/g, "s")
    .replace(/[üÜ]/g, "u")
    .replace(/\s+/g, " ")
    .trim();
}

export function formatStudentPhone(value: string): string {
  let digits = value.replace(/\D/g, "");
  if (digits.startsWith("0090")) digits = digits.slice(4);
  else if (digits.startsWith("90")) digits = digits.slice(2);
  if (digits.startsWith("5")) digits = `0${digits}`;
  digits = digits.slice(0, 11);
  const groups = [
    digits.slice(0, 4),
    digits.slice(4, 7),
    digits.slice(7, 9),
    digits.slice(9, 11),
  ].filter(Boolean);
  return groups.join(" ");
}

function optionalLimitedText(
  value: string | undefined,
  fieldLabel: string,
  maximumLength: number,
): string | undefined {
  const trimmed = optionalTrimmed(value);
  if (trimmed && trimmed.length > maximumLength) {
    throw new Error(`${fieldLabel} ${maximumLength} karakterden uzun olamaz.`);
  }
  return trimmed;
}

export function normalizeStudentPhone(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) {
    throw new Error("Telefon numarası boş bırakılamaz.");
  }
  if (!/^[+()\d\s.-]+$/.test(trimmed)) {
    throw new Error("Telefon numarası yalnız rakam ve telefon ayırıcıları içerebilir.");
  }
  let digits = trimmed.replace(/\D/g, "");
  if (digits.startsWith("0090")) digits = digits.slice(4);
  else if (digits.startsWith("90")) digits = digits.slice(2);
  if (digits.length === 10 && digits.startsWith("5")) digits = `0${digits}`;
  if (!/^05\d{9}$/.test(digits)) {
    throw new Error(
      "Cep telefonu 05 ile başlayan toplam 11 rakamdan oluşmalıdır.",
    );
  }
  return `+90${digits.slice(1)}`;
}

export function normalizeStudentContacts(
  contacts: readonly StudentContactInput[] | undefined,
): StudentContact[] {
  if (!contacts) return [];
  const ids = new Set<string>();
  const normalized = contacts.map((contact) => {
    if (!CONTACT_ID_PATTERN.test(contact.id) || ids.has(contact.id)) {
      throw new Error("Yakın iletişim kaydı kimliği geçersiz veya mükerrer.");
    }
    ids.add(contact.id);
    if (
      contact.kind !== "mother" &&
      contact.kind !== "father" &&
      contact.kind !== "other"
    ) {
      throw new Error("Yakın iletişim türü geçersiz.");
    }
    const relationship = optionalLimitedText(
      contact.relationship,
      "Yakınlık",
      60,
    );
    if (!relationship) {
      throw new Error("Yakınlık bilgisi boş bırakılamaz.");
    }
    const name = optionalLimitedText(contact.name, "Yakın adı", 120);
    return {
      id: contact.id,
      kind: contact.kind,
      relationship,
      ...(name ? { name } : {}),
      phone: normalizeStudentPhone(contact.phone),
      isPrimary: contact.isPrimary === true,
    };
  });
  if (normalized.filter((contact) => contact.isPrimary).length > 1) {
    throw new Error("Yalnız bir kişi öncelikli iletişim olarak seçilebilir.");
  }
  return normalized;
}

export function studentContactsFromRecord(value: unknown): StudentContact[] {
  if (!Array.isArray(value)) return [];
  const ids = new Set<string>();
  let primaryAssigned = false;
  const contacts: StudentContact[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object") continue;
    const source = item as Partial<StudentContactInput>;
    if (
      typeof source.id !== "string" ||
      !CONTACT_ID_PATTERN.test(source.id) ||
      ids.has(source.id) ||
      (source.kind !== "mother" &&
        source.kind !== "father" &&
        source.kind !== "other") ||
      typeof source.relationship !== "string" ||
      !source.relationship.trim() ||
      typeof source.phone !== "string" ||
      !source.phone.trim()
    ) {
      continue;
    }
    ids.add(source.id);
    const isPrimary: boolean =
      source.isPrimary === true && !primaryAssigned;
    if (isPrimary) primaryAssigned = true;
    const base: StudentContactInput = {
      id: source.id,
      kind: source.kind,
      relationship: source.relationship,
      ...(typeof source.name === "string" && source.name.trim()
        ? { name: source.name }
        : {}),
      phone: source.phone,
      isPrimary,
    };
    try {
      contacts.push(normalizeStudentContacts([base])[0]);
    } catch {
      contacts.push({
        ...base,
        relationship: source.relationship.trim(),
        ...(base.name ? { name: base.name.trim() } : {}),
        phone: source.phone.trim(),
        isPrimary,
      });
    }
  }
  return contacts;
}

export function isStudentProfilePhotoDataUrl(
  value: unknown,
): value is string {
  return (
    typeof value === "string" &&
    value.length <= MAX_PROFILE_PHOTO_DATA_URL_LENGTH &&
    PROFILE_PHOTO_PATTERN.test(value)
  );
}

function isCivilDateValue(value: string): boolean {
  if (!CIVIL_DATE_PATTERN.test(value)) return false;
  const parsed = new Date(`${value}T12:00:00.000Z`);
  return (
    !Number.isNaN(parsed.getTime()) &&
    parsed.toISOString().slice(0, 10) === value
  );
}

function requireCivilDate(value: string, fieldLabel: string): string {
  if (!CIVIL_DATE_PATTERN.test(value)) {
    throw new Error(`${fieldLabel} YYYY-AA-GG biçiminde olmalıdır.`);
  }
  if (!isCivilDateValue(value)) {
    throw new Error(`${fieldLabel} geçerli bir tarih olmalıdır.`);
  }
  return value;
}

export function normalizeStudentProfile(
  input: StudentProfileInput,
  currentCivilDate: string,
): StudentProfile {
  const legacyNameParts = splitStudentDisplayName(input.displayName);
  const firstName = optionalTrimmed(input.firstName) ?? legacyNameParts.firstName;
  const lastName = optionalTrimmed(input.lastName) ?? legacyNameParts.lastName;
  if (!firstName || firstName.length > 80) {
    throw new Error("Çocuğun adı 1–80 karakter arasında olmalıdır.");
  }
  if (lastName.length > 80) {
    throw new Error("Çocuğun soyadı 80 karakterden uzun olamaz.");
  }
  const displayName = composeStudentDisplayName(firstName, lastName);
  if (!displayName || displayName.length > 120) {
    throw new Error("Çocuğun adı 1–120 karakter arasında olmalıdır.");
  }
  const preferredName = optionalTrimmed(input.preferredName);
  if (preferredName && preferredName.length > 60) {
    throw new Error("Kullanılan ad 60 karakterden uzun olamaz.");
  }

  const today = requireCivilDate(currentCivilDate, "Bugünün tarihi");
  const birthDateValue = optionalTrimmed(input.birthDate);
  const birthDate = birthDateValue
    ? requireCivilDate(birthDateValue, "Doğum tarihi")
    : undefined;
  if (birthDate && birthDate > today) {
    throw new Error("Doğum tarihi gelecekte olamaz.");
  }

  const optionalCode = optionalTrimmed(input.optionalCode);
  if (optionalCode && optionalCode.length > 40) {
    throw new Error("Okul içi kod 40 karakterden uzun olamaz.");
  }
  if (optionalCode && NATIONAL_IDENTIFIER_PATTERN.test(optionalCode)) {
    throw new Error("Okul içi kod alanına kimlik numarası yazmayın.");
  }

  const enrollmentDateValue = optionalTrimmed(input.enrollmentDate);
  const enrollmentDate = enrollmentDateValue
    ? requireCivilDate(enrollmentDateValue, "Kayıt tarihi")
    : undefined;
  if (enrollmentDate && enrollmentDate > today) {
    throw new Error("Kayıt tarihi gelecekte olamaz.");
  }
  if (enrollmentDate && birthDate && enrollmentDate < birthDate) {
    throw new Error("Kayıt tarihi doğum tarihinden önce olamaz.");
  }

  const homeLanguages = optionalLimitedText(
    input.homeLanguages,
    "Evde kullanılan diller",
    200,
  );
  const interests = optionalLimitedText(
    input.interests,
    "İlgi alanları",
    500,
  );
  const strengths = optionalLimitedText(
    input.strengths,
    "Güçlü yönler",
    500,
  );
  const supportPreferences = optionalLimitedText(
    input.supportPreferences,
    "Öğretmen desteği notu",
    1_000,
  );
  const contacts = normalizeStudentContacts(input.contacts);
  const profilePhotoDataUrl = optionalTrimmed(input.profilePhotoDataUrl);
  if (
    profilePhotoDataUrl !== undefined &&
    !isStudentProfilePhotoDataUrl(profilePhotoDataUrl)
  ) {
    throw new Error("Profil fotoğrafı desteklenmeyen veya çok büyük bir görsel içeriyor.");
  }

  return {
    displayName,
    firstName,
    ...(lastName ? { lastName } : {}),
    ...(preferredName ? { preferredName } : {}),
    ...(birthDate ? { birthDate } : {}),
    ...(optionalCode ? { optionalCode } : {}),
    ...(enrollmentDate ? { enrollmentDate } : {}),
    ...(homeLanguages ? { homeLanguages } : {}),
    ...(interests ? { interests } : {}),
    ...(strengths ? { strengths } : {}),
    ...(supportPreferences ? { supportPreferences } : {}),
    ...(contacts.length > 0 ? { contacts } : {}),
    ...(profilePhotoDataUrl ? { profilePhotoDataUrl } : {}),
    profileSchemaVersion: STUDENT_PROFILE_SCHEMA_VERSION,
  };
}

export function studentProfileFromRecord(
  record: StoredRecord,
): StudentProfile | null {
  if (typeof record.displayName !== "string" || !record.displayName.trim()) {
    return null;
  }
  const birthDate =
    typeof record.birthDate === "string" &&
    isCivilDateValue(record.birthDate)
      ? record.birthDate
      : undefined;
  const enrollmentDate =
    typeof record.enrollmentDate === "string" &&
    isCivilDateValue(record.enrollmentDate) &&
    (!birthDate || record.enrollmentDate >= birthDate)
      ? record.enrollmentDate
      : undefined;
  const contacts = studentContactsFromRecord(record.contacts);
  const profilePhotoDataUrl = isStudentProfilePhotoDataUrl(
    record.profilePhotoDataUrl,
  )
    ? record.profilePhotoDataUrl
    : undefined;
  const legacyNameParts = splitStudentDisplayName(record.displayName);
  const firstName =
    typeof record.firstName === "string" && record.firstName.trim()
      ? record.firstName.trim()
      : legacyNameParts.firstName;
  const lastName =
    typeof record.lastName === "string" && record.lastName.trim()
      ? record.lastName.trim()
      : legacyNameParts.lastName;
  return {
    displayName: composeStudentDisplayName(firstName, lastName),
    firstName,
    ...(lastName ? { lastName } : {}),
    ...(typeof record.preferredName === "string" && record.preferredName.trim()
      ? { preferredName: record.preferredName.trim() }
      : {}),
    ...(birthDate ? { birthDate } : {}),
    ...(typeof record.optionalCode === "string" && record.optionalCode.trim()
      ? { optionalCode: record.optionalCode.trim() }
      : {}),
    ...(enrollmentDate ? { enrollmentDate } : {}),
    ...(typeof record.homeLanguages === "string" &&
    record.homeLanguages.trim()
      ? { homeLanguages: record.homeLanguages.trim() }
      : {}),
    ...(typeof record.interests === "string" && record.interests.trim()
      ? { interests: record.interests.trim() }
      : {}),
    ...(typeof record.strengths === "string" && record.strengths.trim()
      ? { strengths: record.strengths.trim() }
      : {}),
    ...(typeof record.supportPreferences === "string" &&
    record.supportPreferences.trim()
      ? { supportPreferences: record.supportPreferences.trim() }
      : {}),
    ...(contacts.length > 0 ? { contacts } : {}),
    ...(profilePhotoDataUrl ? { profilePhotoDataUrl } : {}),
    profileSchemaVersion: STUDENT_PROFILE_SCHEMA_VERSION,
  };
}

export function ageInMonthsOn(
  birthDate: string,
  currentCivilDate: string,
): number {
  const birth = requireCivilDate(birthDate, "Doğum tarihi");
  const current = requireCivilDate(currentCivilDate, "Hesaplama tarihi");
  if (birth > current) throw new Error("Doğum tarihi gelecekte olamaz.");

  const [birthYear, birthMonth, birthDay] = birth.split("-").map(Number);
  const [currentYear, currentMonth, currentDay] = current.split("-").map(Number);
  return (
    (currentYear - birthYear) * 12 +
    (currentMonth - birthMonth) -
    (currentDay < birthDay ? 1 : 0)
  );
}
