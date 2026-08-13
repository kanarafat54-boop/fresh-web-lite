# Cloudflare setup

Fresh Web Lite uses the Cloudflare Vite plugin and Wrangler for Cloudflare Workers deployment.

## Local verification

```bash
npm install
npm run build
npm run preview
npm run cf-typegen
npx wrangler check
npx wrangler deploy --dry-run
```

## Deployment

Authenticate Wrangler with `npx wrangler login`, then run:

```bash
npm run deploy
```

Do not commit `.dev.vars*`, API tokens, or other secrets. Configure secrets with Wrangler or the Cloudflare dashboard.
