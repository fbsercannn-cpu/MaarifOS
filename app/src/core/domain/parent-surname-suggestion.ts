import type { StudentContactKind } from "./student.ts";

export function studentContactKindFromRelationship(relationship: string): StudentContactKind {
  const value = relationship.normalize("NFC").trim().toLocaleLowerCase("tr-TR");
  if (value === "anne" || value === "annesi") return "mother";
  if (value === "baba" || value === "babası") return "father";
  return "other";
}

/** A proposal only: callers must wait for an explicit apply action. */
export function suggestParentFullName(input: {
  childLastName: string;
  parentName: string;
  kind: StudentContactKind;
}): string | null {
  if (input.kind === "other") return null;
  const surname = input.childLastName.trim().replace(/\s+/g, " ");
  const name = input.parentName.trim().replace(/\s+/g, " ");
  // A multiword value might already include a different surname. Never guess
  // which part to replace or silently append a second surname to that value.
  if (!surname || !name || name.includes(" ")) return null;
  if (name.normalize("NFC").toLocaleLowerCase("tr-TR") === surname.normalize("NFC").toLocaleLowerCase("tr-TR")) return null;
  const proposedName = `${name} ${surname}`;
  return proposedName.length <= 120 ? proposedName : null;
}
