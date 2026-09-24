/**
 * MaarifPaywallModal.tsx — MaarifOS 0.73.0
 * Canlı Demo İnceleme Bilgilendirme Modalı (MaarifOS Canlı Tanıtım Sürümü)
 * 
 * Amaç:
 * 1. Ziyaretçilerin sistemi serbestçe incelemesini ("karıştırmasını") sağlamak.
 * 2. İndirme, A4 baskı ve dışa aktarma denendiğinde şık ve kurumsal bir demo bilgilendirmesi sunmak.
 * 3. Çok yakında online ödeme altyapısı (kredi kartı / taksit) ile tam sürümün satışa çıkacağını bildirmek.
 * 4. Kesinlikle hiçbir kişisel bilgi, şahsi IBAN veya telefon numarası içermemek.
 */

import React, { useState, useEffect } from "react";
import {
  getCommercialLicenseStatus,
  activateLicense,
  type CommercialLicenseInfo,
} from "./commercial-license.ts";
import {
  SparklesIcon,
  CheckIcon,
  CheckCircleIcon,
  LockIcon,
  ShieldCheckIcon,
  TerminalIcon,
  InfoIcon,
} from "../../components/MaarifIcons.tsx";
import "./commercial.css";

export interface MaarifPaywallModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentPlanCount?: number;
  triggerReason?: string;
  onSuccessActivation?: () => void;
}

