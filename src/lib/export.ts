/** Fields never included in a data export. */
export const EXPORT_OMIT = new Set(["passwordHash", "fileData", "tokenHash"]);

export function scrub<T>(value: T): T {
  if (Array.isArray(value)) return value.map(scrub) as T;
  if (value && typeof value === "object" && !(value instanceof Date)) {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .filter(([key]) => !EXPORT_OMIT.has(key))
        .map(([key, v]) => [key, scrub(v)]),
    ) as T;
  }
  return value;
}
