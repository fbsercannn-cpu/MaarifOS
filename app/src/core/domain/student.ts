import type { StoredRecord } from "./model.ts";
import { formatStudentHomeAddress, normalizeStudentHomeAddressParts, type StudentHomeAddressParts } from "./student-home-address.ts";

export const STUDENT_PROFILE_SCHEMA_VERSION = 10 as const;

const CIVIL_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const NATIONAL_IDENTIFIER_PATTERN = /^\d{10,11}$/;
const ENROLLMENT_YEAR_PATTERN = /^\d{4}$/;
const CONTACT_ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const PROFILE_PHOTO_PATTERN =
  /^data:image\/(?:jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/;
const MAX_PROFILE_PHOTO_DATA_URL_LENGTH = 400_000;

export type StudentContactKind = "mother" | "father" | "other";

/** Immutable evidence of an explicit duplicate review; contains no source PII. */
export type StudentSpreadsheetImportReview = {
  sourceRow: number;
  reviewedAtUtc: string;
  duplicateCandidateIds: string[];
  _MUKERRER_INCELE: true;
  decision: "distinct-student-confirmed";
};

export function isStudentSpreadsheetImportReview(
  value: unknown,
  record: Pick<StoredRecord, "id" | "createdAt" | "updatedAt">,
): value is StudentSpreadsheetImportReview {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const review = value as Record<string, unknown>;
  if (Object.keys(review).sort().join(",") !== "_MUKERRER_INCELE,decision,duplicateCandidateIds,reviewedAtUtc,sourceRow") return false;
  if (!Number.isSafeInteger(review.sourceRow) || Number(review.sourceRow) < 1 || Number(review.sourceRow) > 1_048_576 ||
    review._MUKERRER_INCELE !== true || review.decision !== "distinct-student-confirmed" ||
    typeof review.reviewedAtUtc !== "string" ||
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(review.reviewedAtUtc)) return false;
  const reviewedAt = new Date(review.reviewedAtUtc);
  if (Number.isNaN(reviewedAt.getTime()) || reviewedAt.toISOString() !== review.reviewedAtUtc ||
    review.reviewedAtUtc < record.createdAt || review.reviewedAtUtc > record.updatedAt) return false;
  return Array.isArray(review.duplicateCandidateIds) && review.duplicateCandidateIds.length > 0 &&
    new Set(review.duplicateCandidateIds).size === review.duplicateCandidateIds.length &&
    review.duplicateCandidateIds.every(id => typeof id === "string" && CONTACT_ID_PATTERN.test(id) && id !== record.id);
}

export type StudentContactInput = {
  id: string;
  kind: StudentContactKind;
  relationship: string;
  name?: string;
  occupation?: string;
  phone: string;
  isPrimary?: boolean;
  isEmergencyContact?: boolean;
  isAuthorizedPickup?: boolean;
};

export type StudentContact = {
  id: string;
  kind: StudentContactKind;
  relationship: string;
  name?: string;
  occupation?: string;
  phone: string;
  isPrimary: boolean;
  isEmergencyContact?: boolean;
  isAuthorizedPickup?: boolean;
};

export type StudentCareDetailsInput = {
  homeAddress?: string;
  homeAddressParts?: StudentHomeAddressParts;
  childPrivateNotes?: string;
  familySituationNotes?: string;
  parentsSeparated?: boolean;
  motherDeceased?: boolean;
  fatherDeceased?: boolean;
  martyrChild?: boolean;
  veteranChild?: boolean;
  allergies?: string;
  dietaryNeeds?: string;
  medicationNotes?: string;
  emergencyNotes?: string;
  physicianName?: string;
  physicianPhone?: string;
  medicalDevices?: string;
  guardianEmail?: string;
  familyEducationNeeds?: string;
  familyParticipationPreferences?: string;
  photoVideoPermissionOnFile?: boolean;
  fieldTripPermissionOnFile?: boolean;
  digitalCommunicationPermissionOnFile?: boolean;
  permissionFormDate?: string;
};

export type StudentCareDetails = {
  homeAddress?: string;
  homeAddressParts?: StudentHomeAddressParts;
  childPrivateNotes?: string;
  familySituationNotes?: string;
  parentsSeparated?: boolean;
  motherDeceased?: boolean;
  fatherDeceased?: boolean;
  martyrChild?: boolean;
  veteranChild?: boolean;
  allergies?: string;
  dietaryNeeds?: string;
  medicationNotes?: string;
  emergencyNotes?: string;
  physicianName?: string;
  physicianPhone?: string;
  medicalDevices?: string;
  guardianEmail?: string;
  familyEducationNeeds?: string;
  familyParticipationPreferences?: string;
  photoVideoPermissionOnFile?: boolean;
  fieldTripPermissionOnFile?: boolean;
  digitalCommunicationPermissionOnFile?: boolean;
  permissionFormDate?: string;
};

export type StudentProfileInput = {
  displayName: string;
  firstName?: string;
  lastName?: string;
  preferredName?: string;
  birthDate?: string;
  optionalCode?: string;
  nationalIdentityNumber?: string;
  enrollmentYear?: string;
  /** @deprecated Yalnız eski kayıtları v6 kayıt yılına taşımak içindir. */
  enrollmentDate?: string;
  homeLanguages?: string;
  interests?: string;
  strengths?: string;
  /** Öğretmenin sunduğu desteği betimler; tanı veya gelişim hükmü değildir. */
  supportPreferences?: string;
  contacts?: readonly StudentContactInput[];
  careDetails?: StudentCareDetailsInput;
  profilePhotoDataUrl?: string;
};

export type StudentProfile = {
  displayName: string;
  firstName: string;
  lastName?: string;
  preferredName?: string;
  birthDate?: string;
  optionalCode?: string;
  nationalIdentityNumber?: string;
  enrollmentYear?: string;
  homeLanguages?: string;
  interests?: string;
  strengths?: string;
  supportPreferences?: string;
  contacts?: StudentContact[];
  careDetails?: StudentCareDetails;
  profilePhotoDataUrl?: string;
  profileSchemaVersion: typeof STUDENT_PROFILE_SCHEMA_VERSION;
};

function optionalTrimmed(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

export function isValidStudentNationalIdentityNumber(
  value: unknown,
): value is string {
  if (typeof value !== "string" || !/^[1-9]\d{10}$/.test(value)) return false;
  const digits = [...value].map(Number);
  const oddSum = digits[0] + digits[2] + digits[4] + digits[6] + digits[8];
  const evenSum = digits[1] + digits[3] + digits[5] + digits[7];
  const tenthDigit = ((oddSum * 7 - evenSum) % 10 + 10) % 10;
  const eleventhDigit = digits.slice(0, 10).reduce((sum, digit) => sum + digit, 0) % 10;
  return digits[9] === tenthDigit && digits[10] === eleventhDigit;
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
    const occupation = optionalLimitedText(contact.occupation, "Yakın mesleği", 120);
    const phone = contact.phone.trim() ? normalizeStudentPhone(contact.phone) : "";
    if (!name && !occupation && !phone) {
      throw new Error("Yakın için ad, meslek veya telefon bilgilerinden en az birini girin.");
    }
    if (!phone && (contact.isPrimary || contact.isEmergencyContact)) {
      throw new Error("Öncelikli veya acil iletişim kişisi için telefon numarası gereklidir.");
    }
    return {
      id: contact.id,
      kind: contact.kind,
      relationship,
      ...(name ? { name } : {}),
      ...(occupation ? { occupation } : {}),
      phone,
      isPrimary: contact.isPrimary === true,
      ...(contact.isEmergencyContact === true ? { isEmergencyContact: true } : {}),
      ...(contact.isAuthorizedPickup === true ? { isAuthorizedPickup: true } : {}),
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
      (!source.phone.trim() &&
        !(typeof source.name === "string" && source.name.trim()) &&
        !(typeof source.occupation === "string" && source.occupation.trim()))
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
      ...(typeof source.occupation === "string" && source.occupation.trim()
        ? { occupation: source.occupation }
        : {}),
      phone: source.phone,
      isPrimary,
      ...(source.isEmergencyContact === true ? { isEmergencyContact: true } : {}),
      ...(source.isAuthorizedPickup === true ? { isAuthorizedPickup: true } : {}),
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
        ...(source.isEmergencyContact === true ? { isEmergencyContact: true } : {}),
        ...(source.isAuthorizedPickup === true ? { isAuthorizedPickup: true } : {}),
      });
    }
  }
  return contacts;
}

