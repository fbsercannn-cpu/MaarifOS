import React, { useState, useEffect } from "react";
import { ChevronRightIcon, CheckCircledIcon, Cross2Icon } from "@radix-ui/react-icons";
import "./learning-centers.css";

export interface StudentItem {
  id: string;
  name: string;
  gender?: "girl" | "boy";
}

export interface CenterDefinition {
  id: string;
  name: string;
  icon: string;
  capacity: number;
  description: string;
  materials: string;
}

export const OFFICIAL_CENTERS: CenterDefinition[] = [
  {
    id: "blok",
    name: "Blok Merkezi",
    icon: "🧱",
    capacity: 4,
    description: "3B bloklar, ahşap parçalar, denge ve mimari problem çözme",
    materials: "Ahşap geometrik bloklar, köprü parçaları, araçlar",
  },
  {
    id: "kitap",
    name: "Kitap ve Dil Merkezi",
    icon: "📚",
    capacity: 4,
    description: "Resimli hikâye kitapları, erken okuryazarlık, dinleme ve anlatma",
    materials: "Resimli masal kitapları, minderler, büyüteç, kuklalar",
  },
  {
    id: "muzik",
    name: "Müzik ve Ritim Merkezi",
    icon: "🎵",
    capacity: 3,
    description: "Ritim çalgıları, ses ayırma, tempo tutma ve melodik eşlik",
    materials: "Marakas, tef, ksilofon, ritim çubukları, ses kutuları",
  },
  {
    id: "sanat",
    name: "Sanat ve Tasarım Merkezi",
    icon: "🎨",
    capacity: 5,
    description: "Özgün sanatsal üretim, yoğurma maddeleri, kolaj ve çizim",
    materials: "Pastel ve sulu boyalar, kil, atık malzemeler, makas, yapıştırıcı",
  },
  {
    id: "fen",
    name: "Fen ve Doğa Merkezi",
    icon: "🔬",
    capacity: 4,
    description: "Bilimsel gözlem, canlı inceleme, tartma, ölçme ve tahmin",
    materials: "Büyüteç, mıknatıs, terazi, bitki tohumları, taş ve yaprak koleksiyonu",
  },
  {
    id: "drama",
    name: "Dramatik Oyun Merkezi",
    icon: "🎭",
    capacity: 4,
    description: "Rol oynama, sosyalleşme, empati ve canlandırma",
    materials: "Kostümler, mutfak gereçleri, doktor/tamir seti, şapkalar",
  },
];

interface Props {
  students?: readonly StudentItem[];
  dateIso?: string;
  onClose?: () => void;
  onOpenQuickObservation?: (studentId: string) => void;
}

