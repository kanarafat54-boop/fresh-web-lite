/**
 * Date-only Fresh ID birth-date validation.
 *
 * Date inputs are calendar dates, not timestamps. Parse and compare them in UTC
 * so the result is identical in Uganda, North America, and other time zones.
 */
export type DateOfBirthValidationError = "invalid" | "not-past" | "underage";

export function validateDateOfBirth(
  value: string,
  minimumAge = 13,
  now = new Date(),
): DateOfBirthValidationError | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return "invalid";

  const birthDate = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(birthDate.getTime()) || birthDate.toISOString().slice(0, 10) !== value) {
    return "invalid";
  }

  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  if (birthDate >= today) return "not-past";

  const ageCutoff = new Date(Date.UTC(
    today.getUTCFullYear() - minimumAge,
    today.getUTCMonth(),
    today.getUTCDate(),
  ));
  if (birthDate > ageCutoff) return "underage";

  return null;
}

export function formatUtcDateInputValue(now = new Date()): string {
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}-${String(now.getUTCDate()).padStart(2, "0")}`;
}
