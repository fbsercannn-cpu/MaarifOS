import React, { useState, useEffect } from "react";
import {
  CheckCircledIcon,
  ChevronRightIcon,
  ReaderIcon,
  Pencil1Icon
} from "@radix-ui/react-icons";
import { LearningCentersDistributionBoard } from "../learning-centers/LearningCentersDistributionBoard.tsx";

export interface RoutineItem {
  id: string;
  order: number;
  title: string;
  subtitle: string;
  timeHint: string;
  icon: string;
  actionLabel: string;
  onAction?: () => void;
}

interface Props {
  dateIso?: string;
  onOpenAttendance?: () => void;
  onOpenQuickObservation?: () => void;
  onOpenPlanFlow?: () => void;
  onOpenDayClosure?: () => void;
}

export function OfficialDailyRoutinesTracker({
  dateIso = new Date().toISOString().slice(0, 10),
  onOpenAttendance,
  onOpenQuickObservation,
  onOpenPlanFlow,
  onOpenDayClosure,
}: Props) {
  const storageKey = `maarif_daily_routines_${dateIso}`;

  const [completedRoutines, setCompletedRoutines] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const [activeRoutineId, setActiveRoutineId] = useState<string>("routine-1");
  const [isCollapsed, setIsCollapsed] = useState<boolean>(false);
  const [showCentersModal, setShowCentersModal] = useState<boolean>(false);

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(completedRoutines));
    } catch {
      // Graceful degradation
    }
  }, [completedRoutines, storageKey]);

  const routines: RoutineItem[] = [
    {
      id: "routine-1",
      order: 1,
      title: "Güne Başlama Zamanı",
      subtitle: "Giriş, selamlaşma, duygu panosu, takvim, yoklama",
      timeHint: "08:30 – 09:15",
      icon: "🌅",
      actionLabel: "Yoklama Al",
      onAction: onOpenAttendance,
    },
    {
      id: "routine-2",
      order: 2,
      title: "Öğrenme Merkezlerinde Oyun",
      subtitle: "Blok, kitap, sanat, fen, müzik ve dramatik oyun",
      timeHint: "09:15 – 10:15",
      icon: "🧩",
      actionLabel: "Merkez Dağıtımı",
      onAction: () => setShowCentersModal(true),
    },
    {
      id: "routine-3",
      order: 3,
      title: "Beslenme, Toplanma ve Temizlik",
      subtitle: "Öz bakım becerileri, sofra kuralları, temizlik",
      timeHint: "10:15 – 10:50",
      icon: "🍎",
      actionLabel: "Öz Bakım Takibi",
      onAction: onOpenQuickObservation,
    },
    {
      id: "routine-4",
      order: 4,
      title: "Etkinlik Zamanı",
      subtitle: "Bütünleştirilmiş/bağımsız etkinlikler & 7 materyal sandığı",
      timeHint: "10:50 – 12:00",
      icon: "🎨",
      actionLabel: "Günün Planı",
      onAction: onOpenPlanFlow,
    },
    {
      id: "routine-5",
      order: 5,
      title: "Günü Değerlendirme Zamanı",
      subtitle: "Neler yaptık, duygu paylaşımı, yarına hazırlık, eve dönüş",
      timeHint: "12:00 – 12:30",
      icon: "🌟",
      actionLabel: "Günü Tamamla",
      onAction: onOpenDayClosure,
    },
  ];

  const toggleComplete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setCompletedRoutines((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const completedCount = routines.filter((r) => completedRoutines[r.id]).length;
  const progressPercent = Math.round((completedCount / routines.length) * 100);

  const handleDownloadRoutinesExcel = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const { exportOfficialTableToExcel } = await import("../official-forms/official-form-export-service.ts");
    const rows = routines.map((r) => {
      const isDone = Boolean(completedRoutines[r.id]);
      return {
        order: r.order,
        title: r.title,
        timeHint: r.timeHint,
        subtitle: r.subtitle,
        status: isDone ? "Tamamlandı (✓)" : "Bekliyor (-)",
        isDoneNum: isDone ? 1 : 0,
      };
    });

    await exportOfficialTableToExcel({
      fileName: `Gunun_5_Resmi_Rutini_Takip_${dateIso}`,
      sheetName: "Rutin Takip",
      title: "T.C. MİLLÎ EĞİTİM BAKANLIĞI — GÜNÜN 5 RESMÎ RUTİNİ TAKİP VE DENETİM ÇİZELGESİ",
      subtitle: `Tarih: ${dateIso} · MEB TTKB Okul Öncesi Eğitim Programı Sayfa 92`,
      metadata: [
        { label: "Tarih", value: dateIso },
        { label: "Tamamlanan Rutin", value: `${completedCount} / 5 (%${progressPercent})` },
        { label: "Mevzuat", value: "MEB TTKB Günün Akışı ve 5 Resmî Rutini" },
      ],
      columns: [
        { header: "Sıra", key: "order", width: 8, align: "center", isNumeric: true },
        { header: "Resmî Rutin Adı", key: "title", width: 32 },
        { header: "Önerilen Zaman", key: "timeHint", width: 18, align: "center" },
        { header: "Pedagojik Süreç ve Kapsam", key: "subtitle", width: 45 },
        { header: "Durum", key: "status", width: 18, align: "center" },
        { header: "Puan (1)", key: "isDoneNum", width: 10, align: "center", isNumeric: true },
      ],
      rows,
      includeSubtotals: true,
    });
  };

  return (
    <section
      className="official-routines-tracker no-print"
      aria-labelledby="official-routines-title"
      style={{
        background: "#ffffff",
        border: "1px solid #e2e8f0",
        borderRadius: "14px",
        padding: "12px 14px",
        margin: "12px 0 16px 0",
        boxShadow: "0 2px 8px rgba(15, 23, 42, 0.04)",
      }}
    >
      <header
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          cursor: "pointer",
          userSelect: "none",
        }}
        onClick={() => setIsCollapsed(!isCollapsed)}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ fontSize: "1.2rem" }}>⏱️</span>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <h2
                id="official-routines-title"
                style={{
                  fontSize: "0.95rem",
                  fontWeight: 800,
                  margin: 0,
                  color: "#0f172a",
                  letterSpacing: "-0.01em",
                }}
              >
                Günün 5 Resmî Rutini
              </h2>
              <span
                style={{
                  fontSize: "0.68rem",
                  fontWeight: 700,
                  background: "#fed7aa",
                  color: "#9a3412",
                  padding: "1px 6px",
                  borderRadius: "6px",
                }}
              >
                TTKB s. 92
              </span>
            </div>
            <p style={{ margin: "2px 0 0 0", fontSize: "0.75rem", color: "#64748b" }}>
              {completedCount === 5
                ? "Günün tüm resmî akışı tamamlandı! 🎉"
                : `${completedCount}/5 Rutin Tamamlandı (% ${progressPercent})`}
            </p>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          {/* Rutin Excel Çıktısı Butonu */}
          <button
            type="button"
            onClick={handleDownloadRoutinesExcel}
            style={{
              padding: "4px 8px",
              background: "#ecfdf5",
              color: "#065f46",
              border: "1px solid #a7f3d0",
              borderRadius: "6px",
              fontSize: "0.75rem",
              fontWeight: 600,
              cursor: "pointer",
            }}
            title="Günün 5 resmî rutini takip Excel çizelgesi indir (SUBTOTAL 109 Korumalı)"
          >
            📊 Rutin Excel (.xlsx)
          </button>
          {/* Circular / pill indicator */}
          <div
            style={{
              width: "48px",
              height: "6px",
              background: "#e2e8f0",
              borderRadius: "3px",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                width: `${progressPercent}%`,
                height: "100%",
                background: completedCount === 5 ? "#059669" : "#ea580c",
                transition: "width 0.3s ease",
              }}
            />
          </div>
          <button
            type="button"
            aria-label={isCollapsed ? "Rutinleri Genişlet" : "Rutinleri Daralt"}
            style={{
              background: "none",
              border: "none",
              color: "#64748b",
              cursor: "pointer",
              fontSize: "0.85rem",
              fontWeight: 700,
            }}
          >
            {isCollapsed ? "▼ Göster" : "▲ Gizle"}
          </button>
        </div>
      </header>

      {!isCollapsed ? (
        <div style={{ marginTop: "12px", display: "flex", flexDirection: "column", gap: "8px" }}>
          {routines.map((routine) => {
            const isDone = Boolean(completedRoutines[routine.id]);
            const isActive = activeRoutineId === routine.id;

            return (
              <div
                key={routine.id}
                onClick={() => setActiveRoutineId(routine.id)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "8px 10px",
                  borderRadius: "10px",
                  border: isDone
                    ? "1px solid #d1fae5"
                    : isActive
                    ? "1px solid #fdba74"
                    : "1px solid #f1f5f9",
                  background: isDone ? "#f0fdf4" : isActive ? "#fff7ed" : "#f8fafc",
                  transition: "all 0.15s ease",
                  cursor: "pointer",
                  gap: "10px",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "10px", minWidth: 0, flex: 1 }}>
                  {/* Status toggle checkmark */}
                  <button
                    type="button"
                    onClick={(e) => toggleComplete(routine.id, e)}
                    aria-label={`${routine.title} durumunu değiştir`}
                    style={{
                      width: "28px",
                      height: "28px",
                      borderRadius: "50%",
                      border: isDone ? "2px solid #059669" : "2px solid #cbd5e1",
                      background: isDone ? "#059669" : "#ffffff",
                      color: "#ffffff",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      cursor: "pointer",
                      fontSize: "0.85rem",
                      flexShrink: 0,
                    }}
                  >
                    {isDone ? "✓" : ""}
                  </button>

                  <div style={{ minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
                      <span style={{ fontSize: "0.95rem" }}>{routine.icon}</span>
                      <strong
                        style={{
                          fontSize: "0.85rem",
                          color: isDone ? "#065f46" : "#1e293b",
                          textDecoration: isDone ? "line-through" : "none",
                        }}
                      >
                        {routine.order}. {routine.title}
                      </strong>
                      <span
                        style={{
                          fontSize: "0.68rem",
                          color: "#64748b",
                          background: "#e2e8f0",
                          padding: "1px 5px",
                          borderRadius: "4px",
                        }}
                      >
                        {routine.timeHint}
                      </span>
                    </div>
                    <div
                      style={{
                        fontSize: "0.74rem",
                        color: "#64748b",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        marginTop: "1px",
                      }}
                    >
                      {routine.subtitle}
                    </div>
                  </div>
                </div>

                {/* Direct Action Button */}
                {routine.onAction ? (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      routine.onAction?.();
                    }}
                    style={{
                      background: isDone ? "#e2e8f0" : "#ea580c",
                      color: isDone ? "#475569" : "#ffffff",
                      border: "none",
                      borderRadius: "6px",
                      padding: "5px 10px",
                      fontSize: "0.75rem",
                      fontWeight: 700,
                      cursor: "pointer",
                      whiteSpace: "nowrap",
                      flexShrink: 0,
                      display: "flex",
                      alignItems: "center",
                      gap: "4px",
                    }}
                  >
                    <span>{routine.actionLabel}</span>
                    <ChevronRightIcon />
                  </button>
                ) : null}
              </div>
            );
          })}
        </div>
      ) : null}

      {showCentersModal ? (
        <LearningCentersDistributionBoard
          dateIso={dateIso}
          onClose={() => setShowCentersModal(false)}
          onOpenQuickObservation={() => {
            setShowCentersModal(false);
            onOpenQuickObservation?.();
          }}
        />
      ) : null}
    </section>
  );
}
