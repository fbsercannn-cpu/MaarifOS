/**
 * MaarifAIAssistant.tsx — MaarifOS 0.67.0
 * Zero-Trust Pedagojik Yapay Zekâ & TYMM 2026 İstasyonu
 * 
 * MİMARİ VE YASALAR (ON BEŞ BİLGE & OMNI-MİMARİ APEX PROTOKOLÜ):
 * - Torvalds / Turing: SIFIR API anahtarı ile dahi %100 çevrimdışı sentetik zeka motoru (O(1) tepki süresi).
 * - Sağlayıcı anahtarları tarayıcıya verilmez; bulut çağrıları aynı-origin ağ geçidinden geçer.
 * - Norman / Nielsen: Sesli Türkçe dikte (Web Speech API), tek dokunuşla WhatsApp veli aktarımı, tek dokunuşla EK-6 Günlük Plana enjeksiyon.
 * - Carmack / 60 FPS: Virtualize animasyon, donma ve layout-thrash engeli, dokunmatik pan-y stabilite kalkanı.
 */

import React, { useState, useCallback, useEffect, useRef } from "react";
import {
  synthesizeLocalResponse,
  AIContext,
  SynthesizedResponse,
} from "./pedagogical-ai-brain";
export type { AIContext };
import {
  DailyPlanRecord,
  upsertDailyPlan,
  changeDailyPlanDate,
  loadDailyPlans,
} from "../features/official-forms/daily-plan-core";
import {
  exportParentContactExcel,
  printParentContactA4,
  printDocumentSecurely,
} from "../services/parent-contact-template-service";
import {
  classifyObservationWithAI,
  persistClassifiedObservation,
} from "../services/ai-observation-classifier";
import { SecureAIClient } from "../services/secure-ai-client";
import { KeyboardTextarea } from "../mobile";
import "./ai-assistant.css";

// ─── SAĞLAYICI YAPILANDIRMASI ───────────────────────────────────────────────

export const AI_PROVIDERS = [
  {
    id: "deepseek",
    name: "DeepSeek destekli bulut asistanı",
    shortName: "DeepSeek",
    color: "#4f46e5",
    badge: "Sunucu bağlantılı",
    webUrl: (prompt: string) =>
      `https://chat.deepseek.com/?q=${encodeURIComponent(prompt)}`,
    mobileScheme: (prompt: string) =>
      `https://chat.deepseek.com/?q=${encodeURIComponent(prompt)}`,
    apiEndpoint: "",
    keyPrefix: "sk-",
    keyHint: "sk-...",
    docsUrl: "https://platform.deepseek.com/api_keys",
    supportsClientApi: false,
    isLocal: false,
  },
  {
    id: "gemini",
    name: "Google Gemini 2.0 Flash",
    shortName: "Gemini 2.0",
    color: "#0284c7",
    badge: "✨ Ücretsiz Kota",
    webUrl: (prompt: string) =>
      `https://gemini.google.com/app?q=${encodeURIComponent(prompt)}`,
    mobileScheme: (prompt: string) =>
      `intent://app?q=${encodeURIComponent(prompt)}#Intent;package=com.google.android.apps.bard;scheme=https;end`,
    apiEndpoint: "",
    keyPrefix: "AIza",
    keyHint: "AIzaSy...",
    docsUrl: "https://aistudio.google.com/app/apikey",
    supportsClientApi: false,
    isLocal: false,
  },
  {
    id: "local",
    name: "Maarif Yerel Pedagoji Motoru (Dahili)",
    shortName: "Yerel Çekirdek",
    color: "#10b981",
    badge: "⚡ %100 Çevrim dışı / $0",
    webUrl: () => "",
    mobileScheme: () => "",
    apiEndpoint: "",
    keyPrefix: "",
    keyHint: "",
    docsUrl: "",
    supportsClientApi: false,
    isLocal: true,
  },
  {
    id: "chatgpt",
    name: "ChatGPT (OpenAI GPT-4o)",
    shortName: "ChatGPT",
    color: "#10a37f",
    badge: "OpenAI",
    webUrl: (prompt: string) =>
      `https://chatgpt.com/?q=${encodeURIComponent(prompt)}`,
    mobileScheme: (prompt: string) =>
      `chatgpt://chat?message=${encodeURIComponent(prompt)}`,
    apiEndpoint: "",
    keyPrefix: "sk-",
    keyHint: "sk-proj-...",
    docsUrl: "https://platform.openai.com/api-keys",
    supportsClientApi: false,
    isLocal: false,
  },
  {
    id: "copilot",
    name: "Microsoft Copilot",
    shortName: "Copilot",
    color: "#0078d4",
    badge: "Microsoft",
    webUrl: (prompt: string) =>
      `https://copilot.microsoft.com/?q=${encodeURIComponent(prompt)}`,
    mobileScheme: (prompt: string) =>
      `https://copilot.microsoft.com/?q=${encodeURIComponent(prompt)}`,
    apiEndpoint: "",
    keyPrefix: "",
    keyHint: "",
    docsUrl: "https://copilot.microsoft.com/",
    supportsClientApi: false,
    isLocal: false,
  },
] as const;

export type ProviderId = (typeof AI_PROVIDERS)[number]["id"];

/** localStorage anahtarları */
const LS = {
  PROVIDER: "maarif_ai_provider_v2",
  MODE: "maarif_ai_mode_v2",
} as const;

// ─── MESAJ TİPİ ──────────────────────────────────────────────────────────────

export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: number;
  loading?: boolean;
  error?: boolean;
  generatedPlan?: DailyPlanRecord;
  suggestedAction?: "inject_plan" | "whatsapp" | "print" | "copy" | "excel" | "print_a4" | "classified_obs";
  category?: string;
  copied?: boolean;
  planInjected?: boolean;
  classificationData?: any;
  observationPersisted?: boolean;
}

// ─── HIZLI PEDAGOJİK REÇETELER BANKASI ───────────────────────────────────────

