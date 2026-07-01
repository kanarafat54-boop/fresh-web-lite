# feat(seo): add RSS, dynamic sitemap, SSR post pages, and OG image generator

## Summary
- Adds Phase 0 SEO & sharing improvements:
  - Minimal RSS feed of recent public posts
  - Dynamic sitemap that lists homepage, post pages, and user profiles
  - Server-side rendered post pages with JSON-LD and Open Graph meta tags
  - Dynamic OG image generator endpoint (SVG fallback)
  - README/docs updates for testing and verification

## Files changed (high level)
- pages/api/feed/rss.js
- pages/sitemap.xml.js
- pages/posts/[id].js
- pages/api/og.js
- docs/seo.md

## Local verification checklist
1. Install dependencies
   ```bash
   npm ci
   ```

2. Copy example env and set up local SQLite DB
   ```bash
   cp .env.local.example .env.local
   # Edit .env.local: set DATABASE_URL="file:dev.db"
   # Optionally set SITE_URL to your dev/public URL
   ```

3. Prisma: generate client and push schema
   ```bash
   npx prisma generate
   npx prisma db push
   ```

4. Build & lint
   ```bash
   npm run build
   npm run lint
   ```

5. Start dev server
   ```bash
   npm run dev
   ```

6. Smoke tests (after server is up, run in another terminal)
   ```bash
   # Health check
   curl http://localhost:3000/api/health

   # RSS
   curl http://localhost:3000/api/feed/rss

   # Sitemap
   curl http://localhost:3000/sitemap.xml

   # SSR post page (replace 1 with a valid post id)
   curl http://localhost:3000/posts/1

   # OG image generator
   curl http://localhost:3000/api/og?postId=1
   ```

## Expected smoke-test responses
- GET /api/health -> 200 { ok: true, time: "..." }
- GET /api/feed/rss -> 200 XML containing recent published posts
- GET /sitemap.xml -> 200 XML listing homepage, posts, profiles
- GET /posts/<id> -> 200 HTML page rendered server-side with meta tags and JSON-LD
- GET /api/og?postId=<id> -> 200 SVG image for the post

## Notes & Warnings (important)
- These endpoints read from the Prisma `Post` and `User` models. If your schema uses different field names, adapt the queries accordingly.
- The signup/signin endpoints added in feat/auth-icons-pr are development helpers only: they hash passwords but do NOT implement sessions, CSRF protection, rate-limiting, email verification, or production-safe token handling.
- For production, integrate next-auth or implement secure session/JWT handling, CSRF protection, rate limiting, and email verification.
- OG images are returned as SVG; convert to PNG server-side or at build time if required for some platforms.

## SEO / PWA work included
- RSS feed endpoint for feed readers and crawlers
- Dynamic sitemap.xml for search engines
- JSON-LD (schema.org/Article) on post pages
- Open Graph meta tags and dynamic og:image per post
- README/docs updated with testing instructions

## Developer checklist (for PR review)
- [ ] Confirm smoke tests run and paste logs into this PR
- [ ] Verify no sensitive data is exposed by new endpoints
- [ ] Sanitize post content and check for XSS on post render
- [ ] Optional: replace placeholder OG image and icons with branded assets
- [ ] Optional: add caching headers or CDN configuration for /api/og and sitemap

## Suggested labels
enhancement, SEO, pwa, auth

## Suggested reviewers
@kanarafat54-boop (yourself) and any teammates responsible for auth or infra

---

### Build & smoke-test logs (paste here after running locally)
*(Reviewer: after you run the verification checklist above, copy the console output and paste it here.)*

```
[Paste build and smoke-test logs here]
```

---

## Follow-up PRs planned
After this PR merges, the following phases will be implemented:

### Phase 1: Moderation & Data Portability
- Moderation model (ModerationAction) + admin UI
- Data export endpoint (account/export)
- Data import endpoint (account/import)
- Moderation transparency feed

### Phase 2: Federation & Cross-posting
- ActivityPub skeleton (WebFinger, inbox, outbox)
- OAuth connectors: X/Twitter, Facebook/Instagram, TikTok
- Cross-post worker for automated posting
- Secure token storage & rotation

### Phase 3: Creator Features & Privacy
- Creator primitives (Tip, Subscription models)
- Tip API + Stripe integration
- Optional selective E2EE for DMs
- Full next-auth or JWT/session integration for production
