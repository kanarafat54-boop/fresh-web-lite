# Fresh Flow global discovery

Five Fresh Flow systems search the wider web, not only what is posted on Fresh: **Fresh News, Fresh Music, Books & Reading, Learn, and Research & Knowledge.**
Each result links to the original source. Fresh does not host, copy or re-publish the work.

Code: `src/core/discovery/globalDiscovery.ts` (sources, parsing, fan-out) · endpoint `GET /api/discover?system=<id>&q=<text>` (served by `api/research/search.ts` through a `vercel.json` route, to stay inside the Vercel Hobby limit of 12 functions) · screen `GlobalDiscoveryPanel.tsx`.

## Sources

All sources are free and need no key. No paid service is involved.

| System | Source | What Fresh shows | Notes |
| --- | --- | --- | --- |
| Fresh News | Publisher RSS/Atom feeds: BBC News, BBC News Africa, Al Jazeera, DW, France 24, NPR, The Guardian, allAfrica | Latest headlines with nothing typed; search filters the feeds' recent items | Feeds only hold recent stories. Newest first, capped at 30 |
| Fresh News | GDELT news index | Wider and older coverage when you search | Rate limited (about one request per 5 seconds per address); shown as a failure when it answers HTTP 429 |
| Fresh Music | Apple music catalog (iTunes Search API) | Songs with artwork and a 30-second preview | Full tracks play at the provider |
| Books & Reading | Open Library, Internet Archive (texts) | Catalog entries and free-to-read or borrowable books | Open Library and the Internet Archive say what can be read or borrowed |
| Learn | Wikiversity, Wikibooks | Free lessons and open textbooks | Text is CC BY-SA |
| Research & Knowledge | OpenAlex, Wikipedia | Papers (with open-access flag) and encyclopedia articles | |

Project Gutenberg's search API (gutendex.com) answered HTTP 403 from CI, so it was replaced by the Internet Archive.

## Honesty rules in the code

- A source that fails, times out or answers with something that is not a feed is reported by name. It is never shown as "no results".
- When some publisher feeds fail, the screen says which ones. When every feed fails, it says so.
- Only `http(s)` addresses are kept. Images must be `https`.
- Nothing is invented: every item comes from a source reply.
- Search words are cleaned and capped at 120 characters. Source hosts are fixed in code, so the endpoint cannot be pointed at other sites.
- The feed reader is bounded (1,000,000 characters, 40 items per feed) and tested against hostile input so a broken feed cannot stall the function.

## Needs a decision from the owner

- **Publisher terms.** Headlines, a short snippet and a link back are the normal use of public feeds, but each publisher sets its own terms and several limit feeds to non-commercial use. Review them before relying on a feed in a commercial product. Removing a publisher is a one-line change in `NEWS_FEEDS`.
- **Rate limits and abuse.** `/api/discover` is public and, like the existing research endpoint, has no sign-in or rate limit. Results are cached at the edge for 5 minutes, which absorbs repeat searches, but a determined caller can still make Vercel call the sources. Add a limit if usage grows.
- **Music playback.** Only previews the catalog provides are played. Full-track playback inside Fresh needs a licensed source.

## Checks

- `npm run test:global-discovery`: parsing for every source with fixtures, the feed reader, fan-out, newest-first ordering, partial and total failures, timeouts, and the route wiring.
- `.github/workflows/global-discovery-live.yml`: calls the real sources from CI and prints each publisher feed on its own. It fails if news headlines come from fewer than three publishers or any music, books, learn or research source fails. It runs on pull requests that touch discovery code and on demand.
- Browser check at 390 px with mocked replies: headlines on arrival, search, partial failure, total failure, empty results.

## Not built yet

- Saving or following a result inside Fresh.
- Publisher verification, corrections and topic pages for News.
- Artist and album pages for Music.
- Languages other than English, and per-country editions.
