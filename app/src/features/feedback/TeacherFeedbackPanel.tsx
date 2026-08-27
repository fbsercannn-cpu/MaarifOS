import {
  ExclamationTriangleIcon,
  InfoCircledIcon,
} from "@radix-ui/react-icons";
import type { TeacherFeedback } from "./teacher-feedback.ts";
import "./teacher-feedback.css";

export interface TeacherFeedbackPanelProps {
  feedback: TeacherFeedback;
  onAction?: () => void;
  compact?: boolean;
}

export function TeacherFeedbackPanel({
  feedback,
  onAction,
  compact = false,
}: TeacherFeedbackPanelProps) {
  const assertive = feedback.severity === "error";
  return (
    <section
      className={`teacher-feedback is-${feedback.severity}${compact ? " is-compact" : ""}`}
      role={assertive ? "alert" : "status"}
      aria-live={assertive ? "assertive" : "polite"}
      aria-atomic="true"
      data-feedback-code={feedback.code}
      data-testid="teacher-feedback"
    >
      <span className="teacher-feedback-icon" aria-hidden="true">
        {feedback.severity === "info" ? (
          <InfoCircledIcon />
        ) : (
          <ExclamationTriangleIcon />
        )}
      </span>
      <div className="teacher-feedback-content">
        <strong>{feedback.title}</strong>
        <p>{feedback.detail}</p>
        {feedback.action && onAction ? (
          <button type="button" onClick={onAction} data-testid="teacher-feedback-action">
            {feedback.action.label}
          </button>
        ) : null}
        <details>
          <summary>Teknik ayrıntı</summary>
          <span>
            Destek kodu: <code>{feedback.supportCode}</code>
          </span>
          {feedback.technicalDetail ? <p>{feedback.technicalDetail}</p> : null}
        </details>
      </div>
    </section>
  );
}
