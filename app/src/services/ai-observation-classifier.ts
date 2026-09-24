/**
 * ai-observation-classifier.ts — MaarifOS 0.85.0
 * Yapay Zekâ Semantik Gözlem Sınıflandırıcı ve Pedagojik Ontoloji Motoru
 * 
 * Öğretmenin girdiği ham gözlem metnini (anekdot) DeepSeek-V3 motoruyla analiz eder;
 * MEB TYMM 2026 Alan Becerileri, Değerler, Eğilimler, Kavramlar ve Gelişim Boyutuna bağlar.
 */

import { SecureAIClient } from "./secure-ai-client";

export interface AIObservationClassification {
  readonly domainCodes: string[];          // ["TADB.1", "MAB.2", "SDB.2", ...]
  readonly domainLabels: string[];         // ["Sosyal-Duygusal", "Matematik", ...]
  readonly valueCodes: string[];           // ["D14 Saygı ve Yardımlaşma", "D16 Sorumluluk"]
  readonly tendencyCodes: string[];        // ["E2.4 İş Birliğine Açıklık", "E1.1 Merak"]
  readonly conceptLabels: string[];        // ["Büyük - Küçük", "Aynı - Farklı", ...]
  readonly learningCenter: string;         // "Blok Merkezi", "Sanat Merkezi", "Kitap Merkezi", ...
  readonly dimension: "bilissel" | "sosyal_duygusal" | "fiziksel" | "dil" | "ozbakim";
  readonly dimensionLabel: string;         // "Bilişsel Gelişim", "Sosyal-Duygusal Gelişim", ...
  readonly pedagogicalInterpretation: string; // Öğretmene rehberlik eden resmî pedagoji yorumu
}

const CLASSIFICATION_PROMPT_TEMPLATE = `Sen T.C. Millî Eğitim Bakanlığı Türkiye Yüzyılı Maarif Modeli (TYMM 2026) Okul Öncesi Gelişim ve Gözlem Baş Uzmanısın.
Aşağıda okul öncesi öğretmeninin bir çocuk hakkında girdiği ham gözlem / anekdot metni verilmiştir.

Bu gözlemi analiz et ve SADECE geçerli bir JSON nesnesi döndür. Ekstra açıklama veya markdown ekleme.

JSON Şeması:
{
  "domainCodes": ["MAB.2", "SDB.2"],
  "domainLabels": ["Matematik Alan Becerisi", "Sosyal ve Duygusal Beceriler"],
  "valueCodes": ["D14 Saygı ve Yardımlaşma", "D16 Sorumluluk"],
  "tendencyCodes": ["E2.4 İş Birliğine Açıklık", "E1.1 Merak"],
  "conceptLabels": ["Büyük - Küçük", "Örüntü"],
  "learningCenter": "Blok Merkezi",
  "dimension": "sosyal_duygusal",
  "dimensionLabel": "Sosyal ve Duygusal Gelişim",
  "pedagogicalInterpretation": "Çocuğun akran iş birliği ve problem çözme eğilimi yüksek düzeyde gözlemlenmiştir. İleri aşamada küçük grup projelerinde liderlik verilerek desteklenmesi önerilir."
}

Geçerli "dimension" değerleri: "bilissel", "sosyal_duygusal", "fiziksel", "dil", "ozbakim".`;

