import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { rankPlanTargetRecommendations } from "../../src/features/planning/plan-target-recommendations.ts";

const planFlowSource = readFileSync(
  new URL("../../src/features/planning/PlanCreationFlow.tsx", import.meta.url),
  "utf8",
);

function target(id, domain, referenceTitle) {
  return {
    id,
    domain,
    referenceTitle,
    referenceCode: id.toLocaleUpperCase("tr-TR"),
  };
}

test("kanıt bulunmadığında yaş uygunluğu tek başına hedef önerisi üretmez", () => {
  const recommendations = rankPlanTargetRecommendations({
    targets: [
      target("muz-1", "Müzik", "Ritim kalıplarını uygular."),
      target("san-1", "Sanat", "Özgün görsel çalışmalar oluşturur."),
    ],
    activityTitle: "Zqxv sessiz nesne",
    limit: 4,
  });

  assert.deepEqual(recommendations, []);
});

test("bir kanıtlı hedef sıfır puanlı kayıtlarla dörde tamamlanmaz", () => {
  const recommendations = rankPlanTargetRecommendations({
    targets: [
      target("fen-1", "Fen", "Canlıları gözlemleyerek veri toplar."),
      target("muz-1", "Müzik", "Ritim kalıplarını uygular."),
      target("san-1", "Sanat", "Özgün görsel çalışmalar oluşturur."),
      target("sos-1", "Sosyal", "Toplumsal kurumları açıklar."),
    ],
    activityTitle: "Bilinmeyen laboratuvar nesnesi",
    activitySuggestion: {
      id: "local-science",
      area: "science",
      title: "Bilinmeyen laboratuvar nesnesi",
      teacherPrompt: "Çocuklar nesneyi yetişkin eşliğinde inceler.",
    },
    limit: 4,
  });

  assert.equal(recommendations.length, 1);
  assert.equal(recommendations[0]?.target.id, "fen-1");
  assert.ok(recommendations[0]?.score > 0);
});

test("doğrudan anlam kanıtı bulunan hedef önerilmeye devam eder", () => {
  const recommendations = rankPlanTargetRecommendations({
    targets: [
      target("muz-1", "Müzik", "Ritim kalıplarını uygular."),
      target("fen-1", "Fen", "Canlıları gözlemler."),
    ],
    activityTitle: "Ritim oyunu",
  });

  assert.equal(recommendations.length, 1);
  assert.equal(recommendations[0]?.target.id, "muz-1");
  assert.doesNotMatch(recommendations[0]?.reason ?? "", /güvenli genel seçenek/iu);
});

test("boş öneri durumu öğretmene manuel alan veya kod seçimini erişilebilir biçimde gösterir", () => {
  assert.match(
    planFlowSource,
    /Bu etkinlik için kanıtlı otomatik eşleşme bulunamadı\. Daha fazla hedef\s+ara bölümünden alan veya kodla seçim yapın\./u,
  );
  assert.match(
    planFlowSource,
    /data-testid="semantic-target-explanation"[\s\S]*role="status"[\s\S]*aria-live="polite"/u,
  );
  assert.doesNotMatch(planFlowSource, /resmî katalogdaki güvenli genel seçenek/iu);
});
