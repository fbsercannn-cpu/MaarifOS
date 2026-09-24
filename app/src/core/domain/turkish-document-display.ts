/** Display only. Identifiers, telephone numbers and persisted source values are never rewritten. */
const ABBREVIATIONS = new Set(["T.C.", "TC", "MEB", "T.C", "TDK", "PTT", "DSİ", "SGK", "OSB", "TOKİ", "AŞ", "A.Ş.", "TBMM", "TR", "PDR", "BT", "İŞKUR", "AFAD", "MTA", "TÜBİTAK"]);
const TITLE_ABBREVIATIONS: Record<string, string> = { "no": "No", "no.": "No.", "dr": "Dr", "dr.": "Dr.", "prof.": "Prof.", "doç.": "Doç.", "mah.": "Mah.", "cad.": "Cad.", "sok.": "Sok.", "sk.": "Sk.", "apt.": "Apt.", "ltd.": "Ltd.", "şti.": "Şti." };
function capitalized(value: string): string {
  const lower = value.toLocaleLowerCase("tr-TR");
  return lower.replace(/^\p{L}/u, first => first.toLocaleUpperCase("tr-TR"));
}
export function turkishDocumentName(value: string): string {
  return value.normalize("NFC").replace(/\p{L}[\p{L}\p{M}]*(?:['’][\p{L}\p{M}]+)*/gu, capitalized);
}
export function turkishDocumentAddress(value: string): string {
  return value.normalize("NFC").replace(/[\p{L}\p{M}][\p{L}\p{M}.]*/gu, token => {
    const upper = token.toLocaleUpperCase("tr-TR"), lower = token.toLocaleLowerCase("tr-TR");
    if (ABBREVIATIONS.has(upper)) return upper;
    if (TITLE_ABBREVIATIONS[lower]) return TITLE_ABBREVIATIONS[lower];
    // A dotted initialism is kept as an initialism; phone and building digits are outside this match.
    if (/^(?:\p{L}\.){2,}$/u.test(token)) return upper;
    return capitalized(token);
  });
}
/** Occupations and relationship descriptions are sentences; only their initial and known acronyms change. */
export function turkishDocumentDescription(value: string): string {
  let first = true;
  return value.normalize("NFC").replace(/[\p{L}\p{M}][\p{L}\p{M}.]*/gu, token => {
    const upper = token.toLocaleUpperCase("tr-TR"), lower = token.toLocaleLowerCase("tr-TR");
    const result = ABBREVIATIONS.has(upper) ? upper : TITLE_ABBREVIATIONS[lower] ?? (first ? capitalized(token) : lower);
    first = false; return result;
  });
}
