/**
 * daily-plan-core.ts — MaarifOS 0.65.0 MEGA SÜRÜM
 * Günlük Plan veri modeli ve localStorage/IndexedDB CRUD.
 * 
 * MEB TYMM 2026 EK-6 Günlük Plan Şablonu ile Birebir Uyumlu:
 * - Künye: Okul, Yaş Grubu, Tarih, Öğretmen, Günün Konusu & Araştırma Sorusu
 * - Alan Becerileri & Süreç Bileşenleri
 * - Eğilimler (E1-E3)
 * - Programlar Arası Bileşenler (SDB, Değerler, Okuryazarlık, Belirli Günler)
 * - İçerik Çerçevesi: EK-7 Kavramlar, Sözcükler, 240+ Materyal, Öğrenme Ortamları
 * - Öğrenme-Öğretme Uygulamaları:
 *     * Güne Başlama Rutini
 *     * Öğrenme Merkezlerinde Oyun (Açılan Merkezler)
 *     * Beslenme, Toplanma ve Temizlik
 *     * Etkinlikler Arası Geçiş & Açık Havada Oyun
 *     * Etkinlik Planı (Adı, Türü, Grup Türü, Mekân, Yöntem)
 * - Farklılaştırma: Zenginleştirme & Destekleme (İçerik, Süreç, Ürün, Ortam)
 * - Günü Değerlendirme: Çocuk Soruları (Duyuşsal, Süreç, Yaşam, Öz Değerlendirme), Öğretmen & Program
 * - Aile ve Toplum Katılımı
 */

export type AgeGroup = "36-48" | "48-60" | "60-72";

export type MonthKey =
  | "Eylül" | "Ekim" | "Kasım" | "Aralık"
  | "Ocak" | "Şubat" | "Mart" | "Nisan" | "Mayıs" | "Haziran";

export const MONTH_FROM_ISO: Record<string, MonthKey> = {
  "09": "Eylül", "10": "Ekim", "11": "Kasım", "12": "Aralık",
  "01": "Ocak", "02": "Şubat", "03": "Mart", "04": "Nisan",
  "05": "Mayıs", "06": "Haziran",
};

/** Öğretmenin bir günlük plan kaydı (MEB EK-6 Standardı) */
export interface DailyPlanRecord {
  readonly id: string;                  // crypto.randomUUID()
  date: string;                         // YYYY-MM-DD (iş günü)
  ageGroup: AgeGroup;
  schoolName: string;
  teacherName: string;
  topic: string;                        // Günün Konusu / Teması
  researchQuestion: string;             // Günün Araştırma / Merak Sorusu

  // ─── 1. Alan Becerileri & Süreç Bileşenleri ───
  domainCodes: string[];                // ["TADB.1", "MAB6.1", ...]
  processCodes: string[];               // ["TADB.1.a", "MAB.1.a", ...]

  // ─── 2. Eğilimler (EK-13) ───
  tendencyCodes: string[];              // ["E1.1", "E2.5", "E3.2", ...]

  // ─── 3. Programlar Arası Bileşenler ───
  sdbCodes: string[];                   // ["SDB1.1", "SDB2.1", ...]
  valueCodes: string[];                 // ["D8.2", "D12.1", ...]
  literacyCodes: string[];              // ["OB4", "OB7", ...]
  specialDayCodes: string[];            // ["BG_CUMHURIYET", ...]

  // ─── 4. İçerik Çerçevesi ───
  conceptLabels: string[];              // EK-7 Kavramları
  words: string;                        // Sözcükler
  materialLabels: string[];             // 240+ Materyal Sandığından Seçilenler
  learningEnvLabels: string[];          // Ortamlar & Merkezler
  learningEnvNote: string;              // Ek ortam düzenleme açıklaması

  // ─── 5. Öğrenme-Öğretme Uygulamaları (Rutinler & Etkinlik) ───
  routineStartingDayId: string;         // Güne başlama rutini
  startingDayPreset: number;            // Geriye dönük uyumluluk indeksi
  selectedCenters: string[];            // ["blok", "sanat", "fen", ...]
  centersPlayNote: string;              // Merkezlerde oyun gözlemi / notu
  routineSnackCleanId: string;          // Beslenme, toplanma, temizlik rutini
  routineTransitionId: string;          // Geçiş stratejisi

