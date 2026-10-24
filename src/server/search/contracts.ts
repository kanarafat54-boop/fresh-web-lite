/**
 * Fresh Global Intelligence: shared search contracts (slice 1).
 * File ownership: this file is the single source of truth for the search/crawl/index
 * interfaces. Other workstreams import from here and must not redefine them.
 */

export type CrawlOutcome =
  | "fetched"
  | "not_modified"
  | "blocked_by_robots"
  | "blocked_by_policy"
  | "too_large"
  | "unsupported_content_type"
  | "http_error"
  | "timeout"
  | "network_error";

export interface FetchedResource {
  requestedUrl: string;
  finalUrl: string;
  status: number;
  contentType: string;
  body: string;
  fetchedAt: string;
  etag?: string;
  lastModified?: string;
}

export interface CrawlResult {
  outcome: CrawlOutcome;
  requestedUrl: string;
  resource?: FetchedResource;
  detail?: string;
}

export interface CrawlerAdapter {
  fetch(url: string, options?: { etag?: string; lastModified?: string }): Promise<CrawlResult>;
}

export interface ParsedPassage {
  ordinal: number;
  text: string;
  startOffset: number;
  endOffset: number;
}

export interface ParsedDocument {
  canonicalUrl: string;
  title: string;
  language: string | null;
  publishedAt: string | null;
  text: string;
  contentHash: string;
  passages: ParsedPassage[];
  outlinks: string[];
  /** Set when the page asks not to be indexed (robots meta noindex). */
  noindex: boolean;
}

export interface ContentParser {
  parse(resource: FetchedResource): ParsedDocument;
}

export interface IndexedDocumentVersion {
  documentId: string;
  version: number;
  canonicalUrl: string;
  contentHash: string;
  fetchedAt: string;
  status: "indexed" | "unchanged" | "removed";
}

export interface IndexWriter {
  upsert(doc: ParsedDocument, meta: { fetchedAt: string; sourceUrl: string }): Promise<IndexedDocumentVersion>;
  markRemoved(canonicalUrl: string, at: string): Promise<boolean>;
}

export interface SearchQuery {
  text: string;
  limit?: number;
  language?: string;
}

export interface SearchHit {
  documentId: string;
  canonicalUrl: string;
  title: string;
  language: string | null;
  publishedAt: string | null;
  fetchedAt: string;
  contentHash: string;
  score: number;
  passages: Array<{ passageId: string; ordinal: number; text: string; score: number }>;
}

export interface SearchResponse {
  query: string;
  hits: SearchHit[];
  totalCandidates: number;
  indexedDocuments: number;
  tookMs: number;
}

export interface SearchProvider {
  readonly id: string;
  search(query: SearchQuery): Promise<SearchResponse>;
}

export interface RankingEngine {
  rank(
    queryTerms: string[],
    candidates: Array<{ id: string; terms: string[] }>,
    stats: { documentCount: number; averageLength: number; documentFrequency: Map<string, number> },
  ): Array<{ id: string; score: number }>;
}

export type EvidenceSupport = "direct_support_candidate" | "unknown";

/**
 * Evidence is a retrieved, citable source passage. Stance (support/contradiction) is NOT
 * inferred here: it is "unknown" until the claim engine evaluates it. Nothing is fabricated.
 */
export interface EvidenceItem {
  evidenceId: string;
  sourceUrl: string;
  sourceTitle: string;
  passage: string;
  passageOrdinal: number;
  contentHash: string;
  publishedAt: string | null;
  retrievedAt: string;
  language: string | null;
  queryTermCoverage: number;
  support: EvidenceSupport;
}

export interface EvidenceBundle {
  query: string;
  items: EvidenceItem[];
  independentSourceCount: number;
  duplicateGroups: Array<{ contentHash: string; urls: string[] }>;
  warnings: string[];
}

export interface EvidenceService {
  gather(query: string, options?: { maxItems?: number }): Promise<EvidenceBundle>;
}

export interface StructuredError {
  code: string;
  message: string;
  retryable: boolean;
}
