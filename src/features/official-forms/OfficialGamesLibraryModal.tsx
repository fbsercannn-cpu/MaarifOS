import { downloadOfficialFormWord } from "./official-form-export-service.ts";
import React, { useState } from "react";
import "./official-forms.css";
import { printOfficialFormA4 } from "./official-form-export-service.ts";

export interface GameItem {
  id: string;
  name: string;
  category: "Geleneksel Çocuk Oyunu" | "Hareketli Oyun" | "Dikkat ve Ritim Oyunu" | "Sakinleşme / Çember Oyunu";
  ageBand: string;
  playerCount: string;
  skillsGained: string;
  materials: string;
  howToPlay: string[];
  teacherTip: string;
}

const OFFICIAL_GAMES_DATABASE: GameItem[] = [
  {
    id: "game-1",
    name: "Yağ Satarım, Bal Satarım",
    category: "Geleneksel Çocuk Oyunu",
    ageBand: "48–72 Ay",
    playerCount: "Tüm Sınıf (8–25 Çocuk)",
    skillsGained: "HAB.1 (Hızlı koşma, yön değiştirme), E3.2 (Odaklanma), D12 (Sabırla sıra bekleme)",
    materials: "1 adet mendil veya bez parçası.",
    howToPlay: [
      "Çocuklar yere bağdaş kurarak geniş bir çember oluşturur ve yüzleri merkeze dönük oturur.",
      "Bir ebe seçilir. Ebe elinde mendille çemberin etrafında dönerken sınıf hep birlikte 'Yağ satarım, bal satarım, ustam öldü ben satarım...' şarkısını söyler.",
      "Ebe mendili hissettirmeden bir arkadaşının arkasına bırakır ve koşmaya başlar.",
      "Arkasına mendil bırakılan çocuk mendili fark ettiği anda ebenin peşinden koşar ve ebenin boşalan yere oturmasını engellemeye çalışır.",
      "Ebe yakalanmadan boş yere oturursa, koşan çocuk yeni ebe olur."
    ],
    teacherTip: "Arkasına bakma kuralı netleştirilmeli, çocukların sadece elleriyle arkalarını yoklamaları hatırlatılmalıdır."
  },
  {
    id: "game-2",
    name: "Mendil Kapmaca",
    category: "Geleneksel Çocuk Oyunu",
    ageBand: "60–72 Ay",
    playerCount: "İki Eşit Takım (10–20 Çocuk)",
    skillsGained: "HAB.1 (Hızlı refleks), MAB.1 (Sayı eşleme), SDB2.2 (Takım iş birliği)",
    materials: "1 adet mendil, zemin çizgisi için renkli tebeşir veya şerit.",
    howToPlay: [
      "Sınıf eşit sayıda iki takıma ayrılır ve karşılıklı düz çizgilere dizilir.",
      "Her takımdaki çocuklara 1'den başlayarak numara verilir (1, 2, 3...).",
      "Öğretmen ortada mendili elinde tutarak durur ve bir numara söyler (Örn: '3 numaralar!').",
      "Her iki takımdan 3 numara olan çocuklar hızla ortaya koşar.",
      "Amaç mendili kapıp rakibine dokunulmadan kendi takım çizgisine dönmektir."
    ],
    teacherTip: "Çocukların birbirini itmesini önlemek için dokunmanın sadece omuza hafif bir temas olması gerektiği vurgulanmalıdır."
  },
  {
    id: "game-3",
    name: "Körebe",
    category: "Geleneksel Çocuk Oyunu",
    ageBand: "48–72 Ay",
    playerCount: "6–15 Çocuk",
    skillsGained: "FAB.1 (İşitsel ve dokunsal duyu gelişimi), SAB.3 (Mekânsal yön algısı)",
    materials: "Gözleri kapatmak için yumuşak bir tülbent/fular.",
    howToPlay: [
      "Bir ebe seçilir ve gözleri tülbentle nazikçe bağlanır.",
      "Diğer çocuklar ebenin etrafında toplanır ve 'Körebe sesime gel!' diyerek ses çıkarır.",
      "Ebe sesleri takip ederek dokunabileceği bir arkadaşını yakalamaya çalışır.",
      "Yakalanan çocuğun yüzüne veya saçına dokunarak kim olduğunu tahmin ederse o çocuk yeni ebe olur."
    ],
    teacherTip: "Oyun alanındaki keskin köşeli materyaller kenara çekilmeli, güvenli bir zemin sağlanmalıdır."
  },
  {
    id: "game-4",
    name: "Heykel ve Donma Oyunu (Müzikli Ritim)",
    category: "Dikkat ve Ritim Oyunu",
    ageBand: "36–72 Ay",
    playerCount: "Tüm Sınıf",
    skillsGained: "SDB1.2 (Öz kontrol / Dürtü kontrolü), MZB.1 (Müziksel ritim ve hareket)",
    materials: "Ritim tefi veya hareketli bir çocuk şarkısı.",
    howToPlay: [
      "Müzik başladığında çocuklar sınıfta serbestçe dans eder veya ritme uygun yürür.",
      "Öğretmen müziği aniden durdurduğunda 'DON!' der.",
      "Çocuklar o anki hareketlerinde hiç kıpırdamadan heykel gibi donup kalır.",
      "Gülümseyen veya kıpırdayan çocuk oyun dışı kalmaz; 'Gözlemci Hakem' olarak bir sonraki donanları inceler."
    ],
    teacherTip: "Oyunun eğlence odaklı kalması için elenen çocuk cezalandırılmamalı, sevimli heykeller alkışlanmalıdır."
  },
  {
    id: "game-5",
    name: "Kurt Baba, Saat Kaç?",
    category: "Hareketli Oyun",
    ageBand: "48–72 Ay",
    playerCount: "8–20 Çocuk",
    skillsGained: "MAB.1 (Sayı sayma ve adım eşleme), HAB.1 (Büyük motor hızlanma)",
    materials: "Herhangi bir materyal gerekmez.",
    howToPlay: [
      "Bir çocuk 'Kurt Baba' seçilir ve sırtı duvara dönük durur.",
      "Diğer çocuklar başlangıç çizgisinde durup koro halinde 'Kurt Baba saat kaç?' diye sorar.",
      "Kurt Baba bir saat söyler (Örn: 'Saat 3!'). Çocuklar 3 adım ileri yürür.",
      "Kurt Baba aniden arkasını dönüp 'Yemek vakti!' dediğinde çocuklar başlangıç çizgisine geri kaçar; Kurt Baba birini yakalamaya çalışır."
    ],
    teacherTip: "Adımların büyük/küçük olması üzerine matematiksel karşılaştırma soruları yöneltilebilir."
  }
];

