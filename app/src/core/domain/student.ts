import type { StoredRecord } from "./model.ts";

export const STUDENT_PROFILE_SCHEMA_VERSION = 3 as const;

const CIVIL_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const NATIONAL_IDENTIFIER_PATTERN = /^\d{10,11}$/;

export type StudentProfileInput = {
  displayName: string;
  preferredName?: string;
  birthDate?: string;
  optionalCode?: string;
  enrollmentDate?: string;
  homeLanguages?: string;
  interests?: string;
  strengths?: string;
  /** Öğretmenin sunduğu desteği betimler; tanı veya gelişim hükmü değildir. */
  supportPreferences?: string;
};

export type StudentProfile = {
  displayName: string;
  preferredName?: string;
  birthDate?: string;
  optionalCode?: string;
  enrollmentDate?: string;
  homeLanguages?: string;
  interests?: string;
  strengths?: string;
  supportPreferences?: string;
  profileSchemaVersion: typeof STUDENT_PROFILE_SCHEMA_VERSION;
};

function optionalTrimmed(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
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
  const displayName = input.displayName.trim();
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

  return {
    displayName,
    ...(preferredName ? { preferredName } : {}),
    ...(birthDate ? { birthDate } : {}),
    ...(optionalCode ? { optionalCode } : {}),
    ...(enrollmentDate ? { enrollmentDate } : {}),
    ...(homeLanguages ? { homeLanguages } : {}),
    ...(interests ? { interests } : {}),
    ...(strengths ? { strengths } : {}),
    ...(supportPreferences ? { supportPreferences } : {}),
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
  return {
    displayName: record.displayName.trim(),
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
