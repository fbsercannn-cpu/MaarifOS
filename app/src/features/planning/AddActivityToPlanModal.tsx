import { useState } from "react";
import { Cross2Icon, PlusIcon } from "@radix-ui/react-icons";
import type { ActiveClassroomScope } from "../../core/domain/classroom-scope.ts";
import type { LocalDataStore } from "../../core/repository/contracts.ts";
import { appendActivityToDailyPlan } from "./daily-plan-activity-service.ts";
import "./daily-plan-enhancements.css";

export interface AddActivityToPlanModalProps {
  isOpen: boolean;
  onClose(): void;
  store: LocalDataStore;
  scope: ActiveClassroomScope;
  planId: string;
  civilDate: string;
  onAdded?(): void;
}

const QUICK_MAARIF_SUGGESTIONS = [
  { title: "Doğal Malzemelerle Sanat Atölyesi", kind: "teacher-activity-two", tag: "Sanat" },
  { title: "Meyve Sepeti Ritim Oyunu", kind: "teacher-activity-two", tag: "Müzik" },
  { title: "Bahçede Renk ve Denge Parkuru", kind: "outdoor-movement", tag: "Hareket" },
  { title: "Duygu Kartlarıyla Canlandırma", kind: "small-group", tag: "Drama" },
  { title: "Tohum ve Yaprak Keşif Masası", kind: "small-group", tag: "Fen/Doğa" },
  { title: "Şekil Avcıları Matematik Oyunu", kind: "small-group", tag: "Matematik" },
];

export function AddActivityToPlanModal({
  isOpen,
  onClose,
  store,
  scope,
  planId,
  civilDate,
  onAdded,
}: AddActivityToPlanModalProps) {
  const [title, setTitle] = useState("");
  const [flowBlockKind, setFlowBlockKind] = useState<"teacher-activity-two" | "small-group" | "outdoor-movement">("teacher-activity-two");
  const [startTime, setStartTime] = useState("");
  const [teacherNote, setTeacherNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  if (!isOpen) return null;

  const handleSelectQuickChip = (suggestion: (typeof QUICK_MAARIF_SUGGESTIONS)[number]) => {
    setTitle(suggestion.title);
    setFlowBlockKind(suggestion.kind as "teacher-activity-two" | "small-group" | "outdoor-movement");
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError("Lütfen etkinlik başlığı girin.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await appendActivityToDailyPlan(store, scope, {
        planId,
        title: title.trim(),
        flowBlockKind,
        startTime: startTime.trim() || null,
        teacherNote: teacherNote.trim() || undefined,
      });
      onAdded?.();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Etkinlik eklenemedi.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="aap-modal-overlay" role="dialog" aria-modal="true" aria-label="Plana Etkinlik Ekle">
      <div className="aap-modal-container">
        <div className="dpe-header">
          <div className="dpe-header-title">
            <h3>Günün Planına Etkinlik Ekle</h3>
            <p>{civilDate} · Yeni etkinlik veya akış zenginleştirmesi</p>
          </div>
          <button
            type="button"
            className="dpe-close-btn"
            onClick={onClose}
            aria-label="Kapat"
          >
            <Cross2Icon />
          </button>
        </div>

        <form onSubmit={handleAdd}>
          <div className="dpe-body">
            {error && (
              <div style={{ padding: "8px 12px", background: "#fef2f2", color: "#991b1b", borderRadius: "8px", fontSize: "0.85rem" }}>
                {error}
              </div>
            )}

            {/* Quick Suggestions Chips */}
            <div className="aap-form-group">
              <label>Hızlı Maarif Önerileri (Tıkla ve Seç):</label>
              <div className="aap-quick-chips">
                {QUICK_MAARIF_SUGGESTIONS.map((item) => (
                  <button
                    key={item.title}
                    type="button"
                    className="aap-quick-chip"
                    onClick={() => handleSelectQuickChip(item)}
                  >
                    + [{item.tag}] {item.title}
                  </button>
                ))}
              </div>
            </div>

            {/* Title Input */}
            <div className="aap-form-group">
              <label htmlFor="aap-title-input">Etkinlik Başlığı *</label>
              <input
                id="aap-title-input"
                type="text"
                className="aap-input"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Örn: Kukla ile Paylaşma Oyunu"
                autoFocus
              />
            </div>

            {/* Flow Block Assignment */}
            <div className="aap-form-group">
              <label htmlFor="aap-flow-select">Akış Bölümü Eşleşmesi:</label>
              <select
                id="aap-flow-select"
                className="aap-select"
                value={flowBlockKind}
                onChange={(e) => setFlowBlockKind(e.target.value as "teacher-activity-two" | "small-group" | "outdoor-movement")}
              >
                <option value="teacher-activity-two">2. Öğretmen Etkinliği</option>
                <option value="small-group">Küçük Grup Çalışması</option>
                <option value="outdoor-movement">Açık Hava ve Hareket</option>
              </select>
            </div>

            {/* Optional Start Time */}
            <div className="aap-form-group">
              <label htmlFor="aap-time-input">Başlangıç Saati (İsteğe Bağlı):</label>
              <input
                id="aap-time-input"
                type="time"
                className="aap-input"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
              />
            </div>

            {/* Teacher Note */}
            <div className="aap-form-group">
              <label htmlFor="aap-note-input">Öğretmen Notu / Materyal (İsteğe Bağlı):</label>
              <textarea
                id="aap-note-input"
                className="dpe-textarea"
                style={{ minHeight: "70px" }}
                value={teacherNote}
                onChange={(e) => setTeacherNote(e.target.value)}
                placeholder="Etkinlikte kullanılacak malzemeler veya dikkat edilecek noktalar..."
              />
            </div>
          </div>

          <div className="dpe-footer">
            <button type="button" className="dpe-btn-secondary" onClick={onClose}>
              Vazgeç
            </button>
            <button type="submit" className="dpe-btn-primary" disabled={busy}>
              <PlusIcon /> Plana Ekle ve Kaydet
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
