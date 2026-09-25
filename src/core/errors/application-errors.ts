export type ApplicationErrorKind =
  | "validation"
  | "conflict"
  | "storage-transient"
  | "storage-integrity"
  | "security"
  | "offline";

export interface ApplicationErrorOptions {
  code?: string;
  cause?: unknown;
  context?: Readonly<Record<string, unknown>>;
}

export abstract class ApplicationError extends Error {
  abstract readonly kind: ApplicationErrorKind;
  readonly code?: string;
  readonly context?: Readonly<Record<string, unknown>>;

  protected constructor(message: string, options: ApplicationErrorOptions = {}) {
    super(message, { cause: options.cause });
    this.name = new.target.name;
    this.code = options.code;
    this.context = options.context;
  }
}

export class ValidationError extends ApplicationError {
  readonly kind = "validation" as const;
}

export class ConflictError extends ApplicationError {
  readonly kind = "conflict" as const;
}

export class StorageTransientError extends ApplicationError {
  readonly kind = "storage-transient" as const;
}

export class StorageIntegrityError extends ApplicationError {
  readonly kind = "storage-integrity" as const;
}

export class SecurityViolation extends ApplicationError {
  readonly kind = "security" as const;
}

export class OfflineBoundary extends ApplicationError {
  readonly kind = "offline" as const;
}
