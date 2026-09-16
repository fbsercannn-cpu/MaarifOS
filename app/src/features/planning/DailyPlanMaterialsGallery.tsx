/**
 * T.C. Hazine ve Maliye Bakanlığı & MaarifOS Standartları
 * Günün Materyalleri ve Kaynak Galerisi (Sınıf İçi & Akıllı Tahta & A4 Baskı)
 * İlham: okuloncesirehberi.com (Günün Kaynakları & Materyalleri)
 * Mimari: Sıfır harici API, %100 Client-Side, A4 CSS Paged Media Uyumlu
 */

import { useState } from "react";
import {
  Cross2Icon,
  MagnifyingGlassIcon,
  ReaderIcon,
} from "@radix-ui/react-icons";
import {
  BUILT_IN_DAILY_MATERIALS,
  DAILY_PLAN_MATERIAL_CATEGORIES,
  filterDailyMaterials,
  generateMaterialPrintHtml,
  type DailyPlanMaterialCategory,
  type DailyPlanMaterialItem,
} from "../../core/domain/daily-plan-materials.ts";
import { openHtmlPrintWindow } from "../printing/open-html-print-window.ts";
import "./daily-plan-enhancements.css";

export interface DailyPlanMaterialsGalleryProps {
  initialCategory?: DailyPlanMaterialCategory | "all";
  onAttachToPlan?(item: DailyPlanMaterialItem): void;
}

