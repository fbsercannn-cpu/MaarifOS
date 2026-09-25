export type DeepSeekTeacherWorkId =
  | "prepare-daily-plan"
  | "review-daily-plan"
  | "analyze-observation"
  | "prepare-family-brief"
  | "prepare-day-reflection";

export type DeepSeekTeacherWorkKind = "assistant" | "observation" | "plan";

export interface DeepSeekTeacherWorkInput {
  readonly civilDate: string;
  readonly ageBand?: string;
  readonly programLabel: string;
  readonly studentCount: number;
  readonly attendance: {
    readonly marked: number;
    readonly total: number;
  };
  readonly pendingObservationCount: number;
  readonly hasDailyPlan: boolean;
}

export interface DeepSeekTeacherWork {
  readonly id: DeepSeekTeacherWorkId;
  readonly kind: DeepSeekTeacherWorkKind;
  readonly title: string;
  readonly detail: string;
  readonly actionLabel: string;
  readonly query?: string;
  readonly primary: boolean;
}

function boundedCount(value: number): number {
  return Number.isFinite(value) ? Math.max(0, Math.trunc(value)) : 0;
}

function normalizedAgeBand(value?: string): string {
  if (!value) return "öğretmenin seçtiği okul öncesi yaş grubu";
  const compact = value.trim().replace(/\s*(?:-|\u2013)\s*/gu, "–");
  return /\bay$/iu.test(compact) ? compact : `${compact} ay`;
}

function anonymousContext(input: DeepSeekTeacherWorkInput): string {
  const studentCount = boundedCount(input.studentCount);
  const marked = Math.min(boundedCount(input.attendance.marked), boundedCount(input.attendance.total));
  const total = boundedCount(input.attendance.total);
  const pending = boundedCount(input.pendingObservationCount);
  return [
    `Tarih: ${input.civilDate}.`,
    `Yaş grubu: ${normalizedAgeBand(input.ageBand)}.`,
    `Program: ${input.programLabel.trim() || "TYMM Okul Öncesi"}.`,
    `Kayıtlı çocuk sayısı: ${studentCount}.`,
    `Yoklama kapsamı: ${marked}/${total}.`,
    `Bağlantı bekleyen gözlem sayısı: ${pending}.`,
  ].join(" ");
}

function dailyPlanWork(input: DeepSeekTeacherWorkInput): DeepSeekTeacherWork {
  if (!input.hasDailyPlan) {
    return {
      id: "prepare-daily-plan",
      kind: "plan",
      title: "AI ile bugünün plan taslağını hazırla",
      detail: "DeepSeek güvenli ağ geçidini dener; bağlantı yoksa cihaz içi motorla taslak oluşturur. Onayınız olmadan kaydetmez.",
      actionLabel: "Taslağı oluştur",
      primary: true,
    };
  }
  return {
    id: "review-daily-plan",
    kind: "assistant",
    title: "Bugünün planını iyileştir",
    detail: "Kayıtlı planı değiştirmeden uyarlama, soru ve değerlendirme seçenekleri hazırlar.",
    actionLabel: "Önerileri hazırla",
    query: `${anonymousContext(input)} Kayıtlı günlük planı değiştirmeden; kapsayıcı uyarlama, beş açık uçlu soru ve gün sonu değerlendirme ölçütleri içeren kısa bir öğretmen çalışma taslağı hazırla. Çocuk adı veya kişisel veri isteme.`,
    primary: false,
  };
}

function observationWork(input: DeepSeekTeacherWorkInput): DeepSeekTeacherWork {
  const pending = boundedCount(input.pendingObservationCount);
  return {
    id: "analyze-observation",
    kind: "observation",
    title: pending > 0 ? `${pending} gözlemi anlamlandır` : "Yeni gözlemi anlamlandır",
    detail: "Ham notu nesnel dile, TYMM bağlantı seçeneklerine ve takip taslağına dönüştürür.",
    actionLabel: "Gözlem çalışma alanını aç",
    primary: input.hasDailyPlan && pending > 0,
  };
}

function familyBriefWork(input: DeepSeekTeacherWorkInput): DeepSeekTeacherWork {
  return {
    id: "prepare-family-brief",
    kind: "assistant",
    title: "Veli bülteni taslağı",
    detail: "İsim ve iletişim bilgisi göndermeden haftalık sınıf bülteni hazırlar.",
    actionLabel: "Bülteni hazırla",
    query: `${anonymousContext(input)} Velilere yönelik; bu haftanın öğrenme odağını, evde uygulanabilecek tek düşük maliyetli etkinliği ve kısa bir hatırlatmayı içeren sıcak fakat kurumsal bir bülten taslağı hazırla. Hiçbir çocuk adı, telefon veya özel aile bilgisi kullanma. Göndermeden önce öğretmen incelemesi gerektiğini belirt.`,
    primary: false,
  };
}

function reflectionWork(input: DeepSeekTeacherWorkInput): DeepSeekTeacherWork {
  return {
    id: "prepare-day-reflection",
    kind: "assistant",
    title: "Gün sonu yansımasını hazırla",
    detail: "Yoklama ve gözlem kapsamından öğretmenin tamamlayacağı kısa yansıma soruları üretir.",
    actionLabel: "Yansımayı hazırla",
    query: `${anonymousContext(input)} Bu anonim sınıf özeti için tanı, puan veya çocuk karşılaştırması yapmadan beş maddelik gün sonu öğretmen yansıma taslağı hazırla. Her maddede gözlenecek kanıtı ve yarın için olası bir sonraki adımı ayrı yaz.`,
    primary: input.hasDailyPlan && input.pendingObservationCount <= 0,
  };
}

export function createDeepSeekTeacherWork(
  input: DeepSeekTeacherWorkInput,
): readonly DeepSeekTeacherWork[] {
  const plan = dailyPlanWork(input);
  const observation = observationWork(input);
  const candidates = [plan, observation, familyBriefWork(input), reflectionWork(input)];
  const primary = candidates.find((item) => item.primary) ?? plan;
  const followUps = candidates
    .filter((item) => item.id !== primary.id)
    .sort((left, right) => {
      const priority: Record<DeepSeekTeacherWorkId, number> = {
        "prepare-daily-plan": 0,
        "review-daily-plan": 0,
        "prepare-family-brief": 1,
        "analyze-observation": 2,
        "prepare-day-reflection": 3,
      };
      return priority[left.id] - priority[right.id];
    })
    .slice(0, 2)
    .map((item) => ({ ...item, primary: false }));
  return [{ ...primary, primary: true }, ...followUps];
}
