export type ChatMessage = { role: 'system' | 'user' | 'assistant'; content: string };

export type LLMOptions = {
  model?: string;
  temperature?: number;
  maxTokens?: number;
};

const BASE_URL = process.env.LLM_BASE_URL ?? 'https://api.openai.com/v1';
const API_KEY = process.env.LLM_API_KEY ?? '';

export async function chat(messages: ChatMessage[], opts: LLMOptions = {}): Promise<string> {
  if (!API_KEY) throw new Error('LLM_API_KEY is not set');

  const res = await fetch(`${BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${API_KEY}`,
    },
    body: JSON.stringify({
      model: opts.model ?? 'gpt-4o-mini',
      temperature: opts.temperature ?? 0.2,
      max_tokens: opts.maxTokens ?? 800,
      messages,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`LLM request failed (${res.status}): ${text}`);
  }

  const j = await res.json();
  return j?.choices?.[0]?.message?.content ?? '';
}
