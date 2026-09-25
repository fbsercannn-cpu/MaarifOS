import { lazy, Suspense, useState } from "react";
import type { LocalDataStore } from "../../core/repository/contracts.ts";
import { civilDateInIstanbul } from "../../core/domain/attendance.ts";
import "./document-workshop.css";

const TeacherPrintKit = lazy(() => import("../teacher-print-kit/TeacherPrintKit.tsx").then(m => ({ default: m.TeacherPrintKit })));
const SmallGroupCardsPanel = lazy(() => import("../small-group-cards/SmallGroupCardsPanel.tsx").then(m => ({ default: m.SmallGroupCardsPanel })));
const HomeGameCardsPanel = lazy(() => import("../home-game-cards/HomeGameCardsPanel.tsx").then(m => ({ default: m.HomeGameCardsPanel })));
const DayExitPackagePanel = lazy(() => import("../day-exit-package/DayExitPackagePanel.tsx").then(m => ({ default: m.DayExitPackagePanel })));
const MaterialBoxLabelsPanel = lazy(() => import("../material-box-labels/MaterialBoxLabelsPanel.tsx").then(m => ({ default: m.MaterialBoxLabelsPanel })));
const FamilyResponseBoardPanel = lazy(() => import("../family-response-board/FamilyResponseBoardPanel.tsx").then(m => ({ default: m.FamilyResponseBoardPanel })));

export function DocumentWorkshop({ store, refreshKey, disabled, onChanged, onOpenPlan, onOpenPickup, onOpenMeeting, onOpenCenters, onPlanDate, onOpenStudent, onOpenAttendance, purpose='classroom' }: {
  store: LocalDataStore; refreshKey: string | number; disabled: boolean;
  onChanged: () => void; onOpenPlan: (planId: string) => void;
  onOpenPickup: (studentId: string, civilDate: string) => void;
  onOpenMeeting?: (appointmentId: string) => void;
  onOpenCenters?: () => void;
  onPlanDate?: (civilDate: string) => void;
  onOpenStudent?: (studentId: string) => void;
  onOpenAttendance?: () => void;
  purpose?: 'classroom'|'family';
}) {
  const [active, setActive] = useState<"print" | "groups" | "family" | "exit" | "boxes" | "responses" | null>(null);

  return <section className="document-workshop" aria-label={purpose==='family'?'Aileyle paylaşılacak belgeler':'Sınıfta kullanılacak belgeler'}>
    <h2>{purpose==='family'?'Aileyle paylaşılacak belgeler':'Sınıfta kullanılacak belgeler'}</h2>
    <p>Belgeyi seçin; kayıtlı bilgiler yerleşsin, ilgili işi aynı yerden tamamlayın.</p>
    <div className="document-workshop-options">
      {([
        ["exit", "Günün çıkış paketi", "Teslimleri tamamla · sonraki öğretim gününü hazırla · A4 kontrol sayfası"],
        ["boxes", "Malzeme kutusu etiketleri", "A4 üzerinde 12 etiket · eksikleri hazırlığa ekle · kutuyu hazır işaretle"],
        ["responses", "Aile dönüş panosu", "Gerçek yanıtı seç · takip etkinliğine veya görüşme gündemine yerleştir"],
        ["print", "Teslim çizelgesi ve klasör", "Yatay A4 teslim listesi · kapak, ayraç ve sırt etiketi"],
        ["groups", "Küçük grup kartları", "A4 üzerinde 6 kart · seçilen grubu plana yerleştir"],
        ["family", "Aileye ev oyunu", "A4 üzerinde 2 kart · gelen yanıtı çocuğa bağla"],
      ] as const).filter(([id])=>purpose==='family'?['family','responses'].includes(id):!['family','responses'].includes(id)).map(([id, title, detail]) => <button type="button" key={id} aria-expanded={active === id} onClick={() => { setActive(previous => previous === id ? null : id); }}><strong>{title}</strong><span>{detail}</span></button>)}
    </div>
    <Suspense fallback={<p role="status">Seçtiğiniz belgenin kayıtları hazırlanıyor…</p>}>
      {active==="print" && <TeacherPrintKit store={store} refreshKey={refreshKey} disabled={disabled} onOpenPickup={onOpenPickup} />}
      {active==="groups" && <SmallGroupCardsPanel store={store} civilDate={civilDateInIstanbul(new Date())} refreshKey={refreshKey} disabled={disabled} onChanged={onChanged} onOpenPlan={onOpenPlan} />}
      {active==="family" && <HomeGameCardsPanel store={store} refreshKey={refreshKey} disabled={disabled} onChanged={onChanged} />}
      {active==="exit" && <DayExitPackagePanel store={store} refreshKey={refreshKey} disabled={disabled} onChanged={onChanged} onOpenPickup={onOpenPickup} onOpenPlan={onOpenPlan} onOpenAttendance={onOpenAttendance} onPlanDate={onPlanDate} />}
      {active==="boxes" && <MaterialBoxLabelsPanel store={store} refreshKey={refreshKey} disabled={disabled} onChanged={onChanged} onOpenPlan={onOpenPlan} onOpenCenters={onOpenCenters} onOpenPlanning={onPlanDate} />}
      {active==="responses" && <FamilyResponseBoardPanel store={store} refreshKey={refreshKey} disabled={disabled} onChanged={onChanged} onOpenPlan={onOpenPlan} onOpenMeeting={onOpenMeeting} onOpenStudent={onOpenStudent} onPrepareCard={() => setActive("family")} />}
    </Suspense>
  </section>;
}
