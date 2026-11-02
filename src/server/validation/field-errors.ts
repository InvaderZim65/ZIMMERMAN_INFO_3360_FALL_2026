/**
 * Shared field-level error type and helper used by both
 * event-payload.ts and evaluation-payload.ts.
 *
 * Property names match the validation-error item schema in
 * openapi/hockey-ingestion.yaml exactly: field, code, message.
 *
 * This module defines the error shape and a helper to build
 * error arrays. It does not create HTTP status envelopes.
 */

export interface FieldError {
  field: string;
  code: string;
  message: string;
}

export type ValidationResult<T> =
  | { ok: true; data: T }
  | { ok: false; errors: FieldError[] };

/**
 * Build a FieldError from its three required parts.
 * Keeps error construction consistent across both validators.
 */
export function toFieldErrors(
  ...items: Array<{ field: string; code: string; message: string }>
): FieldError[] {
  return items.map(({ field, code, message }) => ({ field, code, message }));
}