interface Props {
  onClose?: () => void;
}

export function OfficialGamesLibraryModal({ onClose }: Props) {
  const [selectedGameId, setSelectedGameId] = useState<string>("game-1");
  const [wheelSpinning, setWheelSpinning] = useState(false);

  const activeGame = OFFICIAL_GAMES_DATABASE.find((g) => g.id === selectedGameId) || OFFICIAL_GAMES_DATABASE[0];

  const handleSpinWheel = () => {
    setWheelSpinning(true);
    let count = 0;
    const interval = setInterval(() => {
      const randomIdx = Math.floor(Math.random() * OFFICIAL_GAMES_DATABASE.length);
      setSelectedGameId(OFFICIAL_GAMES_DATABASE[randomIdx].id);
      count++;
      if (count > 12) {
        clearInterval(interval);
        setWheelSpinning(false);
      }
    }, 100);
  };

  const handlePrint = () => {
    printOfficialFormA4(`TYMM_Oyun_Kartlari_Kutuphanesi`);
  };

  const handleDownloadDoc = () => downloadOfficialFormWord("OfficialGamesLibraryModal");

  const handleDownloadExcel = async () => {
    const { exportOfficialTableToExcel } = await import("./official-form-export-service.ts");
    const rows = OFFICIAL_GAMES_DATABASE.map((game, index) => ({
      no: index + 1,
      name: game.name,
      category: game.category,
      ageBand: game.ageBand,
      playerCount: game.playerCount,
      skillsGained: game.skillsGained,
      materials: game.materials,
      howToPlay: game.howToPlay.join("\n"),
      teacherTip: game.teacherTip,
    }));

    await exportOfficialTableToExcel({
      fileName: "MEB_Resmi_Oyun_Sandigi_ve_Geleneksel_Oyunlar",
      sheetName: "Oyun Kütüphanesi",
      title: "T.C. MİLLÎ EĞİTİM BAKANLIĞI — RESMÎ OYUN SANDIĞI & GELENEKSEL ÇOCUK OYUNLARI KATALOĞU",
      subtitle: "TTKB Sayfa 86–91 Okul Öncesinde Oyun Standartları",
      metadata: [
        { label: "Oyun Havuzu", value: "Tüm Kategoriler" },
        { label: "Kapsanan Oyun Sayısı", value: `${OFFICIAL_GAMES_DATABASE.length} Oyun` },
      ],
      columns: [
        { header: "Sıra", key: "no", width: 6, align: "center", isNumeric: true },
        { header: "Oyun Adı", key: "name", width: 25, align: "left" },
        { header: "Kategori", key: "category", width: 22, align: "left" },
        { header: "Yaş Bandı", key: "ageBand", width: 14, align: "center" },
        { header: "Oyuncu Sayısı", key: "playerCount", width: 18, align: "center" },
        { header: "Desteklenen Beceriler", key: "skillsGained", width: 35, align: "left" },
        { header: "Gerekli Materyaller", key: "materials", width: 25, align: "left" },
        { header: "Nasıl Oynanır (Kurallar)", key: "howToPlay", width: 50, align: "left" },
        { header: "Öğretmene Pedagojik İpucu", key: "teacherTip", width: 35, align: "left" },
      ],
      rows,
      includeSubtotals: false,
    });
  };

  return (
    <div className="official-form-container">
      {/* ÜST BAŞLIK & ARAÇLAR */}
      <div className="official-form-header print-hidden">
        <div>
          <h2 style={{ margin: "0 0 4px 0", fontSize: "1.25rem", color: "#c2410c", display: "flex", alignItems: "center", gap: "8px" }}>
            <span>🎲</span>
            <span>Resmî Oyun Sandığı &amp; Geleneksel Çocuk Oyunları Çarkı</span>
          </h2>
          <p style={{ margin: 0, fontSize: "0.85rem", color: "#64748b" }}>
            TTKB Sayfa 86–91 Okul Öncesinde Oyun Standartları | Güne başlama ve serbest zaman için tek tıkla oyun
          </p>
        </div>

        <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
          <button
            onClick={handleDownloadExcel}
            style={{
              padding: "7px 12px",
              background: "#15803d",
              color: "#fff",
              border: "none",
              borderRadius: "6px",
              fontWeight: 600,
              fontSize: "0.85rem",
              cursor: "pointer",
            }}
          >
            📊 Excel (.xlsx)
          </button>
          <button
            onClick={handleSpinWheel}
            disabled={wheelSpinning}
            style={{
              padding: "7px 14px",
              background: wheelSpinning ? "#94a3b8" : "#ea580c",
              color: "#fff",
              border: "none",
              borderRadius: "6px",
              fontWeight: 700,
              fontSize: "0.85rem",
              cursor: wheelSpinning ? "not-allowed" : "pointer",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              boxShadow: "0 2px 6px rgba(234, 88, 12, 0.3)",
            }}
          >
            <span>{wheelSpinning ? "🌀" : "🎲"}</span>
            <span>{wheelSpinning ? "Oyun Seçiliyor..." : "Rastgele Oyun Seç (Çark)"}</span>
          </button>
          <button
            onClick={handleDownloadDoc}
            style={{
              padding: "7px 12px",
              background: "#0284c7",
              color: "#fff",
              border: "none",
              borderRadius: "6px",
              fontWeight: 600,
              fontSize: "0.85rem",
              cursor: "pointer",
            }}
          >
            💾 Word (.docx) İndir
          </button>
          <button
            onClick={handlePrint}
            style={{
              padding: "7px 12px",
              background: "#4f46e5",
              color: "#fff",
              border: "none",
              borderRadius: "6px",
              fontWeight: 600,
              fontSize: "0.85rem",
              cursor: "pointer",
            }}
          >
            🖨️ A4 Oyun Kartı Yazdır
          </button>
          {onClose && (
            <button
              onClick={onClose}
              style={{
                padding: "7px 12px",
                background: "#f1f5f9",
                color: "#475569",
                border: "1px solid #cbd5e1",
                borderRadius: "6px",
                fontWeight: 600,
                fontSize: "0.85rem",
                cursor: "pointer",
              }}
            >
              Kapat
            </button>
          )}
        </div>
      </div>

      {/* OYUN SEÇİM BUTONLARI */}
      <div className="print-hidden" style={{ display: "flex", gap: "8px", margin: "14px 0", overflowX: "auto", paddingBottom: "4px" }}>
        {OFFICIAL_GAMES_DATABASE.map((game) => (
          <button
            key={game.id}
            onClick={() => setSelectedGameId(game.id)}
            style={{
              padding: "6px 14px",
              borderRadius: "20px",
              border: selectedGameId === game.id ? "2px solid #ea580c" : "1px solid #cbd5e1",
              background: selectedGameId === game.id ? "#fff7ed" : "#ffffff",
              color: selectedGameId === game.id ? "#c2410c" : "#475569",
              fontWeight: 700,
              fontSize: "0.82rem",
              cursor: "pointer",
              whiteSpace: "nowrap",
            }}
          >
            {game.name}
          </button>
        ))}
      </div>

      {/* CANLI A4 OYUN KARTI */}
      <div
        className="official-print-document"
        style={{
          background: "#ffffff",
          border: "1px solid #e2e8f0",
          borderRadius: "10px",
          padding: "24px",
          boxShadow: "0 4px 12px rgba(0,0,0,0.04)",
          fontFamily: "'Segoe UI', Roboto, sans-serif",
        }}
      >
        <div style={{ textAlign: "center", borderBottom: "2px solid #ea580c", paddingBottom: "14px", marginBottom: "18px" }}>
          <div style={{ fontSize: "0.82rem", fontWeight: 800, color: "#64748b", textTransform: "uppercase" }}>
            T.C. MİLLÎ EĞİTİM BAKANLIĞI · TÜRKİYE YÜZYILI MAARİF MODELİ
          </div>
          <h1 style={{ margin: "6px 0 2px 0", fontSize: "1.5rem", color: "#c2410c", fontWeight: 800 }}>
            {activeGame.name}
          </h1>
          <div style={{ display: "flex", justifyContent: "center", gap: "10px", marginTop: "6px", fontSize: "0.82rem", fontWeight: 600 }}>
            <span style={{ background: "#fff7ed", color: "#c2410c", padding: "2px 10px", borderRadius: "12px" }}>
              🏷️ {activeGame.category}
            </span>
            <span style={{ background: "#f1f5f9", color: "#334155", padding: "2px 10px", borderRadius: "12px" }}>
              🎂 {activeGame.ageBand}
            </span>
            <span style={{ background: "#f1f5f9", color: "#334155", padding: "2px 10px", borderRadius: "12px" }}>
              👥 {activeGame.playerCount}
            </span>
          </div>
        </div>

        {/* BİLGİ KUTULARI */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px", marginBottom: "18px" }}>
          <div style={{ background: "#f0f9ff", border: "1px solid #bae6fd", borderRadius: "8px", padding: "12px" }}>
            <div style={{ fontSize: "0.82rem", fontWeight: 800, color: "#0369a1", marginBottom: "4px" }}>
              🎯 Kazandırdığı Beceriler &amp; Değerler:
            </div>
            <div style={{ fontSize: "0.84rem", color: "#0c4a6e" }}>
              {activeGame.skillsGained}
            </div>
          </div>
          <div style={{ background: "#fefce8", border: "1px solid #fef08a", borderRadius: "8px", padding: "12px" }}>
            <div style={{ fontSize: "0.82rem", fontWeight: 800, color: "#854d0e", marginBottom: "4px" }}>
              📦 Gerekli Materyaller:
            </div>
            <div style={{ fontSize: "0.84rem", color: "#713f12" }}>
              {activeGame.materials}
            </div>
          </div>
        </div>

        {/* NASIL OYNANIR ADIMLARI */}
        <div style={{ marginBottom: "18px" }}>
          <div style={{ fontSize: "0.95rem", fontWeight: 800, color: "#1e293b", marginBottom: "10px", display: "flex", alignItems: "center", gap: "6px" }}>
            <span>▶️</span>
            <span>NASIL OYNANIR? (UYGULAMA ADIMLARI)</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {activeGame.howToPlay.map((step, idx) => (
              <div
                key={idx}
                style={{
                  display: "flex",
                  gap: "10px",
                  background: "#f8fafc",
                  padding: "10px 14px",
                  borderRadius: "6px",
                  borderLeft: "4px solid #ea580c",
                }}
              >
                <span style={{ fontWeight: 800, color: "#c2410c", fontSize: "0.9rem" }}>{idx + 1}.</span>
                <span style={{ fontSize: "0.85rem", color: "#334155", lineHeight: 1.45 }}>{step}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ÖĞRETMENE PEDAGOJİK İPUCU */}
        <div style={{ background: "#fdf2f8", border: "1px solid #fbcfe8", borderRadius: "8px", padding: "12px", borderLeft: "4px solid #db2777" }}>
          <div style={{ fontSize: "0.82rem", fontWeight: 800, color: "#9d174d", marginBottom: "4px" }}>
            💡 Öğretmene Pedagojik İpucu ve Sınıf Yönetimi:
          </div>
          <div style={{ fontSize: "0.84rem", color: "#831843", fontStyle: "italic" }}>
            {activeGame.teacherTip}
          </div>
        </div>
      </div>
    </div>
  );
}
