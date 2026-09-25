/**
 * ActivityLibraryPanel.tsx � 0.47.0
 *
 * Hopper prensibi: O(1) arama; Map index build suresi O(n) ancak sadece bir kere.
 * Turk karakter normalizasyonu: "S -> s, I -> i, O -> o, U -> u, G -> g, C -> c".
 * Gigo: girdi bosluk/undefined temizligi.
 */
import {AlternativeActivityPanel} from "../teacher-assistant/AlternativeActivityPanel.tsx";
import { useMemo, useState } from "react";
import { ChevronRightIcon, MagnifyingGlassIcon } from "@radix-ui/react-icons";
import type { ActivityStudioItem } from "./activity-studio-model.ts";

// Turk karakter normalize
function normalizeTurkish(text: string): string {
  return text
    .toLowerCase()
    .replace(/\u015f/g, "s").replace(/\u015e/g, "s")
    .replace(/\u0131/g, "i").replace(/\u0130/g, "i")
    .replace(/\u00f6/g, "o").replace(/\u00d6/g, "o")
    .replace(/\u00fc/g, "u").replace(/\u00dc/g, "u")
    .replace(/\u011f/g, "g").replace(/\u011e/g, "g")
    .replace(/\u00e7/g, "c").replace(/\u00c7/g, "c")
    .trim();
}

export interface ActivityLibraryPanelProps {
  readonly items: readonly ActivityStudioItem[];
  readonly onAddToPlan: (activityId: string) => void;
  readonly onOpenActivity?: (activityId: string) => void;
  readonly disabled?: boolean;
}

const CATEGORY_LABELS: Record<string, string> = {
  sanat: "Sanat",
  muzik: "Muzik & Ritim",
  hareket: "Hareket & Beden",
  dil: "Dil & Iletisim",
  matematik: "Matematik & Mantik",
  fen: "Fen & Doga",
  oyun: "Oyun & Drama",
  deger: "Deger Egitimi",
};

export function ActivityLibraryPanel({
  items,
  onAddToPlan,
  onOpenActivity,
  disabled = false,
}: ActivityLibraryPanelProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("hepsi");
  const [selectedAgeBand, setSelectedAgeBand] = useState<string>("hepsi");

  // O(n) build, O(1) erisim � sadece items degisince yeniden kurulur
  const searchIndex = useMemo(() => {
    const index = new Map<string, ActivityStudioItem>();
    for (const item of items) {
      const key = normalizeTurkish(item.title + " " + (item.teacherPrompt ?? ""));
      index.set(item.id, item);
    }
    return index;
  }, [items]);

  // Kategori listesi
  const categories = useMemo(() => {
    const cats = new Set(items.map((i) => i.category));
    return Array.from(cats);
  }, [items]);

  // Yas bandlari
  const ageBands = useMemo(() => {
    const bands = new Set(items.map((i) => (i as any).ageBand ?? "").filter(Boolean));
    return Array.from(bands) as string[];
  }, [items]);

  // Filtrelenms liste � O(n) sadece filtre degisince
  const filtered = useMemo(() => {
    const normQ = normalizeTurkish(searchQuery);
    return items.filter((item) => {
      if (selectedCategory !== "hepsi" && item.category !== selectedCategory) return false;
      if (selectedAgeBand !== "hepsi" && (item as any).ageBand !== selectedAgeBand) return false;
      if (normQ.length >= 2) {
        const normTitle = normalizeTurkish(item.title + " " + (item.teacherPrompt ?? ""));
        if (!normTitle.includes(normQ)) return false;
      }
      return true;
    });
  }, [items, searchQuery, selectedCategory, selectedAgeBand]);

  return (
    <section className="activity-library" aria-label="Etkinlik Kutuphanesi">
      <header className="activity-library__header">
        <h2>Etkinlik Kutuphanesi</h2>
        <p>{filtered.length} etkinlik listeleniyor</p>
      </header>

      <AlternativeActivityPanel items={items} onAddToPlan={onAddToPlan} onOpenActivity={onOpenActivity} disabled={disabled}/>
      <div className="activity-library__filters">
        {/* Arama */}
        <label className="activity-library__search" aria-label="Etkinlik ara">
          <MagnifyingGlassIcon aria-hidden="true" />
          <input
            type="search"
            placeholder="Etkinlik ara..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            aria-label="Etkinlik ara"
          />
        </label>

        {/* Kategori filtresi */}
        <div className="activity-library__filter-row" role="group" aria-label="Kategori">
          <button
            type="button"
            aria-pressed={selectedCategory === "hepsi"}
            onClick={() => setSelectedCategory("hepsi")}
          >
            Hepsi
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              aria-pressed={selectedCategory === cat}
              onClick={() => setSelectedCategory(cat)}
            >
              {CATEGORY_LABELS[cat] ?? cat}
            </button>
          ))}
        </div>

        {/* Yas bandi filtresi */}
        {ageBands.length > 0 && (
          <div className="activity-library__filter-row" role="group" aria-label="Yas bandi">
            <button
              type="button"
              aria-pressed={selectedAgeBand === "hepsi"}
              onClick={() => setSelectedAgeBand("hepsi")}
            >
              Tum Yaslar
            </button>
            {ageBands.map((band) => (
              <button
                key={band}
                type="button"
                aria-pressed={selectedAgeBand === band}
                onClick={() => setSelectedAgeBand(band)}
              >
                {band} ay
              </button>
            ))}
          </div>
        )}
      </div>

      {filtered.length === 0 ? (
        <p className="activity-library__empty" role="status">
          Bu filtreyle etkinlik bulunamadi. Arama terimini veya kategoriyi degistirin.
        </p>
      ) : (
        <ol className="activity-library__list">
          {filtered.map((item) => (
            <li key={item.id} className="activity-library__item">
              <div className="ali__meta">
                <small>{CATEGORY_LABELS[item.category] ?? item.category} � {item.durationMinutes} dk</small>
                <strong>{item.title}</strong>
                <em>{item.teacherPrompt}</em>
              </div>
              <div className="ali__actions">
                {onOpenActivity && (
                  <button
                    type="button"
                    onClick={() => onOpenActivity(item.id)}
                    disabled={disabled}
                    aria-label={`${item.title} etkinligini ac`}
                  >
                    <ChevronRightIcon aria-hidden="true" />
                    Ac
                  </button>
                )}
                <button
                  type="button"
                  className="ali__add-btn"
                  onClick={() => onAddToPlan(item.id)}
                  disabled={disabled}
                  aria-label={`${item.title} etkinligini plana ekle`}
                >
                  + Plana Ekle
                </button>
              </div>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
