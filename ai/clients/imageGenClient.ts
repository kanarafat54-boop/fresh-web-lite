export type ImageGenOptions = {
  prompt: string;
  width?: number;
  height?: number;
  format?: 'png'|'webp'|'jpg';
};

export class ImageGenClient {
  apiKey?: string;
  constructor() {
    this.apiKey = process.env.IMAGE_API_KEY;
  }

  async generate(options: ImageGenOptions) {
    if (!this.apiKey) throw new Error('IMAGE_API_KEY not configured');
    // Placeholder return; implement provider call when keys are available.
    return { url: null, base64: null, metadata: { width: options.width, height: options.height } };
  }
}
