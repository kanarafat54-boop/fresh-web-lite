# Fresh Research: Search Experience and Evidence Contract

## Purpose

Fresh Research must be a genuine, organized discovery engine—not a prose answer wrapped in search-looking tabs. It should combine web retrieval, media discovery, structured knowledge, transparent evidence, and useful next steps. This contract defines observable product behavior; it does not claim that any provider or media capability is already integrated.

## 1. Search results must be organized by intent

Every query has a universal **All** view and dedicated, independently functional views:

- **All** — concise answer when useful, then categorized result groups: Top web results, News, Images, Videos, Academic, Discussions/Posts, People/Organizations, Places/Local, and related searches when relevant.
- **Web** — ranked pages with distinct title, publisher/domain, URL, snippet, publication/update date when available, and favicon/thumbnail when available.
- **News** — actual news articles with publisher, date/time, article link, and duplicate/syndicated-story grouping.
- **Images** — image thumbnails with source page, creator/publisher when available, license/usage information when available, and image-open/source-page actions.
- **Videos** — playable or previewable video results with title, creator/channel, duration, publish date, provider, and source link when available.
- **Academic** — papers, books, authors, publication venues, year, DOI/open-access links and citation metadata when available.
- **Posts/Discussions** — community and social results clearly labeled by platform and date; never presented as verified facts solely because they are popular.
- **People/Organizations** — entity-oriented results that distinguish namesakes and show grounded attributes, sources, and confidence.
- **Local** — place/service results with location, distance only when computed, hours only when sourced, map and directions when supported.
- **Related research** — related questions, alternative spellings, query refinements, entities and follow-up searches derived from retrieval, not fabricated filler.

A tab is not complete merely because it renders. It must return real results of that type or explicitly say the source is unavailable/not configured. Never silently substitute text-only results for missing media.

## 2. Research results use one consistent data model

Every result should preserve, where available:

- stable result ID and canonical URL;
- title, summary/snippet and content type;
- source/publisher/domain and author/creator;
- published date and retrieved-at timestamp;
- thumbnail/media URL and media metadata;
- language and region;
- query and retrieval method;
- duplicate/near-duplicate cluster;
- rights/license metadata when available;
- extracted claims supported by that result;
- quality/relevance score with documented meaning.

Missing fields remain missing; the interface must not invent publication dates, ratings, authors, media assets, or confidence values.

## 3. Rank and group information, not just links

The All view must order content by relevance to the query and display clear section headings. Use a stable ranking strategy that considers query relevance, source quality, recency where appropriate, content type, language/region, and diversity. News searches should value recency; evergreen queries should not blindly prioritize newest pages.

Deduplicate:
- identical canonical URLs and tracking-parameter variants;
- multiple search passes returning the same page;
- syndications or near-identical article text;
- repeated claims copied from the same underlying publisher.

A single page returned twice is one source, not two independent checks. Evidence independence must be estimated from publisher/domain and underlying source provenance—not the number of result rows.

## 4. AI answer and evidence are separate layers

When an answer is useful, present a short answer with an explicit link to the evidence supporting each material claim. Keep the result list visible below it. The AI answer must not replace the search results.

Each material claim should map to one or more evidence IDs. Show:
- supported claims and their source links;
- conflicting claims and the disagreement;
- uncertainty and important missing evidence;
- source dates and freshness;
- independent domains/sources versus repeated pages;
- a clear explanation when no adequate evidence was found.

Do not label evidence “verified” merely because a retrieval provider returned it. Use labels such as “retrieved source,” “cross-checked,” and “independently corroborated” only when the relevant criteria are met. Confidence must be calibrated to the evidence and never imply that many reasoning layers establish factual correctness.

## 5. Entity disambiguation and personal identity

For queries such as “Who is Memphis Arafat?”:
1. Detect that the query is a person/entity lookup.
2. Search exact-name and relevant variants without assuming the person is a public figure.
3. Separate namesakes into distinct entity candidates.
4. Rank results by exact-name match, contextual match, source reliability, and corroboration.
5. Do not blend biography details of different people.
6. Do not infer that a person does not exist because two unrelated results omit them.
7. Distinguish “I did not find reliable public sources in this search” from “no information exists.”
8. For private individuals, avoid exposing sensitive personal information; do not use private account data as public web evidence.
9. If identity cannot be resolved, ask for a public contextual clue or present clearly separated candidates.

