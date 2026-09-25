import { useEffect, useMemo, useState, type MouseEvent } from "react";
import {
  ChatBubbleIcon,
  ChevronDownIcon,
  ClockIcon,
  LightningBoltIcon,
  Pencil1Icon,
  ReaderIcon,
  SpeakerLoudIcon,
} from "@radix-ui/react-icons";
import {
  CircadianRhythmEngine,
  type CircadianPhase,
} from "../services/circadian-rhythm-engine";
import { AmbientClassroomPedagogue } from "../services/ambient-classroom-pedagogue";
import { triggerHaptic } from "../core/haptics";

export interface ClassroomDynamicIslandProps {
  absentCount?: number;
  presentCount?: number;
  totalStudents?: number;
  absentStudentNames?: string[];
  classroomName?: string;
  teacherName?: string;
  onOpenAttendance?: () => void;
  onOpenPlanFlow?: () => void;
  onOpenQuickObservation?: () => void;
}

type DeckTab = "pulse" | "zpd" | "crisis";

export function ClassroomDynamicIsland({
  absentCount = 0,
  presentCount = 0,
  totalStudents = 0,
  absentStudentNames = [],
  classroomName = "Sınıfım",
  teacherName = "Öğretmenim",
  onOpenAttendance,
  onOpenPlanFlow,
  onOpenQuickObservation,
}: ClassroomDynamicIslandProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [currentPhase, setCurrentPhase] = useState<CircadianPhase>(() =>
    CircadianRhythmEngine.getCurrentPhase(),
  );
  const [currentTime, setCurrentTime] = useState(() =>
    new Date().toTimeString().slice(0, 5),
  );
  const [deckTab, setDeckTab] = useState<DeckTab>("pulse");
  const [zpdTopic, setZpdTopic] = useState<"block" | "scissor" | "share">("block");
  const [crisisTopic, setCrisisTopic] = useState<
    "aggression_physical" | "tantrum_crying" | "possession_conflict"
  >("possession_conflict");
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    const timer = window.setInterval(() => {
      const now = new Date();
      setCurrentPhase(CircadianRhythmEngine.getCurrentPhase(now));
      setCurrentTime(now.toTimeString().slice(0, 5));
    }, 60_000);
    return () => window.clearInterval(timer);
  }, []);

  const phaseTone = useMemo(() => {
    switch (currentPhase.phaseId) {
      case "kinetic_burst": return "amber";
      case "lunch_nutrition": return "emerald";
      case "post_lunch_dip": return "violet";
      case "social_reflection": return "cyan";
      default: return "sky";
    }
  }, [currentPhase.phaseId]);

  const zpdResult = useMemo(() => {
    const descriptions = {
      block: "blok kule denge",
      scissor: "makas kesme boyama",
      share: "sıra paylaşma benim",
    };
    return AmbientClassroomPedagogue.scaffoldLearningMoment({
      center: currentPhase.recommendedCenter,
      studentName: "Çocuğumuz",
      actionDescription: descriptions[zpdTopic],
    });
  }, [currentPhase.recommendedCenter, zpdTopic]);

  const crisisResult = useMemo(() =>
    AmbientClassroomPedagogue.generateCrisisShield({
      studentName: "Öğrencimiz",
      incidentType: crisisTopic,
    }), [crisisTopic]);

  const showNotice = (message: string) => {
    setNotice(message);
    triggerHaptic(15);
    window.setTimeout(() => setNotice(null), 3200);
  };

  const stop = (event: MouseEvent) => event.stopPropagation();

  const copyFamilyNote = async (event: MouseEvent) => {
    stop(event);
    const names = absentStudentNames.length ? absentStudentNames.join(", ") : "öğrencimiz";
    const text = `Sayın Velimiz,\nBugün ${names} sınıfımızda aramızda olamadı. Sağlık veya özel bir durum varsa lütfen bizi bilgilendiriniz.\nSevgilerimizle,\n${classroomName} — ${teacherName}`;
    try {
      await navigator.clipboard.writeText(text);
      showNotice("Veli bilgilendirme notu panoya kopyalandı.");
    } catch {
      showNotice("Metin hazırlandı; pano izni verilmedi.");
    }
  };

  const openVoiceObservation = (event: MouseEvent) => {
    stop(event);
    triggerHaptic(20);
    onOpenQuickObservation?.();
  };

  const openPlan = (event: MouseEvent) => {
    stop(event);
    triggerHaptic(15);
    onOpenPlanFlow?.();
  };

  return (
    <aside
      className="classroom-dynamic-island"
      data-expanded={isExpanded ? "true" : "false"}
      data-tone={phaseTone}
      aria-label="Dinamik Pedagojik Ada"
    >
      {notice ? <p className="classroom-island__notice" role="status">{notice}</p> : null}

      <section className="classroom-island__surface">
        <button
          type="button"
          className="classroom-island__summary"
          aria-expanded={isExpanded}
          aria-controls="classroom-island-deck"
          onClick={() => {
            triggerHaptic(10);
            setIsExpanded((current) => !current);
          }}
        >
          <span className="classroom-island__pulse" aria-hidden="true" />
          <span className="classroom-island__summary-copy">
            <small><ClockIcon aria-hidden="true" /> {currentTime}</small>
            <strong>{currentPhase.shortName}</strong>
          </span>
          <span className="classroom-island__status">
            {absentCount > 0 ? `${absentCount} devamsız` : `${presentCount}/${totalStudents || presentCount} sınıfta`}
          </span>
          <ChevronDownIcon className="classroom-island__chevron" aria-hidden="true" />
        </button>

        {isExpanded ? (
          <div id="classroom-island-deck" className="classroom-island__deck">
            <div className="classroom-island__tabs" role="tablist" aria-label="Pedagojik destek alanları">
              <button type="button" role="tab" aria-selected={deckTab === "pulse"} onClick={() => setDeckTab("pulse")}>
                <ClockIcon aria-hidden="true" /><span>Günün ritmi</span>
              </button>
              <button type="button" role="tab" aria-selected={deckTab === "zpd"} onClick={() => setDeckTab("zpd")}>
                <LightningBoltIcon aria-hidden="true" /><span>Öğrenme iskelesi</span>
              </button>
              <button type="button" role="tab" aria-selected={deckTab === "crisis"} onClick={() => setDeckTab("crisis")}>
                <ChatBubbleIcon aria-hidden="true" /><span>Aile ve çatışma</span>
              </button>
            </div>

            {deckTab === "pulse" ? (
              <section className="classroom-island__panel" role="tabpanel">
                <div className="classroom-island__metric">
                  <small>Bilişsel kapasite</small>
                  <div><span><i style={{ width: `${currentPhase.cognitiveCapacity}%` }} /></span><b>%{currentPhase.cognitiveCapacity}</b></div>
                </div>
                <div className="classroom-island__metric">
                  <small>Önerilen merkez</small>
                  <strong>{currentPhase.recommendedCenter}</strong>
                </div>
                <p className="classroom-island__guidance"><small>Pedagojik rehberlik</small>{currentPhase.pedagogicalGuidance}</p>
              </section>
            ) : null}

            {deckTab === "zpd" ? (
              <section className="classroom-island__panel" role="tabpanel">
                <div className="classroom-island__choice-row" aria-label="Öğrenme durumu">
                  <button type="button" aria-pressed={zpdTopic === "block"} onClick={() => setZpdTopic("block")}>Blok ve denge</button>
                  <button type="button" aria-pressed={zpdTopic === "scissor"} onClick={() => setZpdTopic("scissor")}>Makas çalışması</button>
                  <button type="button" aria-pressed={zpdTopic === "share"} onClick={() => setZpdTopic("share")}>Sıra ve paylaşma</button>
                </div>
                <p className="classroom-island__guidance"><small>Öğretmenin söyleyebileceği cümle</small>{zpdResult.teacherWhisperPrompt}</p>
              </section>
            ) : null}

            {deckTab === "crisis" ? (
              <section className="classroom-island__panel" role="tabpanel">
                <div className="classroom-island__choice-row" aria-label="Olay türü">
                  <button type="button" aria-pressed={crisisTopic === "possession_conflict"} onClick={() => setCrisisTopic("possession_conflict")}>Paylaşamama</button>
                  <button type="button" aria-pressed={crisisTopic === "aggression_physical"} onClick={() => setCrisisTopic("aggression_physical")}>Fiziksel tepki</button>
                  <button type="button" aria-pressed={crisisTopic === "tantrum_crying"} onClick={() => setCrisisTopic("tantrum_crying")}>Ağlama ve öfke</button>
                </div>
                <p className="classroom-island__guidance"><small>O anda öğretmen hamlesi</small>{crisisResult.immediateTeacherAction}</p>
                <button type="button" className="classroom-island__copy" onClick={async (event) => {
                  stop(event);
                  await navigator.clipboard.writeText(crisisResult.parentWhatsAppDigest);
                  showNotice("Aile paylaşım notu panoya kopyalandı.");
                }}><ChatBubbleIcon aria-hidden="true" /> Aile notunu kopyala</button>
              </section>
            ) : null}

            <div className="classroom-island__actions" aria-label="Hızlı sınıf eylemleri">
              {absentCount > 0 ? <button type="button" onClick={copyFamilyNote}><ChatBubbleIcon aria-hidden="true" /><span>Veli bilgilendirme</span></button> : null}
              <button type="button" onClick={openVoiceObservation}><Pencil1Icon aria-hidden="true" /><span>Hızlı gözlem</span></button>
              <button type="button" onClick={openPlan}><ReaderIcon aria-hidden="true" /><span>Günün planı</span></button>
              <button type="button" onClick={(event) => { stop(event); onOpenAttendance?.(); }}><SpeakerLoudIcon aria-hidden="true" /><span>Yoklamayı aç</span></button>
            </div>
          </div>
        ) : null}
      </section>
    </aside>
  );
}
