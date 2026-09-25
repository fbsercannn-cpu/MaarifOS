import React, { useState, useMemo } from "react";
import { SparklesIcon, ChartBarIcon, LayersIcon } from "./MaarifIcons";

interface StudentNode {
  id: string;
  name: string;
  dominantCenter: string;
  dominantValue: string;
  interactionCount: number;
}

const DEFAULT_SAMPLE_STUDENTS: StudentNode[] = [
  { id: "s1", name: "Ali K.", dominantCenter: "Blok Merkezi", dominantValue: "D14 Adalet & Paylaşım", interactionCount: 14 },
  { id: "s2", name: "Zeynep B.", dominantCenter: "Kitap Merkezi", dominantValue: "E1.1 Merak & Keşif", interactionCount: 12 },
  { id: "s3", name: "Kerem T.", dominantCenter: "Dramatik Oyun", dominantValue: "E2.4 İş Birliği & Nezaket", interactionCount: 16 },
  { id: "s4", name: "Elif S.", dominantCenter: "Sanat Merkezi", dominantValue: "E3.1 Estetik Duyarlılık", interactionCount: 10 },
  { id: "s5", name: "Mehmet Ç.", dominantCenter: "Blok Merkezi", dominantValue: "D14 Adalet & Paylaşım", interactionCount: 15 },
  { id: "s6", name: "Defne Y.", dominantCenter: "Fen & Doğa", dominantValue: "E1.2 Bilimsel Sorgulama", interactionCount: 9 },
  { id: "s7", name: "Emir A.", dominantCenter: "Müzik Merkezi", dominantValue: "E2.1 Öz Denetim", interactionCount: 8 },
  { id: "s8", name: "Ayşe D.", dominantCenter: "Dramatik Oyun", dominantValue: "E2.4 İş Birliği & Nezaket", interactionCount: 13 },
];

const CENTERS = [
  { name: "Blok Merkezi", color: "#0284c7", icon: "🧱" },
  { name: "Dramatik Oyun", color: "#ec4899", icon: "🎭" },
  { name: "Kitap Merkezi", color: "#8b5cf6", icon: "📖" },
  { name: "Sanat Merkezi", color: "#f59e0b", icon: "🎨" },
  { name: "Fen & Doğa", color: "#10b981", icon: "🌱" },
  { name: "Müzik Merkezi", color: "#06b6d4", icon: "🎵" },
];

