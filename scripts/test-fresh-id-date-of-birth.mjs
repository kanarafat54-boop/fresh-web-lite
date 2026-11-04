import assert from "node:assert/strict";
import { formatUtcDateInputValue, validateDateOfBirth } from "../src/features/fresh-id/utils/dateOfBirth.ts";

const now = new Date("2026-10-14T12:00:00.000Z");
assert.equal(validateDateOfBirth("2002-02-14", 13, now), null, "adult DOB should pass");
assert.equal(validateDateOfBirth("2013-10-14", 13, now), null, "exact minimum-age birthday should pass");
assert.equal(validateDateOfBirth("2013-10-15", 13, now), "underage", "one day too young should fail");
assert.equal(validateDateOfBirth("2026-10-14", 13, now), "not-past", "today should fail");
assert.equal(validateDateOfBirth("2027-01-01", 13, now), "not-past", "future date should fail");
assert.equal(validateDateOfBirth("2024-02-30", 13, now), "invalid", "impossible calendar date should fail");
assert.equal(validateDateOfBirth("14/02/2002", 13, now), "invalid", "non-ISO input should fail");
assert.equal(formatUtcDateInputValue(now), "2026-10-14", "date input max uses the UTC calendar date");
console.log("Fresh ID date-only validation passed: 8 checks");
