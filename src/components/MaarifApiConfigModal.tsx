import { useEffect, useState } from "react";
import { SecureAIClient, type AIGatewayStatus, type SupportedAIProvider } from "../services/secure-ai-client";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSaved?: () => void;
}

const statusText = (status: AIGatewayStatus | null) => {
  if (!status) return "Bağlantı henüz sınanmadı.";
  if (status.available) return `DeepSeek ağ geçidi hazır (${status.model ?? "yapılandırılmış model"}).`;
  if (status.reason === "authentication_required") return "Bulut asistanı için önce bağlı öğretmen hesabı gerekir.";
  return "Bulut asistanı bu yayında henüz etkin değil; yerel motor kesintisiz çalışır.";
};

export function MaarifApiConfigModal({ isOpen, onClose, onSaved }: Props) {
  const [provider, setProvider] = useState<SupportedAIProvider>("deepseek");
  const [status, setStatus] = useState<AIGatewayStatus | null>(null);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    let current = true;
    setProvider(SecureAIClient.getActiveProvider());
    setStatus(null);
    setTesting(true);
    void SecureAIClient.getGatewayStatus().then((next) => {
      if (!current) return;
      setStatus(next);
      setTesting(false);
    });
    return () => {
      current = false;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const testGateway = async () => {
    setTesting(true);
    setStatus(await SecureAIClient.getGatewayStatus());
    setTesting(false);
  };

  const save = () => {
    if (provider === "deepseek" && !status?.available) return;
    SecureAIClient.setActiveProvider(provider);
    onSaved?.();
    onClose();
  };

  return (
    <div
      role="presentation"
      onClick={onClose}
      style={{ position: "fixed", inset: 0, zIndex: 999999, background: "rgba(7,13,24,.82)", display: "grid", placeItems: "center", padding: 16 }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="ai-connection-title"
        onClick={(event) => event.stopPropagation()}
        style={{ width: "min(560px,100%)", background: "#0f172a", border: "1px solid rgba(56,189,248,.3)", borderRadius: 16, color: "#fff", boxShadow: "0 20px 50px rgba(0,0,0,.6)", padding: 24 }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", gap: 16, alignItems: "start" }}>
          <div>
            <h2 id="ai-connection-title" style={{ margin: 0, fontSize: "1.1rem" }}>Yapay zekâ çalışma biçimi</h2>
            <p style={{ color: "#cbd5e1", lineHeight: 1.5 }}>
              Sağlayıcı anahtarı bu ekrana girilmez ve tarayıcıda saklanmaz. Bulut seçeneği yalnız MaarifOS sunucu ağ geçidi hazırsa çalışır.
            </p>
          </div>
          <button type="button" onClick={onClose} aria-label="Kapat" style={{ background: "transparent", border: 0, color: "#cbd5e1", fontSize: 22 }}>×</button>
        </div>

        <div style={{ display: "grid", gap: 10 }}>
          <button
            type="button"
            onClick={() => setProvider("local")}
            aria-pressed={provider === "local"}
            style={{ textAlign: "left", padding: 14, borderRadius: 10, color: "#fff", background: provider === "local" ? "rgba(16,185,129,.2)" : "rgba(255,255,255,.04)", border: `1px solid ${provider === "local" ? "#10b981" : "rgba(255,255,255,.12)"}` }}
          >
            <strong>Yerel pedagoji motoru</strong><br />
            <small>Çevrim dışı çalışır; sınıf bağlamı cihazdan çıkmaz.</small>
          </button>
          <button
            type="button"
            onClick={() => setProvider("deepseek")}
            aria-pressed={provider === "deepseek"}
            style={{ textAlign: "left", padding: 14, borderRadius: 10, color: "#fff", background: provider === "deepseek" ? "rgba(2,132,199,.22)" : "rgba(255,255,255,.04)", border: `1px solid ${provider === "deepseek" ? "#38bdf8" : "rgba(255,255,255,.12)"}` }}
          >
            <strong>DeepSeek destekli bulut asistanı</strong><br />
            <small>Bağlı öğretmen oturumu ve sunucu taraflı anahtar gerektirir; çıktı yalnız taslaktır.</small>
          </button>
        </div>

        <p role="status" style={{ minHeight: 22, color: status?.available ? "#6ee7b7" : "#cbd5e1" }}>{statusText(status)}</p>
        {provider === "deepseek" && !status?.available ? (
          <button
            type="button"
            onClick={() => {
              onClose();
              window.dispatchEvent(new CustomEvent("maarif_open_account"));
            }}
            style={{ width: "100%", minHeight: 44, borderRadius: 10, border: "1px solid #38bdf8", background: "rgba(2,132,199,.18)", color: "#e0f2fe", fontWeight: 800 }}
          >
            Google hesabını ve bulut bağlantısını aç
          </button>
        ) : null}
        <p style={{ color: "#94a3b8", fontSize: ".78rem", lineHeight: 1.5 }}>
          Öğrenci adı, kimlik, telefon ve e-posta gibi bilgiler bulut istemine yazılmamalıdır. Otomatik maskeleme ek bir korumadır; öğretmen kontrolünün yerini almaz.
        </p>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, flexWrap: "wrap" }}>
          <button type="button" onClick={() => void testGateway()} disabled={testing} style={{ padding: "9px 14px", borderRadius: 8 }}>
            {testing ? "Bağlantı sınanıyor…" : "Bulut bağlantısını sına"}
          </button>
          <button type="button" onClick={save} disabled={provider === "deepseek" && !status?.available} style={{ padding: "9px 16px", borderRadius: 8, border: 0, background: "#0284c7", color: "#fff", fontWeight: 700, opacity: provider === "deepseek" && !status?.available ? .5 : 1 }}>
            Kaydet
          </button>
        </div>
      </section>
    </div>
  );
}
