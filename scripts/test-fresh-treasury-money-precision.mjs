import assert from "node:assert/strict";
import { formatMinorUnits, minorUnitDigits, parseAmountToMinor } from "../src/core/treasury/moneyPrecision.ts";

assert.equal(minorUnitDigits("USD"), 2);
assert.equal(minorUnitDigits("FRESH"), 2);
assert.equal(minorUnitDigits("UGX"), 0);
assert.equal(minorUnitDigits("JPY"), 0);
assert.equal(minorUnitDigits("KWD"), 3);

assert.equal(parseAmountToMinor("12.34", "USD"), "1234");
assert.equal(parseAmountToMinor("12", "UGX"), "12");
assert.equal(parseAmountToMinor("12.345", "KWD"), "12345");
assert.equal(parseAmountToMinor("12.3", "UGX"), null);
assert.equal(parseAmountToMinor("12.3456", "USD"), null);
assert.equal(parseAmountToMinor("0.00", "USD"), null);
assert.equal(parseAmountToMinor("92233720368547758.08", "USD"), null);

assert.equal(formatMinorUnits("1234", "USD"), "USD 12.34");
assert.equal(formatMinorUnits("1234", "UGX"), "UGX 1,234");
assert.equal(formatMinorUnits("12345", "KWD"), "KWD 12.345");
assert.equal(formatMinorUnits("-1234", "USD"), "-USD 12.34");

console.log("Fresh Treasury currency precision checks passed.");
