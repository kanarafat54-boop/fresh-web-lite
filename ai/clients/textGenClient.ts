export class TextGenClient {
  apiKey?: string;
  constructor() {
    this.apiKey = process.env.GENAI_API_KEY;
  }

  async generate(prompt: string, options?: any) {
    if (!this.apiKey) throw new Error('GENAI_API_KEY not configured');
    // Placeholder implementation.
    return { text: `Generated (stub) for prompt: ${prompt}` };
  }
}
