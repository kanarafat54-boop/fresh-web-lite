# Fresh Web Lite Architecture

## Overview

Fresh Web Lite is an AI-native universal platform built with React, TypeScript, and Vite. The architecture prioritizes:

- **Modular features** via `FeatureRegistry`
- **Async initialization** with error boundaries
- **Context-based state** for layout, auth, and core platform
- **Semantic research** capabilities backed by Supabase
- **Agent runtime** (Ara6) for automation and intelligence

## Core Layers

### 1. Bootstrap Layer (`main.tsx`)

**Responsibility**: Safe application startup

- `RuntimeErrorBoundary`: Catches initialization errors
- `BootScreen`: Shows loading/error states
- `bootstrap()`: Async provider loading with error handling
- Renders providers in correct order: `FreshCoreProvider` → `FreshIdProvider` → `App`

### 2. Application Shell (`app/AppShell.tsx`)

**Responsibility**: Theme and layout context

- `ThemeProvider`: Design system tokens
- `LayoutProvider`: Sidebar, notifications, active route state
- Wraps `AppRouter`

### 3. Routing Layer (`app/AppRouter.tsx`)

**Responsibility**: Feature selection and rendering

- `FeatureRegistry.getFeature()`: Maps active route to component
- `FeatureLoader`: Wraps features with error boundary
- Layout: TopBar, SideNav, MainContent, RightPanel, BottomNav
- Special routes handled in `App.tsx` (e.g., `/memphis-arafat`)

### 4. Feature Modules (`features/`)

**Responsibility**: User-facing functionality

Each feature is:
- Registered in `FeatureRegistry`
- Lazy-loadable via dynamic imports
- Wrapped in `ErrorBoundary` for isolation
- Can have its own context providers

**Examples**:
- `fresh-id/`: Authentication & identity management
- `feed/`: Social media feed
- `ai/`: Fresh AI command center
- `home/`: Dashboard

### 5. Core Platform (`core/`)

**Responsibility**: Foundational capabilities

#### `fresh-core/`
- Platform APIs and interfaces
- Exports from ara6, interactions, research

#### `ara6/`
- **Runtime**: Agent execution engine
- **Tools**: Extensible tool registry
- **Agents**: Default agent definitions

#### `interactions/`
- `FreshReactionModel`: Like/comment/reaction system
- `FreshAttachmentValidation`: File upload validation
- `FreshInteractionA11y`: Accessibility helpers

#### `research/`
- `ResearchMode`: Search depth (quick, deep, global, etc.)
- `ResearchClaim`: Fact verification with confidence
- `ResearchSynthesis`: Answer generation from sources
- `ResearchProvenance`: Source attribution

#### `semantic/`
- `SemanticStore`: Knowledge graph storage
- `ResearchIngestion`: Source ingest & processing
- Entity & relation storage

### 6. Shared Components (`components/`)

**Responsibility**: Reusable UI primitives

- `Icons.tsx`: 22-24px monochrome icon set (no external deps)
- Consistent stroke-based design

## State Management

### Context Providers

1. **FreshCoreProvider** (`app/providers/FreshCoreProvider.tsx`)
   - Platform readiness
   - Available tools and agents
   - Semantic store access

2. **FreshIdProvider** (`features/fresh-id/context/FreshIdContext.tsx`)
   - Current user
   - Auth state
   - Session management

3. **LayoutProvider** (`app/contexts/LayoutProvider.tsx`)
   - `activeRoute`: Current feature
   - `sidebarOpen`: Navigation visibility
   - `notifications`: Toast/notification queue
   - Methods: `setActiveRoute()`, `removeNotification()`

4. **ThemeProvider** (`app/providers/ThemeProvider.tsx`)
   - Design tokens
   - Dark/light mode

### Hook Usage

```typescript
// In any component:
const { activeRoute, setActiveRoute } = useLayout();
const { user, loading } = useFreshId();
const { ready, tools, agents } = useFreshCore();
```

## Data Flow

### Typical Feature Interaction

```
User clicks SideNav button
  → setActiveRoute('feed')
  → LayoutProvider updates state
  → AppRouter re-renders
  → FeatureRegistry.getFeature('feed') returns HomeDashboard
  → HomeDashboard lazy-loads inside FeatureLoader
  → Component renders with access to all context hooks
```

### Authentication Flow

```
App loads
  → FreshIdProvider checks Supabase session
  → Sets user state (or null if logged out)
  → Features can check useFreshId().user
  → AuthForm shown to unauthenticated users
```

### Research/AI Flow

```
User inputs query in Fresh AI
  → ResearchIngestion fetches sources
  → SemanticStore ingests entities & relations
  → ResearchSynthesis generates answer
  → Claims generated with confidence scoring
  → UI displays with source attribution
```

## Error Handling

1. **Initialization**: `RuntimeErrorBoundary` in `main.tsx` → `BootFailure` screen
2. **Feature Loading**: `ErrorBoundary` in `AppRouter` → "empty-state" message
3. **Async**: Try/catch in `bootstrap()` and Supabase queries
4. **Component**: Class `ErrorBoundary` in `app/components/ErrorBoundary.tsx`

## Code Organization Rules

- **Features** own their routes, context, and components
- **Core** provides platform abstractions (no feature-specific logic)
- **Components** are stateless, pure, or use only shared context
- **Shared styles** in `design-system/design-system.css`
- **Icons** in `components/Icons.tsx` (single source of truth)

## Performance Considerations

- **Lazy loading**: Features imported dynamically by `FeatureLoader`
- **Code splitting**: Vite auto-chunks by route
- **Context optimization**: `LayoutProvider` doesn't re-render unused features
- **CSS-in-JS avoided**: All styles are plain CSS files

## Testing Strategy

- Unit tests for `core/` modules (research, semantic, interactions)
- Integration tests for provider stacks
- E2E tests for feature workflows
- Error boundary tests for error states

## Future Patterns

- **Workspace switching**: `WorkspaceSwitcher` component ready for multi-workspace
- **Notifications center**: Already hooked into layout state
- **Global search**: `GlobalSearchEntry` component exists
- **Ara6 agents**: Runtime ready for autonomous task execution
