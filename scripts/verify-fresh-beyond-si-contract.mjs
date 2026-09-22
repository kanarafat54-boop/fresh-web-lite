#!/usr/bin/env node
/** Verifies Beyond Superintelligence contract source without claiming AGI. */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();
const path = resolve(root, "src/core/fresh-ai/FreshBeyondSuperintelligence.ts");
const text = readFileSync(path, "utf8");

const required = [
  "FRESH_BEYOND_SUPERINTELLIGENCE",
  "beyondIq",
  "training-required",
  "truth",
  "agency",
  "memory",
  "creation",
  "work",
  "privacy",
  "learning",
  "governance",
  "assertBeyondSuperintelligenceContract",
  "autonomous production mutation",
  "sovereign intelligence system",
];

const missing = required.filter((item) => !text.includes(item));
if (missing.length) {
  console.error("Beyond-SI contract missing:", missing.join(", "));
  process.exit(1);
}

if (!text.includes("not a pure race for unconstrained cognitive power")) {
  console.error("Thesis string missing");
  process.exit(1);
}

console.log("Fresh Beyond Superintelligence contract: PASS");
console.log("Note: this verifies product doctrine in source — not AGI/ASI achievement.");
