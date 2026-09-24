/**
 * parent-empathy-shield.ts — MaarifOS 0.91.0
 * Türkiye Yüzyılı Maarif Modeli (TYMM) 2026
 * Veli Empati & Savunma Kalkanı (WhatsApp Micro-Digest Generator)
 * 
 * Felsefe: Vygotsky / Maria Montessori & Gelir Uzmanı / GİB Hukuk Disiplini
 * 
 * Okul öncesi öğretmeninin enerjisini tüketen veli kaygısını yatıştıran;
 * sınıf içi hızlı gözlemleri, etiketlemeden arındırılmış (non-stigmatizing),
 * MEB TYMM 2026 erdem ve becerilerine odaklı, 2 cümlelik saygılı veli
 * WhatsApp bilgilendirme notlarına dönüştüren akıllı pedagojik motor.
 * 
 * %100 İstemci Taraflı (Stateless Client-Side) & Sıfır Bulut Bağımlılığı.
 */

export interface ParentEmpathyDigestInput {
  studentName: string;
  studentPhone?: string;
  observationText: string;
  customValue?: string;
  learningCenter?: string;
}

export interface ParentEmpathyDigest {
  studentName: string;
  studentPhone?: string;
  associatedValue: string;
  positiveHighlight: string;
  homeActivitySuggestion: string;
  digestMessage: string;
  whatsAppUrl: string;
  generatedAt: string;
}

// Negatif / etiketleyici kelimeleri yapıcı pedagojik ifadelere dönüştürme sözlüğü
const STIGMA_TRANSFORMS: Array<{ pattern: RegExp; replacement: string; valueTag: string }> = [
  {
    pattern: /ağladı|huysuzlandı|mızmızlandı/gi,
    replacement: "duygusal regülasyon ve güven geliştirme sürecinde önemli bir adım attı",
    valueTag: "D11 Sabır & Öz Denetim",
  },
  {
    pattern: /vurdu|itti|kavga etti|bağırdı/gi,
    replacement: "akranlarıyla sınırları koruma ve barışçıl iletişim kurma becerisini deneyimledi",
    valueTag: "D20 Sevgi & Saygı",
  },
  {
    pattern: /paylaşmadı|vermedi|bırakmadı/gi,
    replacement: "bireysel mülkiyet sınırlarını belirleyip ardından sırayla oynamayı keşfetti",
    valueTag: "D14 Adalet & Paylaşım",
  },
  {
    pattern: /dinlemedi|söz kes|oturtamadım/gi,
    replacement: "enerjisini hareketli oyunlarla dengelemeye odaklandı ve çemberde söz alma sırasını pekiştirdi",
    valueTag: "E2.1 Öz Düzenleme",
  },
  {
    pattern: /yapamadı|beceremedi|başaramadı/gi,
    replacement: "yeni bir beceriyi denerken sebat gösterdi ve öğrenme cesaretini korudu",
    valueTag: "D3 Çalışkanlık & Azim",
  },
  {
    pattern: /yemedi|istemedi/gi,
    replacement: "kendi ihtiyaçlarını ifade ederek beslenme saatinde bağımsız seçim yapma sürecini geliştirdi",
    valueTag: "Öz Bakım & Sağlıklı Yaşam",
  },
];

// TYMM Erdemlerine göre evde uygulanabilir sıcak mikro-oyun önerileri
const HOME_REINFORCEMENT_SUGGESTIONS: Record<string, string> = {
  "D14 Adalet & Paylaşım": "akşam yemeğinde meyveleri veya çatal-kaşıkları herkese eşit paylaştırma oyunu",
  "D11 Sabır & Öz Denetim": "birlikte kısa bir hikaye okurken resimlerdeki detayları sırayla bulma oyunu",
  "D20 Sevgi & Saygı": "günün en mutlu anını birbirinize fısıldayarak teşekkür etme sohbeti",
  "D3 Çalışkanlık & Azim": "odadaki oyuncakları türlerine göre ayırıp toplama yarışması",
  "E1.1 Merak & Keşif": "evdeki bir nesnenin gölgesini duvara yansıtıp şekil tahmin etme oyunu",
  "E2.4 İş Birliği & Nezaket": "sofrayı toplarken 'lütfen' ve 'teşekkür ederim' sihirli kelimeleriyle yardımlaşma",
  "E3.1 Estetik Duyarlılık": "renkli mandallardan veya kağıtlardan özgün bir desen oluşturma etkinliği",
};

