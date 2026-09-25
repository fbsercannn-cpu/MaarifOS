/**
 * AIObservationAnecdoteWorkspace.tsx — MaarifOS 0.95.0
 * Yapay Zeka Destekli MEB EK-2 Gözlem & Anekdot Formu Çalışma Masası
 * 
 * MİMARİ VE PEDAGOJİK STANDARTLAR:
 * 1. Web Speech API (tr-TR) ile Eller-Serbest Sesli Dikte.
 * 2. Yapay Zekâ Semantik Ontoloji Motoru (DeepSeek-V3 + Offline Heuristic Fallback).
 * 3. T.C. Millî Eğitim Bakanlığı Resmî EK-2 Anekdot Kayıt Formu A4 Mizanpajı.
 * 4. Tek Tıkla Veli WhatsApp Bülteni ve e-Okul Aktarım Köprüsü.
 * 5. %100 Stateless Client-Side İzolasyonu, Cihaz İçi IndexedDB & LocalStorage Kalıcılığı.
 */

import React, { useState, useEffect, useMemo } from "react";
import {
  classifyObservationWithAI,
  type AIObservationClassification,
  persistClassifiedObservation,
} from "../../services/ai-observation-classifier.ts";
import { generateParentEmpathyDigest } from "../../services/parent-empathy-shield.ts";
import {
  SparklesIcon,
  ShieldCheckIcon,
  PrinterIcon,
  CheckCircleIcon,
  BookOpenIcon,
  ClipboardCheckIcon,
} from "../../components/MaarifIcons.tsx";
import { AmbientClassroomPedagogue } from "../../services/ambient-classroom-pedagogue.ts";
import { triggerHaptic } from "../../core/haptics.ts";

interface StoredObservationRecord {
  id: string;
  studentName: string;
  civilDate: string;
  time: string;
  learningCenter: string;
  rawText: string;
  childQuote?: string;
  classification: AIObservationClassification;
  createdAt: string;
}

const DEFAULT_STUDENTS = [
  "Ali Yılmaz",
  "Zeynep Kaya",
  "Mehmet Demir",
  "Elif Çelik",
  "Kerem Şahin",
  "Ayşe Öztürk",
  "Can Yıldız",
  "Defne Arslan",
];

const LEARNING_CENTERS = [
  "Blok Merkezi",
  "Sanat Merkezi",
  "Fen & Keşif Merkezi",
  "Kitap & Dil Merkezi",
  "Müzik & Ritim Merkezi",
  "Dramatik Oyun Merkezi",
  "Açık Hava & Bahçe",
];

const QUICK_OBSERVATION_TEMPLATES = [
  { label: "Blok Paylaşımı", text: "Blok merkezinde arkadaşlarıyla yüksek bir kule inşa ederken parçaları sırayla paylaştı ve devrilen kuleyi gülümseyerek yeniden yaptı." },
  { label: "Örüntü & Sayma", text: "Fen ve matematik köşesinde kırmızı ve mavi boncukları 1-2-1-2 örüntüsüyle dizdi, 15'e kadar hatasız saydı." },
  { label: "Duygu İfadesi", text: "Arkadaşı üzgünken yanına gidip 'Oyuncağımı seninle paylaşabilirim' diyerek sarıldı ve duygusal empati gösterdi." },
  { label: "İnce Motor & Makas", text: "Sanat merkezinde çizilen dalgalı çizgileri makasla taşırmadan kesti ve origami tekniğiyle kurbağa figürü katladı." },
  { label: "Sözlü Hikaye", text: "Kitap merkezinde resimli kitaba bakarak arkadaşlarına kendi kurguladığı uzay macerası masalını jest ve mimiklerle anlattı." },
];

interface AIObservationAnecdoteWorkspaceProps {
  onClose?: () => void;
  autoStartVoice?: boolean;
  initialStudentName?: string;
}

