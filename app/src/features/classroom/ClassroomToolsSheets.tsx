import { Cross2Icon, DownloadIcon } from "@radix-ui/react-icons";
import { BottomSheet, KeyboardInput } from "../../mobile";
import type { ClassroomStudentViewModel } from "./classroom-screen-model";

export interface ClassroomToolsSheetsProps {
  addOpen: boolean;
  exportOpen: boolean;
  busy: boolean;
  newStudentName: string;
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
  onAddStudent(): void | Promise<void>;
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
  onAddStudent,
  onExportStartDateChange,
  onExportEndDateChange,
  onExportNameModeChange,
  onExportStudentIdsChange,
  onDownload,
}: ClassroomToolsSheetsProps) {
  return (
    <>
      <BottomSheet
        open={addOpen}
        onOpenChange={onAddOpenChange}
        title="Çocuk ekle"
        description="Sınıf listesine yeni bir çocuk ekleyin."
        snap={0.44}
      >
        <form
          id="student-add-form"
          className="children-form roster-add-form"
          onSubmit={(event) => {
            event.preventDefault();
            void onAddStudent();
          }}
        >
          <label htmlFor="new-student-name">Çocuğun adı</label>
          <div className="children-add-row">
            <KeyboardInput
              id="new-student-name"
              value={newStudentName}
              onChange={(event) => onNewStudentNameChange(event.target.value)}
              placeholder="Ad ve soyad"
              autoComplete="off"
            />
            <button type="submit" disabled={!newStudentName.trim() || busy}>
              Ekle
            </button>
          </div>
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
