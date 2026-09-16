/**
 * T.C. Hazine ve Maliye Bakanlığı & Gelir İdaresi Başkanlığı Standartları
 * Birleşik 4'lü Dışa Aktarma Araç Çubuğu (Quad-Export Bar)
 * A4 Yazdır · PDF İndir · Excel (.xlsx) İndir · Word (.doc) İndir · Bağlı Örnek Çıktılar
 */

import React from "react";
import "./official-forms.css";

export interface OfficialFormExportBarProps {
  documentTitle: string;
  onPrintA4?: () => void;
  onDownloadPdf?: () => void;
  onDownloadExcel?: () => void;
  onDownloadWord?: () => void;
  onOpenSampleOutputs?: () => void;
  isBusy?: boolean;
  extraActions?: React.ReactNode;
}

export function OfficialFormExportBar({
  documentTitle,
  onPrintA4,
  onDownloadPdf,
  onDownloadExcel,
  onDownloadWord,
  onOpenSampleOutputs,
  isBusy = false,
  extraActions,
}: OfficialFormExportBarProps) {
  return (
    <div
      className="official-export-toolbar no-print"
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        flexWrap: "wrap",
        gap: "8px",
        padding: "8px 12px",
        background: "#f1f5f9",
        border: "1px solid #cbd5e1",
        borderRadius: "8px",
        marginBottom: "12px",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
        <span style={{ fontSize: "0.95rem" }}>📄</span>
        <strong style={{ fontSize: "0.86rem", color: "#1e293b" }}>{documentTitle}</strong>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
        {extraActions}

        {onOpenSampleOutputs && (
          <button
            type="button"
            className="of-btn"
            style={{
              background: "#eff6ff",
              color: "#1d4ed8",
              border: "1px solid #93c5fd",
              fontWeight: 600,
              fontSize: "0.8rem",
              padding: "6px 10px",
              cursor: "pointer",
              borderRadius: "6px",
            }}
            onClick={onOpenSampleOutputs}
            disabled={isBusy}
            title="Bu plana bağlı hazır bülten, malzeme listesi ve çıktılar"
          >
            📦 Bağlı Örnek Çıktılar
          </button>
        )}

        {onDownloadExcel && (
          <button
            type="button"
            className="of-btn"
            style={{
              background: "#ecfdf5",
              color: "#047857",
              border: "1px solid #6ee7b7",
              fontWeight: 600,
              fontSize: "0.8rem",
              padding: "6px 10px",
              cursor: "pointer",
              borderRadius: "6px",
            }}
            onClick={onDownloadExcel}
            disabled={isBusy}
            title="Microsoft Excel (.xlsx) olarak indir (Formül ve Filtre Korumalı)"
          >
            📊 Excel (.xlsx)
          </button>
        )}

        {onDownloadPdf && (
          <button
            type="button"
            className="of-btn"
            style={{
              background: "#fef2f2",
              color: "#b91c1c",
              border: "1px solid #fca5a5",
              fontWeight: 600,
              fontSize: "0.8rem",
              padding: "6px 10px",
              cursor: "pointer",
              borderRadius: "6px",
            }}
            onClick={onDownloadPdf}
            disabled={isBusy}
            title="Doğrudan PDF olarak hazırla"
          >
            📑 PDF İndir
          </button>
        )}

        {onPrintA4 && (
          <button
            type="button"
            className="of-btn"
            style={{
              background: "#f8fafc",
              color: "#334155",
              border: "1px solid #94a3b8",
              fontWeight: 600,
              fontSize: "0.8rem",
              padding: "6px 10px",
              cursor: "pointer",
              borderRadius: "6px",
            }}
            onClick={onPrintA4}
            disabled={isBusy}
            title="A4 CSS Paged Media formatında yazdır veya PDF kaydet"
          >
            🖨️ A4 Yazdır
          </button>
        )}

        {onDownloadWord && (
          <button
            type="button"
            className="of-btn"
            style={{
              background: "#f0f9ff",
              color: "#0369a1",
              border: "1px solid #7dd3fc",
              fontWeight: 600,
              fontSize: "0.8rem",
              padding: "6px 10px",
              cursor: "pointer",
              borderRadius: "6px",
            }}
            onClick={onDownloadWord}
            disabled={isBusy}
            title="Microsoft Word (.doc) olarak indir"
          >
            📄 Word (.doc)
          </button>
        )}
      </div>
    </div>
  );
}
