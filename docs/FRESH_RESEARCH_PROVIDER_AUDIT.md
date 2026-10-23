# Fresh Research provider audit (source inspection)

Audit basis: repository source inspection. The Wikimedia Commons and Internet Archive adapters are implemented in this branch; live production behavior still needs runtime/browser verification.

| Category | Actual retrieval path | Current limitation |
|---|---|---|
| External Web / Fresh AI Research | `POST /api/research/search` calls Tavily Search API | Requires `TAVILY_API_KEY`; returns 503 if absent |
| Quick / Deep / Global | Same Tavily endpoint with basic/advanced depth; Deep/Global issue two queries | Different modes over one provider, not independent search engines |
| News / Live | Tavily news topic for Live; Fresh Flow News reuses internal `posts` | Fresh Flow News is not an external-news index |
| Academic | Tavily general web search with academic query guidance | No dedicated scholarly index/provider |
| Business / People / Local | Tavily general web search with mode-specific query guidance | No dedicated directory, public-people index, or geospatial provider |
| Fresh Flow Videos | Supabase `shorts` plus full-text RPC and text fallback | Real internal Fresh videos only; not global video search |
| Fresh Flow Posts | Supabase `posts` plus full-text RPC and text fallback | Internal posts only; no public social-network index |
| Fresh Flow People | Supabase `user_public_profiles` | Fresh profiles only |
| Fresh Flow Topics | Reuses internal videos and posts | No dedicated trends index |
| External Images | New `POST /api/research/images` adapter uses Wikimedia Commons API | Real thumbnail + source-page URL + author/license metadata; results are limited to Commons and safely filtered to provider hosts |
| Archive Videos | New `POST /api/research/videos` adapter uses Internet Archive search + item metadata | Returns only items with a discovered MP4/MPEG4-compatible file, archive thumbnail, creator/date metadata, and source record; this is a focused archive, not the whole public video web |
| Music | URL heuristics classify music-site links found in web results | No dedicated music provider |

## Evidence-engine changes in this branch

- Canonical URL deduplication removes tracking parameters and fragments and normalizes host/path.
- Publisher diversity counts registrable domains, not duplicate query passes or subdomains.
- Each source excerpt is linked to exactly one result URL.
- Search excerpts remain `unverified` until claim-entailment verification exists.
- Confidence is capped at medium until proposition-level verification is implemented.
- Different generated answer paragraphs are not treated as proof of contradiction.

## Remaining parity work

1. Configure and validate image retrieval with separate thumbnail URL, source-page URL, publisher, and attribution fields.
2. Add a dedicated video provider or label results honestly as web-discovered video links.
3. Add dedicated academic, external-news, and public-post indexes where those categories are promised.
4. Implement claim-level entailment, contradiction checks, and source-backed entity disambiguation.
5. Test with live credentials and a real Android/desktop browser. CI does not prove production credentials or rendered journeys.
