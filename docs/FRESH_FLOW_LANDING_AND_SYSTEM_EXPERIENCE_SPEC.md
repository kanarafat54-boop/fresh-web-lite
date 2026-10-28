# Fresh Flow Landing Page & Independent System Experiences

**Status:** Product/design contract. Initial landing UI and system-specific scaffold routing are now implemented on draft PR #163; full workflows, canonical URL routing, CI, browser/device validation, and production behavior remain unverified.
**Parent:** Fresh Web Lite
**Reference viewport:** Android-first mobile, 390 × 844 CSS px baseline, responsive down to 320 px.
**Visual direction:** Dark premium interface using existing Fresh Flow design tokens; readable, high-contrast, low-bandwidth aware.

## 1. Fresh Flow landing page

The landing page is the cross-media home for Fresh Flow, not the global Fresh Web Lite Home and not a generic feed belonging to one system.

### Content hierarchy

1. **Brand header**
   - Title: Fresh Flow
   - Tagline: Discover. Connect. Create.
   - Preserve a clear route back to the global Fresh Web Lite Home without confusing it with Fresh Flow Home.
2. **Creation prompt**
   - Prompt: What's happening? Create something...
   - Opens the appropriate creation entry point based on the user's selected intent and available capabilities.
   - Do not imply an upload, post, live broadcast, or other creation succeeded until the operation confirms success.
3. **Primary discovery shortcuts**
   - Shorts
   - Videos
   - News / Posts
   - VR / AR
   - Podcasts
   - Others
   - These are launch shortcuts into their own experiences, not six tabs that render the same generic screen.
   - Others opens the complete All Systems directory, organized into the six families and all 24 independent systems.
4. **Personalized discovery section**
   - Heading: For you
   - Subheading: Recommended for you
   - Description: A personalized mix of creators, useful discoveries, and content from across Fresh Flow.
   - Render mixed media cards only when there is actual content available. Show explicit loading, empty, offline, and retry states.
   - A demo, fixture, mock, or placeholder feed must be visibly labelled "Example content — not a live feed". Never present fixture content as live, personalized, or sourced from real accounts.
5. **Persistent bottom navigation**
   - Home
   - Following
   - Create
   - Messages
   - Profile
   - Home returns to the Fresh Flow landing page. Following opens the user's followed creators/content stream. Create opens the creation chooser/studio entry point. Messages opens communication. Profile opens the current user's profile/workspace.
   - Keep labels visible and tap targets comfortably usable on small Android screens. Respect safe-area insets and do not cover content or player controls.
   - If the current implementation has other bottom-navigation labels, reconcile them against this approved five-item contract instead of silently deleting existing functionality. Any displaced destination must remain discoverable through an appropriate menu or system directory.

### Mobile-first conceptual wireframe

> Fresh Flow
>
> Discover. Connect. Create.
>
> What's happening? Create something... [+]
>
> Shorts · Videos · News / Posts
>
> VR / AR · Podcasts · Others
>
> **For you**
>
> **Recommended for you**
>
> A personalized mix of creators, useful discoveries, and content from across Fresh Flow.
>
> [Mixed-media content cards]
>
> Example content — not a live feed
>
> **Home · Following · Create · Messages · Profile**

The wireframe explains hierarchy only. It is not a screenshot or proof of the current implementation. Do not hard-code the sample text as live content or fabricate real creators, engagement metrics, availability, or recommendations.

## 2. Every system is an independent product experience

The directory contains 24 systems in six families. Family names are for grouping and navigation only. Every system needs its own:
- Canonical route and deep-link behavior.
- Purpose-built landing/discovery UI and primary workflows.
- System-specific content model and capability boundaries.
- Loading, empty, offline, permission-denied, error, and retry states as applicable.
- Keyboard/screen-reader support, visible focus, scalable text, contrast, touch target sizing, and reduced-motion support.
- Unit/contract tests plus relevant interaction and responsive tests.
- Honest implementation status backed by evidence.

Systems may reuse shared design tokens, identity, search, media processing, accessibility utilities, safety/reporting, notifications, saved items, and monetization infrastructure. Shared services must not make different systems indistinguishable or bypass their authorization, privacy, moderation, licensing, or device-permission requirements.

### Experience boundaries

