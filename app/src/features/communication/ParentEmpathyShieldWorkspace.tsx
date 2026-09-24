/**
 * ParentEmpathyShieldWorkspace.tsx — MaarifOS 0.91.0
 * Türkiye Yüzyılı Maarif Modeli (TYMM) 2026
 * Veli Empati & Savunma Kalkanı Çalışma Masası (Horizon-2 Pillar 2)
 * 
 * Sınıf gözlemlerini veli kaygısını yatıştıran, yapıcı, MEB TYMM erdemlerine dayalı
 * 2 cümlelik mikro-bültenlere dönüştürür ve tek tıkla WhatsApp üzerinden iletir.
 */

import React, { useState, useMemo } from "react";
import {
  generateParentEmpathyDigest,
  generateBatchParentDigests,
  type ParentEmpathyDigest,
} from "../../services/parent-empathy-shield.ts";

interface StudentDigestState {
  id: string;
  name: string;
  phone: string;
  observationNote: string;
  customValue?: string;
}

const DEFAULT_ROSTER: StudentDigestState[] = [
  { id: "s1", name: "Ali Kaya", phone: "05551112233", observationNote: "Blok merkezinde kule yaparken arkadaşı Kerem'le parçaları eşit paylaştı." },
  { id: "s2", name: "Zeynep Baran", phone: "05552223344", observationNote: "Suluboya etkinliğinde renkleri karıştırarak yeni tonlar keşfetti, masasını topladı." },
  { id: "s3", name: "Kerem Tekin", phone: "05553334455", observationNote: "Çemberde söz alırken sabırla sırasını bekledi ve arkadaşını dikkatle dinledi." },
  { id: "s4", name: "Elif Sarı", phone: "05554445566", observationNote: "Dramatik oyun merkezinde doktor rolünü üstlenerek empatiyle iletişim kurdu." },
  { id: "s5", name: "Mehmet Çelik", phone: "05555556677", observationNote: "Bahçe oyununda düşen arkadaşına elini uzatarak yardım etti ve hatırını sordu." },
  { id: "s6", name: "Defne Yıldız", phone: "05556667788", observationNote: "Fen merkezinde tohumları büyüteçle incelerken bilimsel sorular sordu." },
  { id: "s7", name: "Emir Aydın", phone: "05557778899", observationNote: "Müzik istasyonunda marakasla ritim tuttu, şarkı sözlerini neşeyle tekrarladı." },
  { id: "s8", name: "Ayşe Demir", phone: "05558889900", observationNote: "Kitap merkezinde hikaye kartlarını olay sırasına göre dizerek arkadaşlarına anlattı." },
];

