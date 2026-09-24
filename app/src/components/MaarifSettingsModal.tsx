import React from "react";
import { CheckCircledIcon, Cross2Icon, GearIcon, LightningBoltIcon, LockClosedIcon } from "@radix-ui/react-icons";

interface MaarifSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenApiConfig: () => void;
  onOpenPaywall?: () => void;
  onLicenseUpdated?: () => void;
}

export function MaarifSettingsModal({ isOpen, onClose, onOpenApiConfig }: MaarifSettingsModalProps) {
  if (!isOpen) return null;

  return (
    <div
      role="presentation"
      style={{ position: "fixed", inset: 0, zIndex: 100000, background: "rgba(7, 13, 24, 0.72)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
      onClick={onClose}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="maarif-settings-title"
        style={{ background: "#fff", borderRadius: 16, width: "100%", maxWidth: 480, boxShadow: "0 20px 45px rgba(0,0,0,.25)", overflow: "hidden", border: "1px solid #e2e8f0" }}
        onClick={(event) => event.stopPropagation()}
      >
        <header style={{ background: "#17332b", color: "#fff", padding: "17px 20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <GearIcon width={20} height={20} />
            <div>
              <h3 id="maarif-settings-title" style={{ margin: 0, fontSize: "1rem", fontWeight: 800 }}>Sistem ve gizlilik ayarları</h3>
              <small style={{ color: "#c5d8cf", fontSize: ".75rem" }}>MaarifOS öğretmen çalışma alanı</small>
            </div>
          </div>
          <button type="button" aria-label="Ayarları kapat" onClick={onClose} style={{ width: 40, height: 40, display: "inline-flex", alignItems: "center", justifyContent: "center", background: "transparent", border: "1px solid rgba(255,255,255,.25)", borderRadius: 10, color: "#fff", cursor: "pointer" }}>
            <Cross2Icon />
          </button>
        </header>

        <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ background: "#f0fdf4", border: "1px solid #bbdfc8", borderRadius: 12, padding: 15, display: "flex", gap: 12 }}>
            <CheckCircledIcon width={22} height={22} style={{ color: "#347a57", flex: "0 0 auto" }} />
            <div>
              <strong style={{ color: "#20563d", fontSize: ".9rem" }}>Tüm temel öğretmen araçları açık</strong>
              <p style={{ margin: "5px 0 0", color: "#587069", fontSize: ".8rem", lineHeight: 1.5 }}>Demo, ücret veya lisans engeli bulunmaz. Planlama, kayıt ve dışa aktarma araçları birlikte kullanılabilir.</p>
            </div>
          </div>

          <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 12, padding: 15, display: "flex", gap: 12 }}>
            <LockClosedIcon width={22} height={22} style={{ color: "#347a57", flex: "0 0 auto" }} />
            <div>
              <strong style={{ color: "#1e293b", fontSize: ".9rem" }}>Önce cihazda saklama</strong>
              <p style={{ margin: "5px 0 0", color: "#64748b", fontSize: ".8rem", lineHeight: 1.5 }}>Sınıf kayıtları varsayılan olarak tarayıcıdaki yerel alanda tutulur. Yedek ve bulut işlemleri kullanıcı eylemiyle başlar.</p>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, padding: "4px 0" }}>
            <div style={{ display: "flex", gap: 10 }}>
              <LightningBoltIcon width={20} height={20} style={{ color: "#347a57", flex: "0 0 auto" }} />
              <div>
                <strong style={{ display: "block", color: "#1e293b", fontSize: ".88rem" }}>Yapay zekâ çalışma biçimi</strong>
                <small style={{ color: "#64748b", fontSize: ".76rem" }}>Yerel destek veya güvenli sunucu geçidi</small>
              </div>
            </div>
            <button type="button" onClick={() => { onClose(); onOpenApiConfig(); }} style={{ background: "#fff", border: "1px solid #b9c7c0", padding: "8px 13px", borderRadius: 10, fontSize: ".78rem", fontWeight: 800, color: "#20563d", cursor: "pointer" }}>Yapılandır</button>
          </div>

          <div style={{ paddingTop: 14, borderTop: "1px solid #e2e8f0", color: "#94a3b8", fontSize: ".74rem", display: "flex", justifyContent: "space-between", gap: 12 }}>
            <span>MaarifOS 0.66.2</span>
            <span>Bağımsız öğretmen aracı</span>
          </div>
        </div>
      </section>
    </div>
  );
}