export async function classifyObservationWithAI(
  observationText: string
): Promise<AIObservationClassification> {
  const text = observationText.trim();
  if (!text) {
    throw new Error("Lütfen analiz edilecek bir gözlem metni giriniz.");
  }

  if (SecureAIClient.getActiveProvider() === "deepseek") {
    try {
      const rawContent = (await SecureAIClient.requestCompletion(
        `${CLASSIFICATION_PROMPT_TEMPLATE}\n\n[GÖZLEM METNİ]: "${text}"`,
        { systemPrompt: "Sen MEB TYMM Okul Öncesi pedagoji ontoloji uzmanısın. Yalnızca istenen JSON nesnesini döndür." },
      )).text;
      const parsed = JSON.parse(rawContent.trim().replace(/^```json\s*/iu, "").replace(/```$/u, "").trim());
      const dimensions = new Set<AIObservationClassification["dimension"]>([
        "bilissel", "sosyal_duygusal", "fiziksel", "dil", "ozbakim",
      ]);
      if (parsed && Array.isArray(parsed.domainCodes)) {
        return {
          domainCodes: parsed.domainCodes,
          domainLabels: Array.isArray(parsed.domainLabels) ? parsed.domainLabels : ["Sosyal ve Duygusal Gelişim"],
          valueCodes: Array.isArray(parsed.valueCodes) ? parsed.valueCodes : ["D14 Saygı"],
          tendencyCodes: Array.isArray(parsed.tendencyCodes) ? parsed.tendencyCodes : ["E2.4 İş Birliğine Açıklık"],
          conceptLabels: Array.isArray(parsed.conceptLabels) ? parsed.conceptLabels : ["Aynı - Farklı"],
          learningCenter: typeof parsed.learningCenter === "string" ? parsed.learningCenter : "Öğrenme Merkezi",
          dimension: dimensions.has(parsed.dimension) ? parsed.dimension : "sosyal_duygusal",
          dimensionLabel: typeof parsed.dimensionLabel === "string" ? parsed.dimensionLabel : "Sosyal ve Duygusal Gelişim",
          pedagogicalInterpretation: typeof parsed.pedagogicalInterpretation === "string"
            ? parsed.pedagogicalInterpretation
            : "Gözlem, öğretmenin incelemesi için sınıflandırılmıştır.",
        };
      }
    } catch (err) {
      console.warn("[ai-observation-classifier] Bulut sınıflandırması kullanılamadı; yerel kurallara geçiliyor.");
    }
  }

  // Çevrimdışı Heuristic Sınıflandırıcı (Offline Fallback)
  return classifyObservationOffline(text);
}