function optionalEmail(value: string | undefined): string | undefined {
  const email = optionalLimitedText(value, "Veli e-posta adresi", 254);
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error("Veli e-posta adresi geçerli değil.");
  }
  return email;
}

function optionalGeneralPhone(value: string | undefined): string | undefined {
  const phone = optionalLimitedText(value, "Hekim telefonu", 30);
  if (phone && !/^[+()\d\s.-]+$/.test(phone)) {
    throw new Error("Hekim telefonu yalnız rakam ve telefon ayırıcıları içerebilir.");
  }
  return phone;
}

export function normalizeStudentCareDetails(
  input: StudentCareDetailsInput | undefined,
): StudentCareDetails | undefined {
  if (!input) return undefined;
  const homeAddressParts = input.homeAddressParts === undefined
    ? undefined : normalizeStudentHomeAddressParts(input.homeAddressParts);
  const homeAddress = optionalLimitedText(
    homeAddressParts ? formatStudentHomeAddress(homeAddressParts) : input.homeAddress,
    "Ev adresi", 500,
  );
  const childPrivateNotes = optionalLimitedText(input.childPrivateNotes, "Çocuğa özel bilgi notu", 2_000);
  const familySituationNotes = optionalLimitedText(input.familySituationNotes, "Aile durumu açıklaması", 1_000);
  const familyFlags = {
    ...(input.parentsSeparated === true ? { parentsSeparated: true } : {}),
    ...(input.motherDeceased === true ? { motherDeceased: true } : {}),
    ...(input.fatherDeceased === true ? { fatherDeceased: true } : {}),
    ...(input.martyrChild === true ? { martyrChild: true } : {}),
    ...(input.veteranChild === true ? { veteranChild: true } : {}),
  };
  const allergies = optionalLimitedText(input.allergies, "Alerji bilgisi", 500);
  const dietaryNeeds = optionalLimitedText(
    input.dietaryNeeds,
    "Beslenme gereksinimi",
    500,
  );
  const medicationNotes = optionalLimitedText(
    input.medicationNotes,
    "İlaç notu",
    500,
  );
  const emergencyNotes = optionalLimitedText(
    input.emergencyNotes,
    "Acil durum notu",
    1_000,
  );
  const physicianName = optionalLimitedText(input.physicianName, "Hekim adı", 120);
  const physicianPhone = optionalGeneralPhone(input.physicianPhone);
  const medicalDevices = optionalLimitedText(
    input.medicalDevices,
    "Sağlık cihazı veya desteği",
    500,
  );
  const guardianEmail = optionalEmail(input.guardianEmail);
  const familyEducationNeeds = optionalLimitedText(
    input.familyEducationNeeds,
    "Aile eğitimi ihtiyacı",
    1_000,
  );
  const familyParticipationPreferences = optionalLimitedText(
    input.familyParticipationPreferences,
    "Aile katılım tercihi",
    1_000,
  );
  const photoVideoPermissionOnFile = input.photoVideoPermissionOnFile === true;
  const fieldTripPermissionOnFile = input.fieldTripPermissionOnFile === true;
  const digitalCommunicationPermissionOnFile =
    input.digitalCommunicationPermissionOnFile === true;
  const permissionFormDate = input.permissionFormDate
    ? requireCivilDate(input.permissionFormDate, "İzin formu tarihi")
    : undefined;
  if (
    !homeAddress &&
    !childPrivateNotes &&
    !familySituationNotes &&
    Object.keys(familyFlags).length === 0 &&
    !allergies &&
    !dietaryNeeds &&
    !medicationNotes &&
    !emergencyNotes &&
    !physicianName &&
    !physicianPhone &&
    !medicalDevices &&
    !guardianEmail &&
    !familyEducationNeeds &&
    !familyParticipationPreferences &&
    !photoVideoPermissionOnFile &&
    !fieldTripPermissionOnFile &&
    !digitalCommunicationPermissionOnFile &&
    !permissionFormDate
  ) {
    return undefined;
  }
  return {
    ...(homeAddress ? { homeAddress } : {}),
    ...(homeAddress && homeAddressParts ? { homeAddressParts } : {}),
    ...(childPrivateNotes ? { childPrivateNotes } : {}),
    ...(familySituationNotes ? { familySituationNotes } : {}),
    ...familyFlags,
    ...(allergies ? { allergies } : {}),
    ...(dietaryNeeds ? { dietaryNeeds } : {}),
    ...(medicationNotes ? { medicationNotes } : {}),
    ...(emergencyNotes ? { emergencyNotes } : {}),
    ...(physicianName ? { physicianName } : {}),
    ...(physicianPhone ? { physicianPhone } : {}),
    ...(medicalDevices ? { medicalDevices } : {}),
    ...(guardianEmail ? { guardianEmail } : {}),
    ...(familyEducationNeeds ? { familyEducationNeeds } : {}),
    ...(familyParticipationPreferences
      ? { familyParticipationPreferences }
      : {}),
    ...(photoVideoPermissionOnFile ? { photoVideoPermissionOnFile: true } : {}),
    ...(fieldTripPermissionOnFile ? { fieldTripPermissionOnFile: true } : {}),
    ...(digitalCommunicationPermissionOnFile
      ? { digitalCommunicationPermissionOnFile: true }
      : {}),
    ...(permissionFormDate ? { permissionFormDate } : {}),
  };
}

