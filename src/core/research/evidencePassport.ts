import { createHash } from "node:crypto";

export type EvidencePassport = {
  version: "1.0";
  id: string;
  issuedAt: string;
  issuer: "Fresh Web Lite Research";
  source: {
    title: string;
    url: string;
    publisherDomain: string;
    retrievalProvider: string;
    publishedAt?: string;
    observedAt: string;
  };
  capturedMaterial: {
    kind: "publisher_excerpt" | "title_only";
    text: string;
    digestAlgorithm: "SHA-256";
    digest: string;
  };
  verification: {
    recordStatus: "recorded";
    sourceUrlStatus: "valid_http_url";
    publisherAuthenticity: "not_independently_verified";
    claimSupport: "requires_content_review";
  };
  limitations: string[];
};

type PassportSource = {
  title: string;
  url: string;
  snippet?: string;
  publishedAt?: string;
  provider: string;
};

/**
 * Creates a durable identity for the exact source metadata and excerpt Fresh captured.
 * The digest proves only that this captured record has not changed; it does not
 * authenticate the publisher or prove that the excerpt supports a separate claim.
 */
export function createEvidencePassport(source: PassportSource, observedAt: string): EvidencePassport {
  const parsed = new URL(source.url);
  if ((parsed.protocol !== "https:" && parsed.protocol !== "http:") || parsed.username || parsed.password) {
    throw new Error("Evidence passports require a valid public HTTP(S) source URL.");
  }
  const excerpt = (source.snippet ?? "").trim();
  const capturedText = excerpt || source.title.trim();
  const digestInput = JSON.stringify({
    title: source.title.trim(),
    url: parsed.toString(),
    publisherDomain: parsed.hostname.toLowerCase().replace(/^www\./, ""),
    publishedAt: source.publishedAt ?? null,
    capturedText,
  });
  const digest = createHash("sha256").update(digestInput, "utf8").digest("hex");
  const idDigest = createHash("sha256").update(`${parsed.toString()}\n${observedAt}\n${digest}`, "utf8").digest("hex");
  return {
    version: "1.0",
    id: `FEP-${idDigest.slice(0, 24).toUpperCase()}`,
    issuedAt: observedAt,
    issuer: "Fresh Web Lite Research",
    source: {
      title: source.title,
      url: parsed.toString(),
      publisherDomain: parsed.hostname.toLowerCase().replace(/^www\./, ""),
      retrievalProvider: source.provider,
      ...(source.publishedAt ? { publishedAt: source.publishedAt } : {}),
      observedAt,
    },
    capturedMaterial: {
      kind: excerpt ? "publisher_excerpt" : "title_only",
      text: capturedText,
      digestAlgorithm: "SHA-256",
      digest,
    },
    verification: {
      recordStatus: "recorded",
      sourceUrlStatus: "valid_http_url",
      publisherAuthenticity: "not_independently_verified",
      claimSupport: "requires_content_review",
    },
    limitations: [
      "The fingerprint covers the captured title, URL, publication date and excerpt, not the complete original webpage.",
      "A matching fingerprint establishes record integrity, not publisher identity or factual truth.",
      "A human or claim-level content check is still required to determine whether this source supports a particular claim.",
    ],
  };
}