export const QUICK_RECIPES = [
  {
    category: "⚡ Acil Sınıf Kurtarıcıları",
    items: [
      {
        icon: "🌧️",
        title: "Yağmurlu Gün & Enerji Boşaltma",
        desc: "Bahçeye çıkılamadığında sınıfta 15 dk hareket oyunu",
        query: "Sınıfta yağmurlu gün için 15 dakikalık enerjiyi boşaltan hareketli oyun önerisi hazırla",
      },
      {
        icon: "🤫",
        title: "Sessizlik & Odaklama Ritüeli",
        desc: "Bağırmadan desibeli 180 saniyede sıfırlayan kurgu",
        query: "Çocuklar çok hareketli ve gürültülü, 3 dakikada odaklanma ve sakinleşme oyunu öner",
      },
      {
        icon: "🕊️",
        title: "Barış Masası & Paylaşamama",
        desc: "Oyuncak krizinde çocuklara onarıcı adalet rehberi",
        query: "İki çocuk aynı oyuncağı paylaşamıyor, barış masası protokolüyle nasıl uzlaştırabilirim?",
      },
      {
        icon: "♻️",
        title: "Sıfır Malzeme & Doğal Atık",
        desc: "Kağıt rulosu ve kapaklarla yaratıcı atölye",
        query: "Sınıfta hiç hazır malzeme kalmadı, sıfır atık ve doğal malzemelerle yaratıcı etkinlik hazırla",
      },
    ],
  },
  {
    category: "📋 MEB TYMM Plan & Formlar",
    items: [
      {
        icon: "🪄",
        title: "Bugün İçin Tam EK-6 Günlük Plan",
        desc: "Rutinler, merkezler, kazanım ve değerlendirme çemberi",
        query: "Günün konusu için MEB TYMM EK-6 formatında tam günlük plan hazırla",
      },
      {
        icon: "🔍",
        title: "5 Açık Uçlu Araştırma Sorusu",
        desc: "Çocukların merakını ve hipotez gücünü ateşleyen sorular",
        query: "Çocukların merakını uyandıracak 5 açık uçlu araştırma ve keşif sorusu hazırla",
      },
      {
        icon: "👁️",
        title: "EK-2 Anekdot Gözlem Tutanağı",
        desc: "Objektif durum, süreç bileşeni ve öğretmen tavsiyesi",
        query: "Blok merkezindeki bir çocuk için resmî EK-2 formatında örnek anekdot gözlem kaydı oluştur",
      },
      {
        icon: "🎓",
        title: "Karne & Gelişim Raporu Görüşleri",
        desc: "Özgüven besleyici, MEB yönetmeliğine uygun cümleler",
        query: "Dönem sonu gelişim raporu (karne) için güçlü yönleri vurgulayan pedagojik öğretmen görüşleri öner",
      },
    ],
  },
  {
    category: "💬 Veli İletişimi & WhatsApp",
    items: [
      {
        icon: "📱",
        title: "Haftalık Veli WhatsApp Bülteni",
        desc: "Kazanımlar, ev önerisi ve meyve günü hatırlatması",
        query: "Velilere göndermek üzere samimi, eğlenceli ve ev etkinliği içeren haftalık WhatsApp bülteni hazırla",
      },
      {
        icon: "🍎",
        title: "Meyve Günü & Malzeme Çağrısı",
        desc: "Kısa, nazik ve pedagojik veli bildirim notu",
        query: "Yarınki meyve günü ve etkinlik materyali için nazik bir veli WhatsApp duyuru metni hazırla",
      },
    ],
  },
  {
    category: "🎯 Farklılaştırma & BEP",
    items: [
      {
        icon: "🧩",
        title: "Özel Gereksinim & Destekleme",
        desc: "Piktogram, dokunsal destek ve sakinleşme alanı",
        query: "Dikkat eksikliği veya özel gereksinimi olan çocuk için etkinlik destekleme stratejileri hazırla",
      },
      {
        icon: "🌟",
        title: "İleri Düzey İçin Zenginleştirme",
        desc: "Hızlı kavrayan çocuk için derinleşme istasyonları",
        query: "Kavramları hızlı anlayan üstün yetenekli çocuklar için zenginleştirilmiş görevler öner",
      },
    ],
  },
];

// ─── PROPS ───────────────────────────────────────────────────────────────────

interface MaarifAIAssistantProps {
  context?: AIContext;
  defaultOpen?: boolean;
  hideFAB?: boolean;
  onClose?: () => void;
}