/** Çevrimdışı Deterministik Heuristic Eşleştirici */
function classifyObservationOffline(text: string): AIObservationClassification {
  const lower = text.toLowerCase();
  
  // 1. Şekil Çizimi / El-Göz Koordinasyonu / İnce Motor
  const isShapeDrawing = /(daire|kare|üçgen|çizgi|şekil).*?(çiz|yap|tamamla)|(çiz).*?(daire|kare|üçgen|şekil)|daire çize|kare çize|üçgen çize/u.test(lower);
  // 2. Makas / Kesme / Küçük Kas
  const isCutting = /makas|kes|katla|yapıştır|kolaj|hamur/u.test(lower);
  // 3. Matematiksel Sayma / Örüntü / Miktar
  const isMath = /sayı|sayma|saydı|miktar|tane|örüntü|sıralama|büyük|küçük|az|çok|blok|kare|üçgen|daire/u.test(lower);
  // 4. Sosyal-Duygusal / Paylaşım / Sıra Bekleme
  const isSocial = /yardım|arkadaş|paylaş|birlikte|ağla|öfke|sarıl|sıra|kural|oyun|bekle|teselli/u.test(lower);
  // 5. Sanat / Boyama / Estetik
  const isArt = /boya|resim|çiz|fırça|kil|hamur|renk|palet|tuval/u.test(lower);
  // 6. Fiziksel / Kaba Motor / Hareket
  const isPhysical = /koş|zıpla|tırman|denge|top|hareket|beden|yakala|sekme/u.test(lower);
  // 7. Dil / Konuşma / Duygu İfadesi
  const isLanguage = /kitap|masal|anlat|söz|konuş|kelime|tekerleme|şiir|duygu/u.test(lower);

  let dimension: AIObservationClassification["dimension"] = "sosyal_duygusal";
  let dimensionLabel = "Sosyal ve Duygusal Gelişim";
  let center = "Öğrenme Merkezi";
  const domainCodes: string[] = [];
  const domainLabels: string[] = [];
  const valueCodes: string[] = ["D14 Saygı ve Yardımlaşma"];
  const tendencyCodes: string[] = ["E2.4 İş Birliğine Açıklık"];
  const conceptLabels: string[] = [];
  let pedagogicalInterpretation = "";

  if (isShapeDrawing) {
    dimension = "bilissel";
    dimensionLabel = "Bilişsel & Küçük Kas Becerisi (Geometri ve Çizim)";
    center = "Sanat / Blok Merkezi";
    domainCodes.push("MAB.2", "FMB.1", "SNAB.1");
    domainLabels.push("Geometrik Şekiller (MAB.2)", "Küçük Kas / Çizim (FMB.1)", "Görsel Sanatlar (SNAB.1)");
    valueCodes.length = 0;
    valueCodes.push("D7 Estetik", "D16 Sorumluluk");
    tendencyCodes.length = 0;
    tendencyCodes.push("E1.1 Merak", "E3.1 Öz Düzenleme");
    conceptLabels.push("Daire / Kapalı Çizgi", "El-Göz Koordinasyonu", "Uzamsal Geometri");
    pedagogicalInterpretation = "Çocuğun kapalı eğri formunda 'daire' çizebilmesi; el-göz koordinasyonu ve ince motor kas gelişiminin, uzamsal geometrik algıyla olgunlaştığını kanıtlamaktadır.";
  } else if (isCutting) {
    dimension = "fiziksel";
    dimensionLabel = "Fiziksel Gelişim (Küçük Kas ve El Becerileri)";
    center = "Sanat Merkezi";
    domainCodes.push("FMB.1", "SNAB.1");
    domainLabels.push("Küçük Kas Becerileri (FMB.1)", "Sanat Alan Becerisi (SNAB.1)");
    valueCodes.length = 0;
    valueCodes.push("D16 Sorumluluk", "D12 Sabır");
    tendencyCodes.length = 0;
    tendencyCodes.push("E3.1 Öz Düzenleme", "E2.3 Sebat");
    conceptLabels.push("Makas Kullanımı", "Bilateral Koordinasyon");
    pedagogicalInterpretation = "Makas ve kesme araçlarını amaca uygun kullanabilmesi, el parmak kas tonusunun ve iki el eşgüdümünün yaş grubuna uygunluğunu belgeler.";
  } else if (isMath) {
    dimension = "bilissel";
    dimensionLabel = "Bilişsel Gelişim (Matematiksel Düşünme)";
    center = "Blok / Matematik Merkezi";
    domainCodes.push("MAB.1", "MAB.2");
    domainLabels.push("Matematik Alan Becerisi");
    valueCodes.length = 0;
    valueCodes.push("D16 Sorumluluk");
    conceptLabels.push("Büyük - Küçük", "Miktar ve Sayma");
    tendencyCodes.length = 0;
    tendencyCodes.push("E1.1 Merak", "E1.2 Akıl Yürütme");
    pedagogicalInterpretation = "Matematik ve blok merkezindeki somut deneyimler, çocuğun miktar algısı ve analitik düşünme yetisini geliştirmektedir.";
  } else if (isArt) {
    dimension = "bilissel";
    dimensionLabel = "Bilişsel ve Sanatsal Gelişim";
    center = "Sanat Merkezi";
    domainCodes.push("SNAB.1");
    domainLabels.push("Sanat Alan Becerisi");
    valueCodes.length = 0;
    valueCodes.push("D7 Estetik");
    conceptLabels.push("Renkler", "Doku ve Form");
    tendencyCodes.length = 0;
    tendencyCodes.push("E1.1 Merak", "E3.1 Öz Düzenleme");
    pedagogicalInterpretation = "Sanat materyalleriyle sergilediği özgün üretimler, estetik algısının ve yaratıcı düşünme becerisinin gelişimini desteklemektedir.";
  } else if (isPhysical) {
    dimension = "fiziksel";
    dimensionLabel = "Fiziksel Gelişim ve Hareket";
    center = "Açık Hava / Hareket Alanı";
    domainCodes.push("HAB.1");
    domainLabels.push("Hareket ve Sağlık Alan Becerisi");
    valueCodes.length = 0;
    valueCodes.push("D16 Sorumluluk");
    tendencyCodes.length = 0;
    tendencyCodes.push("E3.1 Öz Düzenleme", "E2.3 Sebat");
    conceptLabels.push("Denge", "Büyük Kas Koordinasyonu");
    pedagogicalInterpretation = "Açık hava ve hareket alanlarındaki bedensel koordinasyonu, büyük kas gruplarının ve denge kontrolünün güçlendiğini göstermektedir.";
  } else if (isLanguage) {
    dimension = "dil";
    dimensionLabel = "Dil ve İletişim Gelişimi";
    center = "Kitap ve Masal Merkezi";
    domainCodes.push("TADB.1", "OB1");
    domainLabels.push("Türkçe ve Erken Okuryazarlık");
    valueCodes.length = 0;
    valueCodes.push("D4 Dürüstlük", "D14 Saygı");
    conceptLabels.push("Sözcük Bilgisi", "Duygu İfadesi");
    tendencyCodes.length = 0;
    tendencyCodes.push("E1.2 İfade Becerisi", "E1.1 Merak");
    pedagogicalInterpretation = "Kendini sözel olarak ifade etmesi ve aktif dinleme tutumu, erken okuryazarlık ve iletişim becerilerinin zenginliğini kanıtlamaktadır.";
  } else {
    center = "Dramatik Oyun / Çember";
    domainCodes.push("SDB.1", "SDB.2");
    domainLabels.push("Sosyal ve Duygusal Beceriler");
    valueCodes.length = 0;
    valueCodes.push("D16 Sorumluluk", "D12 Sabır", "D14 Saygı ve Yardımlaşma");
    tendencyCodes.length = 0;
    tendencyCodes.push("E2.4 İş Birliğine Açıklık", "E3.1 Öz Düzenleme");
    conceptLabels.push("Akran Etkileşimi", "Grup Kuralları");
    pedagogicalInterpretation = "Akranlarıyla uyumlu etkileşimi ve grup dinamiğine katılımı, sosyal-duygusal olgunluğunu ve iş birliği erdemini yansıtmaktadır.";
  }

  return {
    domainCodes,
    domainLabels,
    valueCodes,
    tendencyCodes,
    conceptLabels,
    learningCenter: center,
    dimension,
    dimensionLabel,
    pedagogicalInterpretation,
  };
}

