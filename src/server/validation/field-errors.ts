/**
 * Shared field-level error type used by both event and evaluation
 * validators. Matches the details items in the ErrorEnvelope from
 * openapi/hockey-ingestion.yaml.
 *
 * This module only defines the field-error shape. It does not build
 * HTTP status envelopes — that responsibility belongs in the route
 * handlers.
 */

export interface FieldError {
  field: string;
  code: string;
  message: string;
}

export type ValidationResult<T> =
  | { ok: true; data: T }
  | { ok: false; errors: FieldError[] };
