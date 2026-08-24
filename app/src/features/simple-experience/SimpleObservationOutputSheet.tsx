import { useEffect, useId, useRef, useState } from "react";
import { FileTextIcon, PersonIcon } from "@radix-ui/react-icons";

import { BottomSheet, KeyboardInput } from "../../mobile";
import type {
  SimpleObservationDocumentAudience,
  SimpleObservationPeriod,
} from "../reports/simple-observation-document.ts";
import "./simple-observation-output-sheet.css";

export interface SimpleObservationOutputStudent {
  readonly id: string;
  readonly displayName: string;
  readonly observationCount?: number;
}

export interface SimpleObservationOutputRequest {
  readonly studentId: string;
  readonly audience: SimpleObservationDocumentAudience;
  readonly period: SimpleObservationPeriod;
}

export interface SimpleObservationOutputSheetProps {
  readonly open: boolean;
  readonly students: readonly SimpleObservationOutputStudent[];
  readonly initialStudentId?: string | null;
  readonly initialAudience?: SimpleObservationDocumentAudience;
  readonly initialStartCivilDate: string;
  readonly initialEndCivilDate: string;
  readonly maximumCivilDate?: string | null;
  readonly disabled?: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly onGenerate: (
    request: SimpleObservationOutputRequest,
  ) => void | Promise<void>;
}

const CIVIL_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/u;

function isCivilDate(value: string): boolean {
  if (!CIVIL_DATE_PATTERN.test(value)) return false;
  const instant = new Date(`${value}T12:00:00.000Z`);
  return (
    !Number.isNaN(instant.getTime()) &&
    instant.toISOString().slice(0, 10) === value
  );
}

export function validateSimpleObservationOutputRequest(
  request: SimpleObservationOutputRequest,
  options: {
    readonly studentIds: readonly string[];
    readonly maximumCivilDate?: string | null;
  },
): string | null {
  if (!request.studentId || !options.studentIds.includes(request.studentId)) {
    return "Aktif sınıftan bir çocuk seçin.";
  }
  if (
    !isCivilDate(request.period.startCivilDate) ||
    !isCivilDate(request.period.endCivilDate)
  ) {
    return "Başlangıç ve bitiş tarihlerini seçin.";
  }
  if (request.period.endCivilDate < request.period.startCivilDate) {
    return "Bitiş tarihi başlangıçtan önce olamaz.";
  }
  if (
    options.maximumCivilDate &&
    isCivilDate(options.maximumCivilDate) &&
    request.period.endCivilDate > options.maximumCivilDate
  ) {
    return "Bitiş tarihi izin verilen son günden sonra olamaz.";
  }
  return null;
}

function initialSelectedStudentId(
  students: readonly SimpleObservationOutputStudent[],
  requestedId: string | null | undefined,
): string {
  return students.some((student) => student.id === requestedId)
    ? requestedId ?? ""
    : students[0]?.id ?? "";
}