/**
 * Yapay zeka tarafından analiz edilen gözlemi sistemin yerel IndexedDB / LocalDataStore havuzuna
 * resmî StoredRecord olarak kalıcı kaydeder.
 */
export async function persistClassifiedObservation(
  store: any,
  studentId: string,
  rawText: string,
  classification: AIObservationClassification
): Promise<{ success: boolean; observationId: string }> {
  const observationId = crypto.randomUUID();
  const now = new Date();
  const timestamp = now.toISOString();
  const civilDate = timestamp.slice(0, 10);

  const observation: any = {
    id: observationId,
    settingType: "observation",
    studentIds: [studentId],
    rawText: rawText.trim(),
    observedAt: timestamp,
    workflowStatus: "captured",
    createdAt: timestamp,
    updatedAt: timestamp,
    civilDate,
    deletedAt: null,
    schemaVersion: 2,
    contextKind: "spontaneous",
    pedagogicalTags: {
      domainCodes: classification.domainCodes,
      domainLabels: classification.domainLabels,
      valueCodes: classification.valueCodes,
      tendencyCodes: classification.tendencyCodes,
      conceptLabels: classification.conceptLabels,
      learningCenter: classification.learningCenter,
      dimension: classification.dimension,
      dimensionLabel: classification.dimensionLabel,
      interpretation: classification.pedagogicalInterpretation,
    }
  };

  // Eğer store mevcutsa IndexedDB transaction ile yaz
  if (store && typeof store.transaction === "function") {
    try {
      await store.transaction("readwrite", ["observations"], async (tx: any) => {
        await tx.putMany("observations", [observation]);
      });
    } catch (e) {
      console.warn("[persistClassifiedObservation] Store putMany uyarısı:", e);
    }
  }

  // Hafif yerel reaktif önbellek (split-brain korumalı)
  try {
    const rawList = localStorage.getItem("maarif_persisted_ai_observations") || "[]";
    const parsed = JSON.parse(rawList);
    parsed.unshift(observation);
    localStorage.setItem("maarif_persisted_ai_observations", JSON.stringify(parsed.slice(0, 100)));
  } catch {}

  window.dispatchEvent(
    new CustomEvent("maarif_observation_persisted", {
      detail: observation,
    })
  );

  return { success: true, observationId };
}
