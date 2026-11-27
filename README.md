# Fresh Web Lite

**One Platform · Endless Possibilities · Your Digital Life, Unified**

Fresh Web Lite is a web-based access point to the wider **Fresh Tech** initiative, founded by Memphis Arafat (Ara6). The project explores connected digital experiences across social interaction, media and creator tools, artificial intelligence, communication, learning, and other technology areas.

> **Fresh Tech:** Turning Ideas Into Possibilities.

- **Live application:** https://fresh-web-lite.vercel.app
- **Source repository:** https://github.com/kanarafat54-boop/fresh-web-lite
- **Default branch:** `main`

## Project status

Fresh Web Lite is under active development. The repository contains application code, feature modules, backend integration code, database migrations, and automated verification scripts.

A feature being present in the repository does not by itself mean it is enabled for every user, fully integrated with production services, or production-ready. Availability can depend on configuration, account permissions, backend services, deployment state, and ongoing verification. Refer to the application and the relevant tests or implementation before treating an individual capability as complete.

## Product areas

The codebase includes work across these areas:

- **Platform shell and navigation** — application composition, feature registry/loading, responsive navigation, workspace layout, and user entry flows.
- **Fresh ID and account experiences** — authentication and identity-related application flows.
- **Fresh Flow and Shorts** — media discovery and playback experiences, creator interactions, collections, privacy controls, and related media workflows.
- **Fresh Studio and media tooling** — creator-oriented editing, rendering, and publishing components.
- **Fresh AI** — AI capability interfaces, runtime contracts, verification scripts, and research/development infrastructure.
- **Communication and social features** — messaging, profiles, notifications, and interaction components.
- **Backend and data foundations** — Supabase client integration and SQL migrations for application data, security policies, and feature-specific persistence.
- **Trust, safety, and verification** — privacy/security contracts, evidence and provenance work, and automated checks.

These are project areas represented in the codebase, not a claim that every listed capability is currently available in the live deployment.

## Technology

The current package configuration identifies the main application stack as:

- React 19
- TypeScript 5
- Vite 6
- React Router 7
- Supabase JavaScript client

The repository also contains feature-specific scripts and SQL migrations. Additional services or runtime integrations may require separate configuration.

## Run locally

### Requirements

- Node.js compatible with the versions required by the installed Vite and TypeScript toolchain
- npm
- Access to a configured Supabase project for application paths that initialize the Supabase client

### 1. Clone and install

```bash
git clone https://github.com/kanarafat54-boop/fresh-web-lite.git
cd fresh-web-lite
npm install
```

### 2. Configure environment variables

The Supabase client reads these Vite environment variables:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY` (preferred), or
- `VITE_SUPABASE_ANON_KEY` (supported fallback)

Create a local `.env.local` file and provide values from your own Supabase project:

```dotenv
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=YOUR_PUBLIC_PUBLISHABLE_KEY
```

Do not put a Supabase service-role key, database password, or other server secret in a `VITE_*` variable or browser bundle. Never commit real credentials. Keep local environment files out of version control.

### 3. Start the development server

```bash
npm run dev
```

Vite prints the local URL in the terminal (normally `http://localhost:5173`).

## Quality checks

The package defines separate commands for build, linting, type-checking, and feature-specific verification. Run the checks relevant to the area you change.

### Core checks

```bash
npm run lint
npm run typecheck
npm run build
```

### Examples of focused verification

```bash
npm run test:shorts
npm run test:fresh-ai
npm run test:phase0-security
npm run test:production-routing
```

The repository also defines additional scripts for Fresh Flow navigation, Fresh AI, Fresh Studio, media, privacy, security, training workflows, and other feature contracts. Inspect `package.json` for the current command list.

A passing focused script is evidence for the contract it checks; it is not a substitute for end-to-end testing of the whole application. Some browser-oriented scripts expect a completed build or additional local services. Check each script before running it.

## Backend and database notes

The application uses the Supabase JavaScript client. SQL migrations are maintained under `supabase/migrations/`.

Before applying migrations to any shared or production database:

1. Confirm the target Supabase project and environment.
2. Review the migration and its dependencies.
3. Check migration history and current schema state.
4. Confirm backups and an appropriate recovery plan.
5. Apply through the project's established migration workflow.
6. Verify the resulting schema, access policies, and application behavior.

Do not assume that every migration is safe to replay against an existing production database.

## Repository structure

A few useful locations:

| Path | Purpose |
| --- | --- |
| `src/app/` | Application shell, routing, layout, and feature loading |
| `src/config/` | Application configuration |
| `src/core/` | Shared platform and runtime foundations |
| `src/features/` | Product feature modules |
| `src/lib/` | Shared integrations and libraries, including Supabase |
| `scripts/` | Automated verification and development scripts |
| `supabase/migrations/` | Database schema and policy migrations |
| `package.json` | Dependencies and available scripts |
| `vite.config.ts` | Vite build and development configuration |

## Contributing and collaboration

Fresh Web Lite is being developed as part of the broader Fresh Tech initiative. Engineers, developers, researchers, designers, creators, and other potential collaborators can explore the public repository, review the implementation, and discuss improvements through GitHub.

When proposing a change:

1. Describe the problem and expected behavior.
2. Identify the affected feature and relevant existing contracts.
3. Keep changes focused and preserve established product behavior.
4. Add or update tests where appropriate.
5. Run the relevant quality checks.
6. Document configuration, migration, and deployment implications.

Please avoid including credentials, personal data, or private production information in issues, commits, screenshots, or pull requests.

## About Fresh Tech

Fresh Tech is the broader technology initiative behind Fresh Web Lite. Its ambition spans interconnected software, artificial intelligence, financial technology, media, automation, and emerging technologies.

Fresh Web Lite is one web-based access point within that larger direction—not the entirety of the vision.

**Founder:** Memphis Arafat (Ara6)  
**Founder philosophy:** Turn ideas into systems.  
**Fresh Tech tagline:** Turning Ideas Into Possibilities.
