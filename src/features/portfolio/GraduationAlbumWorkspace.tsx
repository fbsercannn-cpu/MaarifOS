/**
 * GraduationAlbumWorkspace.tsx — MaarifOS 0.92.0
 * Türkiye Yüzyılı Maarif Modeli (TYMM) 2026
 * Kişiselleştirilmiş Akıllı Mezuniyet Gelişim Albümü Çalışma Masası (Horizon-3 Pillar 3)
 * 
 * Çocuğun 1 yıllık serüvenini ömür boyu saklanacak kuşe baskı formatında
 * 6 sayfalık lüks A4 gelişim romanına dönüştürür.
 */

import React, { useState } from "react";
import {
  SAMPLE_ALBUM_STUDENTS,
  type StudentGraduationAlbum,
} from "../../services/graduation-album-service.ts";

export function GraduationAlbumWorkspace() {
  const [selectedStudentId, setSelectedStudentId] = useState<string>("s1");
  const album: StudentGraduationAlbum =
    SAMPLE_ALBUM_STUDENTS.find((s) => s.studentId === selectedStudentId) ||
    SAMPLE_ALBUM_STUDENTS[0];

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="graduation-album-workspace" style={{ padding: "16px 0" }}>
      {/* Üst Bilgi Kartı */}
      <div
        className="no-print"
        style={{
          background: "linear-gradient(135deg, #1e1b4b 0%, #4338ca 100%)",
          color: "#ffffff",
          borderRadius: "14px",
          padding: "20px 24px",
          marginBottom: "20px",
          boxShadow: "0 8px 24px rgba(30, 27, 75, 0.25)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "12px" }}>
          <div>
            <div style={{ display: "inline-flex", alignItems: "center", gap: "6px", background: "rgba(165, 180, 252, 0.2)", border: "1px solid rgba(165, 180, 252, 0.4)", borderRadius: "20px", padding: "4px 12px", fontSize: "0.78rem", fontWeight: 700, color: "#c7d2fe", marginBottom: "8px" }}>
              <span>🎓</span> AKILLI MEZUNİYET GELİŞİM ALBÜMÜ (HORIZON-3)
            </div>
            <h2 style={{ margin: "0 0 6px 0", fontSize: "1.35rem", fontWeight: 800 }}>
              Kuşe Baskı Formatında Yıl Sonu Çocuk Gelişim Romanı
            </h2>
            <p style={{ margin: 0, fontSize: "0.85rem", color: "#e0e7ff", maxWidth: "680px", lineHeight: "1.4" }}>
              Çocuğun 1 yıl boyunca toplanan görsel analizlerini, e-Okul karne metinlerini, boy-kilo grafiğini ve öğretmen veda mektubunu ömürlük bir hatıra kitabına dönüştürün.
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
              <span>A4 Kuşe Kitap Olarak Yazdır (PDF)</span>
            </button>
          </div>
        </div>
      </div>

      {/* Öğrenci Seçici Tabs */}
      <div className="no-print" style={{ display: "flex", gap: "8px", marginBottom: "20px", overflowX: "auto", paddingBottom: "6px" }}>
        {SAMPLE_ALBUM_STUDENTS.map((s) => (
          <button
            key={s.studentId}
            type="button"
            onClick={() => setSelectedStudentId(s.studentId)}
            style={{
              padding: "8px 16px",
              borderRadius: "8px",
              border: selectedStudentId === s.studentId ? "2px solid #4f46e5" : "1px solid #cbd5e1",
              background: selectedStudentId === s.studentId ? "rgba(79, 70, 229, 0.1)" : "#ffffff",
              color: selectedStudentId === s.studentId ? "#3730a3" : "#475569",
              fontWeight: selectedStudentId === s.studentId ? 800 : 600,
              fontSize: "0.82rem",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            <span>{s.avatarIcon}</span>
            <span>{s.fullName}</span>
          </button>
        ))}
      </div>

      {/* ─── 6 SAYFALIK KUŞE GELİŞİM ALBÜMÜ (CANLI VE YAZDIRILABİLİR) ─── */}
      <div className="graduation-book-wrapper" style={{ display: "flex", flexDirection: "column", gap: "24px", maxWidth: "800px", margin: "0 auto" }}>
        {/* SAYFA 1: LÜKS KAPAK SAYFASI */}
        <div
          className="album-page cover-page"
          style={{
            background: "linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)",
            color: "#ffffff",
            padding: "48px 36px",
            borderRadius: "12px",
            textAlign: "center",
            border: "4px double #fbbf24",
            minHeight: "500px",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
          }}
        >
          <div>
            <div style={{ fontSize: "0.85rem", letterSpacing: "0.1em", color: "#fcd34d", fontWeight: 700, textTransform: "uppercase" }}>
              T.C. MİLLÎ EĞİTİM BAKANLIĞI • TÜRKİYE YÜZYILI MAARİF MODELİ
            </div>
            <div style={{ fontSize: "1.1rem", fontWeight: 800, marginTop: "6px", color: "#e2e8f0" }}>
              {album.schoolName} • {album.classroomName}
            </div>
          </div>

          <div style={{ margin: "30px 0" }}>
            <div style={{ width: "120px", height: "120px", borderRadius: "50%", background: "#ffffff", color: "#1e1b4b", fontSize: "4rem", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px", border: "4px solid #f59e0b", boxShadow: "0 8px 24px rgba(0,0,0,0.4)" }}>
              {album.avatarIcon}
            </div>
            <h1 style={{ margin: "0 0 6px 0", fontSize: "2.2rem", fontWeight: 900, color: "#fcd34d", letterSpacing: "-0.02em" }}>
              {album.fullName}
            </h1>
            <div style={{ fontSize: "1.1rem", color: "#93c5fd", fontWeight: 700 }}>
              Okul Öncesi Gelişim Serüvenim &amp; Mezuniyet Romanım
            </div>
          </div>

          <div style={{ borderTop: "1px solid rgba(255, 255, 255, 0.2)", paddingTop: "16px", display: "flex", justifyContent: "space-between", fontSize: "0.85rem", color: "#cbd5e1" }}>
            <span>Öğretmen: <strong>{album.teacherName}</strong></span>
            <span>Eğitim Dönemi: <strong>{album.academicYear}</strong></span>
          </div>
        </div>

        {/* SAYFA 2: BENİM DÜNYAM & MERKEZLERİM */}
        <div
          className="album-page"
          style={{
            background: "#ffffff",
            padding: "36px 30px",
            borderRadius: "12px",
            border: "1px solid #e2e8f0",
            boxShadow: "0 4px 16px rgba(0,0,0,0.03)",
          }}
        >
          <div style={{ borderBottom: "2px solid #4f46e5", paddingBottom: "10px", marginBottom: "16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h3 style={{ margin: 0, fontSize: "1.2rem", fontWeight: 800, color: "#1e1b4b" }}>
              1. Benim Dünyam: Merkezlerim &amp; Erdemlerim
            </h3>
            <span style={{ fontSize: "0.75rem", color: "#64748b" }}>Sayfa 2</span>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "16px", marginBottom: "20px" }}>
            <div style={{ background: "#f8fafc", padding: "16px", borderRadius: "10px", border: "1px solid #e2e8f0" }}>
              <span style={{ fontSize: "0.72rem", fontWeight: 700, color: "#0284c7" }}>EN ÇOK SEVDİĞİM ALAN</span>
              <h4 style={{ margin: "4px 0", fontSize: "1.05rem", fontWeight: 800, color: "#0f172a" }}>
                {album.dominantCenter}
              </h4>
              <p style={{ margin: 0, fontSize: "0.76rem", color: "#475569", lineHeight: "1.4" }}>
                Yıl boyunca en çok vakit geçirdiğim ve en yaratıcı projelerimi tasarladığım öğrenme ortamı.
              </p>
            </div>

            <div style={{ background: "#fdf4ff", padding: "16px", borderRadius: "10px", border: "1px solid #f0abfc" }}>
              <span style={{ fontSize: "0.72rem", fontWeight: 700, color: "#a21caf" }}>BASKIN TYMM ERDEMİM</span>
              <h4 style={{ margin: "4px 0", fontSize: "1.05rem", fontWeight: 800, color: "#86198f" }}>
                {album.dominantValue}
              </h4>
              <p style={{ margin: 0, fontSize: "0.76rem", color: "#701a75", lineHeight: "1.4" }}>
                Arkadaşlarımla paylaşma, iş birliği ve adaletli oyun kurma erdeminde sınıfımızın ilham kaynağı.
              </p>
            </div>
          </div>

          <div style={{ background: "#eff6ff", borderRadius: "8px", padding: "14px", border: "1px solid #bfdbfe", fontSize: "0.82rem", color: "#1e3a8a", lineHeight: "1.5" }}>
            🌟 <strong>Gelişim İzi:</strong> {album.fullName}, etkinlikler boyunca akranlarıyla derin dostluklar kurdu; problem çözme anlarında barışçıl ve uzlaşmacı tutumuyla sınıf iklimini güzelleştirdi.
          </div>
        </div>

        {/* SAYFA 3: GÖRSEL SANAT & BİLİŞSEL YAPILARIM */}
        <div
          className="album-page"
          style={{
            background: "#ffffff",
            padding: "36px 30px",
            borderRadius: "12px",
            border: "1px solid #e2e8f0",
            boxShadow: "0 4px 16px rgba(0,0,0,0.03)",
          }}
        >
          <div style={{ borderBottom: "2px solid #059669", paddingBottom: "10px", marginBottom: "16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h3 style={{ margin: 0, fontSize: "1.2rem", fontWeight: 800, color: "#065f46" }}>
              2. Görsel Sanat &amp; Bilişsel Tasarımlarım (Edge Vision)
            </h3>
            <span style={{ fontSize: "0.75rem", color: "#64748b" }}>Sayfa 3</span>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "16px", marginBottom: "16px" }}>
            <div style={{ textAlign: "center", background: "#f8fafc", padding: "16px", borderRadius: "10px", border: "1px solid #e2e8f0" }}>
              <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "#64748b" }}>MOTOR KARARLILIK</div>
              <div style={{ fontSize: "2rem", fontWeight: 900, color: "#0284c7" }}>%{album.motorScorePercent}</div>
              <small style={{ color: "#0369a1" }}>İnce Kas &amp; Çizgi Dengesi</small>
            </div>

            <div style={{ textAlign: "center", background: "#f8fafc", padding: "16px", borderRadius: "10px", border: "1px solid #e2e8f0" }}>
              <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "#64748b" }}>MEKÂNSAL DENGE</div>
              <div style={{ fontSize: "2rem", fontWeight: 900, color: "#10b981" }}>%{album.spatialScorePercent}</div>
              <small style={{ color: "#065f46" }}>Simetri &amp; Mimari Kurgu</small>
            </div>
          </div>

          <p style={{ fontSize: "0.82rem", color: "#334155", lineHeight: "1.5", margin: 0 }}>
            Yıl içerisindeki blok kuleleri, serbest suluboya çalışmaları ve kil modelleri incelendiğinde; parça-bütün ilişkilerini kurma ve geometrik dengeyi yakalama becerisinin yaş grubunun ilerisinde olduğu tespit edilmiştir.
          </p>
        </div>

        {/* SAYFA 4: ÖĞRETMENİMİN KALEMİNDEN VEDA MEKTUBU */}
        <div
          className="album-page"
          style={{
            background: "linear-gradient(135deg, #fffbeb 0%, #ffffff 100%)",
            padding: "36px 30px",
            borderRadius: "12px",
            border: "2px solid #fde68a",
            boxShadow: "0 4px 16px rgba(0,0,0,0.03)",
          }}
        >
          <div style={{ borderBottom: "2px solid #d97706", paddingBottom: "10px", marginBottom: "16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h3 style={{ margin: 0, fontSize: "1.2rem", fontWeight: 800, color: "#78350f" }}>
              3. Öğretmenimin Kaleminden: Sevgi Dolu Veda Mektubu
            </h3>
            <span style={{ fontSize: "0.75rem", color: "#92400e" }}>Son Sayfa</span>
          </div>

          <div
            style={{
              padding: "18px 20px",
              background: "rgba(255, 255, 255, 0.8)",
              borderRadius: "8px",
              border: "1px dashed #f59e0b",
              lineHeight: "1.8",
              fontSize: "0.92rem",
              color: "#451a03",
              fontStyle: "italic",
            }}
          >
            "{album.teacherFarewellLetter}"
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginTop: "30px" }}>
            <div style={{ fontSize: "0.78rem", color: "#92400e" }}>
              Tarih: <strong>Haziran 2027</strong>
            </div>

            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: "0.88rem", fontWeight: 800, color: "#1e1b4b" }}>{album.teacherName}</div>
              <div style={{ fontSize: "0.75rem", color: "#64748b" }}>Okul Öncesi Zümre Öğretmeni</div>
              <div style={{ fontSize: "0.72rem", color: "#b45309", marginTop: "4px" }}>[e-İmzalı ve Onaylı]</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