/**
 * Gözlem metnini etiketleyici ifadelerden arındırır ve yapıcı pedagojik özeti çıkarır.
 */
function sanitizeAndHighlight(text: string): { sanitized: string; autoValue: string } {
  let cleaned = text.trim();
  let detectedValue = "D14 Adalet & Paylaşım";

  for (const item of STIGMA_TRANSFORMS) {
    if (item.pattern.test(cleaned)) {
      cleaned = cleaned.replace(item.pattern, item.replacement);
      detectedValue = item.valueTag;
      break;
    }
  }

  // Eğer metin zaten olumluysa doğrudan koru
  if (cleaned.length < 10) {
    cleaned = "sınıf içi etkinliklere merakla katılım sağladı";
  }

  return { sanitized: cleaned, autoValue: detectedValue };
}

/**
 * Tek bir öğrenci ve gözlem için 2 cümlelik MEB TYMM uyumlu veli bülteni üretir.
 */
export function generateParentEmpathyDigest(input: ParentEmpathyDigestInput): ParentEmpathyDigest {
  const { studentName, studentPhone, observationText, customValue } = input;
  const firstName = studentName.split(" ")[0] || "Öğrencimiz";

  const { sanitized, autoValue } = sanitizeAndHighlight(observationText);
  const effectiveValue = customValue || autoValue;

  const homeActivity =
    HOME_REINFORCEMENT_SUGGESTIONS[effectiveValue] ||
    "birlikte günün en keyifli anı hakkında sohbet etme";

  // Cümle 1: Olumlu takdir ve çaba vurgusu
  const sentence1 = `Değerli Velimiz, bugün ${firstName} sınıfımızda ${sanitized} konusunda çok güzel bir çaba ve olgunluk sergiledi.`;
  // Cümle 2: Evde pekiştirme reçetesi ve erdem vurgusu
  const sentence2 = `Akşam evde ${homeActivity} yaparak onun bu güzel gelişimini (${effectiveValue}) pekiştirebilirsiniz. Sevgilerimizle, Maarif Sınıfı.`;

  const fullMessage = `${sentence1} ${sentence2}`;

  // WhatsApp Linki üretimi
  const cleanPhone = (studentPhone || "").replace(/\D/g, "");
  const encodedText = encodeURIComponent(fullMessage);
  const whatsAppUrl = cleanPhone.length >= 10
    ? `https://wa.me/${cleanPhone.startsWith("90") ? cleanPhone : "90" + cleanPhone.replace(/^0/, "")}?text=${encodedText}`
    : `https://wa.me/?text=${encodedText}`;

  return {
    studentName,
    studentPhone,
    associatedValue: effectiveValue,
    positiveHighlight: sanitized,
    homeActivitySuggestion: homeActivity,
    digestMessage: fullMessage,
    whatsAppUrl,
    generatedAt: new Date().toISOString(),
  };
}

/**
 * Sınıftaki tüm öğrencilere ait son gözlemleri toplu WhatsApp bültenine derler.
 */
export function generateBatchParentDigests(
  students: Array<{ id: string; name: string; phone?: string }>,
  recentObservations?: Record<string, string>
): ParentEmpathyDigest[] {
  if (!students || students.length === 0) return [];

  return students.map((s) => {
    const obs = recentObservations?.[s.id] || `${s.name} arkadaşlarıyla merkezlerde uyumlu ve neşeli bir oyun kurdu.`;
    return generateParentEmpathyDigest({
      studentName: s.name,
      studentPhone: s.phone,
      observationText: obs,
    });
  });
}
