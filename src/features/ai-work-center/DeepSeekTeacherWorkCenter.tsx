import { LightningBoltIcon, LockClosedIcon, MagicWandIcon } from "@radix-ui/react-icons";

import type { DeepSeekTeacherWork } from "./deepseek-teacher-work.ts";
import "./deepseek-teacher-work-center.css";

export interface DeepSeekTeacherWorkCenterProps {
  readonly tasks: readonly DeepSeekTeacherWork[];
  readonly busy?: boolean;
  readonly notice?: string;
  readonly onSelect: (task: DeepSeekTeacherWork) => void | Promise<void>;
}

export function DeepSeekTeacherWorkCenter({
  tasks,
  busy = false,
  notice = "",
  onSelect,
}: DeepSeekTeacherWorkCenterProps) {
  const [primary, ...followUps] = tasks;
  if (!primary) return null;

  return (
    <section className="deepseek-work-center" aria-labelledby="deepseek-work-center-title">
      <header className="deepseek-work-center__header">
        <span className="deepseek-work-center__mark" aria-hidden="true">
          <LightningBoltIcon />
        </span>
        <span className="deepseek-work-center__title">
          <small>Güvenli öğretmen yardımcısı</small>
          <strong id="deepseek-work-center-title">DeepSeek Öğretmen İşleri</strong>
        </span>
        <span className="deepseek-work-center__security">
          <LockClosedIcon aria-hidden="true" /> Sunucu anahtarı
        </span>
      </header>

      <button
        type="button"
        className="deepseek-work-center__primary"
        disabled={busy}
        onClick={() => void onSelect(primary)}
      >
        <MagicWandIcon aria-hidden="true" />
        <span>
          <strong>{primary.title}</strong>
          <small>{primary.detail}</small>
        </span>
        <b>{busy && primary.kind === "plan" ? "Hazırlanıyor…" : primary.actionLabel}</b>
      </button>

      {followUps.length > 0 ? (
        <div className="deepseek-work-center__follow-ups" aria-label="DeepSeek takip işleri">
          {followUps.map((task) => (
            <button
              type="button"
              key={task.id}
              disabled={busy}
              onClick={() => void onSelect(task)}
            >
              <span>
                <strong>{task.title}</strong>
                <small>{task.detail}</small>
              </span>
              <b>{task.actionLabel}</b>
            </button>
          ))}
        </div>
      ) : null}

      <footer>
        <span>Ad, T.C. kimlik numarası, telefon ve adres otomatik gönderilmez.</span>
        <span>Çıktılar öğretmen seçmeden resmî kayda dönüşmez.</span>
      </footer>
      {notice ? <p className="deepseek-work-center__notice" role="status">{notice}</p> : null}
    </section>
  );
}
