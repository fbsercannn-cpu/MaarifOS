/**
 * QuickAttendanceGrid.tsx � E5 (0.50.0)
 *
 * Kompakt yoklama: her cocuk icin tek parmak tiklama. Var / Yok / Gec.
 * 20 cocuk icin ~20 saniye hedefi.
 * Grid layout: 44x44 px minimum dokunma hedefi (WCAG 2.5.5).
 * Veri: parent'tan gelir; bu bilesen sadece goruntuler ve callback yapar.
 */

import { triggerHaptic } from "../../core/haptics";

export type AttendanceStatus = "present" | "absent" | "late";

export interface QuickAttendanceStudent {
  readonly id: string;
  readonly displayName: string;
  readonly currentStatus: AttendanceStatus | null;
}

export interface QuickAttendanceGridProps {
  readonly students: readonly QuickAttendanceStudent[];
  readonly disabled?: boolean;
  readonly onMark: (studentId: string, status: AttendanceStatus) => void;
}

const STATUS_LABELS: Record<AttendanceStatus, string> = {
  present: "Var",
  absent: "Yok",
  late: "Gec",
};

const STATUS_ICONS: Record<AttendanceStatus, string> = {
  present: "?",
  absent: "?",
  late: "?",
};

const STATUSES: AttendanceStatus[] = ["present", "absent", "late"];

export function QuickAttendanceGrid({
  students,
  disabled = false,
  onMark,
}: QuickAttendanceGridProps) {
  const markedCount = students.filter((s) => s.currentStatus !== null).length;
  const presentCount = students.filter((s) => s.currentStatus === "present").length;
  const absentCount = students.filter((s) => s.currentStatus === "absent").length;
  const lateCount = students.filter((s) => s.currentStatus === "late").length;

  return (
    <section className="quick-attendance-grid" aria-label="Hizli Yoklama">
      <header className="qag__header">
        <h2>Hizli Yoklama</h2>
        <p role="status" aria-live="polite">
          {markedCount}/{students.length} isaretlendi
          {presentCount > 0 && ` � ${presentCount} var`}
          {absentCount > 0 && ` � ${absentCount} yok`}
          {lateCount > 0 && ` � ${lateCount} gec`}
        </p>
      </header>

      <ol className="qag__grid" aria-label="Ogrenci listesi">
        {students.map((student) => (
          <li key={student.id} className="qag__cell" data-status={student.currentStatus ?? "none"}>
            <span className="qag__name" title={student.displayName}>
              {student.displayName.split(" ")[0]}
            </span>
            <div className="qag__buttons" role="group" aria-label={`${student.displayName} yoklama`}>
              {STATUSES.map((status) => (
                <button
                  key={status}
                  type="button"
                  className="qag__btn"
                  aria-pressed={student.currentStatus === status}
                  aria-label={`${student.displayName} ${STATUS_LABELS[status]}`}
                  onClick={() => {
                    triggerHaptic(10);
                    onMark(student.id, status);
                  }}
                  disabled={disabled}
                >
                  <span aria-hidden="true">{STATUS_ICONS[status]}</span>
                </button>
              ))}
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