export function MaarifPaywallModal({
  isOpen,
  onClose,
  currentPlanCount = 0,
  triggerReason,
  onSuccessActivation,
}: MaarifPaywallModalProps) {
  const [licenseInfo, setLicenseInfo] = useState<CommercialLicenseInfo>(() =>
    getCommercialLicenseStatus(currentPlanCount)
  );
  const [showKeyForm, setShowKeyForm] = useState(false);
  const [inputKey, setInputKey] = useState("");
  const [ownerInput, setOwnerInput] = useState("");
  const [activationFeedback, setActivationFeedback] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  useEffect(() => {
    setLicenseInfo(getCommercialLicenseStatus(currentPlanCount));
  }, [currentPlanCount, isOpen]);

  if (!isOpen) return null;

  const handleActivate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputKey.trim()) return;

    const result = activateLicense(inputKey, ownerInput || "Değerli Öğretmenimiz");
    setActivationFeedback(result);

    if (result.success) {
      setLicenseInfo(getCommercialLicenseStatus(currentPlanCount));
      setTimeout(() => {
        if (onSuccessActivation) onSuccessActivation();
        onClose();
      }, 1200);
    }
  };

  return (
    <div className="maarif-paywall-backdrop" onClick={onClose}>
      <div className="maarif-paywall-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "680px" }}>
        {/* ─── BAŞLIK ─── */}
        <div className="maarif-paywall-header" style={{ paddingBottom: "16px" }}>
          <div>
            <div className="maarif-paywall-badge-row">
              <span className="maarif-badge-tag maarif-badge-gold">
                <TerminalIcon size={12} /> CANLI DEMO MODU
              </span>
              <span className="maarif-badge-tag maarif-badge-emerald">
                <ShieldCheckIcon size={12} /> T.C. MEB TYMM 2026 UYUMLU
              </span>
            </div>
            <h2 className="maarif-paywall-title" style={{ fontSize: "1.4rem", marginTop: "8px" }}>
              MaarifOS Canlı Demo İnceleme Sürümü
            </h2>
            <p className="maarif-paywall-subtitle">
              {triggerReason ||
                "Sistemi, 528 ders kitabı etkinliğini ve resmî planlayıcıyı serbestçe deneyimleyebilirsiniz. İndirme ve resmî çıktılar yakında online ödeme ile satışa açılacaktır."}
            </p>
          </div>
          <button
            type="button"
            className="maarif-paywall-close-btn"
            onClick={onClose}
            title="Kapat"
          >
            ✕
          </button>
        </div>

        {/* ─── BİLGİLENDİRME ÇAĞRISI ─── */}
        <div
          style={{
            background: "rgba(14, 165, 233, 0.08)",
            border: "1px solid rgba(56, 189, 248, 0.3)",
            borderRadius: "12px",
            padding: "16px",
            marginBottom: "20px",
          }}
        >
          <div style={{ display: "flex", gap: "12px", alignItems: "flex-start" }}>
            <span style={{ color: "#38bdf8", marginTop: "2px" }}>
              <InfoIcon size={24} />
            </span>
            <div style={{ fontSize: "0.85rem", color: "#cbd5e1", lineHeight: 1.6 }}>
              <strong style={{ color: "#38bdf8", display: "block", fontSize: "0.95rem", marginBottom: "4px" }}>
                Değerli Okul Öncesi Öğretmenimiz,
              </strong>
              Şu anda MaarifOS'un canlı tanıtım demosunu inceliyorsunuz. Sistemi dilediğiniz gibi "karıştırabilir", 528 MEB etkinliğini arayabilir ve adım adım planlayıcıyı test edebilirsiniz.
              Resmî A4 çıktısı alma, filigransız Word (.docx) ve PDF indirme özellikleri; <strong>çok yakında eklenecek olan resmî online ödeme altyapımız (kredi kartı / taksit imkanı)</strong> ile birlikte tam sürümde satışa sunulacaktır.
            </div>
          </div>
        </div>

        {/* ─── ÖZELLİK MATRİSİ KARŞILAŞTIRMASI ─── */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "24px" }}>
          {/* Canlı Demoda Açık Olanlar */}
          <div
            style={{
              background: "#0f172a",
              border: "1px solid #1e293b",
              borderRadius: "12px",
              padding: "16px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
              <span style={{ color: "#10b981", display: "flex" }}>
                <CheckCircleIcon size={16} />
              </span>
              <strong style={{ color: "#ffffff", fontSize: "0.88rem" }}>Canlı Demoda Açık Olanlar</strong>
            </div>
            <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "8px", fontSize: "0.8rem", color: "#94a3b8" }}>
              <li style={{ display: "flex", gap: "8px" }}>
                <span style={{ color: "#10b981" }}><CheckIcon size={14} /></span> 528 MEB Ders Kitabı Etkinliği İnceleme
              </li>
              <li style={{ display: "flex", gap: "8px" }}>
                <span style={{ color: "#10b981" }}><CheckIcon size={14} /></span> Adım Adım Resmî Günlük Planlayıcı
              </li>
              <li style={{ display: "flex", gap: "8px" }}>
                <span style={{ color: "#10b981" }}><CheckIcon size={14} /></span> MEB Müfredat &amp; Beceri Portalı Grafikleri
              </li>
              <li style={{ display: "flex", gap: "8px" }}>
                <span style={{ color: "#10b981" }}><CheckIcon size={14} /></span> 9 Merkez, 240+ Materyal &amp; 180+ Kavram
              </li>
              <li style={{ display: "flex", gap: "8px" }}>
                <span style={{ color: "#10b981" }}><CheckIcon size={14} /></span> EK-15 ve EK-5 Müfredat Matrisleri
              </li>
            </ul>
          </div>

          {/* Tam Sürümde Açılacaklar */}
          <div
            style={{
              background: "#0f172a",
              border: "1px solid #1e293b",
              borderRadius: "12px",
              padding: "16px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
              <span style={{ color: "#f59e0b", display: "flex" }}>
                <LockIcon size={16} />
              </span>
              <strong style={{ color: "#ffffff", fontSize: "0.88rem" }}>Tam Sürümde Açılacaklar (Yakında)</strong>
            </div>
            <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "8px", fontSize: "0.8rem", color: "#94a3b8" }}>
              <li style={{ display: "flex", gap: "8px" }}>
                <span style={{ color: "#f59e0b" }}><LockIcon size={14} /></span> Resmî MEB Antetli A4 Fiziksel Baskı
              </li>
              <li style={{ display: "flex", gap: "8px" }}>
                <span style={{ color: "#f59e0b" }}><LockIcon size={14} /></span> Düzenlenebilir Microsoft Word (.docx) İndirme
              </li>
              <li style={{ display: "flex", gap: "8px" }}>
                <span style={{ color: "#f59e0b" }}><LockIcon size={14} /></span> Standart A4 PDF Dosyası İndirme
              </li>
              <li style={{ display: "flex", gap: "8px" }}>
                <span style={{ color: "#f59e0b" }}><LockIcon size={14} /></span> 32 Evraklı Maarif Müfettişliği Teftiş Dosyası
              </li>
              <li style={{ display: "flex", gap: "8px" }}>
                <span style={{ color: "#f59e0b" }}><LockIcon size={14} /></span> e-Okul Uyumlu Süreç Beceri Raporları
              </li>
            </ul>
          </div>
        </div>

        {/* ─── ANA AKSİYON BUTONLARI ─── */}
        <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end", alignItems: "center", borderTop: "1px solid #1e293b", paddingTop: "16px" }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: "linear-gradient(135deg, #0284c7, #0d9488)",
              color: "#ffffff",
              border: "none",
              padding: "12px 24px",
              borderRadius: "10px",
              fontWeight: 800,
              fontSize: "0.9rem",
              cursor: "pointer",
              boxShadow: "0 4px 16px rgba(2, 132, 199, 0.4)",
              transition: "transform 0.15s",
            }}
          >
            🚀 İncelemeye Devam Et
          </button>
        </div>

        {/* ─── TAM SÜRÜM AKTİVASYON KODU GİRİŞ ALANI (PRO-PIN) ─── */}
        <div style={{ marginTop: "20px", padding: "16px", background: "rgba(15, 23, 42, 0.9)", border: "1px solid rgba(56, 189, 248, 0.3)", borderRadius: "12px", textAlign: "left" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "10px" }}>
            <span style={{ color: "#38bdf8", fontSize: "1.1rem" }}>🔑</span>
            <strong style={{ color: "#ffffff", fontSize: "0.92rem" }}>Tam Sürüm Aktivasyon Kodu</strong>
            <small style={{ color: "#94a3b8", fontSize: "0.74rem", marginLeft: "auto" }}>Yalnızca Yetkili Kullanıcılar</small>
          </div>
          <form onSubmit={handleActivate} style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            <div style={{ display: "flex", gap: "10px" }}>
              <input
                type="text"
                placeholder="6 Haneli Aktivasyon Kodu (PIN)"
                value={inputKey}
                onChange={(e) => setInputKey(e.target.value)}
                style={{
                  flex: 1,
                  padding: "10px 14px",
                  borderRadius: "8px",
                  border: "1px solid rgba(56, 189, 248, 0.4)",
                  background: "#070d18",
                  color: "#38bdf8",
                  fontSize: "1rem",
                  fontFamily: "monospace",
                  letterSpacing: "2px",
                  fontWeight: "bold",
                }}
                autoFocus
              />
              <button
                type="submit"
                style={{
                  padding: "10px 24px",
                  borderRadius: "8px",
                  border: "none",
                  background: "linear-gradient(135deg, #059669, #10b981)",
                  color: "#ffffff",
                  fontWeight: 800,
                  fontSize: "0.9rem",
                  cursor: "pointer",
                  boxShadow: "0 2px 10px rgba(16, 185, 129, 0.4)",
                  whiteSpace: "nowrap",
                }}
              >
                Tam Sürümü Aç
              </button>
            </div>
            {activationFeedback && (
              <div
                style={{
                  padding: "8px 12px",
                  borderRadius: "6px",
                  fontSize: "0.82rem",
                  fontWeight: 600,
                  background: activationFeedback.success ? "rgba(16, 185, 129, 0.15)" : "rgba(239, 68, 68, 0.15)",
                  border: `1px solid ${activationFeedback.success ? "rgba(16, 185, 129, 0.4)" : "rgba(239, 68, 68, 0.4)"}`,
                  color: activationFeedback.success ? "#34d399" : "#f87171",
                }}
              >
                {activationFeedback.message}
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}

export const MaarifDemoModal = MaarifPaywallModal;