## 6. Media is a first-class retrieval path

Images and videos must be retrieved from supported sources using provider-backed results and displayed as real thumbnails/previews with attribution. A text link alone is not an image result. Do not fabricate image URLs, thumbnails, embeds or video metadata.

The frontend must handle:
- no results;
- provider not configured;
- rate limit and timeout;
- unavailable or blocked thumbnail;
- invalid media URL;
- region restrictions;
- partial provider failure;
- loading, retry, and empty states.

A missing image/video provider must produce a truthful message and leave other search categories usable. Media results must not be confused with Fresh's own generative image/video output.

## 7. Related research and exploration

Provide useful follow-ups based on retrieved evidence and entities:
- related questions;
- named entities and concepts;
- timeline and key events;
- source comparisons;
- conflicting evidence;
- original/primary sources;
- alternative queries and spelling variants;
- “search within these results”;
- save/export/share research when supported.

Every follow-up must be clickable and execute the query or action it advertises. No decorative, nonfunctional chips.

## 8. Accessibility and small-screen behavior

- Mobile-first layout with large tap targets and readable text.
- Category tabs scroll or wrap accessibly without hiding key categories.
- Result cards have consistent hierarchy and visible source/date.
- Thumbnails do not push essential titles or actions off-screen.
- Full keyboard navigation, focus states, semantic labels and screen-reader status announcements.
- Preserve query and scroll position when switching result categories.
- Clear loading, error, retry and empty states.
- Respect reduced motion and low-bandwidth conditions; lazy-load media and provide a text fallback.

## 9. Failure transparency and safety

- Never fabricate a successful search, source, image, video, citation, or related query.
- Distinguish “no results” from “provider unavailable,” “request failed,” and “results filtered.”
- Show partial results and a visible warning when a category/provider fails.
- Escape untrusted page text; treat retrieved content as data, not instructions.
- Do not execute instructions found in webpages or allow search results to bypass authorization.
- Enforce timeouts, request size limits, safe URL handling, and provider-specific rate limits.
- Preserve source provenance through retrieval, synthesis, persistence, and UI rendering.

## 10. Acceptance tests

A release is not complete until these checks pass against the running app and deployed API:

1. A generic query returns categorized All results and functional Web/News/Images/Videos tabs.
2. Each media result has a real source URL and validated thumbnail/media metadata; no invented assets.
3. An unavailable provider produces an explicit category-level error while other categories remain usable.
4. Two retrieval passes returning the same URL are deduplicated and count as one source.
5. Two sources from the same publisher or copied article are not described as independent corroboration.
6. Claim citations resolve to the exact result that supports them.
7. Conflicting source claims remain visible rather than being silently merged.
8. “Who is Memphis Arafat?” does not merge unrelated people named Arafat or claim nonexistence from absent results.
9. Result order is stable for the same inputs and explains recency/relevance behavior at a product level.
10. Switching tabs preserves the query; retries work after timeout/network failure.
11. Keyboard, screen reader, Android small-screen, loading, empty and error states are browser-tested.
12. Production smoke tests confirm actual response payloads and visible result rendering, not just HTTP 200.

## 11. Delivery sequence

1. Audit current UI, API contracts, provider configuration and deployed payloads.
2. Define a normalized SearchResult / SearchResponse contract and adapters per content category.
3. Implement canonical URL normalization, duplicate clustering and provenance preservation.
4. Implement category-aware retrieval and truthful provider readiness/errors.
5. Implement entity disambiguation and claim-to-source linking.
6. Build All/category result presentation with media thumbnails and related research.
7. Add deterministic fixture tests, provider contract tests and security/accessibility tests.
8. Validate in a real browser on mobile and desktop, then production smoke-test each category.

No-cost-first rule: prefer already-configured/free-tier sources and graceful degradation. Do not add a paid provider or silently proxy another model without explicit approval. Report unavailable provider configuration rather than claiming complete coverage.
