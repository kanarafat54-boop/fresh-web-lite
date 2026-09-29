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

function externalAnswerProviderEnabled(): boolean {
  if (typeof globalThis === "undefined") return false;
  const runtime = (globalThis as Record<string, unknown>).process;
  if (!runtime || typeof runtime !== "object") return false;
  const env = (runtime as { env?: unknown }).env;
  return Boolean(env && typeof env === "object" && (env as Record<string, unknown>).FRESH_ALLOW_EXTERNAL_ANSWER_PROVIDER === "true");
}

export class FreshAIProviderRouter {
  private readonly native: FreshAIProvider;
  private readonly external?: FreshAIProvider;

  constructor(native: FreshAIProvider, external?: FreshAIProvider) {
    this.native = native;
    this.external = external;
  }

  async generate(request: FreshAIProviderRequest): Promise<FreshAIProviderResult> {
    if (await this.native.available()) return this.native.generate(request);
    if (this.external && externalAnswerProviderEnabled() && await this.external.available()) {
      return this.external.generate(request);
    }
    throw new Error("No Fresh AI answer provider is available.");
  }
}
