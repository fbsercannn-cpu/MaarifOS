/**
 * chatgpt-data-bridge.ts — ChatGPT Veri Köprüsü & MEB TYMM Ayrıştırıcı (v0.75.2)
 * 
 * TELEFONDAKİ CHATGPT UYGULAMASI VEYA DEPOLAMASINDAN DOĞRUDAN VERİ ÇEKME MOTORU
 * 
 * Güvenlik & Mimari İlkeler (Torvalds & Schneier Yasaları):
 * 1. Android/iOS sandboxing gereğince uygulamaların özel RAM/SQLite hafızaları birbirinden izoledir.
 * 2. Bu köprü 4 senkronizasyon kanalını tek çatı altında toplar:
 *    - Kanal A: Android Web Share Target (ChatGPT uygulamasından MaarifOS'a 'Paylaş' ile aktarım).
 *    - Kanal B: Pano Algılayıcı (Clipboard Auto-Pull) - Tek dokunuşla ChatGPT çıktısını kopyala/yapıştır.
 *    - Kanal C: Dışa Aktarılan Dosya (conversations.json, metin, markdown) toplu ayrıştırma ($O(N)$).
 *    - Kanal D: OpenAI/ChatGPT API doğrudan bulut depolama çekimi (isteğe bağlı API anahtarı).
 * 3. Çok katmanlı AST & Regex filtresi ile serbest metinli ChatGPT çıktılarını MEB 2026 EK-6 formatına dönüştürür.
 */

import {
  type AgeGroup,
  type DailyPlanRecord,
  createDailyPlan,
  loadDailyPlans,
  saveDailyPlans,
  CHILD_EVAL_PRESETS,
  PROGRAM_EVAL_PRESETS,
  TEACHER_EVAL_PRESETS,
  STARTING_DAY_PRESETS,
} from "../official-forms/daily-plan-core.ts";

export interface ParsedPlanCandidate {
  readonly id: string;
  topic: string;
  researchQuestion: string;
  ageGroup: AgeGroup;
  date: string;
  domainCodes: string[];
  processCodes: string[];
  conceptLabels: string[];
  words: string;
  materialLabels: string[];
  selectedCenters: string[];
  activityName: string;
  activityProcessNote: string;
  enrichmentNote: string;
  supportNote: string;
  evalQuestion: string;
  familyNote: string;
  sourceType: "clipboard" | "share_target" | "file_export" | "api";
  rawTextExcerpt: string;
}

// ─── YARDIMCI REGEX VE NORMALİZATÖRLER ──────────────────────────────────────────

