/**
 * Shared field-level error types and helper used by both
 * event-payload.ts and evaluation-payload.ts.
 *
 * Matches the ErrorEnvelope in openapi/hockey-ingestion.yaml:
 *   error.code   – machine-readable top-level code
 *   error.message – human-readable summary
 *   error.details – array of { field, code, message }
 */

export interface FieldError {
  field: string;
  code: string;
  message: string;
}

export interface ErrorEnvelope {
  error: {
    code: string;
    message: string;
    details: FieldError[];
  };
}

export type ValidationResult<T> =
  | { ok: true; data: T }
  | { ok: false; envelope: ErrorEnvelope };

/**
 * Build a 422 VALIDATION_FAILED envelope from a list of field errors.
 */
export function validationFailed(details: FieldError[]): ErrorEnvelope {
  return {
    error: {
      code: "VALIDATION_FAILED",
      message: "One or more fields are invalid.",
      details,
    },
  };
}

/**
 * Build a 409 CONFLICT envelope for a duplicate idempotency key.
 */
export function conflictError(field: string, value: string): ErrorEnvelope {
  return {
    error: {
      code: "CONFLICT",
      message: `An event with this ${field} already exists with different data.`,
      details: [
        {
          field,
          code: "DUPLICATE_KEY",
          message: `${field} ${value} is already stored for a different event`,
        },
      ],
    },
  };
}

/**
 * Build a 400 BAD_REQUEST envelope for unparseable input.
 */
export function badRequest(message: string): ErrorEnvelope {
  return {
    error: {
      code: "BAD_REQUEST",
      message,
      details: [],
    },
  };
}

/**
 * Build a 401 UNAUTHORIZED envelope.
 */
export function unauthorized(): ErrorEnvelope {
  return {
    error: {
      code: "UNAUTHORIZED",
      message: "Missing or invalid identity token.",
      details: [],
    },
  };
}

/**
 * Build a 403 FORBIDDEN envelope.
 */
export function forbidden(message: string): ErrorEnvelope {
  return {
    error: {
      code: "FORBIDDEN",
      message,
      details: [],
    },
  };
}
