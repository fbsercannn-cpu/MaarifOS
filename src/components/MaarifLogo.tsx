import React from "react";

export interface MaarifLogoProps {
  size?: number;
  variant?: "emblem-only" | "full" | "horizontal";
  theme?: "dark" | "light";
  className?: string;
}

/** MaarifOS ürün işareti. */
export function MaarifLogo({
  size = 36,
  variant = "emblem-only",
  theme = "light",
  className = "",
}: MaarifLogoProps) {
  const isDark = theme === "dark";
  const textColor = isDark ? "#f8fafc" : "#0f172a";
  const subtitleColor = isDark ? "#94a3b8" : "#64748b";

  const emblem = (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ flexShrink: 0 }}
      aria-label="MaarifOS Logosu"
    >
      <defs>
        {/* Ana Arka Plan Degrade */}
        <linearGradient id="maarifBgGrad" x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#0284c7" />
          <stop offset="50%" stopColor="#0369a1" />
          <stop offset="100%" stopColor="#0f766e" />
        </linearGradient>

        {/* Bilgi Meşalesi & Hilal Işıltısı Degrade */}
        <linearGradient id="maarifSproutGrad" x1="16" y1="12" x2="48" y2="52" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#38bdf8" />
          <stop offset="50%" stopColor="#34d399" />
          <stop offset="100%" stopColor="#10b981" />
        </linearGradient>

        {/* Kitap Sayfası Beyazı */}
        <linearGradient id="maarifBookGrad" x1="18" y1="36" x2="46" y2="50" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.95" />
          <stop offset="100%" stopColor="#e2e8f0" stopOpacity="0.85" />
        </linearGradient>

        {/* İnce Gölge Filtresi */}
        <filter id="maarifDropShadow" x="-10%" y="-10%" width="120%" height="120%" filterUnits="userSpaceOnUse">
          <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#0284c7" floodOpacity="0.35" />
        </filter>
      </defs>

      {/* Dış Taşıyıcı Kalkan / Yumuşak Kare */}
      <rect
        x="2"
        y="2"
        width="60"
        height="60"
        rx="16"
        fill="url(#maarifBgGrad)"
        filter="url(#maarifDropShadow)"
      />

      {/* İnce İç Çerçeve Parlaması */}
      <rect
        x="2.5"
        y="2.5"
        width="59"
        height="59"
        rx="15.5"
        stroke="#ffffff"
        strokeOpacity="0.25"
        strokeWidth="1"
      />

      {/* Açık Kitap Tabanı (TYMM Pedagoji Omurgası) */}
      <path
        d="M32 44C27.5 41.2 21.8 41 16 43V28C21.8 26.2 27.5 26.5 32 29.5C36.5 26.5 42.2 26.2 48 28V43C42.2 41 36.5 41.2 32 44Z"
        fill="url(#maarifBookGrad)"
      />

      {/* Kitap Orta Ayrımı */}
      <line
        x1="32"
        y1="29.5"
        x2="32"
        y2="44"
        stroke="#0284c7"
        strokeWidth="1.5"
        strokeLinecap="round"
      />

      {/* Yükselen Gelecek Filizi / Meşale (Sol ve Sağ Yapraklar) */}
      {/* Sol Filiz */}
      <path
        d="M32 28C29 23 23 20 18 21C18 26 23 31 32 32V28Z"
        fill="url(#maarifSproutGrad)"
        fillOpacity="0.9"
      />
      {/* Sağ Filiz */}
      <path
        d="M32 28C35 23 41 20 46 21C46 26 41 31 32 32V28Z"
        fill="url(#maarifSproutGrad)"
      />

      {/* Merkez Bilgi Güneşi / MEB Yıldızı */}
      <circle cx="32" cy="17" r="3.5" fill="#facc15" />
      <circle cx="32" cy="17" r="5" stroke="#fef08a" strokeWidth="1" strokeOpacity="0.6" />
    </svg>
  );

  if (variant === "emblem-only") {
    return <div className={`maarif-logo-emblem ${className}`} style={{ display: "inline-flex" }}>{emblem}</div>;
  }

  return (
    <div
      className={`maarif-logo-container ${className}`}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "10px",
        userSelect: "none",
      }}
    >
      {emblem}
      <div style={{ display: "flex", flexDirection: "column", lineHeight: 1.15 }}>
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <span
            style={{
              fontSize: size * 0.46,
              fontWeight: 900,
              letterSpacing: "-0.03em",
              color: textColor,
              fontFamily: "Inter, system-ui, sans-serif",
            }}
          >
            MaarifOS
          </span>
        </div>
        {variant === "full" && (
          <span
            style={{
              fontSize: size * 0.28,
              color: subtitleColor,
              fontWeight: 500,
              marginTop: "2px",
              letterSpacing: "-0.01em",
            }}
          >
            Okul öncesi öğretmen çalışma alanı
          </span>
        )}
      </div>
    </div>
  );
}
