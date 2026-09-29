export type FreshAIProviderKind = "native" | "external";

export type FreshAIProviderRequest = {
  requestId: string;
  input: string;
  context?: Record<string, unknown>;
};

export type FreshAIProviderResult = {
  answer: string;
  provider: FreshAIProviderKind;
  modelId: string;
};

export interface FreshAIProvider {
  readonly kind: FreshAIProviderKind;
  readonly modelId: string;
  available(): boolean | Promise<boolean>;
  generate(request: FreshAIProviderRequest): Promise<FreshAIProviderResult>;
}

export class FreshAIProviderRouter {
  constructor(
    private readonly native: FreshAIProvider,
    private readonly external?: FreshAIProvider,
  ) {}

  async generate(request: FreshAIProviderRequest): Promise<FreshAIProviderResult> {
    if (await this.native.available()) return this.native.generate(request);
    if (this.external && process.env.FRESH_ALLOW_EXTERNAL_ANSWER_PROVIDER === "true" && await this.external.available()) {
      return this.external.generate(request);
    }
    throw new Error("No Fresh AI answer provider is available.");
  }
}
