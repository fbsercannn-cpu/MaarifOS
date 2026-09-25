import { MAARIFOS_SUPPORT_EMAIL, MAARIFOS_SUPPORT_MAILTO } from "../support";

/**
 * Native mağaza sürümü yayımlanana kadar yalnız kurumsal yayın bilgisini gösterir.
 * PWA, APK, barındırma sağlayıcısı ve geliştirici hesabı son kullanıcıya açılmaz.
 */

interface PwaInstallPromptModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function PwaInstallPromptModal({ isOpen, onClose }: PwaInstallPromptModalProps) {
  if (!isOpen) return null;

  return (
    <div
      role="presentation"
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
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="store-release-title"
        aria-describedby="store-release-description"
        style={{
          background: "#090f1d",
          border: "1px solid rgba(56, 189, 248, 0.3)",
          boxShadow: "0 25px 60px -15px rgba(0, 0, 0, 0.85), 0 0 35px rgba(14, 165, 233, 0.2)",
          borderRadius: "18px",
          width: "min(100%, 520px)",
          color: "#f1f5f9",
          padding: "24px",
          fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
          boxSizing: "border-box",
        }}
        onClick={(event) => event.stopPropagation()}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "16px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px", minWidth: 0 }}>
            <div
              aria-hidden="true"
              style={{
                width: "42px",
                height: "42px",
                flex: "0 0 42px",
                borderRadius: "12px",
                background: "linear-gradient(135deg, #0284c7, #10b981)",
                display: "grid",
                placeItems: "center",
                fontSize: "1.35rem",
              }}
            >
              📱
            </div>
            <div>
              <h3 id="store-release-title" style={{ margin: 0, fontSize: "1.08rem", color: "#ffffff" }}>
                MaarifOS mobil uygulaması hazırlanıyor
              </h3>
              <p id="store-release-description" style={{ margin: "4px 0 0", fontSize: "0.82rem", color: "#cbd5e1", lineHeight: 1.5 }}>
                Doğrulanmış mobil sürüm yakında Google Play ve App Store üzerinden yayımlanacak.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Mağaza yayın bilgisini kapat"
            style={{
              background: "rgba(255,255,255,0.08)",
              border: "none",
              color: "#cbd5e1",
              width: "34px",
              height: "34px",
              flex: "0 0 34px",
              borderRadius: "50%",
              cursor: "pointer",
            }}
          >
            ✕
          </button>
        </div>

        <div
          style={{
            marginTop: "18px",
            padding: "16px",
            borderRadius: "12px",
            background: "rgba(14, 165, 233, 0.08)",
            border: "1px solid rgba(56, 189, 248, 0.2)",
          }}
        >
          <strong style={{ display: "block", color: "#7dd3fc", marginBottom: "6px" }}>Resmî duyuru kanalları</strong>
          <p style={{ margin: 0, color: "#cbd5e1", fontSize: "0.86rem", lineHeight: 1.6, overflowWrap: "anywhere" }}>
            Güncel ürün bilgileri yalnız <strong>maarifos.com</strong> ve <strong>maarifos.net</strong> adreslerinde paylaşılır.
            Mağaza yayını tamamlanana kadar doğrudan indirme veya kurulum bağlantısı sunulmaz.
          </p>
          <a href={MAARIFOS_SUPPORT_MAILTO} style={{ minHeight: "44px", marginTop: "10px", display: "inline-flex", alignItems: "center", color: "#7dd3fc", fontSize: "0.86rem", fontWeight: 800, overflowWrap: "anywhere" }}>
            {MAARIFOS_SUPPORT_EMAIL}
          </a>
        </div>

        <button
          type="button"
          onClick={onClose}
          style={{
            marginTop: "18px",
            width: "100%",
            minHeight: "44px",
            border: 0,
            borderRadius: "10px",
            background: "linear-gradient(135deg, #0284c7, #059669)",
            color: "#ffffff",
            fontWeight: 750,
            cursor: "pointer",
          }}
        >
          Anladım
        </button>
      </section>
    </div>
  );
}
