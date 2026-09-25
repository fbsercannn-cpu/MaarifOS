import { ChevronDownIcon, Cross2Icon, DownloadIcon } from "@radix-ui/react-icons";
import { useEffect, useRef, useState } from "react";
import { BottomSheet, KeyboardInput } from "../../mobile";
import { formatStudentPhone, splitStudentDisplayName } from "../../core/domain/student";
import { studentContactKindFromRelationship } from "../../core/domain/parent-surname-suggestion.ts";
import { ParentSurnameSuggestion } from "../students/ParentSurnameSuggestion.tsx";
import { StudentAddressField } from "../students/StudentAddressField.tsx";
import type { StudentHomeAddressParts } from "../../core/domain/student-home-address.ts";
import type { ClassroomStudentViewModel } from "./classroom-screen-model";
import "./classroom-tools-sheets.css";

export interface ClassroomToolsSheetsProps {
  addOpen: boolean;
  exportOpen: boolean;
  busy: boolean;
  newStudentName: string;
  newStudentNumber: string;
  newStudentBirthDate: string;
  newStudentNationalIdentityNumber: string;
  newStudentGuardianName: string;
  newStudentGuardianPhone: string;
  newStudentHomeAddress: string;
  newStudentHomeAddressParts?: StudentHomeAddressParts;
  newStudentError: string;
  civilDate: string;
  exportStartDate: string;
  exportEndDate: string;
  exportNameMode: "preferred" | "registered";
  exportStudentIds: readonly string[];
  students: readonly ClassroomStudentViewModel[];
  observationCount: number;
  onAddOpenChange(open: boolean): void;
  onExportOpenChange(open: boolean): void;
  onNewStudentNameChange(value: string): void;
  onNewStudentNumberChange(value: string): void;
  onNewStudentBirthDateChange(value: string): void;
  onNewStudentNationalIdentityNumberChange(value: string): void;
  onNewStudentGuardianNameChange(value: string): void;
  onNewStudentGuardianPhoneChange(value: string): void;
  onNewStudentHomeAddressChange(value: string, parts?: StudentHomeAddressParts): void;
  onAddStudent(
    guardianRelationship: string,
    guardianKind: "mother" | "father" | "other",
  ): boolean | Promise<boolean>;
  onExportStartDateChange(value: string): void;
  onExportEndDateChange(value: string): void;
  onExportNameModeChange(value: "preferred" | "registered"): void;
  onExportStudentIdsChange(value: string[]): void;
  onDownload(): void;
}

