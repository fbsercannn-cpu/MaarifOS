/**
 * PwaInstallPromptModal.tsx — MaarifOS Doğrudan Uygulama Olarak Telefona Yükleme Masası
 * 
 * Android WebAPK ve iOS PWA kurulumunu tek dokunuşla başlatan,
 * kullanıcıya adım adım rehberlik eden yüksek çözünürlüklü modal.
 */

import React, { useState, useEffect } from "react";

interface PwaInstallPromptModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function PwaInstallPromptModal({ isOpen, onClose }: PwaInstallPromptModalProps) {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    // Zaten standalone (uygulama) modunda mı açıldı?
    if (typeof window !== "undefined") {
      const isStandalone =
        window.matchMedia("(display-mode: standalone)").matches ||
        (window.navigator as any).standalone === true;
      setIsInstalled(isStandalone);
    }

    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstall);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  if (!isOpen) return null;

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === "accepted") {
        setIsInstalled(true);
      }
      setDeferredPrompt(null);
    }
  };

  const copyUrl = () => {
    const url = typeof window !== "undefined"
      ? (window.location.origin + (window.location.pathname.endsWith("/") ? window.location.pathname : window.location.pathname + "/"))
      : "https://fbsercannn-cpu.github.io/maarif/";
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    }
  };

  const isIOS = typeof navigator !== "undefined" && /iphone|ipad|ipod/i.test(navigator.userAgent);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(4, 8, 16, 0.85)",
        backdropFilter: "blur(14px)",
        WebkitBackdropFilter: "blur(14px)",
        zIndex: 999999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px",
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: "#090f1d",
          border: "1px solid rgba(56, 189, 248, 0.3)",
          boxShadow: "0 25px 60px -15px rgba(0, 0, 0, 0.85), 0 0 35px rgba(14, 165, 233, 0.2)",
          borderRadius: "18px",
          width: "100%",
          maxWidth: "520px",
          color: "#f1f5f9",
          padding: "24px",
          fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Başlık */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div
              style={{
                width: "42px",
                height: "42px",
                borderRadius: "12px",
                background: "linear-gradient(135deg, #0284c7, #10b981)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "1.4rem",
              }}
            >
              📲
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: "1.08rem", fontWeight: 700, color: "#ffffff" }}>
                MaarifOS Uygulaması Olarak Yükle
              </h3>
              <p style={{ margin: "2px 0 0 0", fontSize: "0.78rem", color: "#94a3b8" }}>
                Tarayıcı çubuğu olmadan saf mobil tam ekran deneyimi
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: "rgba(255,255,255,0.08)",
              border: "none",
              color: "#cbd5e1",
              width: "30px",
              height: "30px",
              borderRadius: "50%",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            ✕
          </button>
        </div>

        {/* Durum: Zaten Yüklü mü? */}
        {isInstalled ? (
          <div
            style={{
              background: "rgba(16, 185, 129, 0.15)",
              border: "1px solid rgba(16, 185, 129, 0.4)",
              borderRadius: "10px",
              padding: "16px",
              textAlign: "center",
              marginBottom: "16px",
            }}
          >
            <div style={{ fontSize: "1.8rem", marginBottom: "4px" }}>✅</div>
            <strong style={{ color: "#34d399", display: "block", fontSize: "0.95rem" }}>
              MaarifOS Bu Cihazda Uygulama Olarak Çalışıyor
            </strong>
            <p style={{ margin: "4px 0 0 0", fontSize: "0.8rem", color: "#cbd5e1" }}>
              Tüm çevrim dışı çalışma ve hızlı erişim özellikleri etkindir.
            </p>
          </div>
        ) : (
          <div>
            {/* Tek Dokunuşla Kur Butonu (Android WebAPK Hazırsa) */}
            {deferredPrompt ? (
              <button
                type="button"
                onClick={handleInstallClick}
                style={{
                  width: "100%",
                  padding: "14px 20px",
                  borderRadius: "10px",
                  border: "none",
                  background: "linear-gradient(135deg, #0284c7 0%, #0369a1 100%)",
                  color: "#ffffff",
                  fontSize: "0.95rem",
                  fontWeight: 700,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "10px",
                  boxShadow: "0 4px 16px rgba(2, 132, 199, 0.4)",
                  marginBottom: "16px",
                }}
              >
                <span>📲 Şimdi Telefona Yükle (Tek Dokunuş)</span>
              </button>
            ) : null}

            {/* Adım Adım Kurulum Rehberi */}
            <div
              style={{
                background: "rgba(255, 255, 255, 0.03)",
                border: "1px solid rgba(255, 255, 255, 0.08)",
                borderRadius: "12px",
                padding: "16px",
                marginBottom: "16px",
              }}
            >
              <strong style={{ color: "#38bdf8", fontSize: "0.86rem", display: "block", marginBottom: "10px" }}>
                {isIOS ? "🍎 iPhone / iPad Safari İçin Kurulum:" : "🤖 Android Chrome / Tarayıcı İçin Kurulum:"}
              </strong>

              {isIOS ? (
                <ol style={{ margin: 0, paddingLeft: "20px", fontSize: "0.82rem", color: "#cbd5e1", lineHeight: 1.6 }}>
                  <li>Safari'nin altındaki <strong>Paylaş (kare ve yukarı ok)</strong> simgesine dokunun.</li>
                  <li>Açılan menüde aşağı kaydırıp <strong>"Ana Ekrana Ekle"</strong> seçeneğine dokunun.</li>
                  <li>Sağ üstteki <strong>"Ekle"</strong> butonuna basın; MaarifOS ana ekranınıza uygulama olarak yerleşir.</li>
                </ol>
              ) : (
                <ol style={{ margin: 0, paddingLeft: "20px", fontSize: "0.82rem", color: "#cbd5e1", lineHeight: 1.6 }}>
                  <li>Chrome'da sağ üstteki <strong>üç nokta (⋮)</strong> menüsüne dokunun.</li>
                  <li>Listeden <strong>"Uygulamayı yükle"</strong> veya <strong>"Ana ekrana ekle"</strong> seçeneğine basın.</li>
                  <li>Android, MaarifOS'u doğrudan telefonunuzun uygulamalar listesine tam bir uygulama (APK) olarak kuracaktır.</li>
                </ol>
              )}
            </div>
          </div>
        )}

        {/* Doğrudan Link Kutusu */}
        <div
          style={{
            background: "rgba(0, 0, 0, 0.4)",
            border: "1px solid rgba(255, 255, 255, 0.1)",
            borderRadius: "10px",
            padding: "10px 14px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "10px",
          }}
        >
          <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: "0.78rem", color: "#94a3b8" }}>
            <code>https://fbsercannn-cpu.github.io/maarif/index.html</code>
          </div>
          <button
            type="button"
            onClick={copyUrl}
            style={{
              padding: "6px 12px",
              borderRadius: "6px",
              border: "1px solid rgba(56, 189, 248, 0.3)",
              background: copied ? "#059669" : "rgba(56, 189, 248, 0.15)",
              color: copied ? "#ffffff" : "#38bdf8",
              fontSize: "0.75rem",
              fontWeight: 700,
              cursor: "pointer",
              whiteSpace: "nowrap",
            }}
          >
            {copied ? "✓ Kopyalandı" : "📋 Linki Kopyala"}
          </button>
        </div>
      </div>
    </div>
  );
}
