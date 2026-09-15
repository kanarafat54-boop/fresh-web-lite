/**
 * Legacy compatibility boundary for code assistance.
 *
 * Fresh AI owns code assistance. This module intentionally contains no
 * third-party model SDK, provider API key, or vendor-specific model name.
 * Callers should migrate to the Fresh AI capability runtime directly.
 */
import { freshAI } from "../core/ai/FreshAI";

export async function getCodeFix(codeSnippet: string, instruction: string): Promise<string> {
  if (!codeSnippet.trim() || !instruction.trim()) {
    throw new Error("Code and instruction are required for Fresh AI code assistance.");
  }

  const result = await freshAI.reason({
    goal: `Modify the supplied TypeScript/React code according to this instruction: ${instruction}`,
    context: { codeSnippet },
    capabilities: ["code"],
    requireVerification: true,
  });

  if (result.confidence === "BLOCKED" || result.confidence === "UNKNOWN") {
    throw new Error("Fresh AI code assistance is not executable until the code capability is available.");
  }

  return result.answer ?? "";
}
