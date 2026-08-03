import {
  ApplicationError,
  type ApplicationErrorKind,
} from "./application-errors";

export type ClassifiedErrorKind = ApplicationErrorKind | "unknown";
export type ErrorHandlingScope =
  | "field"
  | "conflict"
  | "operation"
  | "global"
  | "boundary"
  | "unexpected";

export interface ErrorClassification {
  kind: ClassifiedErrorKind;
  scope: ErrorHandlingScope;
  shouldFailClosed: boolean;
  retryable: boolean;
  preserveDraft: boolean;
}

const POLICIES = {
  validation: {
    kind: "validation",
    scope: "field",
    shouldFailClosed: false,
    retryable: false,
    preserveDraft: true,
  },
  conflict: {
    kind: "conflict",
    scope: "conflict",
    shouldFailClosed: false,
    retryable: false,
    preserveDraft: true,
  },
  "storage-transient": {
    kind: "storage-transient",
    scope: "operation",
    shouldFailClosed: false,
    retryable: true,
    preserveDraft: true,
  },
  "storage-integrity": {
    kind: "storage-integrity",
    scope: "global",
    shouldFailClosed: true,
    retryable: false,
    preserveDraft: true,
  },
  security: {
    kind: "security",
    scope: "global",
    shouldFailClosed: true,
    retryable: false,
    preserveDraft: true,
  },
  offline: {
    kind: "offline",
    scope: "boundary",
    shouldFailClosed: false,
    retryable: true,
    preserveDraft: true,
  },
} as const satisfies Record<ApplicationErrorKind, ErrorClassification>;

const UNKNOWN_POLICY = {
  kind: "unknown",
  scope: "unexpected",
  shouldFailClosed: false,
  retryable: false,
  preserveDraft: true,
} as const satisfies ErrorClassification;

const DOM_EXCEPTION_POLICIES: Readonly<
  Partial<Record<string, ErrorClassification>>
> = {
  UnknownError: POLICIES["storage-integrity"],
  VersionError: POLICIES["storage-integrity"],
  NotFoundError: POLICIES["storage-integrity"],
  InvalidStateError: POLICIES["storage-integrity"],
  SecurityError: POLICIES.security,
  DataError: POLICIES.validation,
  ConstraintError: POLICIES.conflict,
  QuotaExceededError: POLICIES["storage-transient"],
  AbortError: POLICIES["storage-transient"],
  TimeoutError: POLICIES["storage-transient"],
  NetworkError: POLICIES.offline,
};

/**
 * Bir hata için UI ve yazma kuyruğunun uygulayacağı davranışı saf biçimde seçer.
 * Tanınmayan hatalar depolama bütünlüğü veya güvenlik ihlali sayılmaz.
 */
export function classifyApplicationError(error: unknown): ErrorClassification {
  if (error instanceof ApplicationError) return POLICIES[error.kind];
  if (typeof DOMException !== "undefined" && error instanceof DOMException) {
    return DOM_EXCEPTION_POLICIES[error.name] ?? UNKNOWN_POLICY;
  }
  return UNKNOWN_POLICY;
}

export function requiresGlobalFailClosed(error: unknown): boolean {
  return classifyApplicationError(error).shouldFailClosed;
}
