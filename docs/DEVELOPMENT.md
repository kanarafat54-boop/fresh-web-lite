# Development Guide

## Getting Started

### Prerequisites

- Node.js 18+
- npm 9+

### Setup

```bash
git clone https://github.com/kanarafat54-boop/fresh-web-lite.git
cd fresh-web-lite
npm install
```

### Environment Variables

Create `.env.local` (not tracked in git):

```
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_GOOGLE_GENAI_KEY=your_google_genai_key
```

### Run Development Server

```bash
npm run dev
```

Open http://localhost:5173

## Project Structure Reference

### Adding a New Feature

1. Create feature directory: `src/features/my-feature/`
2. Create components: `src/features/my-feature/components/`
3. Export from index: `src/features/my-feature/index.tsx`
4. Register in `FeatureRegistry`
5. Add to navigation in `FeatureRegistry.getNavEntries()`

### Example Feature Structure

```
src/features/example/
  ├── components/
  │   ├── ExamplePage.tsx
  │   └── ExampleCard.tsx
  ├── context/
  │   └── ExampleContext.tsx
  ├── services/
  │   └── exampleAPI.ts
  └── index.tsx
```

### Adding Shared UI Components

1. Add to `src/components/` (simple, reusable)
2. Or create in feature if complex or feature-specific
3. Export from feature's `index.tsx`
4. Document prop types with TypeScript interfaces

### Working with Styles

- **Global styles**: `src/index.css`
- **Design system**: `src/design-system/design-system.css`
- **Component styles**: Co-locate as `ComponentName.css` next to `.tsx`
- **No CSS-in-JS**: Avoid styled-components or emotion

### Using Context

Access layout state:

```typescript
import { useLayout } from '../app/contexts/useLayout';

export function MyComponent() {
  const { activeRoute, setActiveRoute } = useLayout();
  
  return (
    <button onClick={() => setActiveRoute('feed')}>
      Go to Feed
    </button>
  );
}
```

Access auth:

```typescript
import { useFreshId } from '../features/fresh-id/context/FreshIdContext';

export function MyComponent() {
  const { user, loading } = useFreshId();
  
  if (loading) return <p>Loading...</p>;
  if (!user) return <p>Please log in</p>;
  
  return <h1>Welcome, {user.email}!</h1>;
}
```

Access core platform:

```typescript
import { useFreshCore } from '../app/providers/FreshCoreProvider';

export function MyComponent() {
  const { ready, tools, agents } = useFreshCore();
  
  if (!ready) return <p>Platform loading...</p>;
  
  return <div>Ready to work with {tools.length} tools</div>;
}
```

## Common Tasks

### Run Tests

```bash
# Not yet configured
# npm run test
```

### Check Types

```bash
npm run build  # Runs tsc -b first
```

### Lint Code

```bash
npm run lint
```

Fix auto-fixable issues:

```bash
npm run lint -- --fix
```

### Build for Production

```bash
npm run build
```

Output in `dist/`

### Preview Production Build

```bash
npm run preview
```

## Debugging

### Browser DevTools

- **React DevTools**: Inspect components and props
- **Console**: Check for startup errors
- **Network**: Monitor Supabase requests

### Common Issues

**"Fresh Web Lite root element (#root) is missing"**
- Check `index.html` has `<div id="root"></div>`

**Provider not found error**
- Ensure component is wrapped by provider in `AppShell.tsx`
- Check provider order in `bootstrap()` in `main.tsx`

**Feature not rendering**
- Check feature is registered in `FeatureRegistry`
- Check route name matches nav entry ID
- Check component exports default

**Supabase auth not working**
- Check `.env.local` has correct keys
- Verify Supabase project settings (CORS, redirect URLs)

## Code Style

- **TypeScript**: Strict mode, no `any` without justification
- **React**: Functional components, hooks only
- **Imports**: Path aliases if configured, otherwise relative
- **Naming**: PascalCase for components, camelCase for functions/variables
- **Comments**: JSDoc for public APIs, inline for complex logic

## Git Workflow

1. Create feature branch: `git checkout -b feature/my-feature`
2. Make changes, commit: `git commit -m "feat: add my feature"`
3. Push and create PR: `git push origin feature/my-feature`
4. PR checked for lint errors and type safety

## Resources

- React: https://react.dev
- TypeScript: https://www.typescriptlang.org/docs/
- Vite: https://vitejs.dev/
- Supabase: https://supabase.com/docs
- Google GenAI: https://ai.google.dev/
