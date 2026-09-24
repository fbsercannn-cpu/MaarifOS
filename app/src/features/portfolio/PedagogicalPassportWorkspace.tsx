/**
 * PedagogicalPassportWorkspace.tsx — MaarifOS 0.95.0
 * W3C Verifiable Credentials Uyumlu Zero-Knowledge Pedagojik Çocuk Pasaportu
 */

import React, { useState, useEffect } from "react";
import {
  ZKPassportService,
  type ZKPedagogicalPassport,
} from "../../services/zk-pedagogical-passport.ts";
import {
  ShieldCheckIcon,
  SparklesIcon,
  PrinterIcon,
  CheckCircleIcon,
} from "../../components/MaarifIcons.tsx";

const SAMPLE_STUDENTS = [
  { id: "stu-1", name: "Ali Yılmaz" },
  { id: "stu-2", name: "Zeynep Kaya" },
  { id: "stu-3", name: "Mehmet Demir" },
  { id: "stu-4", name: "Elif Çelik" },
  { id: "stu-5", name: "Kerem Şahin" },
];

export function PedagogicalPassportWorkspace() {
  const [selectedStudent, setSelectedStudent] = useState(SAMPLE_STUDENTS[0]);
  const [passport, setPassport] = useState<ZKPedagogicalPassport | null>(null);
  const [isCopied, setIsCopied] = useState(false);

  useEffect(() => {
    void (async () => {
      const p = await ZKPassportService.generatePassport({
        studentId: selectedStudent.id,
        studentName: selectedStudent.name,
      });
      setPassport(p);
    })();
  }, [selectedStudent]);

  const handlePrint = () => {
    window.print();
  };

  const handleCopyProof = () => {
    if (!passport) return;
    void navigator.clipboard.writeText(JSON.stringify(passport.cryptographicProof, null, 2));
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2500);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      {/* BAŞLIK & KONTROL BAR */}
      <div
        className="no-print"
        style={{
          background: "linear-gradient(135deg, rgba(15, 23, 42, 0.95), rgba(30, 41, 59, 0.9))",
          border: "1px solid rgba(255, 255, 255, 0.1)",
          borderRadius: "16px",
          padding: "24px",
          color: "#ffffff",
          boxShadow: "0 10px 30px rgba(0,0,0,0.3)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "16px" }}>
          <div>
            <div style={{ display: "inline-flex", alignItems: "center", gap: "8px", background: "rgba(16, 185, 129, 0.15)", border: "1px solid rgba(16, 185, 129, 0.3)", padding: "4px 12px", borderRadius: "20px", fontSize: "0.78rem", fontWeight: 800, color: "#10b981" }}>
              <ShieldCheckIcon size={14} />
              <span>W3C VERIFIABLE CREDENTIAL • ZERO-KNOWLEDGE</span>
            </div>
            <h2 style={{ margin: "12px 0 6px 0", fontSize: "1.5rem", fontWeight: 800 }}>
              Kriptografik Pedagojik Çocuk Pasaportu
            </h2>
            <p style={{ margin: 0, fontSize: "0.85rem", color: "#94a3b8", maxWidth: "680px" }}>
              Okul öncesinden ilkokul 1. sınıfa geçişte çocuğun fotoğrafını ve hassas sicilini ifşa etmeden, TYMM beceri olgunluğunu ilkokul öğretmenine kriptografik kanıtla aktarır.
            </p>
          </div>

          <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
            <button
              type="button"
              onClick={handlePrint}
              style={{
                background: "linear-gradient(135deg, #0284c7, #0369a1)",
                border: "none",
                color: "#ffffff",
                padding: "10px 18px",
                borderRadius: "8px",
                fontSize: "0.85rem",
                fontWeight: 700,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              <PrinterIcon size={16} />
              <span>Resmî Pasaportu Yazdır (A4)</span>
            </button>
          </div>
        </div>

        {/* Öğrenci Seçici */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginTop: "20px", flexWrap: "wrap" }}>
          <span style={{ fontSize: "0.82rem", fontWeight: 700, color: "#cbd5e1" }}>
            Öğrenci Seçiniz:
          </span>
          {SAMPLE_STUDENTS.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setSelectedStudent(s)}
              style={{
                background: selectedStudent.id === s.id ? "#10b981" : "rgba(255,255,255,0.06)",
                border: `1px solid ${selectedStudent.id === s.id ? "#10b981" : "rgba(255,255,255,0.12)"}`,
                color: "#ffffff",
                padding: "6px 14px",
                borderRadius: "20px",
                fontSize: "0.8rem",
                fontWeight: 700,
                cursor: "pointer",
                transition: "all 0.2s ease",
              }}
            >
              {s.name}
            </button>
          ))}
        </div>
      </div>

      {/* RESMÎ A4 BASKI & EKRAN PASAPORT KARTI */}
      {passport && (
        <div
          style={{
            background: "#ffffff",
            color: "#0f172a",
            borderRadius: "16px",
            padding: "36px",
            border: "1px solid #cbd5e1",
            boxShadow: "0 10px 40px rgba(0,0,0,0.1)",
            maxWidth: "900px",
            margin: "0 auto",
            width: "100%",
          }}
        >
          {/* Antet */}
          <div style={{ textAlign: "center", borderBottom: "2px solid #0f172a", paddingBottom: "16px", marginBottom: "20px" }}>
            <h4 style={{ margin: 0, fontSize: "0.95rem", letterSpacing: "1px", color: "#475569" }}>
              T.C. MİLLÎ EĞİTİM BAKANLIĞI
            </h4>
            <h2 style={{ margin: "6px 0", fontSize: "1.4rem", fontWeight: 900, color: "#0f172a" }}>
              OKUL ÖNCESİNDEN İLKOKULA GEÇİŞ PEDAGOJİK PASAPORTU
            </h2>
            <div style={{ display: "flex", justifyContent: "center", gap: "20px", fontSize: "0.78rem", color: "#64748b", marginTop: "6px" }}>
              <span>W3C DID: {passport.cryptographicProof.verificationMethod}</span>
              <span>Düzenleme Tarihi: {passport.issuanceDate}</span>
            </div>
          </div>

          {/* Anonim Kimlik & Kripto Mühür */}
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "20px", background: "#f8fafc", padding: "16px", borderRadius: "10px", border: "1px solid #e2e8f0", marginBottom: "24px" }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <span style={{ fontSize: "1.8rem" }}>🎓</span>
                <div>
                  <h3 style={{ margin: 0, fontSize: "1.2rem", fontWeight: 800 }}>
                    {selectedStudent.name} ({passport.studentInitials})
                  </h3>
                  <span style={{ fontSize: "0.8rem", color: "#64748b" }}>
                    Anonim Pasaport Tokeni: <strong style={{ color: "#0284c7" }}>{passport.studentToken}</strong>
                  </span>
                </div>
              </div>
              <div style={{ marginTop: "12px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", fontSize: "0.8rem" }}>
                <div><strong>Kurum:</strong> {passport.schoolName}</div>
                <div><strong>Şube:</strong> {passport.branchName}</div>
                <div><strong>Öğretmen:</strong> {passport.issuerTeacher}</div>
                <div><strong>Yaş Gurubu:</strong> {passport.ageGroupMonths} Ay (Tamamlandı)</div>
              </div>
            </div>

            {/* QR Kod & Doğrulama */}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", borderLeft: "1px solid #e2e8f0", paddingLeft: "16px" }}>
              <div style={{ width: "90px", height: "90px", background: "#0f172a", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center", color: "#ffffff", fontSize: "0.7rem", textAlign: "center", padding: "6px" }}>
                [QR TOKEN]
                <br />
                {passport.studentToken}
              </div>
              <span style={{ fontSize: "0.68rem", color: "#059669", fontWeight: 800, marginTop: "6px" }}>
                ✓ ED25519 İMZALI
              </span>
            </div>
          </div>

          {/* Bilişsel ve Gelişimsel Olgunluk Tablosu */}
          <h4 style={{ margin: "0 0 12px 0", fontSize: "1rem", fontWeight: 800, color: "#0f172a", borderLeft: "4px solid #10b981", paddingLeft: "8px" }}>
            TYMM 2026 1. Sınıfa Geçiş Bilişsel &amp; Motor Olgunluk Düzeyi
          </h4>

          <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "24px" }}>
            {passport.developmentalMaturity.map((item, idx) => (
              <div
                key={idx}
                style={{
                  border: "1px solid #e2e8f0",
                  borderRadius: "8px",
                  padding: "12px 16px",
                  background: "#ffffff",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <span style={{ fontSize: "0.76rem", fontWeight: 800, background: "#f1f5f9", padding: "2px 8px", borderRadius: "4px", color: "#334155" }}>
                      {item.code}
                    </span>
                    <strong style={{ fontSize: "0.9rem" }}>{item.domain}</strong>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <span style={{ fontSize: "0.85rem", fontWeight: 900, color: "#059669" }}>
                      %{item.scorePercent}
                    </span>
                    <span style={{ fontSize: "0.74rem", fontWeight: 800, color: "#0284c7", background: "#e0f2fe", padding: "2px 6px", borderRadius: "4px" }}>
                      {item.readinessStatus}
                    </span>
                  </div>
                </div>

                <p style={{ margin: "4px 0", fontSize: "0.8rem", color: "#334155" }}>
                  <strong>Baskın Güç:</strong> {item.primaryStrength}
                </p>
                <p style={{ margin: "2px 0", fontSize: "0.76rem", color: "#64748b" }}>
                  <strong>1. Sınıf Öğretmenine Not:</strong> {item.transitionAdvice}
                </p>
              </div>
            ))}
          </div>

          {/* Erdemler ve Duyusal Tarz */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "24px" }}>
            <div style={{ background: "#f8fafc", padding: "14px", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
              <span style={{ fontSize: "0.78rem", fontWeight: 800, color: "#475569" }}>İçselleştirilen Erdemler (D1-D20):</span>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginTop: "8px" }}>
                {passport.topValues.map((v, i) => (
                  <span key={i} style={{ background: "#ecfdf5", border: "1px solid #a7f3d0", color: "#065f46", fontSize: "0.74rem", fontWeight: 700, padding: "2px 8px", borderRadius: "12px" }}>
                    {v}
                  </span>
                ))}
              </div>
            </div>

            <div style={{ background: "#f8fafc", padding: "14px", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
              <span style={{ fontSize: "0.78rem", fontWeight: 800, color: "#475569" }}>Baskın Öğrenme Eğilimleri:</span>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginTop: "8px" }}>
                {passport.topTendencies.map((t, i) => (
                  <span key={i} style={{ background: "#eff6ff", border: "1px solid #bfdbfe", color: "#1e40af", fontSize: "0.74rem", fontWeight: 700, padding: "2px 8px", borderRadius: "12px" }}>
                    {t}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Alt İmza & Onay Bölümü */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginTop: "30px", borderTop: "1px solid #cbd5e1", paddingTop: "20px" }}>
            <div>
              <button
                type="button"
                onClick={handleCopyProof}
                className="no-print"
                style={{
                  background: "#f1f5f9",
                  border: "1px solid #cbd5e1",
                  borderRadius: "6px",
                  padding: "6px 12px",
                  fontSize: "0.74rem",
                  fontWeight: 700,
                  color: "#334155",
                  cursor: "pointer",
                }}
              >
                {isCopied ? "✓ Kripto Kanıt Kopyalandı!" : "📋 W3C JSON Proof Kopyala"}
              </button>
              <div style={{ fontSize: "0.7rem", color: "#94a3b8", marginTop: "6px" }}>
                Digest: {passport.cryptographicProof.sha256Digest.substring(0, 32)}...
              </div>
            </div>

            <div style={{ textAlign: "center", minWidth: "180px" }}>
              <span style={{ fontSize: "0.78rem", fontWeight: 700, color: "#475569" }}>
                Düzenleyen Okul Öncesi Öğretmeni
              </span>
              <div style={{ height: "40px" }} />
              <div style={{ fontSize: "0.85rem", fontWeight: 800, borderTop: "1px solid #0f172a", paddingTop: "4px" }}>
                {passport.issuerTeacher}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
