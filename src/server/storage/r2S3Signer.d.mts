export interface R2SignerConfig { accountId: string; bucket: string; accessKeyId: string; secretAccessKey: string; }
export interface R2RequestOptions {
  method: string; key: string; query?: Record<string, string | number | Array<string | number>>;
  headers?: Record<string, string>; body?: string | Uint8Array; now?: Date;
}
export function signR2Request(config: R2SignerConfig, options: R2RequestOptions): { url: string; headers: Record<string, string> };
export function presignR2Request(config: R2SignerConfig, options: R2RequestOptions & { expiresIn?: number }): string;
export function buildR2ObjectKey(userId: string, extension?: string, id?: string): string;
export function isOwnedR2Key(key: string, userId: string): boolean;
