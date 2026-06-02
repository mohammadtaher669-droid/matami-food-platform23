/**
 * Safe date utilities — prevent "value.toISOString is not a function" and
 * "Invalid Date" from crashing the UI when values are null / undefined / strings.
 */

/** Convert any value to a valid Date, or null if invalid/empty. */
export function safeDate(val: unknown): Date | null {
  if (val === null || val === undefined || val === "") return null;
  const d = val instanceof Date ? val : new Date(val as string | number);
  return isNaN(d.getTime()) ? null : d;
}

/** Return a timestamp (ms) from any date-like value, or 0 if invalid. */
export function safeGetTime(val: unknown): number {
  return safeDate(val)?.getTime() ?? 0;
}

/**
 * Return an ISO string from any date-like value.
 * Falls back to current time so callers never receive a broken string.
 */
export function safeISOString(val: unknown): string {
  const d = safeDate(val);
  return d ? d.toISOString() : new Date().toISOString();
}

/** Format as locale date string, returning "—" for invalid values. */
export function safeLocalDate(val: unknown, locale?: string): string {
  const d = safeDate(val);
  if (!d) return "—";
  try {
    return d.toLocaleDateString(locale);
  } catch {
    return "—";
  }
}

/** Format as locale date+time string, returning "—" for invalid values. */
export function safeLocalDateTime(val: unknown, locale?: string): string {
  const d = safeDate(val);
  if (!d) return "—";
  try {
    return d.toLocaleString(locale);
  } catch {
    return "—";
  }
}

/** Format as locale time string, returning "—" for invalid values. */
export function safeLocalTime(val: unknown, locale?: string): string {
  const d = safeDate(val);
  if (!d) return "—";
  try {
    return d.toLocaleTimeString(locale);
  } catch {
    return "—";
  }
}

/**
 * Compute the difference in ms between a date-like value and now.
 * Returns a negative number (or 0) if the date is in the past or invalid.
 */
export function safeDiffFromNow(val: unknown): number {
  const t = safeGetTime(val);
  return t === 0 ? -1 : t - Date.now();
}
