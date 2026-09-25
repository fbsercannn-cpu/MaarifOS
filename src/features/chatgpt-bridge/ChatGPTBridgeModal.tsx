/**
 * ChatGPTBridgeModal.tsx — MaarifOS v0.75.3 ChatGPT Veri Köprüsü
 * 
 * Telefondaki ChatGPT uygulamasından ve harici depolamalardan
 * tek tıkla veri çekme, panoyu okuma ve MEB TYMM EK-6 formatına aktarma masası.
 */

import React, { useState, useEffect, useRef } from "react";
import {
  type ParsedPlanCandidate,
  parseChatGPTTextToPlan,
  parseChatGPTExportJSON,
  commitCandidateToMaarifOS,
  commitMultipleCandidatesToMaarifOS,
} from "./chatgpt-data-bridge.ts";
import "./chatgpt-bridge.css";

interface ChatGPTBridgeModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialSharedText?: string;
}

export function ChatGPTBridgeModal({
  isOpen,
  onClose,
  initialSharedText,
}: ChatGPTBridgeModalProps) {
  const [activeTab, setActiveTab] = useState<"clipboard" | "file" | "guide">("clipboard");
  const [inputText, setInputText] = useState("");
  const [candidate, setCandidate] = useState<ParsedPlanCandidate | null>(null);
  const [bulkCandidates, setBulkCandidates] = useState<ParsedPlanCandidate[]>([]);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    window.setTimeout(() => setToastMessage(null), 4000);
  };

  // Eğer Android Share Target veya URL üzerinden bir metin aktarıldıysa otomatik işle
  useEffect(() => {
    if (initialSharedText && initialSharedText.trim().length > 0) {
      setInputText(initialSharedText);
      const parsed = parseChatGPTTextToPlan(initialSharedText, "share_target");
      setCandidate(parsed);
      setActiveTab("clipboard");
      showToast("📲 Telefondan paylaşılan ChatGPT verisi otomatik algılandı!");
    }
  }, [initialSharedText]);

  if (!isOpen) return null;

  // Panodan Tek Dokunuşla Oku
  const handleReadClipboard = async () => {
    try {
      if (!navigator.clipboard || !navigator.clipboard.readText) {
        showToast("⚠️ Tarayıcınız doğrudan pano okuma iznini kısıtlıyor. Lütfen metni aşağıdaki kutuya yapıştırın.");
        return;
      }
      const text = await navigator.clipboard.readText();
      if (!text || text.trim().length === 0) {
        showToast("ℹ️ Panonuzda kopyalanmış bir metin bulunamadı. ChatGPT uygulamasında 'Kopyala' yapıp tekrar deneyin.");
        return;
      }
      setInputText(text);
      const parsed = parseChatGPTTextToPlan(text, "clipboard");
      setCandidate(parsed);
      showToast(`⚡ ChatGPT metni çözümlendi: "${parsed.topic}"`);
    } catch (err) {
      console.warn("Clipboard access denied:", err);
      showToast("⚠️ Pano erişim izni verilmedi. Metni aşağıdaki kutuya uzun basarak yapıştırabilirsiniz.");
    }
  };

  // Kutudaki Metni Manuel Ayrıştır
  const handleParseInputText = () => {
    if (!inputText.trim()) {
      showToast("⚠️ Lütfen ayrıştırılacak ChatGPT metnini kutuya yapıştırın.");
      return;
    }
    const parsed = parseChatGPTTextToPlan(inputText, "clipboard");
    setCandidate(parsed);
    showToast(`✅ Ayrıştırma tamamlandı: "${parsed.topic}"`);
  };

  // Ayrıştırılan Tekil Planı MaarifOS'a Mühürle
  const handleSaveCandidate = () => {
    if (!candidate) return;
    const committed = commitCandidateToMaarifOS(candidate);
    showToast(`🪄 "${committed.topic}" resmî Günlük Planlarınıza kaydedildi!`);
    setCandidate(null);
    setInputText("");
    // 1 saniye sonra modalı kapat
    window.setTimeout(() => onClose(), 1200);
  };

  // Dosya Yükleme (conversations.json veya metin)
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      if (!content) return;
      const candidates = parseChatGPTExportJSON(content);
      if (candidates.length === 0) {
        showToast("⚠️ Dosyada okul öncesi / MEB planı tespit edilemedi.");
        return;
      }
      setBulkCandidates(candidates);
      showToast(`📁 Dosyadan ${candidates.length} adet okul öncesi planı başarıyla çıkarıldı!`);
    };
    reader.readAsText(file);
  };

  // Toplu Dosya Adaylarını Kaydet
  const handleSaveAllBulk = () => {
    if (bulkCandidates.length === 0) return;
    const count = commitMultipleCandidatesToMaarifOS(bulkCandidates);
    showToast(`🚀 ${count} adet MEB Günlük Planı başarıyla MaarifOS'a aktarıldı!`);
    setBulkCandidates([]);
    window.setTimeout(() => onClose(), 1200);
  };

  return (
    <div className="cgb-overlay" onClick={onClose}>
      <div className="cgb-modal" onClick={(e) => e.stopPropagation()}>
        {/* Başlık */}
        <div className="cgb-header">
          <div className="cgb-title-group">
            <div className="cgb-icon-badge">📥</div>
            <div className="cgb-title-text">
              <h3>
                <span>ChatGPT Veri Köprüsü</span>
                <span className="cgb-version-pill">v0.75 Otonom</span>
              </h3>
              <p>Telefondaki ChatGPT uygulamasından tek dokunuşla veri aktarın ve MEB formatına dönüştürün.</p>
            </div>
          </div>
          <button type="button" className="cgb-close-btn" onClick={onClose} title="Kapat">
            ✕
          </button>
        </div>

        {/* Sekmeler */}
        <div className="cgb-tabs">
          <button
            type="button"
            className={`cgb-tab-btn ${activeTab === "clipboard" ? "active" : ""}`}
            onClick={() => setActiveTab("clipboard")}
          >
            📋 Panodan Çek
          </button>
          <button
            type="button"
            className={`cgb-tab-btn ${activeTab === "file" ? "active" : ""}`}
            onClick={() => setActiveTab("file")}
          >
            📁 Dosya / Export Yükle
          </button>
          <button
            type="button"
            className={`cgb-tab-btn ${activeTab === "guide" ? "active" : ""}`}
            onClick={() => setActiveTab("guide")}
          >
            📱 Telefondan Nasıl Alınır?
          </button>
        </div>

        {/* Gövde */}
        <div className="cgb-body">
          {toastMessage && <div className="cgb-toast">{toastMessage}</div>}

          {/* 1. SEKME: PANODAN ÇEK */}
          {activeTab === "clipboard" && (
            <div>
              <div className="cgb-action-card">
                <button type="button" className="cgb-hero-pull-btn" onClick={handleReadClipboard}>
                  <span>⚡ Panodan ChatGPT Verisini Doğrudan Çek</span>
                </button>
                <p style={{ margin: "10px 0 6px 0", fontSize: "0.78rem", color: "#94a3b8" }}>
                  💡 ChatGPT uygulamasında ürettiğiniz planı kopyalayıp buraya yapıştırın; Maarif akıllı motoru metni MEB EK-6 formatına otomatik dönüştürür.
                </p>

                <textarea
                  className="cgb-textarea"
                  placeholder="Veya ChatGPT'den kopyaladığınız metni doğrudan buraya yapıştırın..."
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                />

                {inputText && !candidate && (
                  <button
                    type="button"
                    onClick={handleParseInputText}
                    style={{
                      marginTop: "10px",
                      padding: "8px 16px",
                      background: "rgba(56, 189, 248, 0.2)",
                      border: "1px solid rgba(56, 189, 248, 0.4)",
                      color: "#38bdf8",
                      borderRadius: "6px",
                      cursor: "pointer",
                      fontWeight: 600,
                      fontSize: "0.82rem",
                    }}
                  >
                    🔍 Metni MEB TYMM Standardında Çözümle
                  </button>
                )}
              </div>

              {/* Ayrıştırılan Plan Önizleme Kartı */}
              {candidate && (
                <div className="cgb-preview-box">
                  <div className="cgb-preview-header">
                    <div>
                      <span style={{ fontSize: "0.7rem", color: "#10b981", fontWeight: 700, textTransform: "uppercase" }}>
                        ✨ Algılanan MEB Günlük Planı
                      </span>
                      <div className="cgb-preview-title">{candidate.topic}</div>
                    </div>
                    <span className="cgb-pill age">{candidate.ageGroup} Ay</span>
                  </div>

                  <div className="cgb-tags-row">
                    <span className="cgb-pill">📅 {candidate.date}</span>
                    {candidate.domainCodes.map((d) => (
                      <span key={d} className="cgb-pill code">
                        {d}
                      </span>
                    ))}
                    {candidate.selectedCenters.slice(0, 3).map((c) => (
                      <span key={c} className="cgb-pill">
                        🏛️ {c}
                      </span>
                    ))}
                  </div>

                  <p style={{ fontSize: "0.8rem", color: "#cbd5e1", margin: "8px 0", lineHeight: 1.4 }}>
                    <strong>Merak Sorusu:</strong> {candidate.researchQuestion}
                  </p>

                  <p style={{ fontSize: "0.78rem", color: "#94a3b8", margin: "6px 0" }}>
                    <strong>Materyaller:</strong> {candidate.materialLabels.join(", ") || "Belirtilmemiş"}
                  </p>

                  <div style={{ marginTop: "14px" }}>
                    <button type="button" className="cgb-save-btn" onClick={handleSaveCandidate}>
                      <span>🪄 MaarifOS Günlük Planlarıma Aktar ve Kaydet</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 2. SEKME: DOSYA / EXPORT YÜKLE */}
          {activeTab === "file" && (
            <div>
              <div
                className="cgb-dropzone"
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  accept=".json,.txt,.md"
                  style={{ display: "none" }}
                  onChange={handleFileUpload}
                />
                <div style={{ fontSize: "2.4rem", marginBottom: "8px" }}>📂</div>
                <strong style={{ display: "block", fontSize: "0.95rem", color: "#ffffff", marginBottom: "4px" }}>
                  ChatGPT Dışa Aktarım Dosyasını (.json / .txt) Seçin
                </strong>
                <p style={{ margin: 0, fontSize: "0.78rem", color: "#94a3b8" }}>
                  ChatGPT Ayarlar &gt; Veri Kontrolleri &gt; Verileri Dışa Aktar ile inen <code>conversations.json</code> dosyasını buraya yükleyin.
                </p>
              </div>

              {bulkCandidates.length > 0 && (
                <div style={{ marginTop: "16px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                    <strong style={{ color: "#34d399", fontSize: "0.9rem" }}>
                      ✅ {bulkCandidates.length} Adet MEB Planı Tespit Edildi
                    </strong>
                    <button
                      type="button"
                      onClick={handleSaveAllBulk}
                      style={{
                        padding: "8px 16px",
                        background: "#059669",
                        color: "#fff",
                        border: "none",
                        borderRadius: "6px",
                        fontWeight: 700,
                        fontSize: "0.82rem",
                        cursor: "pointer",
                      }}
                    >
                      🚀 Tümünü MaarifOS'a Aktar
                    </button>
                  </div>

                  <div style={{ maxHeight: "240px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "8px" }}>
                    {bulkCandidates.map((c, i) => (
                      <div
                        key={c.id}
                        style={{
                          background: "rgba(255,255,255,0.03)",
                          border: "1px solid rgba(255,255,255,0.08)",
                          padding: "10px 14px",
                          borderRadius: "8px",
                          fontSize: "0.8rem",
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                        }}
                      >
                        <div>
                          <strong style={{ color: "#ffffff" }}>{i + 1}. {c.topic}</strong>
                          <div style={{ color: "#94a3b8", fontSize: "0.74rem" }}>
                            {c.ageGroup} Ay · {c.domainCodes.join(", ")}
                          </div>
                        </div>
                        <span className="cgb-pill age">{c.date}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 3. SEKME: TELEFONDAN NASIL VERİ ALINIR? */}
          {activeTab === "guide" && (
            <div className="cgb-guide-container">
              <ul className="cgb-guide-steps">
                <li className="cgb-step-item">
                  <span className="cgb-step-number">1</span>
                  <div className="cgb-step-content">
                    <strong>Android Paylaşım Menüsü (En Hızlı Yöntem)</strong>
                    <p>
                      Telefondaki ChatGPT uygulamasında oluşturduğunuz planın altındaki <strong>Paylaş (Share)</strong> düğmesine dokunun. Açılan paylaşım listesinde <strong>MaarifOS</strong> uygulamasını seçin. Sistem planı otomatik algılar ve hafızaya alır.
                    </p>
                  </div>
                </li>
                <li className="cgb-step-item">
                  <span className="cgb-step-number">2</span>
                  <div className="cgb-step-content">
                    <strong>Kopyala &amp; Panodan Tek Dokunuşla Çek</strong>
                    <p>
                      ChatGPT uygulamasında yanıtın altındaki kopyala simgesine dokunun. Ardından MaarifOS'a gelip <strong>"Panodan ChatGPT Verisini Doğrudan Çek"</strong> düğmesine bir kez tıklayın.
                    </p>
                  </div>
                </li>
                <li className="cgb-step-item">
                  <span className="cgb-step-number">3</span>
                  <div className="cgb-step-content">
                    <strong>İşletim Sistemi Güvenlik Modeli Bilgilendirmesi</strong>
                    <p>
                      Android ve iOS çekirdek güvenlik kuralları (Sandboxing / Linux UID) gereğince, hiçbir uygulama bir başka uygulamanın özel SQLite/RAM verisini gizlice okuyamaz. Bu sebeple sistem paylaşımı veya kopyalama panosu, yasal ve en güvenli köprüdür.
                    </p>
                  </div>
                </li>
              </ul>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