- **Fresh Shorts:** immersive short-form discovery/playback and social interactions. Preserve For You, Following/Social, Trending, Fresh Picks, Learn, Relax, and Filters/Models as distinct modes/tools. Preserve the requested left-swipe-next and right-swipe-previous behavior; audit the current implementation before changing gestures.
- **Long Video:** long-form player, channels, playlists, chapters and resume viewing.
- **Movies & Series:** film/TV catalog, seasons, episodes, watchlists and rights-aware availability.
- **Fresh Live:** viewer-facing audiovisual live streams and audience participation.
- **Sports & Events:** sports-oriented coverage, schedules and fan experience; provider/rights constraints must be explicit.
- **Fresh Posts:** social publishing and conversation.
- **Communities:** member-led groups, roles, topics and moderation.
- **Stories:** temporary, audience-scoped updates and expiry.
- **Creator Channels:** creator-owned audience and channel identity.
- **Fresh Music:** music discovery, playback, library and playlists, subject to rights.
- **Fresh Podcasts:** shows, episodes, subscriptions and spoken-audio playback.
- **Radio & Audio Live:** live audio stations and rooms.
- **Audiobooks:** book-length spoken content, chapters, bookmarks and progress.
- **Fresh News:** source-attributed reporting, topics, freshness and corrections.
- **Books & Reading:** book discovery, reading view, annotations and reading progress.
- **Learn:** structured learning paths, lessons and progress.
- **Research & Knowledge:** source-led research, evidence, citations and knowledge exploration.
- **Images & Art:** image/art discovery, galleries and creator attribution.
- **VR / AR / Spatial:** spatial content, device capability and permission-aware entry.
- **Interactive Experiences:** interactive media and user-controlled experiences.
- **Gaming & Esports:** game discovery, play/watch entry points and esports coverage.
- **Fresh Studio:** recorded creation, editing, drafts and publishing.
- **Live Creation:** real-time production control room, inputs, scenes and broadcast status.
- **Events & Performances:** non-sports event discovery, schedules, attendance and performance experiences.

## 3. Navigation and state rules

- Fresh Flow Home is a cross-system landing page.
- All Systems is a directory, not a substitute for individual system screens.
- Opening a system must route to that system's own experience, not merely change a heading in a generic page.
- Switching systems should preserve valid independent state where appropriate (for example, audio playback), while never leaking private drafts or account data across profiles/workspaces.
- Fresh Web Lite global Home remains a separate destination.
- Discovery selection must be passed to the selected experience and applied consistently; avoid dead controls that only change visual selection.
- Keep legacy IDs, URLs, saved preferences and meaningful destinations backward-compatible or provide explicit redirects/migrations.

## 4. Data honesty and implementation status

- Clearly distinguish live provider data, saved user data, locally generated demo data, and empty states.
- Do not claim personalization unless recommendations use actual user/context signals and have appropriate privacy controls.
- Do not claim a system is complete because it appears in the registry or directory.
- Mark a system "verified" only after its dedicated UI, routes, primary journeys, failure states, accessibility checks, automated checks and production behavior have evidence.
- Provider-dependent, rights-dependent, or hardware-dependent features must show accurate setup/availability states rather than simulated success.

## 5. Current implementation progress

- Fresh Flow Home now renders the specified hero, creation prompt, six primary shortcuts, For you / Following tabs, clearly labelled example cards, and the five-item Home / Following / Create / Messages / Profile navigation.
- The All Systems directory renders the six families and all 24 registry entries, with a searchable list.
- Fresh Shorts now has a separate in-app route from Fresh Flow Home. Other registry entries route either to an existing legacy experience or to a dedicated system-specific scaffold showing its own description and capability areas.
- The system-specific scaffold is a starting point, not a claim that the listed capabilities are functional. All registry statuses remain Planned until the relevant workflows and checks pass.
- The Figma file has been created in the Fresh Web Lite team: https://www.figma.com/design/rqDDcS2YkPWY757MVbwA5u. Its editable frame population is still pending.
- The Fresh Web Lite build gate passed on the current PR head, including the new 24-system/landing contract, TypeScript typecheck, build, lint, and profile-schema drift check. Fresh Shorts Production Gate, Fresh ID Auth Viewport Gate, Fresh ID Device Security Gate, Fresh AI integrity, and TRUEMODE Chain Verification also passed; Vercel and Netlify preview checks are successful.
- Fresh Mail Backend Gate and Fresh AI training contracts are still running. Manual browser/device journey checks remain outstanding. The Figma file exists, but its editable frames and prototypes remain unpopulated.

## 6. Acceptance checklist

- [ ] Fresh Flow landing page follows the hierarchy and exact core copy above.
- [ ] Bottom navigation uses Home / Following / Create / Messages / Profile and works at small Android widths.
- [ ] The six primary shortcuts launch their intended distinct experiences; Others opens All Systems.
- [ ] All Systems lists all 24 systems in six families without merging system entries.
- [ ] Each of the 24 systems has an independently addressable route and purpose-built experience.
- [ ] Demo content is labelled; no fake live feed, creator, metric, or successful action is presented as real.
- [ ] Fresh Shorts discovery modes and gesture requirements are preserved and tested.
- [ ] Existing routes, permissions, profile/workspace boundaries, and global Home remain intact.
- [ ] Automated tests, typecheck, lint, production build, responsive/browser checks and available Android-device checks are recorded before declaring completion.