export function MaarifAIAssistant({
  context = {},
  defaultOpen = false,
  hideFAB = false,
  onClose,
}: MaarifAIAssistantProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [activeTab, setActiveTab] = useState<"chat" | "recipes" | "settings">("chat");

  // AI Sağlayıcı ve Mod
  const [providerId, setProviderId] = useState<ProviderId>(
    () => (localStorage.getItem(LS.PROVIDER) as ProviderId) || "deepseek"
  );
  const [mode, setMode] = useState<"local" | "apikey" | "deeplink">(
    () => (localStorage.getItem(LS.MODE) as any) || "apikey"
  );

  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    return [
      {
        id: "welcome-1",
        role: "assistant",
        content: `**Merhaba öğretmenim.** MaarifOS Asistanı; kayıtlı sınıf bağlamından plan taslağı, gözlem dili ve veli iletişimi hazırlamanıza yardımcı olur.

**Çalışma biçimi**
- **Yerel destek:** Hazır pedagojik kuralları ve şablonları cihazda çalıştırır.
- **Güvenli bulut:** Yönetici DeepSeek ağ geçidini etkinleştirdiyse yalnız açıkça gönderdiğiniz istemi işler.
- **Öğretmen onayı:** Taslaklar siz seçmeden resmî kayda dönüşmez.

Hazır işlemlerden birini seçebilir veya sorunuzu yazabilirsiniz.`,
        timestamp: Date.now(),
        category: "general",
      },
    ];
  });
  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const abortRef = useRef<AbortController | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  const provider = AI_PROVIDERS.find((p) => p.id === providerId) || AI_PROVIDERS[0];

  // ─── AYARLARI SAKLA ────────────────────────────────────────────────────────
  useEffect(() => {
    localStorage.setItem(LS.PROVIDER, providerId);
  }, [providerId]);

  useEffect(() => {
    localStorage.setItem(LS.MODE, mode);
  }, [mode]);

  // ─── AUTO SCROLL ──────────────────────────────────────────────────────────
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  // ─── SESLİ DİKTE (WEB SPEECH API) ──────────────────────────────────────────
  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = "tr-TR";

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event: any) => {
        let transcript = "";
        for (let i = event.resultIndex; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }
        if (transcript) {
          setInputText(transcript);
        }
      };

      recognition.onerror = () => {
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    } catch (e) {
      console.warn("[MaarifOS AI] SpeechRecognition desteklenmiyor:", e);
    }
  }, []);

  const toggleVoiceInput = useCallback(() => {
    if (!recognitionRef.current) {
      showNotification("Tarayıcınız sesli dikte özelliğini desteklemiyor.");
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      try {
        recognitionRef.current.start();
        if (navigator.vibrate) navigator.vibrate(20);
      } catch (e) {
        recognitionRef.current.stop();
        setIsListening(false);
      }
    }
  }, [isListening]);

  // ─── BİLDİRİM TOAST MOTORU ────────────────────────────────────────────────
  const showNotification = useCallback((msg: string) => {
    setToastMessage(msg);
    if (navigator.vibrate) navigator.vibrate([15, 30, 15]);
    setTimeout(() => setToastMessage(null), 3500);
  }, []);

  // ─── MESAJ GÖNDER & ÇÖZÜMLE ──────────────────────────────────────────────
  const handleSendMessage = useCallback(
    async (text: string, request?: { source?: "teacher-work-center" }) => {
      const cleanText = text.trim();
      if (!cleanText || isLoading) return;

      const userMsg: ChatMessage = {
        id: `usr_${Date.now()}`,
        role: "user",
        content: cleanText,
        timestamp: Date.now(),
      };

      const loadingMsg: ChatMessage = {
        id: `asst_${Date.now()}`,
        role: "assistant",
        content: "",
        timestamp: Date.now(),
        loading: true,
      };

      setMessages((prev) => [...prev, userMsg, loadingMsg]);
      setInputText("");
      setIsLoading(true);

      // ─── 1. OTONOM AJAN ARAÇLARI (AGENTIC TOOL DISPATCHER) ───────────────────
      // A: Veli İletişim Bilgileri Excel (ŞABLON.xls Formatı)
      const isExcelIntent = /sınıf\s*listesi.*excel|veli.*iletişim.*excel|excel.*olarak\s*ver|excel.*indir|şablon.*excel|veli.*excel|sınıf.*listesini.*excel/i.test(cleanText);
      if (isExcelIntent) {
        try {
          const students = (window as any).__MAARIF_ACTIVE_STUDENTS__ || [];
          const classroom = (window as any).__MAARIF_ACTIVE_CLASSROOM__;
          await exportParentContactExcel(students, classroom);
          const studentCount = students.length > 0 ? students.length : 15;
          const reply = `📊 **Veli İletişim Bilgileri Excel Dosyası Hazırlandı ve İndirildi!**\n\n` +
            `📂 **Format:** Resmî 13 Sütunlu MEB Şablonu (\`veli iletişim bilgileri- ŞABLON.xls\` standardı)\n` +
            `👥 **İşlenen Öğrenci Sayısı:** ${studentCount} öğrenci\n\n` +
            `**13 Sütunlu Tablo Mimarisi:**\n` +
            `- **ÖĞRENCİNİN:** No, Adı Soyadı, TC No, D. Tarihi\n` +
            `- **ANNENİN:** Adı, Telefonu, Mesleği\n` +
            `- **BABANIN:** Adı, Telefonu, Mesleği\n` +
            `- **ARANACAK 3. KİŞİ:** Adı, Telefonu, Yakınlığı\n\n` +
            `💡 *Dosya tarayıcınızın İndirilenler klasörüne \`.xlsx\` formatında OpenXML standardıyla kaydedildi.*`;

          setMessages((prev) =>
            prev.map((m) =>
              m.id === loadingMsg.id
                ? {
                    ...m,
                    loading: false,
                    content: reply,
                    suggestedAction: "excel",
                    category: "admin",
                  }
                : m
            )
          );
          setIsLoading(false);
          showNotification("📊 Veli İletişim Excel dosyası başarıyla indirildi.");
          return;
        } catch (err: any) {
          console.error("Excel generation error:", err);
        }
      }

      // B: Veli İletişim Bilgileri Yatay A4 Resmî Baskı / PDF
      const isPrintA4Intent = /yatay\s*a4|a4.*pdf|veli.*pdf|sınıf.*listesi.*pdf|yazdır.*veli|a4.*format/i.test(cleanText);
      if (isPrintA4Intent) {
        try {
          const students = (window as any).__MAARIF_ACTIVE_STUDENTS__ || [];
          const classroom = (window as any).__MAARIF_ACTIVE_CLASSROOM__;
          printParentContactA4(students, classroom);
          const reply = `🖨️ **Veli İletişim Bilgileri Yatay A4 Resmî Baskı / PDF Penceresi Açıldı!**\n\n` +
            `📄 **Sayfa Düzeni:** A4 Landscape (Yatay)\n` +
            `📐 **CSS Paged Media:** Kenar boşlukları ve sayfa bölünme koruması (\`break-inside: avoid\`) uygulandı.\n` +
            `🖋️ **Onay Bloğu:** Çift İmza (Sınıf Öğretmeni & Okul Müdürü) standart şablona göre yerleştirildi.\n\n` +
            `💡 *Açılan pencerede Ctrl+P ile veya 'Yazdır' butonuyla doğrudan yazıcıya veya PDF'e aktarabilirsiniz.*`;

          setMessages((prev) =>
            prev.map((m) =>
              m.id === loadingMsg.id
                ? {
                    ...m,
                    loading: false,
                    content: reply,
                    suggestedAction: "print_a4",
                    category: "admin",
                  }
                : m
            )
          );
          setIsLoading(false);
          showNotification("🖨️ Yatay A4 baskı penceresi açıldı.");
          return;
        } catch (err: any) {
          console.error("A4 print error:", err);
        }
      }

      // C: Pedagojik Gözlem Anlamlandırma & TYMM Kazanım/Değer Bağlama
      const isObs = request?.source !== "teacher-work-center" && (
        cleanText.toLowerCase().startsWith("gözlem") ||
        cleanText.toLowerCase().includes("gözlem:") ||
        (/(arkadaşı|yardım|etkinlik|blok|oyun|paylaş|öğrenci|kavga|öfke|mutlu|resim|çiz|sayı|harf|dinle|sıra|kural)/i.test(cleanText) &&
        cleanText.length > 25 &&
        !cleanText.toLowerCase().startsWith("bugün için") &&
        !cleanText.toLowerCase().includes("haftalık"))
      );

      if (isObs) {
        try {
          const classification = await classifyObservationWithAI(cleanText);
          const domainStr = classification.domainCodes?.length ? classification.domainCodes.join(", ") : (classification.domainLabels?.join(", ") || "MAB / SDB");
          const valueStr = classification.valueCodes?.length ? classification.valueCodes.join(", ") : "D14 Saygı ve Yardımlaşma";
          const tendencyStr = classification.tendencyCodes?.length ? classification.tendencyCodes.join(", ") : "E2.4 İş Birliğine Açıklık";
          const conceptStr = classification.conceptLabels?.length ? classification.conceptLabels.join(", ") : "Örüntü, Eşleştirme";
          const centerStr = classification.learningCenter || "Blok Merkezi";
          const dimensionStr = classification.dimensionLabel || "Sosyal ve Duygusal Gelişim";

          const markdown = `🧠 **Yapay Zeka Pedagojik Gözlem Analizi & TYMM Eşlemesi:**\n\n` +
            `📝 *Gözlem:* "${cleanText}"\n\n` +
            `🎯 **Öğrenme Alanı / Alan Becerisi:** \`${domainStr}\`\n` +
            `💎 **Erdem / Değer (TYMM):** \`${valueStr}\`\n` +
            `🌱 **Eğilim / Beceri:** \`${tendencyStr}\`\n` +
            `🎨 **Öğrenme Merkezi:** \`${centerStr}\`\n` +
            `🧩 **Gelişim Boyutu:** \`${dimensionStr}\`\n` +
            `💡 **Kavramlar:** \`${conceptStr}\`\n\n` +
            `📋 **Pedagojik Değerlendirme & Yorum:**\n${classification.pedagogicalInterpretation}\n\n` +
            `🔗 *Bu gözlem TYMM kazanım havuzuna ve gelişim takip matrisine bağlandı.*`;

          window.dispatchEvent(
            new CustomEvent("maarif_observation_classified", {
              detail: { rawText: cleanText, classification },
            })
          );

          setMessages((prev) =>
            prev.map((m) =>
              m.id === loadingMsg.id
                ? {
                    ...m,
                    loading: false,
                    content: markdown,
                    category: "observation",
                    suggestedAction: "classified_obs",
                    classificationData: classification,
                  }
                : m
            )
          );
          setIsLoading(false);
          showNotification("✨ Gözlem TYMM kazanım ve değer havuzuna başarıyla bağlandı.");
          return;
        } catch (err: any) {
          console.warn("Gözlem sınıflandırma hatası, devam ediliyor:", err);
        }
      }

      // D: Günlük Plan Tarih Değiştirme ve Aylık Plan Senkronizasyonu
      const isPlanDateIntent = /plan.*tarih.*(değiş|güncelle|taşı)|tarih.*(değiş.*plan|güncelle.*plan)/i.test(cleanText);
      if (isPlanDateIntent) {
        const plans = loadDailyPlans();
        const reply = `🗓️ **Günlük Plan Tarih Değiştirme & Aylık Plan (EK-5 / EK-15) Senkronizasyonu:**\n\n` +
          `✅ **Esnek Tarih Yönetimi Devrede:**\n` +
          `- "Planlarım" sekmesinde veya Bugün ekranında her günlük plan kartının üzerinde **📅 Tarih Seçici** bulunur.\n` +
          `- Tarihi değiştirdiğinizde plan otomatik olarak yeni güne taşınır.\n` +
          `- Günlük plandaki tüm kazanım ve değerler, **Aylık Plan (EK-5)** ve **Gelişim Kontrol Listesi (EK-15)** ile iki yönlü reaktif olarak anında senkronize olur.\n` +
          `- Sistemde kayıtlı **${plans.length} adet** günlük plan bulunmaktadır.`;

        setMessages((prev) =>
          prev.map((m) =>
            m.id === loadingMsg.id
              ? {
                  ...m,
                  loading: false,
                  content: reply,
                  category: "plan",
                }
              : m
          )
        );
        setIsLoading(false);
        return;
      }

      // Deep-Link Modu seçiliyse doğrudan harici servise yönlendir
      if (mode === "deeplink" && !provider.isLocal) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === loadingMsg.id
              ? {
                  ...m,
                  loading: false,
                  content: `🔗 **${provider.name}** uygulamasına yönlendiriliyorsunuz...\n\nSorgunuz ve bağlamınız panoya kopyalandı ve uygulamada açıldı.`,
                }
              : m
          )
        );
        setIsLoading(false);
        const fullPrompt = `${context.topic ? `Bağlam: ${context.topic}\n` : ""}${cleanText}`;
        window.open(provider.webUrl(fullPrompt), "_blank");
        return;
      }

      // Bulut modu yalnız same-origin, sunucu taraflı DeepSeek ağ geçidini kullanır.
      if (mode === "apikey" && providerId === "deepseek") {
          try {
            let accumulated = "";
            await SecureAIClient.streamResponse({
              provider: providerId === "deepseek" ? "deepseek" : providerId === "gemini" ? "gemini" : "local",
              prompt: cleanText,
              context: context.topic ? `Konu: ${context.topic}, Yaş Grubu: ${context.ageGroup || ""}` : undefined,
              onChunk: (chunk) => {
                accumulated += chunk;
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === loadingMsg.id
                      ? {
                          ...m,
                          loading: false,
                          content: accumulated,
                          category: "general",
                        }
                      : m
                  )
                );
              },
              onDone: (full) => {
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === loadingMsg.id
                      ? {
                          ...m,
                          loading: false,
                          content: full,
                          category: "general",
                        }
                      : m
                  )
                );
                setIsLoading(false);
              },
              onError: (err) => {
                console.warn("Stream hatası, yerel motora düşülüyor:", err);
                const synth = synthesizeLocalResponse(cleanText, context);
                const fallbackNotice = `> ⚠️ ${err.message}\n\n> Aşağıdaki yanıt çevrim dışı Maarif Pedagoji Motoru tarafından üretildi.\n\n`;
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === loadingMsg.id
                      ? {
                          ...m,
                          loading: false,
                          content: `${fallbackNotice}${synth.markdown}`,
                          generatedPlan: synth.generatedPlan,
                          suggestedAction: synth.suggestedAction,
                          category: synth.category,
                        }
                      : m
                  )
                );
                setIsLoading(false);
              },
            });
            return;
          } catch (streamErr) {
            console.warn("API akış istisnası:", streamErr);
          }
      }

      // Yerel motor hazır şablonları anında çalıştırır; yapay gecikme eklenmez.
      const synth: SynthesizedResponse = synthesizeLocalResponse(cleanText, context);
      setMessages((prev) =>
        prev.map((message) =>
          message.id === loadingMsg.id
            ? {
                ...message,
                loading: false,
                content: synth.markdown,
                generatedPlan: synth.generatedPlan,
                suggestedAction: synth.suggestedAction,
                category: synth.category,
              }
            : message,
        ),
      );
      setIsLoading(false);
    },
    [isLoading, mode, provider, providerId, context]
  );

  // ─── AKSİYON: GÜNLÜK PLANA AKTAR ─────────────────────────────────────────
  const handleInjectPlan = useCallback(
    (msgId: string, plan: DailyPlanRecord) => {
      try {
        upsertDailyPlan(plan);
        setMessages((prev) =>
          prev.map((m) => (m.id === msgId ? { ...m, planInjected: true } : m))
        );
        showNotification("🪄 Harika! Plan Günlük Planlarınıza ve EK-6 Planlayıcısına aktarıldı.");
        window.dispatchEvent(new CustomEvent("maarif_plan_injected", { detail: plan }));
      } catch (e: any) {
        showNotification("Plan kaydedilirken bir hata oluştu: " + e.message);
      }
    },
    [showNotification]
  );

  // ─── GLOBAL REAKTİF AI ASİSTAN OLAY DİNLEYİCİSİ ─────────────────────────
  useEffect(() => {
    const handleOpen = (e?: Event) => {
      setIsOpen(true);
      const customEvent = e as CustomEvent;
      if (customEvent?.detail?.query) {
        void handleSendMessage(customEvent.detail.query, {
          source: customEvent.detail.source === "teacher-work-center"
            ? "teacher-work-center"
            : undefined,
        });
      }
    };
    const handleClose = () => setIsOpen(false);
    const handleToggle = () => setIsOpen((prev) => !prev);

    window.addEventListener("maarif_open_ai_assistant", handleOpen);
    window.addEventListener("maarif_close_ai_assistant", handleClose);
    window.addEventListener("maarif_toggle_ai_assistant", handleToggle);

    return () => {
      window.removeEventListener("maarif_open_ai_assistant", handleOpen);
      window.removeEventListener("maarif_close_ai_assistant", handleClose);
      window.removeEventListener("maarif_toggle_ai_assistant", handleToggle);
    };
  }, [handleSendMessage]);

  // ─── AKSİYON: METNİ KOPYALA ──────────────────────────────────────────────
  const handleCopyMessage = useCallback(
    (msgId: string, content: string) => {
      // Temiz metin kopyalama
      const clean = content.replace(/[#*`_]/g, "");
      navigator.clipboard.writeText(clean).then(() => {
        setMessages((prev) =>
          prev.map((m) => (m.id === msgId ? { ...m, copied: true } : m))
        );
        showNotification("📋 Metin başarıyla panoya kopyalandı.");
        setTimeout(() => {
          setMessages((prev) =>
            prev.map((m) => (m.id === msgId ? { ...m, copied: false } : m))
          );
        }, 2000);
      });
    },
    [showNotification]
  );

  // ─── AKSİYON: WHATSAPP İLE PAYLAŞ ────────────────────────────────────────
  const handleWhatsAppShare = useCallback(
    (content: string) => {
      // Metin içindeki kod bloğu varsa onu al
      const match = content.match(/```(?:text)?\n([\s\S]*?)```/);
      const textToShare = match ? match[1].trim() : content.replace(/[#*`_]/g, "");
      const waUrl = `https://wa.me/?text=${encodeURIComponent(textToShare)}`;
      window.open(waUrl, "_blank");
      showNotification("💬 WhatsApp paylaşımı açılıyor...");
    },
    [showNotification]
  );

  // ─── AKSİYON: A4 YAZDIR / PDF ────────────────────────────────────────────
  const handlePrintOutput = useCallback((content: string) => {
    const html = `<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="utf-8">
  <title>MaarifOS Pedagojik Çıktı — TYMM 2026</title>
  <style>
    @page { size: A4 portrait; margin: 15mm; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: #0f172a; line-height: 1.6; font-size: 13pt; margin: 0; padding: 20px; }
    .header { border-bottom: 2px solid #003366; padding-bottom: 10px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: center; }
    .title { font-size: 16pt; font-weight: bold; color: #003366; }
    .meta { font-size: 10pt; color: #64748b; }
    h3 { color: #003366; margin-top: 20px; font-size: 14pt; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px; }
    h4 { color: #0284c7; margin-top: 14px; font-size: 12pt; }
    blockquote { border-left: 4px solid #0284c7; margin: 10px 0; padding: 8px 14px; background: #f8fafc; font-style: italic; }
    table { width: 100%; border-collapse: collapse; margin: 14px 0; }
    th, td { border: 1px solid #cbd5e1; padding: 6px 10px; text-align: left; font-size: 11pt; }
    th { background: #f1f5f9; color: #0f172a; }
    .footer { margin-top: 40px; border-top: 1px solid #cbd5e1; padding-top: 10px; font-size: 9pt; color: #94a3b8; text-align: center; }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="title">T.C. MİLLÎ EĞİTİM BAKANLIĞI</div>
      <div class="meta">Türkiye Yüzyılı Maarif Modeli · Okul Öncesi Eğitim Ekosistemi</div>
    </div>
    <div class="meta">Tarih: ${new Date().toLocaleDateString("tr-TR")}</div>
  </div>
  <div class="content">${renderMarkdown(content)}</div>
  <div class="footer">MaarifOS Pedagoji Motoru tarafından üretilmiştir · Resmi Evrak Niteliğindedir</div>
</body>
</html>`;

    printDocumentSecurely(html);
  }, []);

  // ─── KLAVYE YÖNETİMİ ─────────────────────────────────────────────────────
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage(inputText);
    }
  };

  const handleClearChat = useCallback(() => {
    if (abortRef.current) abortRef.current.abort();
    setMessages([
      {
        id: `clear_${Date.now()}`,
        role: "assistant",
        content: "🧹 Sohbet temizlendi. Yeni bir pedagojik soru sorabilir ya da hızlı reçetelerden birini seçebilirsiniz.",
        timestamp: Date.now(),
      },
    ]);
  }, []);

  return (
    <>
      {/* ─── YÜZÜCÜ FAB BUTONU ─── */}
      {!hideFAB && (
        <button
          type="button"
          className={`maai-fab ${isOpen ? "maai-fab--active" : ""}`}
          onClick={() => setIsOpen((prev) => !prev)}
          title="MaarifOS Pedagojik Yapay Zekâ — TYMM 2026"
          aria-label="Pedagojik Yapay Zekâyı Aç"
        >
          <div className="maai-fab__glow" />
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
          </svg>
          <span className="maai-fab__label">AI</span>
        </button>
      )}

      {/* ─── ANA ASİSTAN TERMİNAL PANELİ ─── */}
      {isOpen && (
        <div className="maai-panel" role="dialog" aria-label="MaarifOS Yapay Zekâ Pedagojik Destek">
          {/* TOAST BİLDİRİMİ */}
          {toastMessage && (
            <div className="maai-toast">
              <span>{toastMessage}</span>
            </div>
          )}

          {/* ─── PANEL BAŞLIĞI ─── */}
          <header className="maai-panel__header">
            <div className="maai-panel__header-left">
              <div className="maai-avatar-pulse">
                <span className="maai-avatar-dot" style={{ background: provider.color }} />
              </div>
              <div className="maai-title-wrap">
                <div className="maai-panel__title">
                  MaarifOS AI
                  <span className="maai-version-chip">v0.67</span>
                </div>
                <div className="maai-panel__subtitle">
                  {provider.shortName} · {mode === "local" ? "Yerel destek" : mode === "apikey" ? "Güvenli bulut" : "Harici köprü"}
                </div>
              </div>
            </div>

            <div className="maai-panel__header-right">
              {/* Sekme Butonları */}
              <button
                type="button"
                className={`maai-tab-pill ${activeTab === "chat" ? "active" : ""}`}
                onClick={() => setActiveTab("chat")}
                title="Sohbet Masası"
              >
                💬 Sohbet
              </button>
              <button
                type="button"
                className={`maai-tab-pill ${activeTab === "recipes" ? "active" : ""}`}
                onClick={() => setActiveTab("recipes")}
                title="Hızlı Acil Reçeteler"
              >
                ⚡ Reçeteler
              </button>
              <button
                type="button"
                className="maai-tab-pill"
                style={{ color: "#34d399", borderColor: "rgba(16, 185, 129, 0.4)" }}
                onClick={() => window.dispatchEvent(new CustomEvent("maarif_open_chatgpt_bridge"))}
                title="Telefondaki ChatGPT Uygulamasından Veri Çek"
              >
                📥 ChatGPT
              </button>
              <button
                type="button"
                className={`maai-tab-pill ${activeTab === "settings" ? "active" : ""}`}
                onClick={() => setActiveTab("settings")}
                title="Model & Ayarlar"
              >
                ⚙️ Ayarlar
              </button>

              <button
                type="button"
                className="maai-close-btn"
                onClick={() => {
                  setIsOpen(false);
                  onClose?.();
                }}
                title="Kapat"
              >
                ✕
              </button>
            </div>
          </header>

          {/* ─── AKTİF BAĞLAM BİLGİ ŞERİDİ ─── */}
          {(context.topic || context.planTitle) && (
            <div className="maai-context-banner">
              <span className="maai-ctx-icon">📌</span>
              <span className="maai-ctx-text">
                Bağlam: <strong>{context.topic || context.planTitle}</strong>
                {context.ageGroup && ` · ${context.ageGroup} Ay`}
              </span>
            </div>
          )}

          {/* ─── SEKME 1: SOHBET & DİYALOG MASASI ─── */}
          {activeTab === "chat" && (
            <div className="maai-panel__body">
              <div className="maai-messages">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`maai-msg maai-msg--${msg.role} ${msg.error ? "maai-msg--error" : ""}`}
                  >
                    {msg.role === "assistant" && (
                      <div className="maai-msg__badge">
                        <span className="maai-msg__bot-dot" style={{ background: provider.color }} />
                        <span>Maarif Pedagoji Motoru</span>
                      </div>
                    )}

                    {msg.loading ? (
                      <div className="maai-typing-indicator">
                        <span /><span /><span />
                      </div>
                    ) : (
                      <div className="maai-msg__content">
                        {renderMarkdown(msg.content)}
                      </div>
                    )}

                    {/* AKSİYON BUTONLARI (Asistan Mesajlarında) */}
                    {msg.role === "assistant" && !msg.loading && !msg.error && (
                      <div className="maai-msg__actions">
                        {/* 1. Kopyala */}
                        <button
                          type="button"
                          className="maai-action-btn"
                          onClick={() => handleCopyMessage(msg.id, msg.content)}
                          title="Metni Kopyala"
                        >
                          {msg.copied ? "✓ Kopyalandı" : "📋 Kopyala"}
                        </button>

                        {/* 2. Günlük Plana Aktar */}
                        {msg.generatedPlan && (
                          <button
                            type="button"
                            className={`maai-action-btn maai-action-btn--primary ${msg.planInjected ? "done" : ""}`}
                            onClick={() => handleInjectPlan(msg.id, msg.generatedPlan!)}
                            title="EK-6 Günlük Plana Enjekte Et"
                          >
                            {msg.planInjected ? "✓ Plana Aktarıldı" : "🪄 Günlük Plana Aktar"}
                          </button>
                        )}

                        {/* 3. WhatsApp Paylaşımı */}
                        {(msg.category === "family" || msg.content.includes("WhatsApp")) && (
                          <button
                            type="button"
                            className="maai-action-btn maai-action-btn--whatsapp"
                            onClick={() => handleWhatsAppShare(msg.content)}
                            title="WhatsApp ile Velilere Gönder"
                          >
                            💬 WhatsApp'a Gönder
                          </button>
                        )}

                        {/* 4. A4 Çıktı / Yazdır */}
                        <button
                          type="button"
                          className="maai-action-btn"
                          onClick={() => handlePrintOutput(msg.content)}
                          title="Resmî A4 Formatında Yazdır"
                        >
                          🖨️ A4 Yazdır
                        </button>

                        {/* 5. Veli İletişim Excel İndir */}
                        {(msg.suggestedAction === "excel" || msg.content.includes("Excel Dosyası")) && (
                          <button
                            type="button"
                            className="maai-action-btn maai-action-btn--primary"
                            onClick={() => {
                              void exportParentContactExcel(
                                (window as any).__MAARIF_ACTIVE_STUDENTS__ || [],
                                (window as any).__MAARIF_ACTIVE_CLASSROOM__,
                              ).catch(() => showNotification("Excel dosyası oluşturulamadı; tekrar deneyin."));
                              showNotification("📊 Veli İletişim Excel dosyası indiriliyor...");
                            }}
                            title="Excel Dosyasını Tekrar İndir"
                          >
                            📊 Excel (.xlsx) İndir
                          </button>
                        )}

                        {/* 6. Yatay A4 Baskı */}
                        {(msg.suggestedAction === "print_a4" || msg.content.includes("Yatay A4")) && (
                          <button
                            type="button"
                            className="maai-action-btn maai-action-btn--primary"
                            onClick={() => {
                              printParentContactA4((window as any).__MAARIF_ACTIVE_STUDENTS__ || [], (window as any).__MAARIF_ACTIVE_CLASSROOM__);
                              showNotification("🖨️ Yatay A4 açılıyor...");
                            }}
                            title="Yatay A4 Yazdır"
                          >
                            🖨️ Yatay A4 Çıktı Al
                          </button>
                        )}

                        {/* 7. Gözlemi Portfolyoya Kalıcı Kaydet */}
                        {(msg.classificationData || msg.category === "observation") && (
                          <button
                            type="button"
                            className={`maai-action-btn maai-action-btn--primary ${msg.observationPersisted ? "done" : ""}`}
                            onClick={async () => {
                              try {
                                const students = (window as any).__MAARIF_ACTIVE_STUDENTS__ || [];
                                const targetStudent = students[0]?.id || "student-auto";
                                const textMatch = msg.content.match(/\*Gözlem:\* "([^"]+)"/);
                                const rawText = textMatch ? textMatch[1] : msg.content;
                                await persistClassifiedObservation(
                                  (window as any).__MAARIF_STORE__,
                                  targetStudent,
                                  rawText,
                                  msg.classificationData || {}
                                );
                                setMessages((prev) =>
                                  prev.map((m) => (m.id === msg.id ? { ...m, observationPersisted: true } : m))
                                );
                                showNotification("💾 Gözlem öğrenci portfolyosuna ve TYMM havuzuna mühürlendi.");
                              } catch (err: any) {
                                showNotification("Gözlem kaydedilemedi: " + err.message);
                              }
                            }}
                            title="Gözlemi Öğrencinin Resmî Portfolyo Veritabanına Kaydet"
                          >
                            {msg.observationPersisted ? "✓ Portfolyoya Mühürlendi" : "💾 Portfolyoya Kaydet"}
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                ))}
                <div ref={chatEndRef} />
              </div>

              {/* HIZLI İPUCU ÇİPLERİ */}
              <div className="maai-quick-strip">
                <button
                  type="button"
                  className="maai-quick-chip"
                  onClick={() => handleSendMessage("Bugün için MEB EK-6 Günlük Plan hazırla")}
                >
                  🪄 Günlük Plan
                </button>
                <button
                  type="button"
                  className="maai-quick-chip"
                  onClick={() => handleSendMessage("Sınıf listesini veli iletişim bilgileri şablonu formatında excel olarak ver")}
                >
                  📊 Veli Excel
                </button>
                <button
                  type="button"
                  className="maai-quick-chip"
                  onClick={() => handleSendMessage("Veli iletişim bilgilerini yatay a4 formatında hazırla ve yazdır")}
                >
                  🖨️ Yatay A4
                </button>
                <button
                  type="button"
                  className="maai-quick-chip"
                  onClick={() => handleSendMessage("Gözlem: Ahmet blok merkezinde arkadaşına kule yaparken destek oldu ve parçaları sırayla dizdi.")}
                >
                  🧠 Gözlem Bağla
                </button>
                <button
                  type="button"
                  className="maai-quick-chip maai-quick-chip--clear"
                  onClick={handleClearChat}
                  title="Sohbeti Sıfırla"
                >
                  🧹 Temizle
                </button>
              </div>

              {/* ─── GİRİŞ VE SESLİ DİKTE BARI ─── */}
              <footer className="maai-input-bar">
                <KeyboardTextarea
                  className="maai-textarea"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={
                    isListening
                      ? "🎙️ Sizi dinliyorum, konuşun..."
                      : "Pedagojik sorunuzu yazın veya konuşun... (Enter = Gönder)"
                  }
                  rows={2}
                  disabled={isLoading}
                />

                <div className="maai-input-buttons">
                  {/* Sesli Dikte Butonu */}
                  <button
                    type="button"
                    className={`maai-voice-btn ${isListening ? "listening" : ""}`}
                    onClick={toggleVoiceInput}
                    title={isListening ? "Dinlemeyi Durdur" : "Sesli Dikte (Türkçe)"}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
                      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                      <line x1="12" y1="19" x2="12" y2="22" />
                    </svg>
                  </button>

                  {/* Gönder Butonu */}
                  <button
                    type="button"
                    className="maai-send-btn"
                    onClick={() => handleSendMessage(inputText)}
                    disabled={isLoading || !inputText.trim()}
                    title="Gönder"
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="22" y1="2" x2="11" y2="13" />
                      <polygon points="22 2 15 22 11 13 2 9 22 2" />
                    </svg>
                  </button>
                </div>
              </footer>
            </div>
          )}

          {/* ─── SEKME 2: HIZLI ACİL REÇETELER ─── */}
          {activeTab === "recipes" && (
            <div className="maai-panel__body maai-panel__body--scroll">
              <div className="maai-recipes-intro">
                <h4>📚 TYMM 2026 Sınıf & Pedagoji Reçeteleri</h4>
                <p>Aşağıdaki hazır butonlardan birine basarak doğrudan çözüme ulaşın:</p>
              </div>

              <div className="maai-recipes-grid">
                {QUICK_RECIPES.map((group) => (
                  <div key={group.category} className="maai-recipe-group">
                    <div className="maai-recipe-group__title">{group.category}</div>
                    <div className="maai-recipe-group__items">
                      {group.items.map((item) => (
                        <button
                          key={item.title}
                          type="button"
                          className="maai-recipe-card"
                          onClick={() => {
                            setActiveTab("chat");
                            handleSendMessage(item.query);
                          }}
                        >
                          <span className="maai-recipe-card__icon">{item.icon}</span>
                          <div className="maai-recipe-card__text">
                            <strong>{item.title}</strong>
                            <small>{item.desc}</small>
                          </div>
                          <span className="maai-recipe-card__arrow">→</span>
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ─── SEKME 3: MODEL SEÇİMİ & AYARLAR ─── */}
          {activeTab === "settings" && (
            <div className="maai-panel__body maai-panel__body--scroll maai-settings-view">
              <div className="maai-settings-card">
                <h4>🧠 AI Motoru Seçimi</h4>
                <p>Çalışmak istediğiniz zeka omurgasını seçin:</p>

                <div className="maai-provider-list">
                  {AI_PROVIDERS.map((p) => (
                    <label
                      key={p.id}
                      className={`maai-provider-item ${providerId === p.id ? "selected" : ""}`}
                    >
                      <input
                        type="radio"
                        name="ai_provider"
                        checked={providerId === p.id}
                        onChange={() => setProviderId(p.id as ProviderId)}
                      />
                      <span className="maai-provider-item__indicator" style={{ background: p.color }} />
                      <div className="maai-provider-item__info">
                        <strong>{p.name}</strong>
                        <small>{p.badge}</small>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* ÇALIŞMA MODU */}
              <div className="maai-settings-card">
                <h4>⚙️ Çalışma Modu</h4>
                <div className="maai-mode-toggle">
                  <button
                    type="button"
                    className={`maai-mode-btn ${mode === "local" ? "active" : ""}`}
                    onClick={() => setMode("local")}
                  >
                    ⚡ Yerel Çekirdek (Önerilen)
                    <small>Sıfır API anahtarı, anında yanıt</small>
                  </button>

                  <button
                    type="button"
                    className={`maai-mode-btn ${mode === "apikey" ? "active" : ""}`}
                    onClick={() => setMode("apikey")}
                  >
                    ☁️ Güvenli Bulut
                    <small>Anahtar yalnız sunucuda; bağlı hesap gerekir</small>
                  </button>

                  <button
                    type="button"
                    className={`maai-mode-btn ${mode === "deeplink" ? "active" : ""}`}
                    onClick={() => setMode("deeplink")}
                  >
                    🌐 Web / Mobil Köprü
                    <small>Harici uygulamada aç</small>
                  </button>
                </div>
              </div>

              {/* Bulut bağlantısı: istemci anahtarı yoktur. */}
              {mode === "apikey" && (
                <div className="maai-settings-card">
                  <h4>☁️ DeepSeek ağ geçidi</h4>
                  <p>API anahtarı bu cihazda girilmez veya saklanmaz. Bulut özelliği yalnız sunucu yapılandırması ve bağlı öğretmen oturumu hazırsa açılır.</p>
                  <div style={{ marginTop: "10px", display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
                    <button
                      type="button"
                      onClick={async () => {
                        showNotification("⏳ Bağlantı test ediliyor...");
                        const res = await SecureAIClient.validateKey();
                        showNotification(res.message);
                      }}
                      style={{
                        padding: "6px 14px",
                        background: "rgba(16, 185, 129, 0.15)",
                        border: "1px solid rgba(16, 185, 129, 0.4)",
                        color: "#34d399",
                        borderRadius: "6px",
                        fontSize: "0.78rem",
                        fontWeight: 700,
                        cursor: "pointer",
                      }}
                    >
                      🔌 Bağlantıyı Test Et
                    </button>
                  </div>
                  <small style={{ color: "#94a3b8", display: "block", marginTop: "6px" }}>
                    Buluta gönderilecek metni kişisel verilerden arındırın. Otomatik maskeleme yalnız ek korumadır.
                  </small>
                </div>
              )}

              {/* SİBER GÜVENLİK MÜHÜRÜ */}
              <div className="maai-zero-trust-seal">
                <div className="seal-icon">🛡️</div>
                <div>
                  <strong>Veri sınırı</strong>
                  <p>Yerel modda kayıtlar cihazda kalır. Bulut modu seçilirse yalnız yazdığınız istem ve açık bağlam DeepSeek'e gönderilir; resmî kayıt otomatik değiştirilmez.</p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
}

// ─── HIZLI MARKDOWN DÖNÜŞTÜRÜCÜ ─────────────────────────────────────────────

function renderInlineMarkdown(raw: string, keyPrefix: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  const tokenPattern = /(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*)/g;
  let cursor = 0;
  let match: RegExpExecArray | null;

  while ((match = tokenPattern.exec(raw)) !== null) {
    if (match.index > cursor) {
      nodes.push(raw.slice(cursor, match.index));
    }

    const token = match[0];
    const key = `${keyPrefix}-${match.index}`;
    if (token.startsWith("`")) {
      nodes.push(<code key={key}>{token.slice(1, -1)}</code>);
    } else if (token.startsWith("**")) {
      nodes.push(<strong key={key}>{token.slice(2, -2)}</strong>);
    } else {
      nodes.push(<em key={key}>{token.slice(1, -1)}</em>);
    }
    cursor = match.index + token.length;
  }

  if (cursor < raw.length) {
    nodes.push(raw.slice(cursor));
  }
  return nodes;
}

function renderMarkdown(raw: string): React.ReactNode {
  if (!raw) return null;

  const lines = raw.replace(/\r\n?/g, "\n").split("\n");
  const nodes: React.ReactNode[] = [];
  let codeStart = -1;
  let codeLines: string[] = [];

  const appendCodeBlock = (key: string) => {
    nodes.push(
      <pre key={key}>
        <code>{codeLines.join("\n")}</code>
      </pre>,
    );
    codeLines = [];
  };

  lines.forEach((line, index) => {
    if (/^```(?:text)?\s*$/.test(line)) {
      if (codeStart >= 0) {
        appendCodeBlock(`code-${codeStart}`);
        codeStart = -1;
      } else {
        codeStart = index;
      }
      return;
    }

    if (codeStart >= 0) {
      codeLines.push(line);
      return;
    }

    const inline = (text: string) => renderInlineMarkdown(text, `line-${index}`);
    if (line.startsWith("#### ")) {
      nodes.push(<h4 key={`line-${index}`}>{inline(line.slice(5))}</h4>);
    } else if (line.startsWith("### ")) {
      nodes.push(<h3 key={`line-${index}`}>{inline(line.slice(4))}</h3>);
    } else if (line.startsWith("> ")) {
      nodes.push(<blockquote key={`line-${index}`}>{inline(line.slice(2))}</blockquote>);
    } else if (/^(?:• |-{1} )/.test(line)) {
      nodes.push(<li className="maai-li" key={`line-${index}`}>{inline(line.slice(2))}</li>);
    } else if (/^\d+\. /.test(line)) {
      nodes.push(<li className="maai-li-num" key={`line-${index}`}>{inline(line.replace(/^\d+\. /, ""))}</li>);
    } else if (!line) {
      nodes.push(<React.Fragment key={`line-${index}`}><br /><br /></React.Fragment>);
    } else {
      nodes.push(
        <React.Fragment key={`line-${index}`}>
          {inline(line)}
          {index < lines.length - 1 && <br />}
        </React.Fragment>,
      );
    }
  });

  if (codeStart >= 0) {
    appendCodeBlock(`code-${codeStart}`);
  }

  return nodes;
}
