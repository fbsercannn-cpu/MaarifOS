import { ClockIcon, CubeIcon, CheckCircledIcon } from "@radix-ui/react-icons";
import type { TodayPlanItem } from "../today/today-data.ts";
import { TODAY_TEACHING_COPY as copy, type TodayTeachingFocus } from "./today-teaching-focus.ts";

export function TodayTeachingCard({ focus }: { focus: TodayTeachingFocus }) {
  const suggested = focus.kind === "suggestion" ? focus.activity : null;
  const recorded = focus.kind === "recorded" ? focus.item : null;
  const duration = suggested?.durationMinutes ?? recorded?.durationMinutes;
  return (
    <section className="today-teaching-card" aria-labelledby="today-teaching-card-title">
      {suggested ? <img className="today-teaching-card__image" src="./assets/teaching/teacher-workshop.webp" alt="" width={1280} height={512} draggable={false} /> : null}
      <p className="today-teaching-card__eyebrow">
        {suggested ? copy.suggestion : recorded?.status === "in_progress" ? copy.current : copy.next}
      </p>
      <h2 id="today-teaching-card-title">{suggested?.title ?? recorded?.title}</h2>
      <div className="today-teaching-card__meta">
        {duration ? <span><ClockIcon aria-hidden="true" />{duration} dk</span> : null}
        {suggested ? <span>{suggested.environment}</span> : recorded?.startTime ? <span>{recorded.startTime}{recorded.endTime ? ` – ${recorded.endTime}` : ""}</span> : null}
        {recorded ? <span>{copy.savedFlow}</span> : null}
      </div>
      {recorded?.purpose ? <p className="today-teaching-card__prompt">{recorded.purpose}</p> : null}
      {suggested ? <>
        <p className="today-teaching-card__materials"><CubeIcon aria-hidden="true" /><span><strong>{copy.materials}: </strong>{suggested.materials.join(", ")}</span></p>
        <p className="today-teaching-card__note">{copy.suggestionNote}</p>
      </> : null}
    </section>
  );
}

export function TodayRecordedFlow({ items, currentId }: { items: readonly TodayPlanItem[]; currentId: string }) {
  const currentIndex = Math.max(0, items.findIndex((item) => item.id === currentId));
  const visible = items.slice(currentIndex, currentIndex + 3);
  return (
    <section className="today-recorded-flow" aria-label={copy.savedFlow}>
      <h2>{copy.planned}</h2>
      <ol start={currentIndex + 1}>
        {visible.map((item, index) => <li key={item.id} data-current={item.id === currentId ? "true" : undefined}>
          <span className="today-recorded-flow__number" aria-hidden="true">{item.status === "completed" ? <CheckCircledIcon /> : currentIndex + index + 1}</span>
          <span><strong>{item.title}</strong><small>{item.status === "completed" ? copy.completed : item.status === "in_progress" ? copy.inProgress : copy.upcoming}{item.durationMinutes ? ` · ${item.durationMinutes} dk` : ""}</small></span>
        </li>)}
      </ol>
      {items.length > currentIndex + visible.length ? <p>{copy.moreFlow(items.length - currentIndex - visible.length)}</p> : null}
    </section>
  );
}