export function ParentEmpathyShieldWorkspace() {
  const [students, setStudents] = useState<StudentDigestState[]>(DEFAULT_ROSTER);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [batchCopied, setBatchCopied] = useState(false);

  // Her öğrenci için üretilen bültenler
  const digests: Record<string, ParentEmpathyDigest> = useMemo(() => {
    const map: Record<string, ParentEmpathyDigest> = {};
    students.forEach((s) => {
      map[s.id] = generateParentEmpathyDigest({
        studentName: s.name,
        studentPhone: s.phone,
        observationText: s.observationNote,
        customValue: s.customValue,
      });
    });
    return map;
  }, [students]);

  const handleNoteChange = (id: string, newNote: string) => {
    setStudents((prev) =>
      prev.map((s) => (s.id === id ? { ...s, observationNote: newNote } : s))
    );
  };

  const handlePhoneChange = (id: string, newPhone: string) => {
    setStudents((prev) =>
      prev.map((s) => (s.id === id ? { ...s, phone: newPhone } : s))
    );
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  const copyAllBatch = () => {
    const allText = Object.values(digests)
      .map((d) => `📌 ${d.studentName}:\n${d.digestMessage}\n`)
      .join("\n---\n\n");
    navigator.clipboard.writeText(allText);
    setBatchCopied(true);
    setTimeout(() => setBatchCopied(false), 3000);
  };

  return (
    <div className="parent-empathy-workspace" style={{ padding: "16px 0" }}>
      {/* Üst Bilgi Kartı */}
      <div
        style={{
          background: "linear-gradient(135deg, #064e3b 0%, #065f46 100%)",
          color: "#ffffff",
          borderRadius: "14px",
          padding: "20px 24px",
          marginBottom: "20px",
          boxShadow: "0 8px 24px rgba(6, 78, 59, 0.2)",
          position: "relative",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "12px" }}>
          <div>
            <div style={{ display: "inline-flex", alignItems: "center", gap: "6px", background: "rgba(52, 211, 153, 0.2)", border: "1px solid rgba(52, 211, 153, 0.4)", borderRadius: "20px", padding: "4px 12px", fontSize: "0.78rem", fontWeight: 700, color: "#a7f3d0", marginBottom: "8px" }}>
              <span>💬</span> VELİ EMPATİ VE SAVUNMA KALKANI (HORIZON-2)
            </div>
            <h2 style={{ margin: "0 0 6px 0", fontSize: "1.35rem", fontWeight: 800 }}>
              Sınıf Gözleminden Saygılı WhatsApp Bülteni Üretici
            </h2>
            <p style={{ margin: 0, fontSize: "0.85rem", color: "#d1fae5", maxWidth: "680px", lineHeight: "1.4" }}>
              Okul öncesi velisinin kaygısını yatıştıran, etiketleyici dilden arındırılmış, 2 cümlelik MEB TYMM erdem odaklı kişiselleştirilmiş veli mesajları. Tek tıkla doğrudan WhatsApp'ta açın veya panoya kopyalayın.
            </p>
          </div>

          <div style={{ display: "flex", gap: "10px" }}>
            <button
              type="button"
              onClick={copyAllBatch}
              style={{
                background: batchCopied ? "#10b981" : "rgba(255, 255, 255, 0.15)",
                color: "#ffffff",
                border: "1px solid rgba(255, 255, 255, 0.3)",
                borderRadius: "8px",
                padding: "8px 16px",
                fontWeight: 700,
                fontSize: "0.82rem",
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                transition: "all 0.15s ease",
              }}
            >
              <span>{batchCopied ? "✓" : "📋"}</span>
              <span>{batchCopied ? "Tüm Sınıf Kopyalandı!" : "Tüm Sınıfı Kopyala"}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Öğrenci Bülten Listesi */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))", gap: "16px" }}>
        {students.map((student) => {
          const digest = digests[student.id];
          const isCopied = copiedId === student.id;

          return (
            <div
              key={student.id}
              style={{
                background: "#ffffff",
                border: "1px solid #e2e8f0",
                borderRadius: "12px",
                padding: "16px 18px",
                boxShadow: "0 2px 8px rgba(0, 0, 0, 0.03)",
                display: "flex",
                flexDirection: "column",
                gap: "12px",
              }}
            >
              {/* Başlık & Telefon */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: "0.95rem", fontWeight: 800, color: "#0f172a" }}>
                    {student.name}
                  </h3>
                  <div style={{ display: "inline-flex", alignItems: "center", gap: "4px", fontSize: "0.72rem", color: "#059669", fontWeight: 700, background: "#ecfdf5", padding: "1px 6px", borderRadius: "4px", marginTop: "2px" }}>
                    <span>⭐</span> {digest.associatedValue}
                  </div>
                </div>

                <div>
                  <input
                    type="text"
                    value={student.phone}
                    onChange={(e) => handlePhoneChange(student.id, e.target.value)}
                    placeholder="05XX XXX XX XX"
                    style={{
                      width: "120px",
                      padding: "4px 8px",
                      fontSize: "0.75rem",
                      borderRadius: "6px",
                      border: "1px solid #cbd5e1",
                      textAlign: "right",
                      fontFamily: "monospace",
                    }}
                    title="Veli Telefon Numarası (WhatsApp için)"
                  />
                </div>
              </div>

              {/* Hızlı Gözlem Giriş Alanı */}
              <div>
                <label style={{ display: "block", fontSize: "0.7rem", fontWeight: 700, color: "#64748b", marginBottom: "4px" }}>
                  Günün Kısa Gözlemi (Düzenlenebilir):
                </label>
                <textarea
                  rows={2}
                  value={student.observationNote}
                  onChange={(e) => handleNoteChange(student.id, e.target.value)}
                  style={{
                    width: "100%",
                    padding: "8px 10px",
                    borderRadius: "6px",
                    border: "1px solid #e2e8f0",
                    fontSize: "0.78rem",
                    color: "#334155",
                    resize: "vertical",
                    boxSizing: "border-box",
                  }}
                  placeholder="Çocuğun bugünkü davranışı veya etkinliği..."
                />
              </div>

              {/* Üretilen Empati WhatsApp Bülteni */}
              <div
                style={{
                  background: "#f0fdf4",
                  border: "1px solid #bbf7d0",
                  borderRadius: "8px",
                  padding: "10px 12px",
                  fontSize: "0.8rem",
                  color: "#166534",
                  lineHeight: "1.45",
                  position: "relative",
                  fontStyle: "italic",
                }}
              >
                "{digest.digestMessage}"
              </div>

              {/* Aksiyon Butonları */}
              <div style={{ display: "flex", gap: "8px", marginTop: "auto" }}>
                <button
                  type="button"
                  onClick={() => copyToClipboard(digest.digestMessage, student.id)}
                  style={{
                    flex: 1,
                    background: isCopied ? "#10b981" : "#f1f5f9",
                    color: isCopied ? "#ffffff" : "#475569",
                    border: "1px solid #cbd5e1",
                    borderRadius: "6px",
                    padding: "8px 10px",
                    fontWeight: 700,
                    fontSize: "0.78rem",
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "6px",
                    transition: "all 0.15s ease",
                  }}
                >
                  <span>{isCopied ? "✓" : "📋"}</span>
                  <span>{isCopied ? "Kopyalandı" : "Metni Kopyala"}</span>
                </button>

                <a
                  href={digest.whatsAppUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    flex: 1.2,
                    background: "linear-gradient(135deg, #22c55e 0%, #16a34a 100%)",
                    color: "#ffffff",
                    borderRadius: "6px",
                    padding: "8px 10px",
                    fontWeight: 700,
                    fontSize: "0.78rem",
                    textDecoration: "none",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "6px",
                    boxShadow: "0 2px 6px rgba(34, 197, 94, 0.3)",
                  }}
                >
                  <span>💬</span>
                  <span>WhatsApp'ta Aç</span>
                </a>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