export function StudentSociometryGraph() {
  const [selectedStudent, setSelectedStudent] = useState<StudentNode | null>(null);
  const [selectedCenter, setSelectedCenter] = useState<string | null>(null);

  const students = DEFAULT_SAMPLE_STUDENTS;

  // Hesaplamalar
  const centerDistribution = useMemo(() => {
    const counts: Record<string, number> = {};
    CENTERS.forEach((c) => (counts[c.name] = 0));
    students.forEach((s) => {
      counts[s.dominantCenter] = (counts[s.dominantCenter] || 0) + s.interactionCount;
    });
    const total = Object.values(counts).reduce((a, b) => a + b, 0) || 1;
    return CENTERS.map((c) => ({
      ...c,
      count: counts[c.name] || 0,
      percentage: Math.round(((counts[c.name] || 0) / total) * 100),
    }));
  }, [students]);

  const topCenter = useMemo(() => {
    return [...centerDistribution].sort((a, b) => b.count - a.count)[0];
  }, [centerDistribution]);

  const lowestCenter = useMemo(() => {
    return [...centerDistribution].sort((a, b) => a.count - b.count)[0];
  }, [centerDistribution]);

  // SVG Düzen Koordinatları (Dairesel / Radial Yerleşim)
  const svgWidth = 560;
  const svgHeight = 440;
  const centerX = svgWidth / 2;
  const centerY = svgHeight / 2;
  const studentRadius = 160;
  const centerRingRadius = 85;

  return (
    <div style={{ padding: "16px 20px", background: "#0a0f1d", color: "#f8fafc", borderRadius: "14px", border: "1px solid rgba(56, 189, 248, 0.2)" }}>
      {/* Üst Başlık & Telemetri */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "10px", marginBottom: "16px" }}>
        <div>
          <div style={{ display: "inline-flex", alignItems: "center", gap: "6px", color: "#38bdf8", fontSize: "0.78rem", fontWeight: 700, textTransform: "uppercase" }}>
            <SparklesIcon size={14} />
            <span>MEB TYMM 2026 SOSYOMETRİ VE ERDEM AĞ GRAFI</span>
          </div>
          <h3 style={{ margin: "4px 0 0", fontSize: "1.2rem", fontWeight: 800, color: "#ffffff" }}>
            Sınıf İçi Akran Etkileşimi &amp; Öğrenme Merkezleri Haritası
          </h3>
          <p style={{ margin: "4px 0 0", fontSize: "0.8rem", color: "#94a3b8" }}>
            Öğretmen gözlemlerinden derlenen canlı sosyometrik ağ grafiği ($O(V+E)$ düğüm analizi).
          </p>
        </div>

        <div style={{ display: "flex", gap: "8px" }}>
          <span style={{ background: "rgba(16, 185, 129, 0.15)", border: "1px solid rgba(16, 185, 129, 0.3)", color: "#34d399", padding: "4px 10px", borderRadius: "8px", fontSize: "0.75rem", fontWeight: 700 }}>
            ● Canlı Ağ Aktif
          </span>
        </div>
      </div>

      {/* Grid: Sol Grafik, Sağ Analiz Kartları */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "20px", alignItems: "center" }}>
        {/* SVG Ağ Grafı */}
        <div style={{ background: "rgba(15, 23, 42, 0.8)", borderRadius: "12px", border: "1px solid rgba(255, 255, 255, 0.08)", padding: "10px", display: "flex", justifyContent: "center" }}>
          <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} style={{ width: "100%", maxHeight: "380px" }}>
            <defs>
              <radialGradient id="hubGradient" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#0284c7" stopOpacity="0.8" />
                <stop offset="100%" stopColor="#070d18" stopOpacity="0.9" />
              </radialGradient>
            </defs>

            {/* Merkez Çember (HUB) */}
            <circle cx={centerX} cy={centerY} r={36} fill="url(#hubGradient)" stroke="#38bdf8" strokeWidth={2} />
            <text x={centerX} y={centerY - 4} textAnchor="middle" fill="#ffffff" fontSize="10" fontWeight="bold">
              SINIF
            </text>
            <text x={centerX} y={centerY + 10} textAnchor="middle" fill="#38bdf8" fontSize="8">
              TYMM 2026
            </text>

            {/* Öğrenme Merkezleri Düğümleri */}
            {CENTERS.map((c, i) => {
              const angle = (i * 2 * Math.PI) / CENTERS.length - Math.PI / 2;
              const cx = centerX + centerRingRadius * Math.cos(angle);
              const cy = centerY + centerRingRadius * Math.sin(angle);
              const isSelected = selectedCenter === c.name;

              return (
                <g key={c.name} style={{ cursor: "pointer" }} onClick={() => setSelectedCenter(isSelected ? null : c.name)}>
                  <line x1={centerX} y1={centerY} x2={cx} y2={cy} stroke={c.color} strokeWidth={isSelected ? 3 : 1} strokeOpacity={0.6} />
                  <circle cx={cx} cy={cy} r={18} fill="#0f172a" stroke={c.color} strokeWidth={isSelected ? 3 : 1.5} />
                  <text x={cx} y={cy + 4} textAnchor="middle" fontSize="13">
                    {c.icon}
                  </text>
                </g>
              );
            })}

            {/* Öğrenci Düğümleri ve Bağlantı Çizgileri */}
            {students.map((student, i) => {
              const angle = (i * 2 * Math.PI) / students.length - Math.PI / 2;
              const sx = centerX + studentRadius * Math.cos(angle);
              const sy = centerY + studentRadius * Math.sin(angle);
              const isHighlighted = selectedStudent?.id === student.id;
              const matchesCenter = !selectedCenter || student.dominantCenter === selectedCenter;

              // İlgili merkeze hat çek
              const centerObj = CENTERS.find((c) => c.name === student.dominantCenter);
              const cIdx = CENTERS.findIndex((c) => c.name === student.dominantCenter);
              const cAngle = (cIdx * 2 * Math.PI) / CENTERS.length - Math.PI / 2;
              const cx = centerX + centerRingRadius * Math.cos(cAngle);
              const cy = centerY + centerRingRadius * Math.sin(cAngle);

              return (
                <g key={student.id} style={{ cursor: "pointer", opacity: matchesCenter ? 1 : 0.25 }} onClick={() => setSelectedStudent(isHighlighted ? null : student)}>
                  {/* Bağlantı Çizgisi */}
                  <line
                    x1={cx}
                    y1={cy}
                    x2={sx}
                    y2={sy}
                    stroke={centerObj?.color || "#38bdf8"}
                    strokeWidth={isHighlighted ? 2.5 : 1}
                    strokeDasharray={isHighlighted ? "none" : "2,2"}
                    strokeOpacity={isHighlighted ? 0.9 : 0.4}
                  />

                  {/* Öğrenci Çemberi */}
                  <circle
                    cx={sx}
                    cy={sy}
                    r={18}
                    fill={isHighlighted ? "#0284c7" : "#1e293b"}
                    stroke={centerObj?.color || "#38bdf8"}
                    strokeWidth={isHighlighted ? 3 : 1.5}
                  />
                  <text x={sx} y={sy + 4} textAnchor="middle" fill="#ffffff" fontSize="9" fontWeight="bold">
                    {student.name.split(" ")[0]}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>

        {/* Sağ Panel: Analitik ve Pedagojik Öngörüler */}
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {/* Seçili Detayı veya Genel Özet */}
          {selectedStudent ? (
            <div style={{ background: "rgba(30, 41, 59, 0.7)", border: "1px solid #38bdf8", borderRadius: "10px", padding: "14px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <strong style={{ color: "#38bdf8", fontSize: "0.95rem" }}>{selectedStudent.name}</strong>
                <button
                  type="button"
                  onClick={() => setSelectedStudent(null)}
                  style={{ background: "transparent", border: "none", color: "#94a3b8", cursor: "pointer", fontSize: "0.8rem" }}
                >
                  ✕ Kapat
                </button>
              </div>
              <div style={{ marginTop: "8px", fontSize: "0.82rem", display: "flex", flexDirection: "column", gap: "4px" }}>
                <div><strong>Tercih Edilen Merkez:</strong> <span style={{ color: "#34d399" }}>{selectedStudent.dominantCenter}</span></div>
                <div><strong>Öne Çıkan TYMM Erdemi:</strong> <span style={{ color: "#fbbf24" }}>{selectedStudent.dominantValue}</span></div>
                <div><strong>Aylık Gözlem Hacmi:</strong> <span>{selectedStudent.interactionCount} kayıt</span></div>
              </div>
            </div>
          ) : (
            <div style={{ background: "rgba(30, 41, 59, 0.5)", border: "1px solid rgba(255, 255, 255, 0.1)", borderRadius: "10px", padding: "12px" }}>
              <span style={{ fontSize: "0.76rem", color: "#94a3b8" }}>İpucu: Düğümlere dokunarak öğrenci ve merkez detayını izole edin.</span>
            </div>
          )}

          {/* Sınıf Düzeyi Özet İstatistikler */}
          <div style={{ background: "rgba(15, 23, 42, 0.6)", borderRadius: "10px", padding: "12px", border: "1px solid rgba(255, 255, 255, 0.08)" }}>
            <h4 style={{ margin: "0 0 10px", fontSize: "0.85rem", color: "#e2e8f0", display: "flex", alignItems: "center", gap: "6px" }}>
              <ChartBarIcon size={14} />
              <span>Öğrenme Merkezleri Dağılım Matrisi</span>
            </h4>
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              {centerDistribution.map((c) => (
                <div key={c.name} style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "0.76rem" }}>
                  <span style={{ width: "110px", color: "#cbd5e1" }}>{c.icon} {c.name}</span>
                  <div style={{ flex: 1, background: "#1e293b", height: "7px", borderRadius: "4px", overflow: "hidden" }}>
                    <div style={{ width: `${c.percentage}%`, background: c.color, height: "100%", borderRadius: "4px" }} />
                  </div>
                  <span style={{ width: "32px", textAlign: "right", color: "#94a3b8", fontWeight: 700 }}>%{c.percentage}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Pedagojik Eylem Önerisi (Vygotsky / TYMM Reçetesi) */}
          <div style={{ background: "linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(2, 132, 199, 0.1) 100%)", border: "1px solid rgba(16, 185, 129, 0.3)", borderRadius: "10px", padding: "12px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "#34d399", fontWeight: 700, fontSize: "0.78rem" }}>
              <span>💡</span>
              <span>YARIN İÇİN PEDAGOJİK REÇETE</span>
            </div>
            <p style={{ margin: "4px 0 0", fontSize: "0.78rem", color: "#cbd5e1", lineHeight: 1.4 }}>
              Bu hafta sınıfta <strong>{topCenter.name}</strong> (%{topCenter.percentage}) baskın etkileşim sağlarken, <strong>{lowestCenter.name}</strong> (%{lowestCenter.percentage}) atıl kalmıştır. 
              Yarınki EK-6 Günlük Planınızda <em>{lowestCenter.name}</em> için merak uyandırıcı bir nesne (büyüteç, kozalak vb.) yerleştirmeniz önerilir.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