export function AIObservationAnecdoteWorkspace({
  onClose,
  autoStartVoice = false,
  initialStudentName,
}: AIObservationAnecdoteWorkspaceProps = {}) {
  const todayStr = useMemo(() => new Date().toISOString().split("T")[0], []);
  const currentTimeStr = useMemo(() => new Date().toTimeString().slice(0, 5), []);

  // Form Durumu
  const [selectedStudent, setSelectedStudent] = useState(() => {
    if (initialStudentName && DEFAULT_STUDENTS.includes(initialStudentName)) {
      return initialStudentName;
    }
    return DEFAULT_STUDENTS[0];
  });
  const [customStudentInput, setCustomStudentInput] = useState(() => {
    if (initialStudentName && !DEFAULT_STUDENTS.includes(initialStudentName)) {
      return initialStudentName;
    }
    return "";
  });

  useEffect(() => {
    if (initialStudentName) {
      if (DEFAULT_STUDENTS.includes(initialStudentName)) {
        setSelectedStudent(initialStudentName);
        setCustomStudentInput("");
      } else {
        setCustomStudentInput(initialStudentName);
      }
    }
  }, [initialStudentName]);

  const [observationDate, setObservationDate] = useState(todayStr);
  const [observationTime, setObservationTime] = useState(currentTimeStr);
  const [selectedCenter, setSelectedCenter] = useState(LEARNING_CENTERS[0]);
  const [rawText, setRawText] = useState("");
  const [childQuote, setChildQuote] = useState("");

  // AI & Analiz Durumu
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiResult, setAiResult] = useState<AIObservationClassification | null>(null);
  const [statusNotice, setStatusNotice] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [eOkulSnippet, setEOkulSnippet] = useState<{ area: string; text: string; charCount: number } | null>(null);
  const [zpdSnippet, setZpdSnippet] = useState<{ whisper: string; material: string; outcome: string } | null>(null);
  const [empathySnippet, setEmpathySnippet] = useState<string | null>(null);

  const handleGenerateZpd = () => {
    if (!rawText.trim()) {
      setStatusNotice("⚠️ Lütfen önce gözlem metnini yazın veya mikrofona konuşun.");
      return;
    }
    triggerHaptic(15);
    const studentName = customStudentInput.trim() || selectedStudent;
    const res = AmbientClassroomPedagogue.scaffoldLearningMoment({
      center: selectedCenter,
      studentName,
      actionDescription: rawText,
    });
    setZpdSnippet({
      whisper: res.teacherWhisperPrompt,
      material: res.materialSuggestion,
      outcome: res.tymmOutcomeCode,
    });
    setEOkulSnippet(null);
    setEmpathySnippet(null);
  };

  const handleGenerateEOkul = () => {
    if (!rawText.trim()) {
      setStatusNotice("⚠️ Lütfen önce gözlem metnini yazın veya mikrofona konuşun.");
      return;
    }
    triggerHaptic(15);
    const studentName = customStudentInput.trim() || selectedStudent;
    const lower = rawText.toLowerCase();
    let area: "motor" | "cognitive" | "language" | "social_emotional" | "self_care" = "social_emotional";
    if (lower.includes("blok") || lower.includes("sayı") || lower.includes("renk") || lower.includes("şekil") || lower.includes("mantık")) {
      area = "cognitive";
    } else if (lower.includes("koş") || lower.includes("kes") || lower.includes("makas") || lower.includes("tırman") || lower.includes("denge")) {
      area = "motor";
    } else if (lower.includes("konuş") || lower.includes("anlat") || lower.includes("hikaye") || lower.includes("kelime") || lower.includes("masal")) {
      area = "language";
    } else if (lower.includes("öz bakım") || lower.includes("elini") || lower.includes("yemek") || lower.includes("giy")) {
      area = "self_care";
    }

    const res = AmbientClassroomPedagogue.synthesizeForEOkul({
      studentName,
      area,
      observationNote: rawText,
    });
    setEOkulSnippet({
      area: res.developmentalArea,
      text: res.eOkulText,
      charCount: res.charCount,
    });
    setZpdSnippet(null);
    setEmpathySnippet(null);
  };

  const handleGenerateEmpathy = () => {
    if (!rawText.trim()) {
      setStatusNotice("⚠️ Lütfen önce gözlem metnini yazın veya mikrofona konuşun.");
      return;
    }
    triggerHaptic(15);
    const studentName = customStudentInput.trim() || selectedStudent;
    const res = generateParentEmpathyDigest({
      studentName,
      observationText: rawText,
      customValue: "Sevgi, Saygı ve İşbirliği",
      learningCenter: selectedCenter,
    });
    setEmpathySnippet(res.digestMessage);
    setZpdSnippet(null);
    setEOkulSnippet(null);
  };

  // Arşiv Listesi
  const [observations, setObservations] = useState<StoredObservationRecord[]>(() => {
    try {
      const raw = localStorage.getItem("maarif_persisted_ai_observations") || "[]";
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed.map((item: any) => ({
          id: item.id || crypto.randomUUID(),
          studentName: item.studentIds?.[0] || item.studentName || "Öğrenci",
          civilDate: item.civilDate || todayStr,
          time: item.observedAt ? item.observedAt.slice(11, 16) : currentTimeStr,
          learningCenter: item.pedagogicalTags?.learningCenter || "Öğrenme Merkezi",
          rawText: item.rawText || "",
          childQuote: item.childQuote || "",
          classification: {
            domainCodes: item.pedagogicalTags?.domainCodes || ["MAB.1"],
            domainLabels: item.pedagogicalTags?.domainLabels || ["Bilişsel Beceriler"],
            valueCodes: item.pedagogicalTags?.valueCodes || ["D14 Saygı"],
            tendencyCodes: item.pedagogicalTags?.tendencyCodes || ["E2.4 İş Birliği"],
            conceptLabels: item.pedagogicalTags?.conceptLabels || ["Örüntü"],
            learningCenter: item.pedagogicalTags?.learningCenter || "Blok Merkezi",
            dimension: item.pedagogicalTags?.dimension || "bilissel",
            dimensionLabel: item.pedagogicalTags?.dimensionLabel || "Bilişsel Gelişim",
            pedagogicalInterpretation: item.pedagogicalTags?.interpretation || "Gözlem başarıyla kaydedildi.",
          },
          createdAt: item.createdAt || new Date().toISOString(),
        }));
      }
    } catch {}
    return [];
  });

  const [activeTab, setActiveTab] = useState<"new_form" | "history">("new_form");
  const [selectedRecordForPrint, setSelectedRecordForPrint] = useState<StoredObservationRecord | null>(null);

  // Sesli Dikte (Web Speech API)
  const toggleSpeechRecognition = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Tarayıcınız Web Speech API sesli dikte özelliğini desteklemiyor. Lütfen güncel Chrome veya Edge kullanın.");
      return;
    }

    if (isListening) {
      setIsListening(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = "tr-TR";
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        setIsListening(true);
        setStatusNotice("🎙️ Dinleniyor... Lütfen sınıf içi gözleminizi Türkçe konuşun.");
      };

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setRawText((prev) => (prev ? `${prev} ${transcript}` : transcript));
        setStatusNotice("✓ Ses başarıyla metne döküldü!");
        setTimeout(() => setStatusNotice(""), 3000);
      };

      recognition.onerror = (event: any) => {
        setIsListening(false);
        setStatusNotice("⚠️ Ses tanıma hatası: " + event.error);
        setTimeout(() => setStatusNotice(""), 4000);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.start();
    } catch (e) {
      alert("Mikrofon başlatılamadı: " + String(e));
      setIsListening(false);
    }
  };

  useEffect(() => {
    if (autoStartVoice) {
      const timer = setTimeout(() => {
        toggleSpeechRecognition();
      }, 400);
      return () => clearTimeout(timer);
    }
  }, [autoStartVoice]);

  // Yapay Zeka ile Analiz Et
  const handleAnalyzeWithAI = async () => {
    if (!rawText.trim()) {
      alert("Lütfen önce gözlem metnini yazın veya mikrofondan sesli dikte edin.");
      return;
    }

    setIsAnalyzing(true);
    setStatusNotice("🤖 Yapay zeka MEB TYMM 2026 pedagoji ontolojisini tarıyor...");

    try {
      const fullPrompt = `${rawText} ${childQuote ? `(Çocuğun Doğrudan Sözü: "${childQuote}")` : ""} [Öğrenme Merkezi: ${selectedCenter}]`;
      const result = await classifyObservationWithAI(fullPrompt);
      setAiResult(result);
      setStatusNotice("✓ Yapay zeka analizi tamamlandı! Aşağıdaki MEB EK-2 kartını inceleyin.");
      setTimeout(() => setStatusNotice(""), 4000);
    } catch (err) {
      setStatusNotice("⚠️ AI analizi uyarısı: " + String(err));
    } finally {
      setIsAnalyzing(false);
    }
  };

  // MEB EK-2 Olarak Sisteme Kaydet
  const handleSaveObservation = async () => {
    if (!rawText.trim()) {
      alert("Gözlem metni boş bırakılamaz.");
      return;
    }

    const studentName = customStudentInput.trim() || selectedStudent;
    const finalClassification = aiResult || {
      domainCodes: ["MAB.1"],
      domainLabels: [selectedCenter],
      valueCodes: ["D14 Saygı ve Yardımlaşma"],
      tendencyCodes: ["E2.4 İş Birliği"],
      conceptLabels: ["Sosyal Etkileşim"],
      learningCenter: selectedCenter,
      dimension: "sosyal_duygusal" as const,
      dimensionLabel: "Sosyal ve Duygusal Gelişim",
      pedagogicalInterpretation: `${studentName} isimli öğrencinin ${selectedCenter} ortamındaki doğal davranışı gözlemlenmiştir.`,
    };

    const newRecord: StoredObservationRecord = {
      id: crypto.randomUUID(),
      studentName,
      civilDate: observationDate,
      time: observationTime,
      learningCenter: selectedCenter,
      rawText: rawText.trim(),
      childQuote: childQuote.trim(),
      classification: finalClassification,
      createdAt: new Date().toISOString(),
    };

    // Kalıcı sakla
    await persistClassifiedObservation(
      null,
      studentName,
      `${newRecord.rawText} ${childQuote ? `[Söz: "${childQuote}"]` : ""}`,
      finalClassification
    );

    const updated = [newRecord, ...observations];
    setObservations(updated);

    setStatusNotice(`🎉 "${studentName}" için MEB EK-2 Anekdot kaydı başarıyla mühürlendi!`);
    setSelectedRecordForPrint(newRecord);

    // Formu temizle
    setRawText("");
    setChildQuote("");
    setAiResult(null);
    setCustomStudentInput("");

    setTimeout(() => setStatusNotice(""), 4000);
  };

  // WhatsApp Veli Bülteni Paylaşımı
  const handleShareWhatsApp = (rec: StoredObservationRecord) => {
    const empathy = generateParentEmpathyDigest({
      studentName: rec.studentName,
      observationText: rec.rawText,
      customValue: rec.classification.valueCodes[0] || "Saygı ve Paylaşım",
      learningCenter: rec.learningCenter,
    });

    if (empathy.whatsAppUrl) {
      window.open(empathy.whatsAppUrl, "_blank");
    } else {
      const msg = encodeURIComponent(
        `Sayın Velimiz, ${rec.civilDate} tarihinde ${rec.studentName} için sınıf içi pedagojik bültenimiz:\n\n"${empathy.digestMessage}"\n\n- MaarifOS TYMM Portalı`
      );
      window.open(`https://api.whatsapp.com/send?text=${msg}`, "_blank");
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      {/* BAŞLIK & TELEMETRİ KARTI */}
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
              <SparklesIcon size={14} />
              <span>MEB EK-2 RESMÎ STANDARDI • DERİN ÖĞRENME</span>
            </div>
            <h2 style={{ margin: "12px 0 6px 0", fontSize: "1.5rem", fontWeight: 800 }}>
              Yapay Zeka Destekli Gözlem &amp; Anekdot (EK-2) Formu
            </h2>
            <p style={{ margin: 0, fontSize: "0.85rem", color: "#94a3b8", maxWidth: "680px" }}>
              Sınıfta sesli dikteyle veya klavyeyle ham notunuzu girin. DeepSeek-V3 ve kural motoru, gözleminizi anında MEB TYMM 2026 kazanımlarına, erdemlerine (D1-D20) ve basılabilir resmî EK-2 formuna dönüştürür.
            </p>
          </div>

          {/* Sekme Değiştirici */}
          <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
            <button
              type="button"
              onClick={() => setActiveTab("new_form")}
              style={{
                background: activeTab === "new_form" ? "#0284c7" : "rgba(255,255,255,0.08)",
                border: "none",
                color: "#ffffff",
                padding: "10px 16px",
                borderRadius: "8px",
                fontSize: "0.85rem",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              ✍️ Yeni Gözlem Gir
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("history")}
              style={{
                background: activeTab === "history" ? "#0284c7" : "rgba(255,255,255,0.08)",
                border: "none",
                color: "#ffffff",
                padding: "10px 16px",
                borderRadius: "8px",
                fontSize: "0.85rem",
                fontWeight: 700,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              <span>📋 Kayıtlı Anekdotlar</span>
              <span style={{ background: "rgba(255,255,255,0.2)", padding: "1px 6px", borderRadius: "10px", fontSize: "0.72rem" }}>
                {observations.length}
              </span>
            </button>
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                style={{
                  background: "rgba(239, 68, 68, 0.2)",
                  border: "1px solid rgba(239, 68, 68, 0.4)",
                  color: "#fca5a5",
                  padding: "10px 16px",
                  borderRadius: "8px",
                  fontSize: "0.85rem",
                  fontWeight: 800,
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                }}
                title="Çalışma Masasını Kapat ve Sınıfa Dön"
              >
                <span>✕</span>
                <span>Kapat</span>
              </button>
            )}
          </div>
        </div>

        {statusNotice && (
          <div style={{ marginTop: "16px", background: "rgba(16, 185, 129, 0.15)", border: "1px solid rgba(16, 185, 129, 0.4)", borderRadius: "8px", padding: "10px 14px", color: "#34d399", fontSize: "0.85rem", fontWeight: 700 }}>
            {statusNotice}
          </div>
        )}
      </div>

      {/* ─── YENİ GÖZLEM GİRİŞ FORMU ─── */}
      {activeTab === "new_form" && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))", gap: "20px" }}>
          {/* Sol Kolon: Veri Girişi & Sesli Dikte */}
          <div
            style={{
              background: "#ffffff",
              border: "1px solid #e2e8f0",
              borderRadius: "14px",
              padding: "24px",
              boxShadow: "0 4px 16px rgba(0,0,0,0.04)",
              display: "flex",
              flexDirection: "column",
              gap: "16px",
            }}
          >
            <h3 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 800, color: "#0f172a", borderBottom: "2px solid #f1f5f9", paddingBottom: "10px" }}>
              1. Gözlem Parametreleri
            </h3>

            {/* Öğrenci Seçimi */}
            <div>
              <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 700, color: "#475569", marginBottom: "6px" }}>
                Öğrenci Seçiniz (Veya Yeni İsim Yazınız):
              </label>
              <div style={{ display: "flex", gap: "8px" }}>
                <select
                  value={selectedStudent}
                  onChange={(e) => {
                    setSelectedStudent(e.target.value);
                    setCustomStudentInput("");
                  }}
                  style={{
                    flex: 1,
                    padding: "9px 12px",
                    borderRadius: "8px",
                    border: "1px solid #cbd5e1",
                    fontSize: "0.88rem",
                    fontWeight: 600,
                  }}
                >
                  {DEFAULT_STUDENTS.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
                <input
                  type="text"
                  placeholder="Farklı İsim..."
                  value={customStudentInput}
                  onChange={(e) => setCustomStudentInput(e.target.value)}
                  style={{
                    width: "130px",
                    padding: "9px 12px",
                    borderRadius: "8px",
                    border: "1px solid #cbd5e1",
                    fontSize: "0.85rem",
                  }}
                />
              </div>
            </div>

            {/* Tarih, Saat, Merkez */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
              <div>
                <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 700, color: "#475569", marginBottom: "4px" }}>
                  Tarih:
                </label>
                <input
                  type="date"
                  value={observationDate}
                  onChange={(e) => setObservationDate(e.target.value)}
                  style={{ width: "100%", padding: "8px 10px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "0.85rem" }}
                />
              </div>
              <div>
                <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 700, color: "#475569", marginBottom: "4px" }}>
                  Saat:
                </label>
                <input
                  type="time"
                  value={observationTime}
                  onChange={(e) => setObservationTime(e.target.value)}
                  style={{ width: "100%", padding: "8px 10px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "0.85rem" }}
                />
              </div>
            </div>

            <div>
              <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 700, color: "#475569", marginBottom: "4px" }}>
                Gözlenen Mekân / Öğrenme Merkezi:
              </label>
              <select
                value={selectedCenter}
                onChange={(e) => setSelectedCenter(e.target.value)}
                style={{ width: "100%", padding: "9px 12px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "0.88rem" }}
              >
                {LEARNING_CENTERS.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            {/* Hızlı Örnek Şablonlar */}
            <div>
              <span style={{ fontSize: "0.78rem", fontWeight: 700, color: "#64748b" }}>Hızlı Gözlem Şablonu Ekle:</span>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginTop: "6px" }}>
                {QUICK_OBSERVATION_TEMPLATES.map((tmpl, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setRawText(tmpl.text)}
                    style={{
                      background: "#f1f5f9",
                      border: "1px solid #e2e8f0",
                      borderRadius: "14px",
                      padding: "4px 10px",
                      fontSize: "0.74rem",
                      fontWeight: 600,
                      color: "#334155",
                      cursor: "pointer",
                    }}
                  >
                    + {tmpl.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Ham Gözlem Metni & Sesli Dikte */}
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                <label style={{ fontSize: "0.82rem", fontWeight: 700, color: "#475569" }}>
                  Gözlenen Durum (Ham Gözlem): *
                </label>
                <button
                  type="button"
                  onClick={toggleSpeechRecognition}
                  style={{
                    background: isListening ? "#ef4444" : "#10b981",
                    color: "#ffffff",
                    border: "none",
                    borderRadius: "6px",
                    padding: "4px 10px",
                    fontSize: "0.76rem",
                    fontWeight: 700,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "4px",
                  }}
                >
                  <span>{isListening ? "⏹️ Durdur" : "🎤 Sesli Dikte"}</span>
                </button>
              </div>
              <textarea
                rows={4}
                value={rawText}
                onChange={(e) => setRawText(e.target.value)}
                placeholder="Örnek: Blok merkezinde arkadaşıyla yüksek kule yaparken sırayla blok aldılar..."
                style={{
                  width: "100%",
                  padding: "10px",
                  borderRadius: "8px",
                  border: "1px solid #cbd5e1",
                  fontSize: "0.88rem",
                  fontFamily: "inherit",
                }}
              />
            </div>

            {/* ─── DÖRT DÜNYA BİLGESİ AMBIENT ZEKA ÇUBUĞU (ZPD, E-OKUL, VELİ KALKANI) ─── */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", margin: "2px 0 8px 0" }}>
              <button
                type="button"
                onClick={handleGenerateZpd}
                style={{
                  background: "#fffbeb",
                  border: "1px solid #fde68a",
                  color: "#b45309",
                  borderRadius: "14px",
                  padding: "4px 10px",
                  fontSize: "0.74rem",
                  fontWeight: 700,
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "4px",
                }}
              >
                🧠 Vygotsky ZPD Fısıltısı
              </button>
              <button
                type="button"
                onClick={handleGenerateEOkul}
                style={{
                  background: "#eef2ff",
                  border: "1px solid #c7d2fe",
                  color: "#4338ca",
                  borderRadius: "14px",
                  padding: "4px 10px",
                  fontSize: "0.74rem",
                  fontWeight: 700,
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "4px",
                }}
              >
                📊 e-Okul 250 Karakter Metni
              </button>
              <button
                type="button"
                onClick={handleGenerateEmpathy}
                style={{
                  background: "#f0fdf4",
                  border: "1px solid #bbf7d0",
                  color: "#15803d",
                  borderRadius: "14px",
                  padding: "4px 10px",
                  fontSize: "0.74rem",
                  fontWeight: 700,
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "4px",
                }}
              >
                🤝 Aile Bilgilendirme Notu
              </button>
            </div>

            {/* Vygotsky ZPD Kutusu */}
            {zpdSnippet && (
              <div
                style={{
                  background: "linear-gradient(135deg, #fffbeb, #fef3c7)",
                  border: "1px solid #f59e0b",
                  borderRadius: "8px",
                  padding: "10px",
                  marginBottom: "8px",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                  <strong style={{ fontSize: "0.75rem", color: "#b45309" }}>
                    🧠 Vygotsky ZPD Sokratik Fısıltı:
                  </strong>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(zpdSnippet.whisper);
                      triggerHaptic(20);
                      setStatusNotice("✅ ZPD fısıltısı panoya kopyalandı!");
                      setTimeout(() => setStatusNotice(""), 3000);
                    }}
                    style={{
                      background: "#b45309",
                      color: "#ffffff",
                      border: "none",
                      borderRadius: "4px",
                      padding: "2px 8px",
                      fontSize: "0.7rem",
                      fontWeight: 700,
                      cursor: "pointer",
                    }}
                  >
                    📋 Fısıltıyı Kopyala
                  </button>
                </div>
                <p style={{ margin: "2px 0 4px 0", fontSize: "0.82rem", color: "#78350f", fontWeight: 700, fontStyle: "italic" }}>
                  {zpdSnippet.whisper}
                </p>
                <small style={{ fontSize: "0.7rem", color: "#92400e" }}>
                  🌿 Çevresel Materyal: {zpdSnippet.material} · {zpdSnippet.outcome}
                </small>
              </div>
            )}

            {/* e-Okul 250 Karakter Kutusu */}
            {eOkulSnippet && (
              <div
                style={{
                  background: "linear-gradient(135deg, #eef2ff, #e0e7ff)",
                  border: "1px solid #6366f1",
                  borderRadius: "8px",
                  padding: "10px",
                  marginBottom: "8px",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <strong style={{ fontSize: "0.75rem", color: "#3730a3" }}>
                      📊 MEB e-Okul Dönem Sonu Gelişim Cümlesi:
                    </strong>
                    <span
                      style={{
                        background: "#c7d2fe",
                        color: "#312e81",
                        padding: "1px 6px",
                        borderRadius: "10px",
                        fontSize: "0.68rem",
                        fontWeight: 800,
                      }}
                    >
                      {eOkulSnippet.charCount}/250 Karakter
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(eOkulSnippet.text);
                      triggerHaptic(20);
                      setStatusNotice("✅ e-Okul metni panoya kopyalandı!");
                      setTimeout(() => setStatusNotice(""), 3000);
                    }}
                    style={{
                      background: "#4338ca",
                      color: "#ffffff",
                      border: "none",
                      borderRadius: "4px",
                      padding: "2px 8px",
                      fontSize: "0.7rem",
                      fontWeight: 700,
                      cursor: "pointer",
                    }}
                  >
                    📋 e-Okul İçin Kopyala
                  </button>
                </div>
                <p style={{ margin: "2px 0 0 0", fontSize: "0.8rem", color: "#1e1b4b", lineHeight: 1.4 }}>
                  {eOkulSnippet.text}
                </p>
              </div>
            )}

            {/* Aile Bilgilendirme Notu Kutusu */}
            {empathySnippet && (
              <div
                style={{
                  background: "linear-gradient(135deg, #f0fdf4, #dcfce7)",
                  border: "1px solid #22c55e",
                  borderRadius: "8px",
                  padding: "10px",
                  marginBottom: "8px",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                  <strong style={{ fontSize: "0.75rem", color: "#166534" }}>
                    🤝 Gelişimsel Aile Bilgilendirme Notu:
                  </strong>
                  <div style={{ display: "flex", gap: "6px" }}>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(empathySnippet);
                        triggerHaptic(20);
                        setStatusNotice("✅ Veli mesajı panoya kopyalandı!");
                        setTimeout(() => setStatusNotice(""), 3000);
                      }}
                      style={{
                        background: "#166534",
                        color: "#ffffff",
                        border: "none",
                        borderRadius: "4px",
                        padding: "2px 8px",
                        fontSize: "0.7rem",
                        fontWeight: 700,
                        cursor: "pointer",
                      }}
                    >
                      📋 Kopyala
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        window.open(`https://wa.me/?text=${encodeURIComponent(empathySnippet)}`, "_blank");
                      }}
                      style={{
                        background: "#15803d",
                        color: "#ffffff",
                        border: "none",
                        borderRadius: "4px",
                        padding: "2px 8px",
                        fontSize: "0.7rem",
                        fontWeight: 700,
                        cursor: "pointer",
                      }}
                    >
                      💬 WhatsApp
                    </button>
                  </div>
                </div>
                <p style={{ margin: "2px 0 0 0", fontSize: "0.78rem", color: "#14532d", lineHeight: 1.4 }}>
                  {empathySnippet}
                </p>
              </div>
            )}

            {/* Çocuğun Doğrudan Sözü */}
            <div>
              <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 700, color: "#475569", marginBottom: "4px" }}>
                Çocuğun Doğrudan Sözü (Varsa):
              </label>
              <input
                type="text"
                value={childQuote}
                onChange={(e) => setChildQuote(e.target.value)}
                placeholder='Örnek: "Bu kule gökyüzüne kadar uzanacak, sen de mavi bloğu koy!"'
                style={{ width: "100%", padding: "9px 12px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "0.85rem" }}
              />
            </div>

            {/* Eylem Butonları */}
            <div style={{ display: "flex", gap: "10px", marginTop: "8px" }}>
              <button
                type="button"
                onClick={handleAnalyzeWithAI}
                disabled={isAnalyzing}
                style={{
                  flex: 1,
                  background: "linear-gradient(135deg, #0284c7, #0369a1)",
                  border: "none",
                  color: "#ffffff",
                  padding: "12px",
                  borderRadius: "8px",
                  fontWeight: 800,
                  fontSize: "0.88rem",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "6px",
                  boxShadow: "0 4px 12px rgba(2, 132, 199, 0.3)",
                }}
              >
                <SparklesIcon size={16} />
                <span>{isAnalyzing ? "Analiz Ediliyor..." : "✨ AI ile Analiz Et"}</span>
              </button>

              <button
                type="button"
                onClick={handleSaveObservation}
                style={{
                  flex: 1,
                  background: "linear-gradient(135deg, #059669, #047857)",
                  border: "none",
                  color: "#ffffff",
                  padding: "12px",
                  borderRadius: "8px",
                  fontWeight: 800,
                  fontSize: "0.88rem",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "6px",
                  boxShadow: "0 4px 12px rgba(5, 150, 105, 0.3)",
                }}
              >
                <span>💾 MEB EK-2 Kaydet</span>
              </button>
            </div>
          </div>

          {/* Sağ Kolon: Resmî EK-2 Canlı Önizleme Kartı */}
          <div
            style={{
              background: "#ffffff",
              border: "1px solid #cbd5e1",
              borderRadius: "14px",
              padding: "24px",
              boxShadow: "0 4px 16px rgba(0,0,0,0.06)",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
            }}
          >
            <div>
              {/* Resmî Başlık */}
              <div style={{ textAlign: "center", borderBottom: "2px solid #0f172a", paddingBottom: "12px", marginBottom: "16px" }}>
                <small style={{ fontWeight: 800, color: "#64748b", letterSpacing: "1px" }}>
                  T.C. MİLLÎ EĞİTİM BAKANLIĞI
                </small>
                <h3 style={{ margin: "4px 0", fontSize: "1.15rem", fontWeight: 900, color: "#0f172a" }}>
                  EK-2 ANEKDOT (VAKA) KAYIT FORMU
                </h3>
                <span style={{ fontSize: "0.74rem", color: "#059669", fontWeight: 700 }}>
                  ✓ TYMM 2026 Resmî Müfredat Uyumlu
                </span>
              </div>

              {/* Temel Bilgi Şeridi */}
              <div style={{ background: "#f8fafc", padding: "12px", borderRadius: "8px", border: "1px solid #e2e8f0", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", fontSize: "0.82rem", marginBottom: "16px" }}>
                <div>
                  <span style={{ color: "#64748b" }}>Öğrenci: </span>
                  <strong style={{ color: "#0f172a" }}>{customStudentInput.trim() || selectedStudent}</strong>
                </div>
                <div>
                  <span style={{ color: "#64748b" }}>Mekân: </span>
                  <strong style={{ color: "#0f172a" }}>{selectedCenter}</strong>
                </div>
                <div>
                  <span style={{ color: "#64748b" }}>Tarih: </span>
                  <strong style={{ color: "#0f172a" }}>{observationDate}</strong>
                </div>
                <div>
                  <span style={{ color: "#64748b" }}>Saat: </span>
                  <strong style={{ color: "#0f172a" }}>{observationTime}</strong>
                </div>
              </div>

              {/* Ham Not */}
              <div style={{ marginBottom: "14px" }}>
                <span style={{ fontSize: "0.78rem", fontWeight: 800, color: "#475569", textTransform: "uppercase" }}>
                  Gözlenen Durum (Ham Not):
                </span>
                <p style={{ margin: "4px 0 0 0", fontSize: "0.88rem", color: "#1e293b", background: "#f1f5f9", padding: "10px", borderRadius: "8px", fontStyle: rawText ? "normal" : "italic" }}>
                  {rawText || "Henüz gözlem metni girilmedi. Soldaki alana yazın veya sesli dikte yapın."}
                </p>
                {childQuote && (
                  <p style={{ margin: "6px 0 0 0", fontSize: "0.82rem", color: "#0369a1", fontWeight: 600 }}>
                    🗣️ Çocuğun Sözü: "{childQuote}"
                  </p>
                )}
              </div>

              {/* AI Ontoloji Kartı */}
              {aiResult ? (
                <div style={{ background: "rgba(16, 185, 129, 0.08)", border: "1px solid rgba(16, 185, 129, 0.3)", borderRadius: "10px", padding: "14px", marginTop: "12px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                    <span style={{ fontSize: "0.78rem", fontWeight: 800, color: "#059669" }}>
                      ✨ TYMM Pedagoji Eşleştirmesi:
                    </span>
                    <span style={{ fontSize: "0.72rem", background: "#10b981", color: "#ffffff", padding: "2px 8px", borderRadius: "10px", fontWeight: 800 }}>
                      {aiResult.dimensionLabel}
                    </span>
                  </div>

                  <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginBottom: "8px" }}>
                    {aiResult.domainCodes.map((c, i) => (
                      <span key={i} style={{ background: "#e0f2fe", color: "#0369a1", fontSize: "0.74rem", fontWeight: 700, padding: "2px 8px", borderRadius: "6px" }}>
                        {c}
                      </span>
                    ))}
                    {aiResult.valueCodes.map((v, i) => (
                      <span key={i} style={{ background: "#fef3c7", color: "#92400e", fontSize: "0.74rem", fontWeight: 700, padding: "2px 8px", borderRadius: "6px" }}>
                        {v}
                      </span>
                    ))}
                    {aiResult.tendencyCodes.map((t, i) => (
                      <span key={i} style={{ background: "#f3e8ff", color: "#6b21a8", fontSize: "0.74rem", fontWeight: 700, padding: "2px 8px", borderRadius: "6px" }}>
                        {t}
                      </span>
                    ))}
                  </div>

                  <div style={{ marginTop: "6px", fontSize: "0.82rem", color: "#334155" }}>
                    <strong>Gözlemcinin Genel Değerlendirmesi:</strong>
                    <p style={{ margin: "4px 0 0 0", color: "#0f172a", lineHeight: "1.4" }}>
                      {aiResult.pedagogicalInterpretation}
                    </p>
                  </div>
                </div>
              ) : (
                <div style={{ background: "#f8fafc", border: "1px dashed #cbd5e1", borderRadius: "8px", padding: "16px", textAlign: "center", color: "#94a3b8", fontSize: "0.82rem", marginTop: "12px" }}>
                  "AI ile Analiz Et" butonuna basıldığında TYMM Alan Becerisi, Erdem ve Öğretmen Yorumu otomatik doldurulacaktır.
                </div>
              )}
            </div>

            {/* Alt İmzalar */}
            <div style={{ marginTop: "24px", paddingTop: "14px", borderTop: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", fontSize: "0.75rem", color: "#64748b" }}>
              <div style={{ textAlign: "center" }}>
                <span>Gözlemci Öğretmen</span>
                <div style={{ height: "24px" }} />
                <span>İmza / Mühür</span>
              </div>
              <div style={{ textAlign: "center" }}>
                <span>Okul Müdürü</span>
                <div style={{ height: "24px" }} />
                <span>Onay</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── GEÇMİŞ GÖZLEMLER VE ANEKDOT LİSTESİ ─── */}
      {activeTab === "history" && (
        <div style={{ background: "#ffffff", borderRadius: "14px", border: "1px solid #e2e8f0", padding: "24px", boxShadow: "0 4px 16px rgba(0,0,0,0.04)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", flexWrap: "wrap", gap: "10px" }}>
            <h3 style={{ margin: 0, fontSize: "1.15rem", fontWeight: 800, color: "#0f172a" }}>
              Kayıtlı MEB EK-2 Anekdot Arşivi ({observations.length} Kayıt)
            </h3>
            <span style={{ fontSize: "0.78rem", color: "#64748b" }}>
              Tüm kayıtlar cihazınızda güvenle saklanmaktadır.
            </span>
          </div>

          {observations.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px", color: "#94a3b8" }}>
              <p style={{ fontSize: "1rem", margin: 0 }}>Henüz kayıtlı bir gözlem bulunmamaktadır.</p>
              <button
                type="button"
                onClick={() => setActiveTab("new_form")}
                style={{ marginTop: "12px", background: "#0284c7", color: "#ffffff", border: "none", padding: "8px 16px", borderRadius: "6px", fontWeight: 700, cursor: "pointer" }}
              >
                İlk Gözlemi Kaydet
              </button>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              {observations.map((rec) => (
                <div
                  key={rec.id}
                  style={{
                    border: "1px solid #e2e8f0",
                    borderRadius: "10px",
                    padding: "16px",
                    background: "#f8fafc",
                    display: "flex",
                    flexDirection: "column",
                    gap: "10px",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "10px" }}>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <strong style={{ fontSize: "1rem", color: "#0f172a" }}>{rec.studentName}</strong>
                        <span style={{ background: "#e0f2fe", color: "#0369a1", fontSize: "0.74rem", fontWeight: 700, padding: "2px 8px", borderRadius: "10px" }}>
                          {rec.learningCenter}
                        </span>
                        <span style={{ fontSize: "0.76rem", color: "#64748b" }}>
                          {rec.civilDate} {rec.time}
                        </span>
                      </div>
                      <p style={{ margin: "6px 0 0 0", fontSize: "0.85rem", color: "#334155" }}>
                        "{rec.rawText}"
                      </p>
                      {rec.childQuote && (
                        <p style={{ margin: "2px 0 0 0", fontSize: "0.8rem", color: "#0284c7" }}>
                          🗣️ "{rec.childQuote}"
                        </p>
                      )}
                    </div>

                    <div style={{ display: "flex", gap: "8px" }}>
                      <button
                        type="button"
                        onClick={() => handleShareWhatsApp(rec)}
                        style={{
                          background: "#25d366",
                          color: "#ffffff",
                          border: "none",
                          borderRadius: "6px",
                          padding: "6px 12px",
                          fontSize: "0.75rem",
                          fontWeight: 700,
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          gap: "4px",
                        }}
                      >
                        💬 Veli WhatsApp
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setSelectedRecordForPrint(rec);
                          setTimeout(() => window.print(), 200);
                        }}
                        style={{
                          background: "#0284c7",
                          color: "#ffffff",
                          border: "none",
                          borderRadius: "6px",
                          padding: "6px 12px",
                          fontSize: "0.75rem",
                          fontWeight: 700,
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          gap: "4px",
                        }}
                      >
                        🖨️ A4 Yazdır
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          if (confirm(`"${rec.studentName}" isimli gözlemi silmek istiyor musunuz?`)) {
                            const filtered = observations.filter((o) => o.id !== rec.id);
                            setObservations(filtered);
                            localStorage.setItem("maarif_persisted_ai_observations", JSON.stringify(filtered));
                          }
                        }}
                        style={{
                          background: "transparent",
                          color: "#ef4444",
                          border: "1px solid #fecaca",
                          borderRadius: "6px",
                          padding: "6px 10px",
                          fontSize: "0.75rem",
                          fontWeight: 700,
                          cursor: "pointer",
                        }}
                      >
                        Sil
                      </button>
                    </div>
                  </div>

                  {/* Etiketler */}
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", borderTop: "1px solid #e2e8f0", paddingTop: "8px" }}>
                    <span style={{ fontSize: "0.72rem", background: "#f1f5f9", padding: "2px 6px", borderRadius: "4px", fontWeight: 700 }}>
                      Boyut: {rec.classification.dimensionLabel}
                    </span>
                    {rec.classification.valueCodes.map((v, i) => (
                      <span key={i} style={{ fontSize: "0.72rem", background: "#fef3c7", color: "#92400e", padding: "2px 6px", borderRadius: "4px", fontWeight: 700 }}>
                        {v}
                      </span>
                    ))}
                    {rec.classification.domainCodes.map((d, i) => (
                      <span key={i} style={{ fontSize: "0.72rem", background: "#ecfdf5", color: "#065f46", padding: "2px 6px", borderRadius: "4px", fontWeight: 700 }}>
                        {d}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ─── YALNIZCA BASKI ANINDA GÖRÜNEN RESMÎ A4 EK-2 DOKÜMANI ─── */}
      {selectedRecordForPrint && (
        <div
          className="print-only-a4"
          style={{
            display: "none",
            background: "#ffffff",
            color: "#000000",
            padding: "20mm",
            fontFamily: "serif",
          }}
        >
          <div style={{ textAlign: "center", borderBottom: "2px solid #000", paddingBottom: "12px", marginBottom: "16px" }}>
            <h4 style={{ margin: 0, fontSize: "14pt" }}>T.C. MİLLÎ EĞİTİM BAKANLIĞI</h4>
            <h5 style={{ margin: "4px 0", fontSize: "12pt" }}>TEMEL EĞİTİM GENEL MÜDÜRLÜĞÜ</h5>
            <h3 style={{ margin: "8px 0 4px 0", fontSize: "16pt", fontWeight: "bold" }}>
              EK-2 ANEKDOT (VAKA) KAYIT FORMU
            </h3>
            <span style={{ fontSize: "10pt" }}>TYMM 2026 Okul Öncesi Eğitim Programı</span>
          </div>

          <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "20px" }}>
            <tbody>
              <tr>
                <td style={{ border: "1px solid #000", padding: "8px", fontWeight: "bold", width: "25%" }}>Öğrencinin Adı Soyadı:</td>
                <td style={{ border: "1px solid #000", padding: "8px", width: "25%" }}>{selectedRecordForPrint.studentName}</td>
                <td style={{ border: "1px solid #000", padding: "8px", fontWeight: "bold", width: "25%" }}>Gözlem Tarihi &amp; Saati:</td>
                <td style={{ border: "1px solid #000", padding: "8px", width: "25%" }}>{selectedRecordForPrint.civilDate} {selectedRecordForPrint.time}</td>
              </tr>
              <tr>
                <td style={{ border: "1px solid #000", padding: "8px", fontWeight: "bold" }}>Gözlenen Mekân / Merkez:</td>
                <td style={{ border: "1px solid #000", padding: "8px" }} colSpan={3}>{selectedRecordForPrint.learningCenter}</td>
              </tr>
              <tr>
                <td style={{ border: "1px solid #000", padding: "8px", fontWeight: "bold" }}>Gözlenen Durum:</td>
                <td style={{ border: "1px solid #000", padding: "8px" }} colSpan={3}>
                  <p style={{ margin: 0 }}>{selectedRecordForPrint.rawText}</p>
                  {selectedRecordForPrint.childQuote && (
                    <p style={{ margin: "8px 0 0 0", fontStyle: "italic" }}>Çocuğun Sözü: "{selectedRecordForPrint.childQuote}"</p>
                  )}
                </td>
              </tr>
              <tr>
                <td style={{ border: "1px solid #000", padding: "8px", fontWeight: "bold" }}>Gözlemcinin Genel Değerlendirmesi:</td>
                <td style={{ border: "1px solid #000", padding: "8px" }} colSpan={3}>
                  <p style={{ margin: 0 }}>{selectedRecordForPrint.classification.pedagogicalInterpretation}</p>
                  <p style={{ margin: "6px 0 0 0", fontSize: "9pt" }}>
                    <strong>İlişkili TYMM Kazanımları:</strong> {selectedRecordForPrint.classification.domainCodes.join(", ")} · {selectedRecordForPrint.classification.valueCodes.join(", ")}
                  </p>
                </td>
              </tr>
            </tbody>
          </table>

          <div style={{ display: "flex", justifyContent: "space-between", marginTop: "40px" }}>
            <div style={{ textAlign: "center", width: "200px" }}>
              <p style={{ margin: 0, fontWeight: "bold" }}>Gözlemci Öğretmen</p>
              <div style={{ height: "50px" }} />
              <p style={{ margin: 0 }}>İmza</p>
            </div>
            <div style={{ textAlign: "center", width: "200px" }}>
              <p style={{ margin: 0, fontWeight: "bold" }}>Okul Müdürü</p>
              <div style={{ height: "50px" }} />
              <p style={{ margin: 0 }}>Onay / Mühür</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