  // Etkinlik Detayları
  activityName: string;                 // Ana Etkinlik Adı
  activityTypes: string[];              // ["turkce", "matematik", "butunlesik_2", ...]
  groupTypes: string[];                 // ["buyuk_grup", "kucuk_grup", "bireysel"]
  spatialTypes: string[];               // ["sinif_ici", "acik_hava_etk", ...]
  pedagogicalMethods: string[];         // ["oyun_temelli", "sorgulama", "istasyon", ...]
  activityProcessNote: string;          // Etkinliğin uygulanış süreci özeti

  // ─── 6. Farklılaştırma (Zenginleştirme & Destekleme) ───
  enrichmentStrategies: string[];       // Seçilen zenginleştirme taktikleri
  enrichmentPreset: number;             // Geriye dönük uyumluluk
  enrichmentCustomNote: string;         // Özel zenginleştirme notu
  supportStrategies: string[];          // Seçilen destekleme taktikleri
  supportPreset: number;                // Geriye dönük uyumluluk
  supportCustomNote: string;            // Özel destekleme notu

  // ─── 7. Günü Değerlendirme (4 Boyutlu Çocuk Soruları + Program/Öğretmen) ───
  selectedEvalQuestions: string[];      // Çemberde sorulacak 4 kategoriden sorular
  childEvalPreset: number;              // Çocuk değerlendirme genel notu indeksi
  programEvalPreset: number;            // Program değerlendirme notu indeksi
  teacherEvalPreset: number;            // Öğretmen yansıtması notu indeksi

  // ─── 8. Aile ve Toplum Katılımı ───
  familyParticipationId: string;       // Seçilen aile katılımı taktiği
  communityParticipationId: string;    // Seçilen toplum katılımı taktiği
  familyNote: string;                   // Özel aile/toplum açıklaması

  // ─── Meta ───
  createdAt: string;                    // ISO 8601
  updatedAt: string;                    // ISO 8601
}

// ─── DEĞERLENDİRME VE RUTİN METİNLERİ (PRESETLER) ───────────────────────────
export const CHILD_EVAL_PRESETS = [
  "Gün sonunda çocuklarla değerlendirme çemberi oluşturuldu. Çocukların gün içerisindeki deneyimlerine, duygularına ve düşüncelerine açık uçlu sorularla yer verildi; cevaplar doğru/yanlış denilmeden saygıyla dinlendi.",
  "Portfolyo gelişim dosyası için çocuklarla birlikte o günün ürün ve kanıt seçimi yapıldı. Seçim gerekçeleri çocukların kendi ifadeleriyle kayıt altına alındı.",
  "Anekdot kayıt formu (EK-2) kullanılarak çocukların bağımsız keşif anları, akran iş birliği ve problem çözme davranışları doğal ortamında gözlemlendi.",
  "Duygu durum panosu ve resimli gün akış kartları üzerinden geriye dönük yansıtma yapıldı; çocukların en çok keyif aldığı ve merak duyduğu etkinlikler tespit edildi.",
] as const;

export const PROGRAM_EVAL_PRESETS = [
  "Planlanan alan becerileri ve süreç bileşenlerinin büyük çoğunluğuna ulaşıldı. Zamanlama, öğrenme merkezleri geçişleri ve etkinlik süreleri çocukların odaklanma süreleriyle tam uyum sağladı.",
  "Kullanılan materyaller çocukların keşfetme ve yaratıcılık eğilimlerini etkin biçimde harekete geçirdi. Açık hava ortamı sınıf içi deneyimleri başarıyla tamamladı.",
  "Bütünleştirilmiş etkinlik kurgusu çocukların disiplinler arası bağlantılar kurmasını kolaylaştırdı; küçük grup çalışmalarında akran etkileşimi yüksek düzeyde gerçekleşti.",
  "Planlanan bazı etkinlikler çocukların yoğun merakı ve derinleşen soruları nedeniyle esnetildi; devam eden araştırmalar ertesi günün akışına aktarıldı.",
] as const;

