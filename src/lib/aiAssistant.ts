import { GoogleGenAI } from "@google/genai";

const apiKey = process.env.GEMINI_API_KEY || "";
const ai = new GoogleGenAI({ apiKey });

export async function getCodeFix(codeSnippet: string, instruction: string): Promise<string> {
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY environment variable is not set.");
  }

  const prompt = `You are a TypeScript and React assistant.
Instruction: ${instruction}

Here is the current code:
\`\`\`typescript
${codeSnippet}
\`\`\`

Return ONLY the modified code block without conversational commentary.`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
    });

    return response.text ?? "";
  } catch (error) {
    console.error("AI Code Assistance Error:", error);
    throw error;
  }
}