export function DailyPlanMaterialsGallery({
  initialCategory = "all",
  onAttachToPlan,
}: DailyPlanMaterialsGalleryProps) {
  const [selectedCategory, setSelectedCategory] = useState<DailyPlanMaterialCategory | "all">(initialCategory);
  const [searchQuery, setSearchQuery] = useState("");
  const [previewItem, setPreviewItem] = useState<DailyPlanMaterialItem | null>(null);

  const materials = filterDailyMaterials(selectedCategory, searchQuery);

  const handlePrint = (item: DailyPlanMaterialItem) => {
    const html = generateMaterialPrintHtml(item);
    openHtmlPrintWindow({
      html,
      title: item.printTitle,
    });
  };

  return (
    <div className="daily-materials-gallery" aria-label="Günün Materyalleri ve Kaynak Galerisi">
      <div className="daily-materials-gallery__header">
        <div>
          <span className="daily-materials-gallery__eyebrow">TYMM PEDAGOJİK HAVUZU</span>
          <h3 className="daily-materials-gallery__title">Günün Materyalleri & Kaynak Sandığı</h3>
          <p className="daily-materials-gallery__desc">
            Sınıfta anında uygulayabileceğiniz ritimler, oyun kartları, hikayeler ve A4 çıktıları.
          </p>
        </div>
        <div className="daily-materials-gallery__search">
          <MagnifyingGlassIcon aria-hidden="true" />
          <input
            type="search"
            placeholder="Materyal veya konu ara..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            aria-label="Materyal ara"
          />
        </div>
      </div>

      {/* Kategori Filtre Çipleri */}
      <div className="daily-materials-gallery__chips" role="tablist" aria-label="Materyal kategorileri">
        <button
          type="button"
          role="tab"
          aria-selected={selectedCategory === "all"}
          className={`daily-materials-chip ${selectedCategory === "all" ? "is-active" : ""}`}
          onClick={() => setSelectedCategory("all")}
        >
          <span>✨ Tümü</span>
          <span className="daily-materials-chip__count">{BUILT_IN_DAILY_MATERIALS.length}</span>
        </button>
        {DAILY_PLAN_MATERIAL_CATEGORIES.map((cat) => {
          const count = BUILT_IN_DAILY_MATERIALS.filter((m) => m.category === cat.id).length;
          return (
            <button
              type="button"
              key={cat.id}
              role="tab"
              aria-selected={selectedCategory === cat.id}
              className={`daily-materials-chip ${selectedCategory === cat.id ? "is-active" : ""}`}
              onClick={() => setSelectedCategory(cat.id)}
            >
              <span>{cat.icon} {cat.shortTitle}</span>
              <span className="daily-materials-chip__count">{count}</span>
            </button>
          );
        })}
      </div>

      {/* Materyal Kartları Izgarası */}
      <div className="daily-materials-grid">
        {materials.map((item) => {
          const categoryMeta = DAILY_PLAN_MATERIAL_CATEGORIES.find((c) => c.id === item.category);
          return (
            <article key={item.id} className="daily-material-card">
              <header className="daily-material-card__header">
                <span
                  className="daily-material-card__badge"
                  style={{ backgroundColor: `${categoryMeta?.badgeColor ?? "#6366f1"}18`, color: categoryMeta?.badgeColor ?? "#6366f1" }}
                >
                  {categoryMeta?.icon} {categoryMeta?.shortTitle}
                </span>
                {item.curriculumTargetCode ? (
                  <span className="daily-material-card__code">{item.curriculumTargetCode}</span>
                ) : null}
              </header>

              <div className="daily-material-card__body">
                <h4 className="daily-material-card__title">{item.title}</h4>
                <p className="daily-material-card__subtitle">{item.subtitle}</p>
                <p className="daily-material-card__objective">
                  <strong>Amaç:</strong> {item.pedagogicalObjective}
                </p>
                {item.lowCostAlternative ? (
                  <p className="daily-material-card__lowcost">
                    🌱 <em>Düşük Maliyet: {item.lowCostAlternative}</em>
                  </p>
                ) : null}
              </div>

              <footer className="daily-material-card__actions">
                <button
                  type="button"
                  className="daily-material-btn daily-material-btn--preview"
                  onClick={() => setPreviewItem(item)}
                >
                  <ReaderIcon aria-hidden="true" />
                  <span>Sınıfta Göster</span>
                </button>
                <button
                  type="button"
                  className="daily-material-btn daily-material-btn--print"
                  onClick={() => handlePrint(item)}
                >
                  <span>🖨️ A4 Yazdır</span>
                </button>
                {onAttachToPlan ? (
                  <button
                    type="button"
                    className="daily-material-btn daily-material-btn--attach"
                    onClick={() => onAttachToPlan(item)}
                  >
                    <span>+ Plana Ekle</span>
                  </button>
                ) : null}
              </footer>
            </article>
          );
        })}
      </div>

      {/* Sınıf / Akıllı Tahta Önizleme Modalı */}
      {previewItem ? (
        <div
          className="daily-material-modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-labelledby="material-preview-modal-title"
        >
          <div className="daily-material-modal">
            <header className="daily-material-modal__header">
              <div>
                <span className="daily-material-modal__eyebrow">AKILLI TAHTA & SINIF ÖNİZLEME</span>
                <h3 id="material-preview-modal-title">{previewItem.title}</h3>
                <small>{previewItem.subtitle}</small>
              </div>
              <div className="daily-material-modal__header-actions">
                <button
                  type="button"
                  className="daily-material-btn daily-material-btn--print"
                  onClick={() => handlePrint(previewItem)}
                >
                  <span>🖨️ A4 Yazdır</span>
                </button>
                <button
                  type="button"
                  className="daily-plan-modal__close-btn"
                  onClick={() => setPreviewItem(null)}
                  aria-label="Kapat"
                >
                  <Cross2Icon aria-hidden="true" />
                </button>
              </div>
            </header>

            <div className="daily-material-modal__content">
              <div className="daily-material-modal__instruction-banner">
                <strong>👩‍🏫 Sınıf İçi Uygulama Önerisi:</strong>
                <p>{previewItem.classroomInstruction}</p>
                {previewItem.lowCostAlternative ? (
                  <small>🌱 <strong>Doğal / Düşük Maliyetli Alternatif:</strong> {previewItem.lowCostAlternative}</small>
                ) : null}
              </div>

              <iframe
                title={previewItem.title}
                srcDoc={previewItem.printBodyHtml}
                className="daily-material-modal__html-view"
                sandbox="allow-same-origin"
                style={{ width: "100%", minHeight: "420px", border: "1px solid #e2e8f0", borderRadius: "8px", background: "#ffffff" }}
              />
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