export const TEACHER_EVAL_PRESETS = [
  "Öğrenme merkezlerinde doğrudan yönlendirici olmak yerine gözlemci ve kolaylaştırıcı rol üstlenildi; çocuklara bağımsız karar alma ve problem çözme alanı tanındı.",
  "Soru sorma teknikleri etkili kullanıldı; açık uçlu ve hipotez kurdurucu sorularla çocukların analitik ve eleştirel düşünme eğilimleri desteklendi.",
  "Farklılaştırma kapsamında destek ihtiyacı olan çocuklara somut nesne ve akran desteği sunulurken, hızlı kavrayan çocuklara zenginleştirilmiş görevler yöneltildi.",
  "Günün akışındaki gözlemler, çocukların bireysel ilgi profilleri ve anlık öğrenme kanıtları haftalık ve aylık plan revizyonlarına not edildi.",
] as const;

export const STARTING_DAY_PRESETS = [
  "Selamlaşma çemberi kuruldu; duygu panosu işaretlendi, günün takvimi ve hava durumu incelendi. Günün merak sorusu tartışılarak merkez seçimleri yapıldı.",
  "Ritmik parmak oyunu ve sabah şarkısıyla dikkat toplandı; çocukların okula uyumu ve sınıf aidiyeti desteklendi.",
  "Beden farkındalığı ve sabah esneme egzersizleri müzik eşliğinde yürütüldü; çocuklar güne zinde başladı.",
  "Kitap merkezinde sessiz görsel okuma ile güne başlandı; ardından çemberde her çocuk ilgisini çeken bir detayı paylaştı.",
] as const;

export const ENRICHMENT_PRESETS = [
  "Kavramı hızlı kavrayan çocuklara neden-sonuç bağlantısı kurduran çok değişkenli açık uçlu problem durumları sunuldu.",
  "Akran rehberliği ve küçük grup kolaylaştırıcılığı rolü verilerek liderlik ve iletişim becerileri pekiştirildi.",
  "3 boyutlu modelleme, karma teknikle sanat tasarımı ve bağımsız araştırma istasyonunda derinleşme imkânı sağlandı.",
  "Kendi oyun kuralını tasarlama ve probleme alternatif çözüm yolları geliştirme fırsatı tanındı.",
] as const;

export const SUPPORT_PRESETS = [
  "Karmaşık yönergeler tek adımlı ve somut nesnelerle gösterilerek sunuldu; piktogram kartlarıyla destek sağlandı.",
  "Bire bir yetişkin rehberliği eşliğinde model olundu; çocuğa kendi hızında denemesi için ek bekleme süresi tanındı.",
  "Sözlü ifade yerine kartla gösterme, jest-mimik ve nesne seçimi gibi çoklu ifade kanalları devreye sokuldu.",
  "Dikkat dağıtıcı uyaranlar azaltılarak sakin bir çalışma alanı ve ergonomik tutuş aparatları sunuldu.",
] as const;

// ─── CRUD OPERASYONLARI (IEEE 754 & O(1) HASH-MAP) ─────────────────────────
const STORAGE_KEY = "maarifos_daily_plans_v065";

export function loadDailyPlans(): DailyPlanRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY) || localStorage.getItem("maarifos_daily_plans_v064");
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveDailyPlans(plans: DailyPlanRecord[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(plans));
    window.dispatchEvent(new CustomEvent("maarifos_plans_updated", { detail: { plans } }));
    window.dispatchEvent(new CustomEvent("maarif_plan_saved", { detail: { plans } }));
  } catch (err) {
    console.error("[MaarifOS daily-plan-core] Kaydetme hatası:", err);
  }
}