export function LearningCentersDistributionBoard({
  students = [
    { id: "s-1", name: "Ali Yılmaz" },
    { id: "s-2", name: "Ayşe Kaya" },
    { id: "s-3", name: "Mehmet Demir" },
    { id: "s-4", name: "Zeynep Çelik" },
    { id: "s-5", name: "Can Aksoy" },
    { id: "s-6", name: "Elif Öztürk" },
    { id: "s-7", name: "Burak Şahin" },
    { id: "s-8", name: "Defne Koç" },
    { id: "s-9", name: "Emir Aydın" },
    { id: "s-10", name: "Yağmur Yıldız" },
    { id: "s-11", name: "Kerem Arslan" },
    { id: "s-12", name: "Merve Doğan" },
    { id: "s-13", name: "Efe Güler" },
    { id: "s-14", name: "Selin Polat" },
    { id: "s-15", name: "Umut Kara" },
    { id: "s-16", name: "Duru Kurt" },
    { id: "s-17", name: "Arda Tekin" },
    { id: "s-18", name: "Beren Yavuz" },
    { id: "s-19", name: "Yusuf Avcı" },
    { id: "s-20", name: "Ceren Gül" },
  ],
  dateIso = new Date().toISOString().slice(0, 10),
  onClose,
  onOpenQuickObservation,
}: Props) {
  const storageKey = `maarif_centers_distribution_${dateIso}`;

  // centerId -> array of studentIds
  const [distribution, setDistribution] = useState<Record<string, string[]>>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return {
      blok: ["s-1", "s-2"],
      kitap: ["s-3", "s-4"],
      muzik: ["s-5", "s-6"],
      sanat: ["s-7", "s-8", "s-9"],
      fen: ["s-10", "s-11"],
      drama: ["s-12", "s-13"],
    };
  });

  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(distribution));
    } catch {
      // ignore
    }
  }, [distribution, storageKey]);

  // Assigned student IDs set
  const assignedIds = new Set(Object.values(distribution).flat());
  const unassignedStudents = students.filter((s) => !assignedIds.has(s.id));

  const assignStudentToCenter = (studentId: string, targetCenterId: string) => {
    setDistribution((prev) => {
      const updated: Record<string, string[]> = {};
      for (const [cId, sIds] of Object.entries(prev)) {
        updated[cId] = sIds.filter((id) => id !== studentId);
      }
      const targetList = updated[targetCenterId] || [];
      updated[targetCenterId] = [...targetList, studentId];
      return updated;
    });
    setSelectedStudentId(null);
  };

  const removeStudentFromCenter = (studentId: string) => {
    setDistribution((prev) => {
      const updated: Record<string, string[]> = {};
      for (const [cId, sIds] of Object.entries(prev)) {
        updated[cId] = sIds.filter((id) => id !== studentId);
      }
      return updated;
    });
  };

  const handleAutoDistribute = () => {
    const pool = [...students];
    const newDist: Record<string, string[]> = {};
    OFFICIAL_CENTERS.forEach((c) => {
      newDist[c.id] = [];
    });

    let centerIdx = 0;
    for (const student of pool) {
      const center = OFFICIAL_CENTERS[centerIdx % OFFICIAL_CENTERS.length]!;
      newDist[center.id]!.push(student.id);
      centerIdx++;
    }
    setDistribution(newDist);
    setSelectedStudentId(null);
  };

  const handleRotateCenters = () => {
    setDistribution((prev) => {
      const newDist: Record<string, string[]> = {};
      for (let i = 0; i < OFFICIAL_CENTERS.length; i++) {
        const currentCenter = OFFICIAL_CENTERS[i]!;
        const nextCenter = OFFICIAL_CENTERS[(i + 1) % OFFICIAL_CENTERS.length]!;
        newDist[nextCenter.id] = prev[currentCenter.id] || [];
      }
      return newDist;
    });
  };

  const handleClearAll = () => {
    const empty: Record<string, string[]> = {};
    OFFICIAL_CENTERS.forEach((c) => {
      empty[c.id] = [];
    });
    setDistribution(empty);
  };

  const handlePrint = () => window.print();

  const handleDownloadWord = () => {
    const centerTables = OFFICIAL_CENTERS.map((c) => {
      const sIds = distribution[c.id] || [];
      const studentNames = sIds
        .map((id) => {
          const s = students.find((st) => st.id === id);
          return s ? s.name : id;
        })
        .join(", ");

      return `<tr>
        <td style="width:25%; font-weight:bold; background-color:#f1f5f9;">${c.icon} ${c.name}</td>
        <td style="width:15%; text-align:center;">${sIds.length} / ${c.capacity}</td>
        <td>${studentNames || '<i>(Öğrenci seçilmedi)</i>'}</td>
      </tr>`;
    }).join("");

    const htmlContent = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>ÖĞRENME MERKEZLERİ DAĞITIM ÇİZELGESİ - ${dateIso}</title>
<style>
  body { font-family: 'Calibri', 'Arial', sans-serif; font-size: 10pt; color: #111; padding: 20px; }
  h2 { text-align: center; font-size: 13pt; color: #0284c7; margin-bottom: 6px; }
  p.sub { text-align: center; font-size: 9pt; color: #64748b; margin-bottom: 14px; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 12px; }
  th, td { border: 1px solid #777; padding: 6px 8px; vertical-align: top; }
  th { background-color: #e0f2fe; color: #0369a1; }
</style>
</head>
<body>
  <h2>T.C. MİLLÎ EĞİTİM BAKANLIĞI</h2>
  <h3 style="text-align:center;">ÖĞRENME MERKEZLERİ GÜNLÜK ÇOCUK DAĞITIM ÇİZELGESİ (TTKB s. 92, 99)</h3>
  <p class="sub">Tarih: ${dateIso} · Toplam Öğrenci: ${students.length} · Dağıtılan: ${assignedIds.size}</p>
  <table>
    <thead>
      <tr>
        <th>Öğrenme Merkezi</th>
        <th>Mevcut / Kapasite</th>
        <th>Merkezdeki Öğrenciler</th>
      </tr>
    </thead>
    <tbody>
      ${centerTables}
    </tbody>
  </table>
</body>
</html>`;

    const blob = new Blob(["\ufeff" + htmlContent], { type: "application/msword;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Ogrenme_Merkezleri_Dagitim_${dateIso}.doc`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="official-form-modal">
      <div className="official-form-container a4-printable" style={{ maxWidth: "1100px" }}>
        {/* Header Actions */}
        <div className="official-form-actions no-print">
          <div className="official-form-actions__title">
            <strong>Öğrenme Merkezleri Çocuk Dağıtım ve İzleme Tahtası (TTKB s. 92, 99)</strong>
            <small>Rutin 2 · Serbest ve Rehberli Oyun Alanları Takip Sistemi</small>
          </div>
          <div className="official-form-actions__buttons">
            <button type="button" className="of-btn of-btn--print" onClick={handlePrint}>
              🖨️ A4 Yazdır
            </button>
            <button type="button" className="of-btn of-btn--word" onClick={handleDownloadWord}>
              📥 Word İndir (.doc)
            </button>
            {onClose ? (
              <button type="button" className="of-btn of-btn--close" onClick={onClose}>
                ✕ Kapat
              </button>
            ) : null}
          </div>
        </div>

        {/* Printable Title */}
        <header className="official-form-header">
          <div className="official-form-emblem">T.C. MİLLÎ EĞİTİM BAKANLIĞI</div>
          <h1 style={{ fontSize: "1.05rem" }}>ÖĞRENME MERKEZLERİ GÜNLÜK ÇOCUK DAĞITIM VE GÖZLEM ÇİZELGESİ</h1>
          <p className="official-form-subtext">
            Tarih: {dateIso} · Türkiye Yüzyılı Maarif Modeli Okul Öncesi Eğitim Programı Rutin 2
          </p>
        </header>

        {/* Action Toolbars (No print) */}
        <div
          className="no-print"
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "8px",
            background: "#f8fafc",
            border: "1px solid #e2e8f0",
            padding: "8px 12px",
            borderRadius: "10px",
            marginBottom: "14px",
            flexWrap: "wrap",
          }}
        >
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={handleAutoDistribute}
              style={{
                background: "#0284c7",
                color: "#fff",
                border: "none",
                borderRadius: "6px",
                padding: "6px 12px",
                fontSize: "0.8rem",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              🎲 Otomatik Dengeli Dağıt
            </button>
            <button
              type="button"
              onClick={handleRotateCenters}
              style={{
                background: "#059669",
                color: "#fff",
                border: "none",
                borderRadius: "6px",
                padding: "6px 12px",
                fontSize: "0.8rem",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              🔄 Merkezleri Döndür (Rotasyon)
            </button>
            <button
              type="button"
              onClick={handleClearAll}
              style={{
                background: "#fff",
                color: "#ef4444",
                border: "1px solid #fca5a5",
                borderRadius: "6px",
                padding: "6px 12px",
                fontSize: "0.8rem",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              🗑️ Tümünü Boşalt
            </button>
          </div>

          <div style={{ fontSize: "0.8rem", color: "#475569" }}>
            <strong>{assignedIds.size}</strong> / {students.length} Çocuk Merkezde ·{" "}
            <span style={{ color: unassignedStudents.length > 0 ? "#ea580c" : "#059669", fontWeight: 700 }}>
              {unassignedStudents.length} Bekliyor
            </span>
          </div>
        </div>

        {/* Unassigned Students Tray (No Print) */}
        {unassignedStudents.length > 0 ? (
          <div
            className="no-print"
            style={{
              background: "#fff7ed",
              border: "1px dashed #fdba74",
              borderRadius: "10px",
              padding: "10px 12px",
              marginBottom: "14px",
            }}
          >
            <strong style={{ fontSize: "0.8rem", color: "#9a3412", display: "block", marginBottom: "6px" }}>
              ⏳ Merkeze Yerleşmeyi Bekleyen Çocuklar ({unassignedStudents.length}):
            </strong>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
              {unassignedStudents.map((student) => {
                const isSelected = selectedStudentId === student.id;
                return (
                  <button
                    key={student.id}
                    type="button"
                    onClick={() => setSelectedStudentId(isSelected ? null : student.id)}
                    style={{
                      background: isSelected ? "#ea580c" : "#ffffff",
                      color: isSelected ? "#ffffff" : "#1e293b",
                      border: isSelected ? "2px solid #c2410c" : "1px solid #cbd5e1",
                      borderRadius: "16px",
                      padding: "4px 10px",
                      fontSize: "0.78rem",
                      fontWeight: 600,
                      cursor: "pointer",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "4px",
                      boxShadow: isSelected ? "0 2px 6px rgba(234, 88, 12, 0.3)" : "none",
                    }}
                  >
                    <span>{student.name}</span>
                    {isSelected ? <span>📌 Seçildi</span> : <span style={{ opacity: 0.5 }}>+</span>}
                  </button>
                );
              })}
            </div>
            {selectedStudentId ? (
              <small style={{ display: "block", marginTop: "6px", color: "#c2410c", fontWeight: 700 }}>
                👆 Bir öğrenci seçtiniz. Şimdi onu yerleştirmek istediğiniz Merkezin üzerine tıklayınız!
              </small>
            ) : null}
          </div>
        ) : null}

        {/* 6 Centers Grid */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
            gap: "12px",
            marginBottom: "16px",
          }}
        >
          {OFFICIAL_CENTERS.map((center) => {
            const studentIds = distribution[center.id] || [];
            const isFull = studentIds.length >= center.capacity;

            return (
              <div
                key={center.id}
                onClick={() => {
                  if (selectedStudentId) {
                    assignStudentToCenter(selectedStudentId, center.id);
                  }
                }}
                style={{
                  background: "#ffffff",
                  border: selectedStudentId ? "2px dashed #0284c7" : "1px solid #cbd5e1",
                  borderRadius: "10px",
                  padding: "10px 12px",
                  position: "relative",
                  transition: "all 0.15s ease",
                  cursor: selectedStudentId ? "pointer" : "default",
                  boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
                  breakInside: "avoid",
                }}
              >
                {/* Center Header */}
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    borderBottom: "1px solid #f1f5f9",
                    paddingBottom: "6px",
                    marginBottom: "8px",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <span style={{ fontSize: "1.4rem" }}>{center.icon}</span>
                    <div>
                      <strong style={{ fontSize: "0.9rem", color: "#0f172a" }}>{center.name}</strong>
                      <small style={{ display: "block", fontSize: "0.72rem", color: "#64748b" }}>
                        {center.description}
                      </small>
                    </div>
                  </div>

                  <span
                    style={{
                      fontSize: "0.72rem",
                      fontWeight: 700,
                      background: isFull ? "#fee2e2" : "#f0fdf4",
                      color: isFull ? "#991b1b" : "#166534",
                      padding: "2px 6px",
                      borderRadius: "6px",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {studentIds.length} / {center.capacity}
                  </span>
                </div>

                {/* Center Students List */}
                <div style={{ minHeight: "60px" }}>
                  {studentIds.length === 0 ? (
                    <div style={{ textAlign: "center", padding: "12px", fontSize: "0.75rem", color: "#94a3b8" }}>
                      Bu merkezde henüz çocuk yok
                    </div>
                  ) : (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                      {studentIds.map((sId) => {
                        const s = students.find((item) => item.id === sId);
                        const name = s ? s.name : sId;
                        return (
                          <div
                            key={sId}
                            style={{
                              background: "#f8fafc",
                              border: "1px solid #cbd5e1",
                              borderRadius: "14px",
                              padding: "3px 8px",
                              fontSize: "0.75rem",
                              fontWeight: 600,
                              color: "#1e293b",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "4px",
                            }}
                          >
                            <span>{name}</span>
                            {onOpenQuickObservation ? (
                              <button
                                type="button"
                                className="no-print"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onOpenQuickObservation(sId);
                                }}
                                title="Hızlı Gözlem Yap"
                                style={{
                                  background: "none",
                                  border: "none",
                                  cursor: "pointer",
                                  padding: "0 2px",
                                  fontSize: "0.7rem",
                                }}
                              >
                                👁️
                              </button>
                            ) : null}
                            <button
                              type="button"
                              className="no-print"
                              onClick={(e) => {
                                e.stopPropagation();
                                removeStudentFromCenter(sId);
                              }}
                              title="Merkezden Çıkar"
                              style={{
                                background: "none",
                                border: "none",
                                color: "#ef4444",
                                cursor: "pointer",
                                padding: "0 2px",
                                fontSize: "0.7rem",
                                fontWeight: 800,
                              }}
                            >
                              ✕
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Quick Add Button if student selected */}
                {selectedStudentId ? (
                  <div className="no-print" style={{ marginTop: "8px", textAlign: "right" }}>
                    <button
                      type="button"
                      onClick={() => assignStudentToCenter(selectedStudentId, center.id)}
                      style={{
                        background: "#0284c7",
                        color: "#fff",
                        border: "none",
                        borderRadius: "4px",
                        padding: "3px 8px",
                        fontSize: "0.72rem",
                        fontWeight: 700,
                        cursor: "pointer",
                      }}
                    >
                      + Buraya Yerleştir
                    </button>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>

        {/* Footer Notes */}
        <div style={{ fontSize: "0.72rem", color: "#64748b", borderTop: "1px solid #e2e8f0", paddingTop: "8px" }}>
          * MEB Talim ve Terbiye Kurulu Başkanlığı Okul Öncesi Eğitim Programı Sayfa 92 ve 99 gereğince, öğrenme merkezlerinde çocuklar ilgi ve isteklerine göre oyun kurar; öğretmen rehberlik eder ve gözlem kayıtlarını işler.
        </div>
      </div>
    </div>
  );
}
