export type StudentHomeAddressParts = {
  readonly district: string;
  readonly province: string;
  readonly neighborhood: string;
  readonly streetAddress: string;
};

/** Form suggestions only: opening a form must not create an address record. */
export const DEFAULT_HOME_ADDRESS_PARTS: StudentHomeAddressParts = Object.freeze({
  district: "Acıpayam",
  province: "Denizli",
  neighborhood: "",
  streetAddress: "",
});

export const STUDENT_HOME_ADDRESS_LIMITS = Object.freeze({
  district: 80,
  province: 80,
  neighborhood: 120,
  streetAddress: 300,
});

const FIELD_LABELS: Record<keyof StudentHomeAddressParts, string> = {
  district: "İlçe",
  province: "İl",
  neighborhood: "Mahalle",
  streetAddress: "Cadde / sokak ve no",
};
const ADDRESS_KEYS = Object.keys(STUDENT_HOME_ADDRESS_LIMITS) as (keyof StudentHomeAddressParts)[];

function addressText(value: string): string {
  return value.normalize("NFC").trim().replace(/\s+/gu, " ");
}

/** Display projection; validation belongs to the save boundary, not live typing. */
export function formatStudentHomeAddress(parts: StudentHomeAddressParts): string {
  const neighborhood = addressText(parts.neighborhood);
  const neighborhoodLabel = neighborhood && !/(?:^|\s)(?:mahalle|mahallesi|mah\.)$/u.test(neighborhood.toLocaleLowerCase("tr-TR"))
    ? `${neighborhood} Mahalle`
    : neighborhood;
  return [parts.streetAddress, neighborhoodLabel, parts.district, parts.province]
    .map(addressText).filter(Boolean).join(" ");
}

export function normalizeStudentHomeAddressParts(value: unknown): StudentHomeAddressParts {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Ev adresi alanları geçerli bir nesne olmalıdır.");
  }
  const source = value as Record<string, unknown>;
  if (Object.keys(source).length !== ADDRESS_KEYS.length ||
    Object.keys(source).some(key => !ADDRESS_KEYS.includes(key as keyof StudentHomeAddressParts))) {
    throw new Error("Ev adresi ilçe, il, mahalle ve cadde / sokak ve no alanlarını içermelidir.");
  }
  const result = {} as Record<keyof StudentHomeAddressParts, string>;
  for (const key of ADDRESS_KEYS) {
    const raw = source[key];
    if (typeof raw !== "string" || /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/u.test(raw)) {
      throw new Error(`${FIELD_LABELS[key]} geçerli bir metin olmalıdır.`);
    }
    const text = addressText(raw);
    if (text.length > STUDENT_HOME_ADDRESS_LIMITS[key]) {
      throw new Error(`${FIELD_LABELS[key]} en fazla ${STUDENT_HOME_ADDRESS_LIMITS[key]} karakter olabilir.`);
    }
    result[key] = text;
  }
  return result;
}

/** Persisted and restored parts must already be canonical, without extra fields. */
export function isStudentHomeAddressParts(value: unknown): value is StudentHomeAddressParts {
  try {
    const normalized = normalizeStudentHomeAddressParts(value);
    const source = value as Record<string, unknown>;
    return ADDRESS_KEYS.every(key => source[key] === normalized[key]);
  } catch {
    return false;
  }
}