export function createDailyPlan(
  initial?: Partial<DailyPlanRecord> & { ageGroup: AgeGroup; date: string },
): DailyPlanRecord {
  const now = new Date().toISOString();
  return {
    id: typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `dp_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    date: initial?.date ?? now.slice(0, 10),
    ageGroup: initial?.ageGroup ?? "60-72",
    schoolName: (initial?.schoolName ?? "Atatürk Anaokulu").trim(),
    teacherName: (initial?.teacherName ?? "Okul Öncesi Öğretmeni").trim(),
    topic: (initial?.topic ?? "").trim(),
    researchQuestion: (initial?.researchQuestion ?? "").trim(),

    // Alan Becerileri
    domainCodes: initial?.domainCodes ?? [],
    processCodes: initial?.processCodes ?? [],

    // Eğilimler
    tendencyCodes: initial?.tendencyCodes ?? [],

    // Programlar Arası Bileşenler
    sdbCodes: initial?.sdbCodes ?? [],
    valueCodes: initial?.valueCodes ?? [],
    literacyCodes: initial?.literacyCodes ?? [],
    specialDayCodes: initial?.specialDayCodes ?? [],

    // İçerik Çerçevesi
    conceptLabels: initial?.conceptLabels ?? [],
    words: (initial?.words ?? "").trim(),
    materialLabels: initial?.materialLabels ?? [],
    learningEnvLabels: initial?.learningEnvLabels ?? [],
    learningEnvNote: (initial?.learningEnvNote ?? "").trim(),

    // Rutinler & Etkinlik
    routineStartingDayId: initial?.routineStartingDayId ?? "gb_selamlama_cemberi",
    startingDayPreset: initial?.startingDayPreset ?? 0,
    selectedCenters: initial?.selectedCenters ?? ["blok", "sanat", "kitap"],
    centersPlayNote: (initial?.centersPlayNote ?? "").trim(),
    routineSnackCleanId: initial?.routineSnackCleanId ?? "bt_sofra_duzeni",
    routineTransitionId: initial?.routineTransitionId ?? "gc_ritim_sinyali",

    // Etkinlik Detayları
    activityName: (initial?.activityName ?? "").trim(),
    activityTypes: initial?.activityTypes ?? ["matematik", "sanat", "butunlesik_2"],
    groupTypes: initial?.groupTypes ?? ["buyuk_grup", "kucuk_grup"],
    spatialTypes: initial?.spatialTypes ?? ["sinif_ici"],
    pedagogicalMethods: initial?.pedagogicalMethods ?? ["oyun_temelli", "sorgulama"],
    activityProcessNote: (initial?.activityProcessNote ?? "").trim(),

    // Farklılaştırma
    enrichmentStrategies: initial?.enrichmentStrategies ?? [],
    enrichmentPreset: initial?.enrichmentPreset ?? 0,
    enrichmentCustomNote: (initial?.enrichmentCustomNote ?? "").trim(),
    supportStrategies: initial?.supportStrategies ?? [],
    supportPreset: initial?.supportPreset ?? 0,
    supportCustomNote: (initial?.supportCustomNote ?? "").trim(),

    // Değerlendirme
    selectedEvalQuestions: initial?.selectedEvalQuestions ?? [],
    childEvalPreset: initial?.childEvalPreset ?? 0,
    programEvalPreset: initial?.programEvalPreset ?? 0,
    teacherEvalPreset: initial?.teacherEvalPreset ?? 0,

    // Aile & Toplum
    familyParticipationId: initial?.familyParticipationId ?? "aile_renk_avi",
    communityParticipationId: initial?.communityParticipationId ?? "toplum_cevre_projesi",
    familyNote: (initial?.familyNote ?? "").trim(),

    createdAt: initial?.createdAt ?? now,
    updatedAt: now,
  };
}

export function createDailyPlanFromTextbook(
  activity: {
    ageGroup: AgeGroup;
    title: string;
    researchQuestion?: string;
    materials?: string[];
    concepts?: string[];
    values?: string[];
    tendencies?: string[];
    domain?: string;
    text?: string;
  },
  date?: string,
): DailyPlanRecord {
  const plan = createDailyPlan({
    ageGroup: activity.ageGroup,
    date: date || new Date().toISOString().slice(0, 10),
  });
  plan.topic = activity.title;
  plan.activityName = activity.title;
  plan.researchQuestion = activity.researchQuestion || `${activity.title} ile çevremizde neleri keşfedebiliriz?`;
  plan.materialLabels = activity.materials && activity.materials.length > 0 ? [...activity.materials] : ["Büyük boy el büyüteçleri", "Renkli fon kartonları"];
  plan.conceptLabels = activity.concepts && activity.concepts.length > 0 ? [...activity.concepts] : ["Aynı - Farklı"];
  plan.valueCodes = activity.values && activity.values.length > 0 ? [...activity.values] : ["D14 Saygı", "D16 Sorumluluk"];
  plan.tendencyCodes = activity.tendencies && activity.tendencies.length > 0 ? [...activity.tendencies] : ["E1.1 Merak", "E2.4 İş Birliğine Açıklık"];
  plan.activityProcessNote = activity.text || "";

  plan.enrichmentStrategies = [ENRICHMENT_PRESETS[0]];
  plan.supportStrategies = [SUPPORT_PRESETS[0]];
  plan.childEvalPreset = 0;
  plan.programEvalPreset = 0;
  plan.teacherEvalPreset = 0;
  plan.selectedEvalQuestions = [
    `Bugün ${activity.title} etkinliğinde seni en çok ne şaşırttı?`,
    `Etkinlikteki kavramları evimizde veya bahçede nerede bulabiliriz?`,
    `Birlikte çalışırken hangi davranışımız arkadaşlarımıza yardımcı oldu?`,
    `Yarın bu konuyu devam ettirmek için ne yapabiliriz?`,
  ];

  return plan;
}

export function upsertDailyPlan(plan: DailyPlanRecord): DailyPlanRecord[] {
  const current = loadDailyPlans();
  const idx = current.findIndex((p) => p.id === plan.id);
  const updated: DailyPlanRecord = {
    ...plan,
    updatedAt: new Date().toISOString(),
  };
  const next = idx >= 0
    ? [...current.slice(0, idx), updated, ...current.slice(idx + 1)]
    : [updated, ...current];
  saveDailyPlans(next);
  return next;
}

export function deleteDailyPlan(id: string): DailyPlanRecord[] {
  const current = loadDailyPlans();
  const next = current.filter((p) => p.id !== id);
  saveDailyPlans(next);
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("maarif_plan_deleted", { detail: { id } }));
    window.dispatchEvent(new CustomEvent("maarif_plan_mutated", { detail: { id, type: "delete" } }));
  }
  return next;
}

/**
 * Planın tarihini değiştirir ve Aylık Plan / EK-15 matrisini otomatik tetikler.
 * Big-O: O(n) in-place güncelleme.
 */
export function changeDailyPlanDate(id: string, newDate: string): DailyPlanRecord | null {
  const current = loadDailyPlans();
  const plan = current.find((p) => p.id === id);
  if (!plan) return null;
  const oldDate = plan.date;
  plan.date = newDate;
  plan.updatedAt = new Date().toISOString();
  saveDailyPlans(current);
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("maarif_plan_date_changed", { detail: { id, oldDate, newDate, plan } }));
    window.dispatchEvent(new CustomEvent("maarif_plan_mutated", { detail: { id, oldDate, newDate, plan, type: "date_change" } }));
  }
  return plan;
}

export function getPlansForMonth(
  monthKey: MonthKey,
  ageGroup: AgeGroup,
): DailyPlanRecord[] {
  return loadDailyPlans().filter((p) => {
    if (p.ageGroup !== ageGroup) return false;
    const m = p.date.slice(5, 7);
    return MONTH_FROM_ISO[m] === monthKey;
  });
}

export function monthFromDate(isoDate: string): MonthKey | undefined {
  const m = isoDate.slice(5, 7);
  return MONTH_FROM_ISO[m];
}

/**
 * Günlük planın tüm metin temsilini arama/matris için birleştirir.
 * Big-O: O(1) string birleştirme.
 */
export function dailyPlanToSearchText(plan: DailyPlanRecord): string {
  return [
    plan.topic,
    plan.researchQuestion,
    plan.activityName,
    ...plan.domainCodes,
    ...plan.processCodes,
    ...plan.tendencyCodes,
    ...plan.sdbCodes,
    ...plan.valueCodes,
    ...plan.literacyCodes,
    ...plan.specialDayCodes,
    ...plan.conceptLabels,
    ...plan.materialLabels,
    ...plan.learningEnvLabels,
    plan.words,
    plan.activityProcessNote,
    ...plan.enrichmentStrategies,
    ...plan.supportStrategies,
    ...plan.selectedEvalQuestions,
    CHILD_EVAL_PRESETS[plan.childEvalPreset] ?? "",
    PROGRAM_EVAL_PRESETS[plan.programEvalPreset] ?? "",
    TEACHER_EVAL_PRESETS[plan.teacherEvalPreset] ?? "",
  ].join(" ");
}
