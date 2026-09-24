import React, { useState } from "react";

export interface ConceptCategory {
  title: string;
  items: string[];
}

export const TTKB_EK7_CONCEPTS: Record<string, ConceptCategory> = {
  renk: {
    title: "Renkler",
    items: ["Kırmızı", "Sarı", "Mavi", "Yeşil", "Turuncu", "Mor", "Pembe", "Kahverengi", "Siyah", "Beyaz", "Gri"]
  },
  sekil: {
    title: "Geometrik Şekiller",
    items: ["Daire", "Üçgen", "Kare", "Dikdörtgen", "Çember", "Kenar", "Köşe"]
  },
  boyut: {
    title: "Boyut",
    items: ["Büyük-Orta-Küçük", "İnce-Kalın", "Uzun-Kısa", "Geniş-Dar"]
  },
  miktar: {
    title: "Miktar",
    items: ["Az-Çok", "Ağır-Hafif", "Boş-Dolu", "Tek-Çift", "Yarım-Tam", "Eşit", "Parça-Bütün", "Hepsi-Hiçbiri"]
  },
  mekan: {
    title: "Yön / Mekânda Konum",
    items: [
      "Ön-Arka",
      "Yukarı-Aşağı",
      "İleri-Geri",
      "Sağ-Sol",
      "Önünde-Arkasında",
      "Altında-Ortasında-Üstünde",
      "Arasında",
      "Yanında",
      "Yukarıda-Aşağıda",
      "İç-Dış",
      "İçinde-Dışında",
      "İçeri-Dışarı",
      "Uzak-Yakın",
      "Alçak-Yüksek",
      "Sağında-Solunda",
      "Çevresinde-Etrafında"
    ]
  },
  sayi: {
    title: "Sayı / Sayma",
    items: ["1-20 Arası Sayılar", "Sıfır", "İlk-Orta-Son", "Önceki-Sonraki", "Sıra Sayısı [Birinci, İkinci…]"]
  },
  zaman: {
    title: "Zaman",
    items: ["Gece-Gündüz", "Sabah-Öğle-Akşam", "Dün-Bugün-Yarın", "Önce-Şimdi-Sonra", "Erken-Geç"]
  },
  duyu: {
    title: "Duyu",
    items: [
      "Tatlı",
      "Tuzlu",
      "Acı",
      "Ekşi",
      "Sıcak-Soğuk-Ilık",
      "Sert-Yumuşak",
      "Kaygan-Pütürlü",
      "Tüylü-Tüysüz",
      "Islak-Kuru",
      "Sivri-Küt",
      "Parlak-Mat",
      "Taze-Bayat",
      "Sesli-Sessiz"
    ]
  },
  duygu: {
    title: "Duygu",
    items: ["Mutluluk", "Üzüntü", "Öfke", "Korku", "Şaşkınlık", "Endişe", "İğrenme", "Pişmanlık", "Utanma"]
  },
  zit: {
    title: "Zıt Kavramlar",
    items: [
      "Aynı-Farklı",
      "Açık-Kapalı",
      "Hızlı-Yavaş",
      "Canlı-Cansız",
      "Hareketli-Hareketsiz",
      "Kolay-Zor",
      "Karanlık-Aydınlık",
      "Ters-Düz",
      "Düzenli-Dağınık",
      "Eski-Yeni",
      "Başlangıç-Bitiş",
      "Kirli-Temiz",
      "Aç-Tok",
      "Düz-Eğri",
      "Doğru-Yanlış",
      "Yaşlı-Genç",
      "Açık-Koyu",
      "Kalabalık-Tenha"
    ]
  }
};

export interface SpecialDayItem {
  name: string;
  date: string;
}

