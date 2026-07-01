# fresh-web-lite

A lightweight, SEO-friendly Next.js PWA scaffold and monorepo starter for web and mobile. It combines a minimal Next.js Pages app with Prisma (SQLite by default), background workers, a small Express server for optional routes, and Capacitor configuration for building native installers.

Monorepo that consolidates repositories from the GitHub account `kanarafat54-boop` into a single full-stack, multi-platform web app and mobile package.

This repository includes:
- Next.js + TypeScript-ready scaffold (lightweight starter)
- PWA configuration and Capacitor integration for building installable phone packages
- GitHub Actions workflow and an import script to preserve each source repository's commit history (using git subtree)

Important: To import private repositories with full history the workflow needs a Personal Access Token (PAT) with `repo` scope stored in this repository's secrets as `IMPORT_PAT`.

Quick start
1. Add a repository secret named `IMPORT_PAT` containing a PAT with `repo` scope.
2. In the Actions tab, run the "Import repositories (preserve history)" workflow (workflow_dispatch).
3. After import completes, inspect `projects/` — each repository will be placed under `projects/<repo-name>`.

Mobile packaging
- This scaffold is PWA-first and configured to work with Capacitor to produce native installers.
- See the "Mobile" section below for build commands.

Scaffold status
- This is an automated scaffold. After import, the codebase will require build/test iterations. CI will run and may need secrets for database, S3, etc.

If you want me to proceed with automated fixes and rebuilds, reply and I will iterate.

---

## 10x Improvements for Google (SEO & PWA readiness)
I updated metadata, manifest, and added placeholder icons so the site can be indexed and recognized as a PWA. Recommended next steps to improve search ranking and discoverability:
- Add meaningful meta description and Open Graph images for social sharing.
- Serve an HTML-rendered homepage with structured data (JSON-LD) for the app and organization.
- Add sitemap.xml and robots.txt (I can generate them in a follow-up).
- Improve content: concise headings, descriptive text, and accelerators like Preload/Prefetch links.

## Local development (auth + Prisma, SQLite)
These instructions let you run the repository locally with the minimal auth APIs (signup/signin) wired to the included Prisma schema.

1. Install dependencies

```bash
npm ci
```

2. Copy the example env and set up a local SQLite DB

```bash
cp .env.local.example .env.local
# In .env.local set DATABASE_URL="file:dev.db" if not already set
```

3. Generate Prisma client and push schema

```bash
npx prisma generate
npx prisma db push
```

4. Start the dev server

```bash
npm run dev
```

5. Smoke tests

```bash
# Health check
curl http://localhost:3000/api/health

# Signup
curl -X POST -H "Content-Type: application/json" -d '{"email":"test@local","password":"abc123"}' http://localhost:3000/api/auth/signup

# Signin
curl -X POST -H "Content-Type: application/json" -d '{"email":"test@local","password":"abc123"}' http://localhost:3000/api/auth/signin
```

Notes
- The auth endpoints are minimal and intended for local development and testing only. They store a hashed password in the `User` model and return a JSON response. For production, integrate next-auth or issue secure session cookies/JWTs.
- If you prefer Postgres in CI/production, change DATABASE_URL accordingly and run migrations.

---

If you want, I will now run a checklist and open a PR with these changes (branch: feat/auth-icons-pr → main) and include the build logs and smoke test outputs.
