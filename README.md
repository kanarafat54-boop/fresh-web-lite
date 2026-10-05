# Fresh Web Lite

**One Platform · Endless Possibilities · Your Digital Life, Unified**

Fresh Flow · Fresh AI · 32 Ecosystems · **10,000 Accounts**

## Scale

- **10,000 generated accounts** with unique names, handles, bios, follower counts, integrity scores, verification flags
- Deterministic generator (`src/lib/generator.ts`) — same ID always produces the same user/post
- Up to 50,000 content items across types
- Full **profile pages** for every account: `/profile/@handle`

## Content types supported

| Type | Route / Filter | Features |
|------|----------------|----------|
| Short video | `/flow` | Vertical feed, swipe, AI overlay |
| Long video | `/flow` → Long | Cinematic |
| News / Posts | `/flow` → News | Text + image |
| Podcasts | `/podcasts` + Flow filter | Duration, play UI |
| Music | `/music` + Flow filter | Now-playing bar, track list |
| AR | `/ar-vr` + Flow filter | Spatial / AR badges |
| VR | `/ar-vr` + Flow filter | 360° / immersive badges |

## Screens

- `/` Welcome
- `/auth` Sign in / Sign up
- `/onboarding` Interests
- `/home` Hub + 10k creators preview + content shortcuts
- `/flow` Multi-type feed (filter tabs) + Fresh AI chat
- `/podcasts` Dedicated podcast list
- `/music` Dedicated music player UI
- `/ar-vr` AR + VR galleries
- `/ecosystems` 20 ecosystems
- `/profile/[handle]` Full profile for any of the 10,000 users

## Run

```bash
cd fresh-web-lite
npm install
npm run dev
```

Open http://localhost:3000

Try:
- Open Flow → switch tabs (Podcast / Music / AR / VR)
- Tap any creator name → full profile page
- Tap Fx → Fresh AI
- Home → Creators row → jump into any of the 10k accounts

## Architecture note

No database required for the demo. Everything is generated on the fly with a seeded hash so the experience feels populated at massive scale while staying lightweight.
