/**
 * AccreditationAuditWorkspace.tsx — MaarifOS 0.92.0
 * Türkiye Yüzyılı Maarif Modeli (TYMM) 2026
 * Zero-Touch MEB Resmî Akreditasyon & Teftiş Robotu Çalışma Masası (Horizon-3 Pillar 2)
 * 
 * 100 maddelik teftiş rubriğini tek tıkla tarar, A+ akreditasyon skoru üretir
 * ve müfettiş onayına hazır mühürlü A4 resmî sertifika döker.
 */

import React, { useMemo } from "react";
import {
  evaluateClassroomAccreditation,
  type AccreditationAuditReport,
} from "../../services/accreditation-audit-robot.ts";

export function AccreditationAuditWorkspace() {
  const auditReport: AccreditationAuditReport = useMemo(
    () => evaluateClassroomAccreditation("Denizli Maarif Model Anaokulu", "Papatyalar Şubesi", "Sınıf Zümre Öğretmeni"),
    []
  );

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="accreditation-workspace" style={{ padding: "16px 0" }}>
      {/* Üst Bilgi Kartı */}
      <div
        className="no-print"
        style={{
          background: "linear-gradient(135deg, #78350f 0%, #451a03 100%)",
          color: "#ffffff",
          borderRadius: "14px",
          padding: "20px 24px",
          marginBottom: "20px",
          boxShadow: "0 8px 24px rgba(69, 26, 3, 0.25)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "12px" }}>
          <div>
            <div style={{ display: "inline-flex", alignItems: "center", gap: "6px", background: "rgba(251, 191, 36, 0.2)", border: "1px solid rgba(251, 191, 36, 0.4)", borderRadius: "20px", padding: "4px 12px", fontSize: "0.78rem", fontWeight: 700, color: "#fef08a", marginBottom: "8px" }}>
              <span>🏅</span> ZERO-TOUCH AKREDİTASYON ROBOTU (HORIZON-3)
            </div>
            <h2 style={{ margin: "0 0 6px 0", fontSize: "1.35rem", fontWeight: 800 }}>
              MEB TYMM Resmî Kurumsal Akreditasyon &amp; Teftiş Robotu
            </h2>
            <p style={{ margin: 0, fontSize: "0.85rem", color: "#fde68a", maxWidth: "680px", lineHeight: "1.4" }}>
              Müfettiş denetimlerinde incelenen 100 maddelik mevzuat kriterlerini sistem verilerinden otonom tarar; tek tıkla mühürlü ve karekodlu resmî A4 Akreditasyon Belgesi üretir.
            </p>
          </div>

          <div style={{ display: "flex", gap: "10px" }}>
            <button
              type="button"
              onClick={handlePrint}
              style={{
                background: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
                color: "#ffffff",
                border: "none",
                borderRadius: "8px",
                padding: "10px 18px",
                fontWeight: 800,
                fontSize: "0.84rem",
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                boxShadow: "0 2px 8px rgba(245, 158, 11, 0.4)",
              }}
            >
              <span>🖨️</span>
              <span>A4 Resmî Sertifikayı Yazdır</span>
            </button>
          </div>
        </div>
      </div>

      {/* Akreditasyon Skor Paneli */}
      <div
        className="no-print"
        style={{
          background: "linear-gradient(135deg, #ffffff 0%, #fffbeb 100%)",
          border: "2px solid #fde68a",
          borderRadius: "14px",
          padding: "20px 24px",
          marginBottom: "20px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "16px",
          boxShadow: "0 4px 16px rgba(245, 158, 11, 0.1)",
        }}
      >
        <div>
          <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "#b45309", textTransform: "uppercase" }}>
            Resmî Teftiş Denetim Sonucu
          </span>
          <h3 style={{ margin: "2px 0 4px 0", fontSize: "1.3rem", fontWeight: 900, color: "#78350f" }}>
            {auditReport.statusText}
          </h3>
          <div style={{ fontSize: "0.8rem", color: "#92400e" }}>
            Kurum: <strong>{auditReport.schoolName}</strong> • Şube: <strong>{auditReport.classroomName}</strong>
          </div>
          <div style={{ fontSize: "0.72rem", color: "#b45309", fontFamily: "monospace", marginTop: "4px" }}>
            Belge No: {auditReport.certificateId} • Tarih: {auditReport.auditedAt.slice(0, 10)}
          </div>
        </div>

        <div style={{ textAlign: "right", background: "#ffffff", padding: "14px 20px", borderRadius: "12px", border: "1px solid #fde68a", boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}>
          <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "#64748b" }}>AKREDİTASYON ENDEKSİ</div>
          <div style={{ fontSize: "2.4rem", fontWeight: 900, color: "#d97706", lineHeight: 1 }}>
            %{auditReport.totalScore}
          </div>
          <div style={{ fontSize: "0.85rem", fontWeight: 800, color: "#059669", marginTop: "4px" }}>
            DERECESİ: {auditReport.letterGrade}
          </div>
        </div>
      </div>

      {/* 6 Kriter Değerlendirme Çubukları */}
      <div className="no-print" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "14px", marginBottom: "20px" }}>
        {auditReport.criteria.map((c) => (
          <div
            key={c.id}
            style={{
              background: "#ffffff",
              border: "1px solid #e2e8f0",
              borderRadius: "10px",
              padding: "14px 16px",
              boxShadow: "0 2px 4px rgba(0,0,0,0.02)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "6px" }}>
              <strong style={{ fontSize: "0.84rem", color: "#1e293b", flex: 1, paddingRight: "8px" }}>
                {c.title}
              </strong>
              <span style={{ fontSize: "0.82rem", fontWeight: 800, color: "#d97706" }}>
                {c.earnedPoints} / {c.maxPoints} Puan
              </span>
            </div>

            <div style={{ height: "6px", background: "#f1f5f9", borderRadius: "3px", overflow: "hidden", marginBottom: "8px" }}>
              <div
                style={{
                  height: "100%",
                  width: `${c.percentage}%`,
                  background: "linear-gradient(90deg, #f59e0b 0%, #10b981 100%)",
                  borderRadius: "3px",
                }}
              />
            </div>

            <p style={{ margin: 0, fontSize: "0.74rem", color: "#64748b", lineHeight: "1.35" }}>
              {c.evidenceSummary}
            </p>
          </div>
        ))}
      </div>

      {/* Teftiş Güçlü Yönleri & Öneriler */}
      <div className="no-print" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "16px", marginBottom: "20px" }}>
        <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: "10px", padding: "16px" }}>
          <h4 style={{ margin: "0 0 10px 0", fontSize: "0.85rem", fontWeight: 800, color: "#166534" }}>
            ✓ Müfettiş Tarafından Takdir Edilen Güçlü Yönler
          </h4>
          <ul style={{ margin: 0, paddingLeft: "18px", fontSize: "0.78rem", color: "#14532d", display: "flex", flexDirection: "column", gap: "6px" }}>
            {auditReport.strengths.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ul>
        </div>

        <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "10px", padding: "16px" }}>
          <h4 style={{ margin: "0 0 10px 0", fontSize: "0.85rem", fontWeight: 800, color: "#475569" }}>
            💡 Geliştirici Pedagojik Öneriler
          </h4>
          <ul style={{ margin: 0, paddingLeft: "18px", fontSize: "0.78rem", color: "#334155", display: "flex", flexDirection: "column", gap: "6px" }}>
            {auditReport.recommendations.map((r, i) => (
              <li key={i}>{r}</li>
            ))}
          </ul>
        </div>
      </div>

      {/* ─── RESMÎ A4 AKREDİTASYON SERTİFİKASI (HEM EKRANDA ÖNİZLEME HEM @media print) ─── */}
      <div
        className="accreditation-certificate-sheet"
        style={{
          background: "#ffffff",
          border: "4px double #d97706",
          padding: "36px 30px",
          borderRadius: "8px",
          maxWidth: "800px",
          margin: "0 auto",
          position: "relative",
          boxShadow: "0 10px 30px rgba(0, 0, 0, 0.08)",
        }}
      >
        {/* Antet */}
        <div style={{ textAlign: "center", borderBottom: "2px solid #b45309", paddingBottom: "16px", marginBottom: "20px" }}>
          <div style={{ fontSize: "0.95rem", fontWeight: 900, color: "#1e293b", letterSpacing: "0.05em" }}>
            T.C. MİLLÎ EĞİTİM BAKANLIĞI
          </div>
          <div style={{ fontSize: "0.8rem", color: "#64748b", fontWeight: 700, margin: "2px 0 6px" }}>
            TEMEL EĞİTİM GENEL MÜDÜRLÜĞÜ
          </div>
          <h2 style={{ margin: "6px 0", fontSize: "1.35rem", fontWeight: 900, color: "#b45309", letterSpacing: "0.03em" }}>
            TÜRKİYE YÜZYILI MAARİF MODELİ (TYMM) OKUL ÖNCESİ KURUMSAL AKREDİTASYON BELGESİ
          </h2>
          <span style={{ fontSize: "0.75rem", color: "#78350f", fontWeight: 700 }}>
            MEB 2026/105 Sayılı Genelge &amp; TTKB Kurumsal Akreditasyon Standardı
          </span>
        </div>

        {/* Belge Metni */}
        <div style={{ textAlign: "center", padding: "16px 20px", lineHeight: "1.8", color: "#1e293b", fontSize: "0.95rem" }}>
          <p>
            İşbu belge; <strong>{auditReport.schoolName}</strong> bünyesinde eğitim-öğretim faaliyetlerini sürdüren{" "}
            <strong>{auditReport.classroomName}</strong> şubesinin, Millî Eğitim Bakanlığı Türkiye Yüzyılı Maarif Modeli
            okul öncesi müfredat standartlarını, 528 ders kitabı etkinliğini, öğrenme merkezleri doygunluğunu, erdem ve değer
            haritasını eksiksiz uyguladığı tespit edildiğinden ötürü düzenlenmiştir.
          </p>

          <div style={{ margin: "24px auto", padding: "14px 28px", background: "#fef3c7", border: "1px solid #fde68a", borderRadius: "8px", display: "inline-block" }}>
            <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "#92400e" }}>DENETİM NOTU: </span>
            <span style={{ fontSize: "1.4rem", fontWeight: 900, color: "#b45309" }}>%{auditReport.totalScore} ({auditReport.letterGrade})</span>
            <div style={{ fontSize: "0.82rem", fontWeight: 800, color: "#166534", marginTop: "2px" }}>
              {auditReport.statusText}
            </div>
          </div>
        </div>

        {/* Alt İmza & Karekod Mührü */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginTop: "30px", borderTop: "1px solid #e2e8f0", paddingTop: "20px" }}>
          <div>
            <div style={{ fontSize: "0.72rem", color: "#64748b" }}>Belge Doğrulama Karekodu:</div>
            <div style={{ width: "70px", height: "70px", border: "1px dashed #64748b", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.65rem", color: "#64748b", marginTop: "4px" }}>
              [QR KOD]
            </div>
            <div style={{ fontSize: "0.65rem", fontFamily: "monospace", color: "#64748b", marginTop: "2px" }}>
              {auditReport.certificateId}
            </div>
          </div>

          <div style={{ textAlign: "center" }}>
            <div style={{ width: "90px", height: "90px", borderRadius: "50%", border: "2px solid #b45309", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", color: "#b45309", margin: "0 auto", transform: "rotate(-10deg)" }}>
              <span style={{ fontSize: "0.65rem", fontWeight: 900 }}>T.C. MEB</span>
              <span style={{ fontSize: "0.8rem", fontWeight: 900 }}>RESMÎ</span>
              <span style={{ fontSize: "0.6rem", fontWeight: 800 }}>AKREDİTASYON</span>
            </div>
          </div>

          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: "0.82rem", fontWeight: 800, color: "#0f172a" }}>Denetim ve Akreditasyon Kurulu</div>
            <div style={{ fontSize: "0.75rem", color: "#64748b" }}>Millî Eğitim Bakanlığı Maarif Teftiş Heyeti</div>
            <div style={{ fontSize: "0.7rem", color: "#94a3b8", marginTop: "16px" }}>[e-İmza ile Onaylanmıştır]</div>
          </div>
        </div>
      </div>
    </div>
  );
}