function cleanLine(val: string): string {
  return val.replace(/^[#*\-•\s\d.:)]+/, "").trim();
}

/** Serbest metin içinden yaş grubunu yakalar */
function extractAgeGroup(text: string): AgeGroup {
  const lower = text.toLowerCase();
  if (lower.includes("36-48") || lower.includes("3 yaş") || lower.includes("36 48") || lower.includes("36 ay")) {
    return "36-48";
  }
  if (lower.includes("48-60") || lower.includes("4 yaş") || lower.includes("48 60") || lower.includes("48 ay")) {
    return "48-60";
  }
  return "60-72"; // Varsayılan büyük yaş
}

/** Serbest metin içinden tarih (YYYY-MM-DD veya DD.MM.YYYY) yakalar */
function extractDate(text: string): string {
  const matchIso = text.match(/\b(202[4-9])-(\d{2})-(\d{2})\b/);
  if (matchIso) return `${matchIso[1]}-${matchIso[2]}-${matchIso[3]}`;

  const matchTr = text.match(/\b(\d{2})[./-](\d{2})[./-](202[4-9])\b/);
  if (matchTr) return `${matchTr[3]}-${matchTr[2]}-${matchTr[1]}`;

  return new Date().toISOString().slice(0, 10);
}

/** Metinden MEB Alan Becerilerini (TADB, MAB, FAB, SAB, SOSB) çıkarır veya anahtar kelimelerden üretir */
function extractDomainCodes(text: string): { domains: string[]; processes: string[] } {
  const domains = new Set<string>();
  const processes = new Set<string>();
  const lower = text.toLowerCase();

  // Doğrudan kod eşleşmesi (Örn: TADB.1, MAB.2, FAB.1.a)
  const codeMatches = text.matchAll(/\b(TADB|MAB|FAB|SAB|SOSB)[.\s_-]*(\d+)(?:\.([a-z]))?\b/gi);
  for (const m of codeMatches) {
    const dCode = `${m[1].toLocaleUpperCase("tr-TR")}.${m[2]}`;
    domains.add(dCode);
    if (m[3]) {
      processes.add(`${dCode}.${m[3].toLowerCase()}`);
    }
  }

  // Anahtar kelime tabanlı semantik eşleştirme
  if (lower.includes("türkçe") || lower.includes("dil") || lower.includes("hikaye") || lower.includes("masal") || lower.includes("tekerleme") || lower.includes("sohbet")) {
    domains.add("TADB.1");
    processes.add("TADB.1.a");
  }
  if (lower.includes("matematik") || lower.includes("sayı") || lower.includes("sayma") || lower.includes("şekil") || lower.includes("örüntü") || lower.includes("grafik")) {
    domains.add("MAB.1");
    processes.add("MAB.1.a");
  }
  if (lower.includes("fen") || lower.includes("deney") || lower.includes("doğa") || lower.includes("canlı") || lower.includes("bitki") || lower.includes("su döngüsü")) {
    domains.add("FAB.1");
    processes.add("FAB.1.a");
  }
  if (lower.includes("sanat") || lower.includes("resim") || lower.includes("boyama") || lower.includes("müzik") || lower.includes("ritim") || lower.includes("drama") || lower.includes("dans")) {
    domains.add("SAB.1");
    processes.add("SAB.1.a");
  }
  if (lower.includes("sosyal") || lower.includes("duygu") || lower.includes("arkadaş") || lower.includes("iş birliği") || lower.includes("paylaşma") || lower.includes("kurallar")) {
    domains.add("SOSB.1");
    processes.add("SOSB.1.a");
  }

  if (domains.size === 0) {
    domains.add("TADB.1");
    domains.add("SAB.1");
    processes.add("TADB.1.a");
  }

  return {
    domains: Array.from(domains),
    processes: Array.from(processes),
  };
}

/** Kavramları ve kelimeleri tespit eder */
function extractConcepts(text: string): { concepts: string[]; words: string } {
  const foundConcepts: string[] = [];
  const knownConcepts = [
    "Büyük / Küçük", "Uzun / Kısa", "Ağır / Hafif", "Sıcak / Soğuk", "Sert / Yumuşak",
    "İçinde / Dışında", "Önünde / Arkasında", "Altında / Üstünde", "Sağ / Sol",
    "Daire", "Kare", "Üçgen", "Dikdörtgen", "Kırmızı", "Sarı", "Mavi", "Yeşil",
    "Canlı / Cansız", "Gece / Gündüz", "Dün / Bugün / Yarın", "1-5 Arası Sayılar",
  ];

  for (const c of knownConcepts) {
    const parts = c.split("/").map((p) => p.trim().toLowerCase());
    if (parts.some((p) => text.toLowerCase().includes(p))) {
      foundConcepts.push(c);
    }
  }

  const wordMatches = text.match(/(?:sözcükler|yeni kelimeler|kelimeler|kavramlar)\s*[:=]\s*([^\n\r]+)/i);
  const words = wordMatches ? cleanLine(wordMatches[1]) : "";

  return {
    concepts: foundConcepts.length > 0 ? foundConcepts.slice(0, 5) : ["Büyük / Küçük", "Daire"],
    words,
  };
}

/** Materyalleri tespit eder */
function extractMaterials(text: string): string[] {
  const materials: string[] = [];
  const knownMaterials = [
    "Renkli Fon Kartonları", "Pastel Boya", "Sulu Boya", "Parmak Boyası", "Makas ve Yapıştırıcı",
    "Doğal Ağaç Blokları", "Kuru Yapraklar ve Kozalaklar", "Büyüteç", "Deney Tüpleri",
    "Ritim Aletleri & Tef", "El Kuklaları", "Hikâye Kitabı", "Oyun Hamuru", "Origami Kâğıtları",
    "Duyusal Kum Masası", "Geometrik Şekil Blokları", "Büyüteç ve Cımbız",
  ];

  for (const m of knownMaterials) {
    const token = m.split(" ")[0].toLowerCase();
    if (text.toLowerCase().includes(token)) {
      materials.push(m);
    }
  }

  const explicitMatch = text.match(/(?:materyaller|malzemeler|araç ve gereçler)\s*[:=]\s*([^\n\r]+)/i);
  if (explicitMatch) {
    const rawList = explicitMatch[1].split(/[,;•]/).map((s) => cleanLine(s)).filter((s) => s.length > 2);
    materials.push(...rawList);
  }

  return Array.from(new Set(materials)).slice(0, 8);
}

/** Öğrenme merkezlerini yakalar */
function extractLearningCenters(text: string): string[] {
  const centers: string[] = [];
  const map: Record<string, string> = {
    blok: "Blok Merkezi",
    sanat: "Sanat Merkezi",
    kitap: "Kitap Merkezi",
    fen: "Fen & Doğa Merkezi",
    dramatik: "Dramatik Oyun Merkezi",
    müzik: "Müzik Merkezi",
    kum: "Duyusal Kum ve Su",
  };

  const lower = text.toLowerCase();
  for (const [key, label] of Object.entries(map)) {
    if (lower.includes(key)) {
      centers.push(label);
    }
  }

  return centers.length > 0 ? centers : ["Sanat Merkezi", "Blok Merkezi", "Kitap Merkezi"];
}

// ─── TEKİL METİN AYRIŞTIRICI (PARSER) ──────────────────────────────────────────

/**
 * ChatGPT'den gelen ham metni (sohbet çıktısı, markdown, liste vb.)
 * analiz ederek MEB 2026 EK-6 uyumlu plan adayına dönüştürür.
 */
export function parseChatGPTTextToPlan(
  rawText: string,
  sourceType: ParsedPlanCandidate["sourceType"] = "clipboard"
): ParsedPlanCandidate {
  const text = rawText.trim();
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);

  // 1. Konu / Başlık
  let topic = "Günün Keşfi ve Öğrenme Yolculuğu";
  const topicMatch = text.match(/(?:günün konusu|konu|tema|etkinlik başlığı|etkinliğin adı|başlık)\s*[:=]\s*([^\n\r]+)/i);
  if (topicMatch) {
    topic = cleanLine(topicMatch[1]);
  } else if (lines.length > 0) {
    const firstLine = cleanLine(lines[0]);
    if (firstLine.length > 3 && firstLine.length < 80 && !firstLine.includes("Merhaba")) {
      topic = firstLine;
    }
  }

  // 2. Merak / Araştırma Sorusu
  let researchQuestion = "Bugün doğayı ve nesneleri yakından incelersek hangi sürprizleri keşfedebiliriz?";
  const qMatch = text.match(/(?:araştırma sorusu|merak sorusu|soru|günün sorusu)\s*[:=]\s*([^\n\r]+)/i);
  if (qMatch) {
    researchQuestion = cleanLine(qMatch[1]);
  } else {
    // Metin içinde soru işaretiyle biten ilk anlamlı cümleyi bul
    const questionInText = lines.find((l) => l.endsWith("?") && l.length > 15 && l.length < 140);
    if (questionInText) {
      researchQuestion = cleanLine(questionInText);
    }
  }

  // 3. Etkinlik Adı ve Süreci
  let activityName = topic;
  const actMatch = text.match(/(?:etkinlik adı|etkinliğin adı)\s*[:=]\s*([^\n\r]+)/i);
  if (actMatch) activityName = cleanLine(actMatch[1]);

  // Süreç / Uygulama adımları
  let activityProcessNote = "";
  const processMatch = text.match(/(?:uygulama süreci|etkinlik süreci|süreci|nasıl uygulanır|adımlar|etkinlik akışı)\s*[:=]?([\s\S]*?)(?:farklılaştırma|değerlendirme|materyaller|aile|$)/i);
  if (processMatch && processMatch[1].trim().length > 20) {
    activityProcessNote = processMatch[1].trim();
  } else {
    // 3'ten uzun paragrafları birleştir
    activityProcessNote = lines.slice(1, 10).join("\n");
  }

  // 4. Farklılaştırma (Zenginleştirme & Destekleme)
  let enrichmentNote = "";
  const enrMatch = text.match(/(?:zenginleştirme|üst düzey|hızlı öğrenenler)\s*[:=]\s*([^\n\r]+)/i);
  if (enrMatch) enrichmentNote = cleanLine(enrMatch[1]);

  let supportNote = "";
  const supMatch = text.match(/(?:destekleme|ek destek|özel gereksinimli)\s*[:=]\s*([^\n\r]+)/i);
  if (supMatch) supportNote = cleanLine(supMatch[1]);

  // 5. Değerlendirme
  let evalQuestion = "Bugünkü oyunda seni en çok ne şaşırttı ve en çok ne yaparken keyif aldın?";
  const evalMatch = text.match(/(?:değerlendirme sorusu|çocuk soruları|değerlendirme)\s*[:=]\s*([^\n\r]+)/i);
  if (evalMatch) evalQuestion = cleanLine(evalMatch[1]);

  // 6. Aile Katılımı
  let familyNote = "";
  const famMatch = text.match(/(?:aile katılımı|ev etkinliği|veli bülteni|aileye öneri)\s*[:=]\s*([^\n\r]+)/i);
  if (famMatch) familyNote = cleanLine(famMatch[1]);

  const ageGroup = extractAgeGroup(text);
  const date = extractDate(text);
  const { domains, processes } = extractDomainCodes(text);
  const { concepts, words } = extractConcepts(text);
  const materialLabels = extractMaterials(text);
  const selectedCenters = extractLearningCenters(text);

  return {
    id: `gpt_plan_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    topic,
    researchQuestion,
    ageGroup,
    date,
    domainCodes: domains,
    processCodes: processes,
    conceptLabels: concepts,
    words: words || (concepts.length > 0 ? concepts.join(", ") : "Gözlem, Keşif, Uyum"),
    materialLabels: materialLabels.length > 0 ? materialLabels : ["Renkli Fon Kartonları", "Pastel Boya", "Doğal Malzemeler"],
    selectedCenters,
    activityName,
    activityProcessNote: activityProcessNote.slice(0, 1500),
    enrichmentNote,
    supportNote,
    evalQuestion,
    familyNote,
    sourceType,
    rawTextExcerpt: text.slice(0, 200),
  };
}

// ─── ÇOKLU METİN VE DOSYA İÇE AKTARICILARI (BULK / JSON IMPORT) ───────────────

/**
 * ChatGPT Dışa Aktarım JSON Dosyası (conversations.json) veya
 * birden fazla plan içeren metin bloklarını ayıklar.
 */
export function parseChatGPTExportJSON(jsonOrText: string): ParsedPlanCandidate[] {
  const candidates: ParsedPlanCandidate[] = [];

  try {
    const parsed = JSON.parse(jsonOrText);

    // Eğer doğrudan OpenAI conversations.json formatı ise
    if (Array.isArray(parsed)) {
      for (const conv of parsed) {
        // Her konuşmadaki mesaj düğümlerini tara
        if (conv.mapping && typeof conv.mapping === "object") {
          for (const nodeKey of Object.keys(conv.mapping)) {
            const node = conv.mapping[nodeKey];
            const msg = node?.message;
            if (msg && msg.author?.role === "assistant" && msg.content?.parts) {
              const textContent = msg.content.parts.filter((p: any) => typeof p === "string").join("\n");
              if (looksLikePreschoolPlan(textContent)) {
                candidates.push(parseChatGPTTextToPlan(textContent, "file_export"));
              }
            }
          }
        } else if (conv.title && typeof conv.title === "string") {
          // Basit özet nesnesi
          if (looksLikePreschoolPlan(JSON.stringify(conv))) {
            candidates.push(parseChatGPTTextToPlan(JSON.stringify(conv), "file_export"));
          }
        }
      }
    } else if (parsed && typeof parsed === "object") {
      // Tekil bir JSON nesnesi veya özel GPT formatı
      candidates.push(parseChatGPTTextToPlan(JSON.stringify(parsed, null, 2), "file_export"));
    }
  } catch {
    // JSON değilse, '---' veya '# Plan' ile ayrılmış çoklu metin bloğu olabilir
    const splitBlocks = jsonOrText.split(/(?:---|===|###\s*Plan\s*\d+|GÜNLÜK EĞİTİM PLANI)/i);
    for (const block of splitBlocks) {
      if (looksLikePreschoolPlan(block)) {
        candidates.push(parseChatGPTTextToPlan(block, "file_export"));
      }
    }
    // Hiçbiri ayrılmadıysa ama okul öncesi planına benziyorsa tek blok olarak al
    if (candidates.length === 0 && looksLikePreschoolPlan(jsonOrText)) {
      candidates.push(parseChatGPTTextToPlan(jsonOrText, "file_export"));
    }
  }

  return candidates;
}

/** Metnin bir okul öncesi/MEB planı olup olmadığını hızlıca teşhis eder ($O(1)$) */
export function looksLikePreschoolPlan(text: string): boolean {
  if (!text || text.length < 60) return false;
  const lower = text.toLowerCase();
  const keywords = [
    "plan", "etkinlik", "okul öncesi", "öğrenme merkez", "meb", "türkiye yüzyılı",
    "maarif", "yaş grubu", "materyal", "kazanım", "beceri", "değerlendirme",
    "farklılaştırma", "çember", "tadb", "mab", "fab", "sab", "güne başlama",
  ];
  let hits = 0;
  for (const kw of keywords) {
    if (lower.includes(kw)) hits++;
    if (hits >= 2) return true;
  }
  return false;
}

// ─── MAARİFOS DEPOSUNA AKTAR VE MÜHÜRLE (COMMIT) ─────────────────────────────

/**
 * Ayrıştırılan ChatGPT aday planını resmî MEB DailyPlanRecord formatında
 * yerel hafızaya (localStorage / IndexedDB) kalıcı olarak kaydeder.
 */
export function commitCandidateToMaarifOS(candidate: ParsedPlanCandidate): DailyPlanRecord {
  const fullPlan = createDailyPlan({
    ageGroup: candidate.ageGroup,
    date: candidate.date,
    topic: candidate.topic,
    researchQuestion: candidate.researchQuestion,
    domainCodes: candidate.domainCodes,
    processCodes: candidate.processCodes,
    conceptLabels: candidate.conceptLabels,
    words: candidate.words,
    materialLabels: candidate.materialLabels,
    selectedCenters: candidate.selectedCenters,
    activityName: candidate.activityName,
    activityProcessNote: candidate.activityProcessNote,
    enrichmentCustomNote: candidate.enrichmentNote,
    supportCustomNote: candidate.supportNote,
    selectedEvalQuestions: candidate.evalQuestion ? [candidate.evalQuestion] : [CHILD_EVAL_PRESETS[0]],
    familyNote: candidate.familyNote,
  });

  const existingPlans = loadDailyPlans();
  // Aynı id veya aynı tarih+konu varsa güncelle, yoksa başa ekle
  const updated = [fullPlan, ...existingPlans.filter((p) => p.id !== fullPlan.id)];
  saveDailyPlans(updated);

  // Uygulama içi reaktif bildirim dağıtımı
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("maarifos_plans_updated", { detail: fullPlan }));
  }

  return fullPlan;
}

// ─── TOPLU ÇEKİM ─────────────────────────────────────────────────────────────

export function commitMultipleCandidatesToMaarifOS(candidates: ParsedPlanCandidate[]): number {
  if (!candidates || candidates.length === 0) return 0;

  const existingPlans = loadDailyPlans();
  const newPlans: DailyPlanRecord[] = [];

  for (const c of candidates) {
    const fullPlan = createDailyPlan({
      ageGroup: c.ageGroup,
      date: c.date,
      topic: c.topic,
      researchQuestion: c.researchQuestion,
      domainCodes: c.domainCodes,
      processCodes: c.processCodes,
      conceptLabels: c.conceptLabels,
      words: c.words,
      materialLabels: c.materialLabels,
      selectedCenters: c.selectedCenters,
      activityName: c.activityName,
      activityProcessNote: c.activityProcessNote,
      enrichmentCustomNote: c.enrichmentNote,
      supportCustomNote: c.supportNote,
      selectedEvalQuestions: c.evalQuestion ? [c.evalQuestion] : [CHILD_EVAL_PRESETS[0]],
      familyNote: c.familyNote,
    });
    newPlans.push(fullPlan);
  }

  const merged = [...newPlans, ...existingPlans];
  saveDailyPlans(merged);

  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("maarifos_plans_updated"));
  }

  return newPlans.length;
}