export const TTKB_EK8_SPECIAL_DAYS: SpecialDayItem[] = [
  { name: "İlköğretim Haftası", date: "Eylül 3. haftası" },
  { name: "Hayvanları Koruma Günü", date: "4 Ekim" },
  { name: "Cumhuriyet Bayramı", date: "29 Ekim" },
  { name: "Kızılay Haftası", date: "29 Ekim - 4 Kasım" },
  { name: "Atatürk Haftası", date: "10-18 Kasım" },
  { name: "Dünya Çocuk Hakları Günü", date: "20 Kasım" },
  { name: "Öğretmenler Günü", date: "24 Kasım" },
  { name: "İnsan Hakları ve Demokrasi Haftası", date: "10 Aralık haftası" },
  { name: "Tutum, Yatırım ve Türk Malları Haftası", date: "12-18 Aralık" },
  { name: "Yeni Yıl", date: "31 Aralık - 1 Ocak" },
  { name: "Enerji Tasarrufu Haftası", date: "Ocak 2. haftası" },
  { name: "Bilim ve Teknoloji Haftası", date: "8-14 Mart" },
  { name: "İstiklâl Marşı'nın Kabulü ve Mehmet Âkif Ersoy'u Anma Günü", date: "12 Mart" },
  { name: "Şehitler Günü", date: "18 Mart" },
  { name: "Orman Haftası", date: "21-26 Mart" },
  { name: "Dünya Tiyatrolar Günü", date: "27 Mart" },
  { name: "Kütüphaneler Haftası", date: "Mart son pazartesi haftası" },
  { name: "Dünya Kitap Günü", date: "23 Nisan haftası" },
  { name: "23 Nisan Ulusal Egemenlik ve Çocuk Bayramı", date: "23 Nisan" },
  { name: "Trafik ve İlk Yardım Haftası", date: "Mayıs 1. haftası" },
  { name: "Anneler Günü", date: "Mayıs 2. pazarı" },
  { name: "Engelliler Haftası", date: "10-18 Mayıs" },
  { name: "19 Mayıs Atatürk'ü Anma, Gençlik ve Spor Bayramı", date: "19 Mayıs" },
  { name: "Müzeler Haftası", date: "18-24 Mayıs" },
  { name: "Çevre Koruma Haftası", date: "Haziran 2. haftası" },
  { name: "Babalar Günü", date: "Haziran 3. pazarı" },
  { name: "15 Temmuz Demokrasi ve Millî Birlik Günü", date: "15 Temmuz" },
  { name: "Ramazan Bayramı", date: "Hicrî Takvim" },
  { name: "Kurban Bayramı", date: "Hicrî Takvim" }
];

interface Props {
  currentValue: string;
  onSelect: (newValue: string) => void;
  mode?: "concepts" | "specialDays";
}