export function studentCareDetailsFromRecord(
  value: unknown,
): StudentCareDetails | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  const source = value as StudentCareDetailsInput;
  try {
    return normalizeStudentCareDetails({
      ...(source.homeAddressParts !== undefined ? { homeAddressParts: source.homeAddressParts } : {}),
      ...(typeof source.childPrivateNotes === "string" ? { childPrivateNotes: source.childPrivateNotes } : {}),
      ...(typeof source.familySituationNotes === "string" ? { familySituationNotes: source.familySituationNotes } : {}),
      ...(source.parentsSeparated === true ? { parentsSeparated: true } : {}),
      ...(source.motherDeceased === true ? { motherDeceased: true } : {}),
      ...(source.fatherDeceased === true ? { fatherDeceased: true } : {}),
      ...(source.martyrChild === true ? { martyrChild: true } : {}),
      ...(source.veteranChild === true ? { veteranChild: true } : {}),
      ...(typeof source.homeAddress === "string"
        ? { homeAddress: source.homeAddress }
        : {}),
      ...(typeof source.allergies === "string" ? { allergies: source.allergies } : {}),
      ...(typeof source.dietaryNeeds === "string"
        ? { dietaryNeeds: source.dietaryNeeds }
        : {}),
      ...(typeof source.medicationNotes === "string"
        ? { medicationNotes: source.medicationNotes }
        : {}),
      ...(typeof source.emergencyNotes === "string"
        ? { emergencyNotes: source.emergencyNotes }
        : {}),
      ...(typeof source.physicianName === "string"
        ? { physicianName: source.physicianName }
        : {}),
      ...(typeof source.physicianPhone === "string"
        ? { physicianPhone: source.physicianPhone }
        : {}),
      ...(typeof source.medicalDevices === "string"
        ? { medicalDevices: source.medicalDevices }
        : {}),
      ...(typeof source.guardianEmail === "string"
        ? { guardianEmail: source.guardianEmail }
        : {}),
      ...(typeof source.familyEducationNeeds === "string"
        ? { familyEducationNeeds: source.familyEducationNeeds }
        : {}),
      ...(typeof source.familyParticipationPreferences === "string"
        ? { familyParticipationPreferences: source.familyParticipationPreferences }
        : {}),
      ...(source.photoVideoPermissionOnFile === true
        ? { photoVideoPermissionOnFile: true }
        : {}),
      ...(source.fieldTripPermissionOnFile === true
        ? { fieldTripPermissionOnFile: true }
        : {}),
      ...(source.digitalCommunicationPermissionOnFile === true
        ? { digitalCommunicationPermissionOnFile: true }
        : {}),
      ...(typeof source.permissionFormDate === "string"
        ? { permissionFormDate: source.permissionFormDate }
        : {}),
    });
  } catch {
    return undefined;
  }
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

  const nationalIdentityNumber = optionalTrimmed(input.nationalIdentityNumber);
  if (
    nationalIdentityNumber &&
    !isValidStudentNationalIdentityNumber(nationalIdentityNumber)
  ) {
    throw new Error("T.C. kimlik numarası 11 haneli ve geçerli olmalıdır.");
  }

  const legacyEnrollmentDateValue = optionalTrimmed(input.enrollmentDate);
  const legacyEnrollmentDate = legacyEnrollmentDateValue
    ? requireCivilDate(legacyEnrollmentDateValue, "Kayıt tarihi")
    : undefined;
  if (legacyEnrollmentDate && legacyEnrollmentDate > today) {
    throw new Error("Kayıt tarihi gelecekte olamaz.");
  }
  if (legacyEnrollmentDate && birthDate && legacyEnrollmentDate < birthDate) {
    throw new Error("Kayıt tarihi doğum tarihinden önce olamaz.");
  }
  const enrollmentYear =
    optionalTrimmed(input.enrollmentYear) ?? legacyEnrollmentDate?.slice(0, 4);
  if (enrollmentYear && !ENROLLMENT_YEAR_PATTERN.test(enrollmentYear)) {
    throw new Error("Okula kayıt yılı 4 haneli olmalıdır.");
  }
  if (enrollmentYear && enrollmentYear > today.slice(0, 4)) {
    throw new Error("Okula kayıt yılı gelecekte olamaz.");
  }
  if (enrollmentYear && birthDate && enrollmentYear < birthDate.slice(0, 4)) {
    throw new Error("Okula kayıt yılı doğum yılından önce olamaz.");
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
  const careDetails = normalizeStudentCareDetails(input.careDetails);
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
    ...(nationalIdentityNumber ? { nationalIdentityNumber } : {}),
    ...(enrollmentYear ? { enrollmentYear } : {}),
    ...(homeLanguages ? { homeLanguages } : {}),
    ...(interests ? { interests } : {}),
    ...(strengths ? { strengths } : {}),
    ...(supportPreferences ? { supportPreferences } : {}),
    ...(contacts.length > 0 ? { contacts } : {}),
    ...(careDetails ? { careDetails } : {}),
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
  const legacyEnrollmentYear =
    typeof record.enrollmentDate === "string" &&
    isCivilDateValue(record.enrollmentDate) &&
    (!birthDate || record.enrollmentDate >= birthDate)
      ? record.enrollmentDate.slice(0, 4)
      : undefined;
  const enrollmentYear =
    typeof record.enrollmentYear === "string" &&
    ENROLLMENT_YEAR_PATTERN.test(record.enrollmentYear) &&
    (!birthDate || record.enrollmentYear >= birthDate.slice(0, 4))
      ? record.enrollmentYear
      : legacyEnrollmentYear;
  const nationalIdentityNumber = isValidStudentNationalIdentityNumber(
    record.nationalIdentityNumber,
  )
    ? record.nationalIdentityNumber
    : undefined;
  const contacts = studentContactsFromRecord(record.contacts);
  const careDetails = studentCareDetailsFromRecord(record.careDetails);
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
    ...(nationalIdentityNumber ? { nationalIdentityNumber } : {}),
    ...(enrollmentYear ? { enrollmentYear } : {}),
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
    ...(careDetails ? { careDetails } : {}),
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
