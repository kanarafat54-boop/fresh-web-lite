import type { EvidenceBundle, EvidenceItem, EvidenceService, SearchProvider } from "./contracts.js";
import { tokenize } from "./parser.js";

/**
 * Retrieval-backed evidence. Every item is a verbatim indexed passage with its source URL,
 * content hash, publication date and retrieval date. This service never asserts that a claim
 * is true: `support` is at most "direct_support_candidate" (passage covers all query terms) and
 * otherwise "unknown". Stance classification belongs to the claim engine (next slice).
 */
export class IndexEvidenceService implements EvidenceService {
  private provider: SearchProvider;
  constructor(provider: SearchProvider) { this.provider = provider; }

  async gather(query: string, options: { maxItems?: number } = {}): Promise<EvidenceBundle> {
    const warnings: string[] = [];
    const max = Math.min(Math.max(options.maxItems ?? 8, 1), 25);
    const terms = [...new Set(tokenize(query))];
    if (!terms.length) return { query, items: [], independentSourceCount: 0, duplicateGroups: [], warnings: ["Query has no searchable terms."] };
    let response;
    try { response = await this.provider.search({ text: query, limit: max }); }
    catch (e) { return { query, items: [], independentSourceCount: 0, duplicateGroups: [], warnings: [`Search provider ${this.provider.id} failed: ${(e as Error).message}`] }; }
    if (response.indexedDocuments === 0) warnings.push("The index is empty; no sources have been crawled yet.");
    else if (!response.hits.length) warnings.push("No indexed source matched the query.");

    const items: EvidenceItem[] = [];
    for (const hit of response.hits) {
      for (const p of hit.passages.slice(0, 2)) {
        const pTerms = new Set(tokenize(p.text));
        const coverage = terms.filter((t) => pTerms.has(t)).length / terms.length;
        items.push({
          evidenceId: p.passageId, sourceUrl: hit.canonicalUrl, sourceTitle: hit.title, passage: p.text, passageOrdinal: p.ordinal,
          contentHash: hit.contentHash, publishedAt: hit.publishedAt, retrievedAt: hit.fetchedAt, language: hit.language,
          queryTermCoverage: Number(coverage.toFixed(3)), support: coverage === 1 ? "direct_support_candidate" : "unknown",
        });
      }
    }
    items.sort((a, b) => b.queryTermCoverage - a.queryTermCoverage);
    const kept = items.slice(0, max);
    const byHash = new Map<string, Set<string>>();
    for (const h of response.hits) (byHash.get(h.contentHash) ?? byHash.set(h.contentHash, new Set()).get(h.contentHash)!).add(h.canonicalUrl);
    const duplicateGroups = [...byHash.entries()].filter(([, u]) => u.size > 1).map(([contentHash, u]) => ({ contentHash, urls: [...u] }));
    if (duplicateGroups.length) warnings.push(`${duplicateGroups.length} group(s) of sources have identical content and are not independent.`);
    const independent = new Set(kept.map((i) => i.contentHash)).size;
    const hosts = new Set(kept.map((i) => new URL(i.sourceUrl).hostname));
    if (kept.length && hosts.size < 2) warnings.push("All evidence comes from a single host; corroboration is not established.");
    return { query, items: kept, independentSourceCount: independent, duplicateGroups, warnings };
  }
}