export function OfficialConceptsAndDaysPalette({ currentValue, onSelect, mode = "concepts" }: Props) {
  const [selectedCategory, setSelectedCategory] = useState<string>("boyut");
  const [isOpen, setIsOpen] = useState<boolean>(false);

  const handleToggleItem = (itemText: string) => {
    const trimmed = currentValue.trim();
    if (!trimmed) {
      onSelect(itemText);
      return;
    }
    const parts = trimmed.split(/[,;\n•|]+/u).map((s) => s.trim()).filter(Boolean);
    const exists = parts.some((p) => p.toLowerCase() === itemText.toLowerCase());

    if (exists) {
      const filtered = parts.filter((p) => p.toLowerCase() !== itemText.toLowerCase());
      onSelect(filtered.join(", "));
    } else {
      onSelect(`${trimmed}, ${itemText}`);
    }
  };

  const isSelected = (itemText: string) => {
    return currentValue.toLowerCase().includes(itemText.toLowerCase());
  };

  if (!isOpen) {
    return (
      <div className="of-palette-trigger no-print" style={{ margin: "4px 0 10px 0" }}>
        <button
          type="button"
          className="of-palette-toggle-btn"
          onClick={() => setIsOpen(true)}
          style={{
            background: "#eff6ff",
            border: "1px dashed #3b82f6",
            color: "#1d4ed8",
            fontSize: "0.8rem",
            padding: "5px 10px",
            borderRadius: "6px",
            cursor: "pointer",
            fontWeight: 600,
            display: "inline-flex",
            alignItems: "center",
            gap: "6px"
          }}
        >
          <span>🏷️ {mode === "concepts" ? "TTKB EK-7 Resmî Kavram Bankasından Ekle" : "📅 TTKB EK-8 Resmî Belirli Günlerden Ekle"}</span>
          <span style={{ fontSize: "0.75rem", background: "#3b82f6", color: "#fff", padding: "1px 6px", borderRadius: "10px" }}>Aç</span>
        </button>
      </div>
    );
  }

  return (
    <div
      className="of-palette-box no-print"
      style={{
        background: "#f8fafc",
        border: "1px solid #cbd5e1",
        borderRadius: "8px",
        padding: "10px 12px",
        margin: "8px 0 14px 0"
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
        <strong style={{ fontSize: "0.85rem", color: "#1e293b" }}>
          {mode === "concepts" ? "🎯 EK-7 Kavram Listesi (TTKB Sayfa 185–186)" : "📅 EK-8 Belirli Gün ve Haftalar (TTKB Sayfa 187)"}
        </strong>
        <button
          type="button"
          onClick={() => setIsOpen(false)}
          style={{
            background: "none",
            border: "none",
            color: "#64748b",
            fontSize: "0.8rem",
            cursor: "pointer",
            fontWeight: 700
          }}
        >
          ✕ Kapat
        </button>
      </div>

      {mode === "concepts" ? (
        <>
          <div style={{ display: "flex", gap: "4px", overflowX: "auto", paddingBottom: "6px", marginBottom: "8px" }}>
            {Object.entries(TTKB_EK7_CONCEPTS).map(([key, cat]) => (
              <button
                key={key}
                type="button"
                onClick={() => setSelectedCategory(key)}
                style={{
                  padding: "3px 8px",
                  fontSize: "0.75rem",
                  borderRadius: "4px",
                  border: selectedCategory === key ? "1px solid #2563eb" : "1px solid #e2e8f0",
                  background: selectedCategory === key ? "#2563eb" : "#ffffff",
                  color: selectedCategory === key ? "#ffffff" : "#475569",
                  fontWeight: selectedCategory === key ? 700 : 500,
                  whiteSpace: "nowrap",
                  cursor: "pointer"
                }}
              >
                {cat.title}
              </button>
            ))}
          </div>

          <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
            {TTKB_EK7_CONCEPTS[selectedCategory]?.items.map((item) => {
              const active = isSelected(item);
              return (
                <button
                  key={item}
                  type="button"
                  onClick={() => handleToggleItem(item)}
                  style={{
                    padding: "4px 8px",
                    fontSize: "0.78rem",
                    borderRadius: "14px",
                    border: active ? "1px solid #059669" : "1px solid #cbd5e1",
                    background: active ? "#ecfdf5" : "#ffffff",
                    color: active ? "#047857" : "#334155",
                    fontWeight: active ? 700 : 500,
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "4px"
                  }}
                >
                  <span>{item}</span>
                  {active ? <span>✓</span> : <span style={{ opacity: 0.5 }}>+</span>}
                </button>
              );
            })}
          </div>
        </>
      ) : (
        <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", maxHeight: "180px", overflowY: "auto" }}>
          {TTKB_EK8_SPECIAL_DAYS.map((sd) => {
            const label = `${sd.name} (${sd.date})`;
            const active = isSelected(sd.name);
            return (
              <button
                key={sd.name}
                type="button"
                onClick={() => handleToggleItem(label)}
                style={{
                  padding: "4px 8px",
                  fontSize: "0.78rem",
                  borderRadius: "14px",
                  border: active ? "1px solid #059669" : "1px solid #cbd5e1",
                  background: active ? "#ecfdf5" : "#ffffff",
                  color: active ? "#047857" : "#334155",
                  fontWeight: active ? 700 : 500,
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "4px"
                }}
              >
                <span>{sd.name}</span>
                <span style={{ fontSize: "0.7rem", opacity: 0.8 }}>({sd.date})</span>
                {active ? <span>✓</span> : <span style={{ opacity: 0.5 }}>+</span>}
              </button>
            );
          })}
        </div>
      )}
      <div style={{ marginTop: "6px", fontSize: "0.72rem", color: "#64748b" }}>
        💡 Tıkladığınız kavram / gün doğrudan form alanına eklenir. Tekrar tıklayarak kaldırabilirsiniz.
      </div>
    </div>
  );
}
