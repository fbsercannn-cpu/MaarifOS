type OptionalEvidenceText = string | null | undefined;

const PARAGRAPH_SEPARATOR = /\r?\n(?:[ \t]*\r?\n)+/u;

function paragraphIdentity(value: string): string {
  return value.replaceAll("\r\n", "\n").trim();
}

function evidenceParagraphs(value: OptionalEvidenceText): string[] {
  if (!value?.trim()) return [];
  return value
    .trim()
    .split(PARAGRAPH_SEPARATOR)
    .filter((paragraph) => paragraph.trim().length > 0);
}

/**
 * Initializes an empty field with the system seed without modifying a saved,
 * non-empty teacher draft. Exact duplicate seed paragraphs left by an older
 * flow are collapsed to the first copy.
 */
export function mergeEvidenceSeedParagraph(
  existingText: OptionalEvidenceText,
  seedParagraph: OptionalEvidenceText,
): string {
  const seed = seedParagraph?.trim() ?? "";
  if (!seed) return existingText ?? "";

  const existing = existingText ?? "";
  if (!existing.trim()) return seed;

  const seedIdentity = paragraphIdentity(seed);
  const paragraphs = evidenceParagraphs(existing);
  const seedCopies = paragraphs.filter(
    (paragraph) => paragraphIdentity(paragraph) === seedIdentity,
  ).length;

  // A non-empty persisted draft is teacher-owned. Keep it byte-exact unless
  // there is an actual duplicate of this exact system paragraph to repair.
  if (seedCopies <= 1) return existing;

  const merged: string[] = [];
  let seedSeen = false;
  for (const paragraph of paragraphs) {
    if (paragraphIdentity(paragraph) !== seedIdentity) {
      merged.push(paragraph);
      continue;
    }
    if (!seedSeen) {
      merged.push(paragraph);
      seedSeen = true;
    }
  }

  return merged.join("\n\n");
}

/**
 * Returns true only when the stored field includes text other than exact seed
 * paragraphs. This lets context and childQuote review logic ignore a system
 * seed without hiding teacher-authored text beside it.
 */
export function hasNonSeedEvidenceText(
  existingText: OptionalEvidenceText,
  seedParagraph: OptionalEvidenceText,
): boolean {
  const paragraphs = evidenceParagraphs(existingText);
  if (paragraphs.length === 0) return false;

  const seed = seedParagraph?.trim() ?? "";
  if (!seed) return true;
  const seedIdentity = paragraphIdentity(seed);
  return paragraphs.some(
    (paragraph) => paragraphIdentity(paragraph) !== seedIdentity,
  );
}
