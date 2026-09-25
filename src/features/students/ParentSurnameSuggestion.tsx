import type { StudentContactKind } from "../../core/domain/student.ts";
import { suggestParentFullName } from "../../core/domain/parent-surname-suggestion.ts";
import { studentProfileCopy } from "./student-profile-copy.ts";
import "./student-profile-entry.css";

export function ParentSurnameSuggestion({ childLastName, parentName, kind, disabled, onApply }: {
  childLastName: string;
  parentName: string;
  kind: StudentContactKind;
  disabled?: boolean;
  onApply(name: string): void;
}) {
  const suggestion = suggestParentFullName({ childLastName, parentName, kind });
  if (!suggestion) return null;
  const parentLabel = kind === "mother" ? studentProfileCopy.mother : studentProfileCopy.father;
  return <div className="student-surname-suggestion">
    <button type="button" disabled={disabled}
      aria-label={`${parentLabel} ${studentProfileCopy.applySurname.toLocaleLowerCase("tr-TR")}: ${suggestion}`}
      onClick={() => onApply(suggestion)}>
      {studentProfileCopy.applySurname}: {suggestion}
    </button>
    <small>{studentProfileCopy.surnameSuggestionHelp}</small>
  </div>;
}