export function ClassroomToolsSheets({
  addOpen,
  exportOpen,
  busy,
  newStudentName,
  newStudentNumber,
  newStudentBirthDate,
  newStudentNationalIdentityNumber,
  newStudentGuardianName,
  newStudentGuardianPhone,
  newStudentHomeAddress,
  newStudentHomeAddressParts,
  newStudentError,
  civilDate,
  exportStartDate,
  exportEndDate,
  exportNameMode,
  exportStudentIds,
  students,
  observationCount,
  onAddOpenChange,
  onExportOpenChange,
  onNewStudentNameChange,
  onNewStudentNumberChange,
  onNewStudentBirthDateChange,
  onNewStudentNationalIdentityNumberChange,
  onNewStudentGuardianNameChange,
  onNewStudentGuardianPhoneChange,
  onNewStudentHomeAddressChange,
  onAddStudent,
  onExportStartDateChange,
  onExportEndDateChange,
  onExportNameModeChange,
  onExportStudentIdsChange,
  onDownload,
}: ClassroomToolsSheetsProps) {
  const [addedStudentCount, setAddedStudentCount] = useState(0);
  const [guardianRelationship, setGuardianRelationship] = useState("Veli");
  const [submissionPending, setSubmissionPending] = useState(false);
  const pendingActionRef = useRef<"next" | "close" | null>(null);
  const submittedStudentCountRef = useRef(students.length);
  const continuingSeriesRef = useRef(false);
  const wasAddOpenRef = useRef(addOpen);
  const nameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (addOpen && continuingSeriesRef.current) {
      continuingSeriesRef.current = false;
      const frame = window.requestAnimationFrame(() => nameInputRef.current?.focus());
      wasAddOpenRef.current = addOpen;
      return () => window.cancelAnimationFrame(frame);
    }
    if (addOpen && !wasAddOpenRef.current) {
      setAddedStudentCount(0);
    }
    wasAddOpenRef.current = addOpen;
  }, [addOpen, addedStudentCount]);

  useEffect(() => {
    const action = pendingActionRef.current;
    if (!action || students.length <= submittedStudentCountRef.current) return;

    const addedCount = students.length - submittedStudentCountRef.current;
    pendingActionRef.current = null;
    setSubmissionPending(false);
    setAddedStudentCount((current) => current + addedCount);

    if (action === "next") {
      continuingSeriesRef.current = true;
      onAddOpenChange(true);
    }
  }, [onAddOpenChange, students.length]);

  useEffect(() => {
    if (!newStudentError || !pendingActionRef.current) return;
    pendingActionRef.current = null;
    setSubmissionPending(false);
  }, [newStudentError]);

  const submitStudent = async (action: "next" | "close") => {
    if (!newStudentName.trim() || busy || submissionPending) return;
    pendingActionRef.current = action;
    submittedStudentCountRef.current = students.length;
    setSubmissionPending(true);
    try {
      const relationship = guardianRelationship.trim() || "Veli";
      const guardianKind = studentContactKindFromRelationship(relationship);
      const saved = await onAddStudent(relationship, guardianKind);
      if (!saved) {
        pendingActionRef.current = null;
        setSubmissionPending(false);
      }
    } catch {
      pendingActionRef.current = null;
      setSubmissionPending(false);
    }
  };

  return (
    <>
      <BottomSheet
        key={addOpen ? "student-add-open" : "student-add-closed"}
        open={addOpen}
        onOpenChange={onAddOpenChange}
        title="Çocuk ekle"
        description="Adını ve soyadını yazıp kaydedin; diğer bilgileri şimdi ya da daha sonra tamamlayabilirsiniz."
        snap={0.9}
      >
        <form
          id="student-add-form"
          className="children-form roster-add-form student-profile-form"
          onSubmit={(event) => {
            event.preventDefault();
            void submitStudent("close");
          }}
        >
          <label htmlFor="new-student-name">Çocuğun adı</label>
          <KeyboardInput
            id="new-student-name"
            value={newStudentName}
            onChange={(event) => onNewStudentNameChange(event.target.value.slice(0, 120))}
            placeholder="Ad ve soyad"
            autoComplete="off"
            ref={nameInputRef}
          />

          <StudentAddressField key={addedStudentCount} id="new-student-home-address" value={newStudentHomeAddress}
            parts={newStudentHomeAddressParts}
            disabled={busy || submissionPending} onChange={onNewStudentHomeAddressChange} />

          <div className="student-quick-entry-actions">
            <button
              className="sheet-primary"
              type="submit"
              disabled={!newStudentName.trim() || busy || submissionPending}
            >
              Kaydet ve kapat
            </button>
            <button
              className="student-quick-entry-next"
              type="button"
              disabled={!newStudentName.trim() || busy || submissionPending}
              onClick={() => void submitStudent("next")}
            >
              Kaydet ve sıradakini ekle
            </button>
          </div>

          <details className="student-optional-details">
            <summary>
              <span>İsteğe bağlı çocuk ve veli bilgileri</span>
              <ChevronDownIcon aria-hidden="true" />
            </summary>
            <div className="student-optional-details__content">
              <div className="student-profile-form-grid">
                <label htmlFor="new-student-number">
                  Öğrenci numarası
                  <KeyboardInput
                    id="new-student-number"
                    value={newStudentNumber}
                    onChange={(event) => onNewStudentNumberChange(event.target.value.slice(0, 40))}
                    placeholder="Örn. 27"
                    autoComplete="off"
                  />
                </label>
                <label htmlFor="new-student-birth-date">
                  Doğum tarihi
                  <KeyboardInput
                    id="new-student-birth-date"
                    type="date"
                    value={newStudentBirthDate}
                    max={civilDate}
                    onChange={(event) => onNewStudentBirthDateChange(event.target.value)}
                    autoComplete="bday"
                  />
                  <small>İsteğe bağlı; boşsa sınıfın yaş bandı kullanılır.</small>
                </label>
                <label htmlFor="new-student-national-identity-number">
                  T.C. kimlik numarası
                  <KeyboardInput
                    id="new-student-national-identity-number"
                    inputMode="numeric"
                    maxLength={11}
                    value={newStudentNationalIdentityNumber}
                    onChange={(event) =>
                      onNewStudentNationalIdentityNumberChange(
                        event.target.value.replace(/\D/g, "").slice(0, 11),
                      )
                    }
                    placeholder="11 hane · isteğe bağlı"
                    autoComplete="off"
                  />
                </label>
              </div>

              <section className="student-contact-card" aria-labelledby="quick-student-guardian-heading">
                <div className="student-contact-card-heading">
                  <strong id="quick-student-guardian-heading">Veli iletişimi</strong>
                  <span>İsteğe bağlı</span>
                </div>
                <label htmlFor="new-student-guardian-relationship">
                  Yakınlığı
                  <KeyboardInput
                    id="new-student-guardian-relationship"
                    value={guardianRelationship}
                    onChange={(event) =>
                      setGuardianRelationship(event.target.value.slice(0, 60))
                    }
                    placeholder="Örn. Anne, baba, bakıcı"
                    autoComplete="off"
                  />
                </label>
                <label htmlFor="new-student-guardian-name">
                  Yakının adı ve soyadı
                  <KeyboardInput
                    id="new-student-guardian-name"
                    value={newStudentGuardianName}
                    onChange={(event) => onNewStudentGuardianNameChange(event.target.value.slice(0, 120))}
                    placeholder="Ad ve soyad"
                    autoComplete="name"
                  />
                </label>
                <ParentSurnameSuggestion childLastName={splitStudentDisplayName(newStudentName).lastName}
                  parentName={newStudentGuardianName} kind={studentContactKindFromRelationship(guardianRelationship)}
                  disabled={busy || submissionPending} onApply={onNewStudentGuardianNameChange} />
                <label htmlFor="new-student-guardian-phone">
                  Yakının cep telefonu
                  <KeyboardInput
                    id="new-student-guardian-phone"
                    type="tel"
                    inputMode="tel"
                    value={newStudentGuardianPhone}
                    onChange={(event) =>
                      onNewStudentGuardianPhoneChange(formatStudentPhone(event.target.value))
                    }
                    placeholder="05xx xxx xx xx"
                    autoComplete="tel"
                  />
                </label>
              </section>
            </div>
          </details>

          {newStudentError ? (
            <p className="student-contact-invalid" role="alert">
              {newStudentError}
            </p>
          ) : null}

          {addedStudentCount > 0 ? (
            <p
              className="student-quick-entry-status"
              role="status"
              aria-live="polite"
              aria-atomic="true"
            >
              Bu seride {addedStudentCount} çocuk eklendi.
            </p>
          ) : null}
        </form>
      </BottomSheet>

      <BottomSheet
        open={exportOpen}
        onOpenChange={onExportOpenChange}
        title="Sınıf gözlem dökümü"
        description="Paylaşmadan önce tarih, çocuk kapsamı ve ad kullanımını denetleyin."
        snap={0.88}
      >
        <section
          className="roster-export-preview"
          id="class-observation-export-preview"
          aria-labelledby="class-observation-export-heading"
        >
          <div className="roster-export-preview-heading">
            <div>
              <span className="d1-kicker">Paylaşmadan önce denetle</span>
              <h3 id="class-observation-export-heading">Sınıf gözlem dökümü</h3>
            </div>
            <button
              type="button"
              onClick={() => onExportOpenChange(false)}
              aria-label="Dışa aktarım önizlemesini kapat"
            >
              <Cross2Icon aria-hidden="true" />
            </button>
          </div>

          <div className="roster-export-date-grid">
            <label>
              Başlangıç
              <KeyboardInput
                type="date"
                value={exportStartDate}
                max={exportEndDate || civilDate}
                onChange={(event) => onExportStartDateChange(event.target.value)}
              />
            </label>
            <label>
              Bitiş
              <KeyboardInput
                type="date"
                value={exportEndDate}
                min={exportStartDate || undefined}
                max={civilDate}
                onChange={(event) => onExportEndDateChange(event.target.value)}
              />
            </label>
          </div>

          <fieldset className="roster-export-name-mode">
            <legend>Metinde kullanılacak ad</legend>
            <label>
              <input
                type="radio"
                name="class-export-name-mode"
                checked={exportNameMode === "preferred"}
                onChange={() => onExportNameModeChange("preferred")}
              />
              Tercih edilen ad
            </label>
            <label>
              <input
                type="radio"
                name="class-export-name-mode"
                checked={exportNameMode === "registered"}
                onChange={() => onExportNameModeChange("registered")}
              />
              Kayıtlı tam ad
            </label>
          </fieldset>

          <details className="roster-export-students">
            <summary>
              Çocuk kapsamı
              <strong>{exportStudentIds.length}/{students.length}</strong>
            </summary>
            <div>
              <button
                type="button"
                onClick={() => onExportStudentIdsChange(students.map(({ id }) => id))}
              >
                Tümünü seç
              </button>
              <button type="button" onClick={() => onExportStudentIdsChange([])}>
                Temizle
              </button>
            </div>
            {students.map((student) => (
              <label key={student.id}>
                <input
                  type="checkbox"
                  checked={exportStudentIds.includes(student.id)}
                  onChange={(event) =>
                    onExportStudentIdsChange(
                      event.target.checked
                        ? [...exportStudentIds, student.id]
                        : exportStudentIds.filter((id) => id !== student.id),
                    )
                  }
                />
                {student.preferredName ?? student.name}
              </label>
            ))}
          </details>

          <div className="roster-export-summary">
            <strong>{observationCount} gözlem</strong>
            <span>
              {exportStudentIds.length} çocuk · Telefon ve fotoğraf dahil edilmeyecek
            </span>
          </div>

          <button
            className="roster-export-download"
            type="button"
            onClick={onDownload}
            disabled={exportStudentIds.length === 0}
          >
            <DownloadIcon aria-hidden="true" />
            Düz metin dosyasını indir
          </button>
        </section>
      </BottomSheet>
    </>
  );
}
