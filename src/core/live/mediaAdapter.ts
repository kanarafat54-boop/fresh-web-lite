/**
 * Fresh Live — provider-neutral media adapter contract.
 *
 * The control plane owns session lifecycle and authorization.
 * The media plane transports audio/video. This interface is the only
 * place product code may talk to a streaming provider.
 *
 * Rules:
 * - Never ship provider secrets to the browser.
 * - Never mark a session LIVE unless createIngest / createInteractiveRoom
 *   (or equivalent) has succeeded and health can be observed.
 * - Prefer free-first / self-hosted options; paid plans require owner approval.
 * - Keep this surface small; add methods only when a real provider needs them.
 */

export type LiveMediaMode = "webrtc" | "rtmps" | "hls" | "audio";

export type MediaCredentialScope = "publisher" | "viewer" | "guest";

export type CreateSessionInput = {
  sessionId: string;
  mode: LiveMediaMode;
  title?: string;
};

export type MediaResourceRefs = {
  provider: string;
  providerSessionRef: string;
  ingestRef?: string;
  playbackRef?: string;
  region?: string;
};

export type ScopedMediaToken = {
  token: string;
  expiresAt: string; // ISO
  scope: MediaCredentialScope;
  /** Never a long-lived stream key for normal API responses. */
};

export type MediaHealth = {
  ok: boolean;
  ingestConnected?: boolean;
  detail?: string;
};

export type WebhookVerification = {
  valid: boolean;
  eventType?: string;
  providerSessionRef?: string;
  idempotencyKey?: string;
  rawNormalized?: Record<string, unknown>;
};

/**
 * Minimal adapter surface. One concrete provider implements this.
 * Product code must not import provider SDKs directly.
 */
export interface LiveMediaAdapter {
  readonly providerId: string;

  /** False until credentials and network path are configured and approved. */
  isConfigured(): boolean;

  createSession(input: CreateSessionInput): Promise<MediaResourceRefs>;
  createIngest(sessionId: string): Promise<MediaResourceRefs>;
  createInteractiveRoom(sessionId: string): Promise<MediaResourceRefs>;

  issuePublisherToken(sessionId: string, userId: string): Promise<ScopedMediaToken>;
  issueViewerToken(sessionId: string, userId: string): Promise<ScopedMediaToken>;

  getHealth(sessionId: string): Promise<MediaHealth>;

  startRecording?(sessionId: string): Promise<{ recordingRef: string }>;
  stopRecording?(sessionId: string): Promise<void>;
  stopSession(sessionId: string): Promise<void>;

  verifyWebhook(
    headers: Record<string, string | undefined>,
    body: string,
  ): Promise<WebhookVerification>;
}

export class MediaNotConfiguredError extends Error {
  readonly code = "LIVE_MEDIA_NOT_CONFIGURED" as const;
  constructor(message = "Fresh Live media plane is not configured") {
    super(message);
    this.name = "MediaNotConfiguredError";
  }
}

/**
 * Default adapter until a real provider is approved and wired.
 * Every mutating method throws MediaNotConfiguredError.
 * isConfigured() is always false so the control plane cannot mark LIVE.
 */
export class NotConfiguredMediaAdapter implements LiveMediaAdapter {
  readonly providerId = "none";

  isConfigured(): boolean {
    return false;
  }

  async createSession(_input: CreateSessionInput): Promise<MediaResourceRefs> {
    throw new MediaNotConfiguredError();
  }

  async createIngest(_sessionId: string): Promise<MediaResourceRefs> {
    throw new MediaNotConfiguredError();
  }

  async createInteractiveRoom(_sessionId: string): Promise<MediaResourceRefs> {
    throw new MediaNotConfiguredError();
  }

  async issuePublisherToken(_sessionId: string, _userId: string): Promise<ScopedMediaToken> {
    throw new MediaNotConfiguredError();
  }

  async issueViewerToken(_sessionId: string, _userId: string): Promise<ScopedMediaToken> {
    throw new MediaNotConfiguredError();
  }

  async getHealth(_sessionId: string): Promise<MediaHealth> {
    return { ok: false, detail: "No media provider configured" };
  }

  async stopSession(_sessionId: string): Promise<void> {
    // Idempotent no-op when nothing was created.
  }

  async verifyWebhook(
    _headers: Record<string, string | undefined>,
    _body: string,
  ): Promise<WebhookVerification> {
    return { valid: false };
  }
}

let activeAdapter: LiveMediaAdapter = new NotConfiguredMediaAdapter();

/** Server-side only. Do not call from browser bundles. */
export function getLiveMediaAdapter(): LiveMediaAdapter {
  return activeAdapter;
}

/**
 * Replace the active adapter (tests or approved provider bootstrap).
 * Production bootstrap must only set a configured adapter after secrets
 * and owner approval are verified.
 */
export function setLiveMediaAdapterForTests(adapter: LiveMediaAdapter): void {
  activeAdapter = adapter;
}

export function resetLiveMediaAdapter(): void {
  activeAdapter = new NotConfiguredMediaAdapter();
}
