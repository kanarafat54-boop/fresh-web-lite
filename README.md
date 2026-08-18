# Fresh Web Lite

**Fresh Web Lite** is an AI-native universal platform created by **Memphis Arafat**. The project is being developed as a connected foundation for identity, intelligence, creation, automation, and digital ownership.

## Creator

**Memphis Arafat**

- GitHub: https://github.com/kanarafat54-boop
- Instagram: https://www.instagram.com/arafatmemphis/

## Project

Repository: https://github.com/kanarafat54-boop/fresh-web-lite

Fresh Web Lite is intended to bring together platform capabilities such as AI assistance, personal intelligence, identity, discovery, creation, and future cross-platform services under one architecture.

## Current Stack

- **React 19** — UI framework
- **TypeScript** — Type-safe development
- **Vite 6** — Build tool and dev server
- **Supabase** — Backend & authentication
- **Google GenAI SDK** — AI capabilities
- **React Router 7** — Client-side routing

## Repository Structure

```
src/
  app/                  Application shell, routing, context, providers
    AppRouter.tsx       Main router component
    AppShell.tsx        Core app wrapper with providers
    components/         TopBar, SideNav, BottomNav, notifications
    contexts/           Layout state management (useLayout)
    providers/          Theme, Layout, FreshCore providers
    registry/           Feature registry system
    services/           Feature loader service
  
  features/             Feature modules (identity, feed, AI, etc.)
    fresh-id/           Identity & authentication
    feed/               Public media feed
    shorts/             Short-form video experience
    ai/                 Fresh AI command center
    home/               Home dashboard
    creator/            Creator pages
    wallet/             Wallet module
    comments/           Comment system
    saved/              Saved items
  
  core/                 Platform foundation
    fresh-core/         Core APIs & interfaces
    ara6/               Runtime system, agents, tools
    interactions/       Reaction model, validation, components
    research/          Research synthesis & verification
    semantic/          Semantic storage & ingestion
  
  components/           Shared UI components
    Icons.tsx           Unified icon set
  
  layouts/              Layout components
  design-system/        Design tokens & shared styles
  config/               Configuration files

index.html              Entry point with metadata
main.tsx                Bootstrap & provider setup
App.tsx                 Root application component
```

## How It Works

1. **Bootstrap** (`main.tsx`): Application starts with `RuntimeErrorBoundary`, loads providers asynchronously
2. **Providers** (`FreshCoreProvider`, `FreshIdProvider`): Establish platform context
3. **Routing** (`App.tsx` → `AppShell` → `AppRouter`): Switches between main app and special routes (e.g., `/memphis-arafat`)
4. **Features** (`FeatureRegistry`): Dynamic feature loading based on active route
5. **State** (`useLayout`): Manages sidebar, notifications, active route

## Development

### Setup

```bash
npm install
```

### Development Server

```bash
npm run dev
```

Runs on `http://localhost:5173` with hot module replacement.

### Build

```bash
npm run build
```

Production build with TypeScript type checking via `tsc -b`.

### Lint

```bash
npm run lint
```

ESLint checking with React hooks rules.

### Preview

```bash
npm run preview
```

Preview production build locally.

## Configuration

- **vite.config.ts** — Vite setup with React plugin
- **tsconfig.json** — TypeScript configuration with project references
- **package.json** — Dependencies and scripts

## Status

Fresh Web Lite is an actively evolving project. Features, architecture, and documentation will continue to change as development progresses.

## Key Concepts

- **One Account** — Unified identity across Fresh
- **Everything Connected** — Integrated platform capabilities
- **AI-Native** — AI assistance built into the platform from the ground up
- **User-Owned** — User controls their data and digital identity