export function SimpleObservationOutputSheet({
  open,
  students,
  initialStudentId,
  initialAudience = "parent",
  initialStartCivilDate,
  initialEndCivilDate,
  maximumCivilDate,
  disabled = false,
  onOpenChange,
  onGenerate,
}: SimpleObservationOutputSheetProps) {
  const audienceName = useId();
  const wasOpenRef = useRef(false);
  const sessionRef = useRef(0);
  const operationRef = useRef(0);
  const [studentId, setStudentId] = useState(() =>
    initialSelectedStudentId(students, initialStudentId),
  );
  const [audience, setAudience] =
    useState<SimpleObservationDocumentAudience>(initialAudience);
  const [startCivilDate, setStartCivilDate] = useState(initialStartCivilDate);
  const [endCivilDate, setEndCivilDate] = useState(initialEndCivilDate);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");

  useEffect(() => {
    if (open && !wasOpenRef.current) {
      sessionRef.current += 1;
      setStudentId(initialSelectedStudentId(students, initialStudentId));
      setAudience(initialAudience);
      setStartCivilDate(initialStartCivilDate);
      setEndCivilDate(initialEndCivilDate);
      setError("");
      setStatus("");
    } else if (!open && wasOpenRef.current) {
      sessionRef.current += 1;
    }
    wasOpenRef.current = open;
  }, [
    initialAudience,
    initialEndCivilDate,
    initialStartCivilDate,
    initialStudentId,
    open,
    students,
  ]);

  useEffect(() => {
    if (
      open &&
      studentId &&
      !students.some((student) => student.id === studentId)
    ) {
      setStudentId(students[0]?.id ?? "");
      setError("");
      setStatus("");
    }
  }, [open, studentId, students]);

  const clearFeedback = () => {
    setError("");
    setStatus("");
  };

  const handleSubmit = async () => {
    if (busy || disabled) return;
    const request: SimpleObservationOutputRequest = {
      studentId,
      audience,
      period: {
        startCivilDate,
        endCivilDate,
      },
    };
    const validationError = validateSimpleObservationOutputRequest(request, {
      studentIds: students.map((student) => student.id),
      maximumCivilDate,
    });
    if (validationError) {
      setError(validationError);
      setStatus("");
      return;
    }

    const operation = operationRef.current + 1;
    const session = sessionRef.current;
    operationRef.current = operation;
    setBusy(true);
    setError("");
    setStatus("Belge hazırlanıyor…");
    try {
      await onGenerate(request);
      if (sessionRef.current === session) {
        setStatus("Belge bu cihazda hazırlandı.");
      }
    } catch (reason) {
      if (sessionRef.current === session) {
        setStatus("");
        setError(
          reason instanceof Error && reason.message.trim()
            ? reason.message
            : "Belge hazırlanamadı. Tekrar deneyin.",
        );
      }
    } finally {
      if (operationRef.current === operation) setBusy(false);
    }
  };

  const selectedStudent = students.find((student) => student.id === studentId);
  const unavailable = disabled || busy || students.length === 0;

  return (
    <BottomSheet
      open={open}
      onOpenChange={onOpenChange}
      title="Gözlem özeti"
      description="Çocuğu, kimin için olduğunu ve dönemi seçin. Belge bu cihazda hazırlanır."
      snap={0.9}
    >
      <form
        className="simple-observation-output"
        aria-busy={busy}
        onSubmit={(event) => {
          event.preventDefault();
          void handleSubmit();
        }}
      >
        <label className="simple-observation-output__field" htmlFor="simple-observation-student">
          <span>Çocuk</span>
          <select
            id="simple-observation-student"
            value={studentId}
            disabled={disabled || busy || students.length === 0}
            onChange={(event) => {
              setStudentId(event.target.value);
              clearFeedback();
            }}
          >
            {students.length === 0 ? (
              <option value="">Aktif öğrenci bulunmuyor</option>
            ) : (
              students.map((student) => (
                <option key={student.id} value={student.id}>
                  {student.displayName}
                  {typeof student.observationCount === "number"
                    ? ` · ${student.observationCount} gözlem`
                    : ""}
                </option>
              ))
            )}
          </select>
        </label>

        <fieldset className="simple-observation-output__audience">
          <legend>Kimin için?</legend>
          <div>
            <label data-selected={audience === "parent" ? "true" : "false"}>
              <input
                type="radio"
                name={audienceName}
                value="parent"
                checked={audience === "parent"}
                disabled={disabled || busy}
                onChange={() => {
                  setAudience("parent");
                  clearFeedback();
                }}
              />
              <PersonIcon aria-hidden="true" />
              <span>
                <strong>Veli</strong>
                <small>Hassas bilgiler eklenmez</small>
              </span>
            </label>
            <label data-selected={audience === "administration" ? "true" : "false"}>
              <input
                type="radio"
                name={audienceName}
                value="administration"
                checked={audience === "administration"}
                disabled={disabled || busy}
                onChange={() => {
                  setAudience("administration");
                  clearFeedback();
                }}
              />
              <FileTextIcon aria-hidden="true" />
              <span>
                <strong>İdare</strong>
                <small>Öğrenci no ve kimlik alanı</small>
              </span>
            </label>
          </div>
        </fieldset>

        <fieldset className="simple-observation-output__dates">
          <legend>Gözlem dönemi</legend>
          <div>
            <label htmlFor="simple-observation-start">
              Başlangıç
              <KeyboardInput
                id="simple-observation-start"
                type="date"
                value={startCivilDate}
                max={endCivilDate || maximumCivilDate || undefined}
                disabled={disabled || busy}
                onChange={(event) => {
                  setStartCivilDate(event.target.value);
                  clearFeedback();
                }}
              />
            </label>
            <label htmlFor="simple-observation-end">
              Bitiş
              <KeyboardInput
                id="simple-observation-end"
                type="date"
                value={endCivilDate}
                min={startCivilDate || undefined}
                max={maximumCivilDate || undefined}
                disabled={disabled || busy}
                onChange={(event) => {
                  setEndCivilDate(event.target.value);
                  clearFeedback();
                }}
              />
            </label>
          </div>
        </fieldset>

        <p className="simple-observation-output__privacy">
          {audience === "parent"
            ? "Veli belgesine T.C. kimlik, telefon ve başka çocuk bilgisi eklenmez."
            : "İdare belgesi yalnız seçili çocuğu, öğretmen adını ve imza alanını içerir."}
        </p>

        {error ? (
          <p className="simple-observation-output__feedback is-error" role="alert">
            {error}
          </p>
        ) : null}
        {status ? (
          <p
            className="simple-observation-output__feedback is-status"
            role="status"
            aria-live="polite"
          >
            {status}
          </p>
        ) : null}

        <div className="simple-observation-output__actions">
          <button
            type="submit"
            disabled={unavailable}
            aria-describedby="simple-observation-output-hint"
          >
            <FileTextIcon aria-hidden="true" />
            {busy ? "Hazırlanıyor…" : "Belgeyi hazırla"}
          </button>
          <small id="simple-observation-output-hint">
            {students.length === 0
              ? "Önce sınıfa bir öğrenci ekleyin."
              : `${selectedStudent?.displayName ?? "Seçili çocuk"} için tek belge hazırlanır.`}
          </small>
        </div>
      </form>
    </BottomSheet>
  );
}
