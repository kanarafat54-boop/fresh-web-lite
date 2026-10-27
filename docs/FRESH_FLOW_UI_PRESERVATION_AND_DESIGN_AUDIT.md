# Fresh Flow UI Preservation & Design-to-Code Audit

**Status:** Repository-level audit baseline; visual/browser/device review is still required.
**Date:** 2026-10-27
**Repository:** `kanarafat54-boop/fresh-web-lite`
**Rule:** Preserve the existing universal Home and its navigation. Fresh Flow remains a separate route and product surface. No Home UI code is changed by this audit.

## Executive decision

Do **not** redesign or replace the current universal Home to fit the Fresh Flow Figma concept. Home already has a Fresh Flow quick-access card, and the route registry separately maps `fresh-flow` to `/fresh-flow`. The global Home is the platform anchor; Fresh Flow owns its own internal Home and media-world navigation.

The correct sequence is:
1. Preserve the current Home and navigation behavior.
2. Audit and refine the Fresh Flow route and the existing Figma frames against the running code.
3. Add prototype links and screen-level implementation mappings.
4. Change the global Home only if an independently evidenced bug or user-tested need is found; do not merge Fresh Flow into it.

## Code surfaces inspected

| Surface | Current evidence | Audit conclusion |
|---|---|---|
| Universal Home | `src/features/home/HomeDashboard.tsx` | Existing greeting, Ask Fresh AI, help panel, quick-access cards, optional search/feed and a Fresh Flow card. Preserve it. |
| Home styling | `src/features/home/HomeDashboard.css` | Responsive breakpoints and focus/reduced-motion rules exist. The file has multiple appended/overlapping style passes; inspect the computed styles in browser before changing layout. |
| Navigation model | `src/app/navigation/navModel.ts` | Home, Flow, Create, AI and other workspaces are separate navigation destinations; Flow uses a route prefix for active-state behavior. |
| Feature registry | `src/app/registry/FeatureRegistry.ts` | `feed` maps to `/`; `fresh-flow` maps to `/fresh-flow` and lazy-loads `FreshFlowHub`. This is the key separation boundary. |
| Fresh Flow hub | `src/features/fresh-flow/FreshFlowHub.tsx` | Has its own header, search, Flow Switch, theme, wallet/profile actions, six internal destinations, discovery chips, and contextual media surfaces. |
| Media-world model | `src/features/fresh-flow/core/freshFlowArchitecture.ts` | Defines Short, Long Videos, News/Posts, VR/AR, Podcasts and Others as extensible entry worlds; new formats must not require a redesign of the global Home. |
| Design contract | `docs/FRESH_FLOW_FIGMA_DESIGN_CONTRACT.md` | Documents 10 editable frames, implementation evidence requirements and the still-incomplete native prototype. |

## Existing Home: preservation checklist

- [x] Fresh Flow already has a Home quick-access card.
- [x] The Home route and Fresh Flow route are distinct registry entries.
- [x] Fresh Flow has its own internal Home and six media-world destinations.
- [x] The mobile primary navigation includes Flow as a separate destination.
- [ ] Visual check of the deployed Home at common Android widths.
- [ ] Browser test that Home → Flow → Flow Home → global Home works without losing route state or breaking the back button.
- [ ] Verify focus visibility, zoom/text scaling, touch targets and contrast in the actual browser.
- [ ] Check that the CSS cascade at 320, 360, 390 and 430 CSS-pixel widths matches intended layouts.

## Figma screen-to-code review matrix

Figma file: https://www.figma.com/design/b2kC0RCJAUxS7jLda1lAvB

| Existing Figma frame | Intended code surface | Status from repository inspection | Required next verification |
|---|---|---|---|
| Discover everything (390×844) | `FreshFlowHub`, media-world architecture, discovery/search surfaces | Partial mapping. The overview route currently renders `FreshFlowShortsExperience`; compare this carefully with the discovery-first design before changing either. | Inspect real frame and route screenshot; agree on the overview's primary content; test search, loading, empty, offline and retry. |
| Playback, your way (390×844) | Shorts experience and media workspace/renderers | Components exist; complete media delivery/playback journey not proven. | Test actual media, play/pause, seek, captions, resume, unsupported formats and failure recovery. |
| Live universe (390×844) | Live destination/provider/session adapter | Design contract requires a real provider/protocol; do not treat a UI shell as working live service. | Trace host/join/viewer states, permission denial, reconnect, captions, moderation and provider availability. |
| Live room · host & audience (390×844) | Live session lifecycle and room UI | Provider-dependent; production readiness unverified. | Verify host/viewer variants and real session events; remove any simulated viewer counts or success states. |
| Creator studio (390×844) | `/studio`, `StudioWorkspace`, creator publishing flow | Studio surface exists; persistence and end-to-end publishing need evidence. | Verify drafts, resumable uploads, processing state, publish authorization and post-publish appearance in Flow. |
| Identity & workspaces (390×844) | Fresh ID, profile, workspace switching and authorization | Identity/profile surfaces exist; role-specific access needs verification. | Test personal/creator/business/developer contexts; prove membership and server-side authorization; prevent user-editable privilege elevation. |
| Creator dashboard (390×844) | `/creation`, `CreatorStudioDashboard`, analytics and monetization | Dashboard surface exists; verified real metrics/earnings not proven. | Use persisted authorized metrics only; test empty state, eligibility, ledger states and error handling. |
| Developer console (1200×760) | Developer workspace/API credentials, projects, quotas, webhooks/logs | Exact complete screen-to-component mapping not established by this audit. | Locate route and API surfaces; verify scoped keys, one-time reveal, rotation/revocation, redacted logs and audit trail. |
| Admin operations (1200×760) | Admin panel, moderation, service/job health and audit | Basic admin surface exists; full operations console is documented as incomplete. | Verify server-side role gate, least privilege, moderation/appeals, audit records and live service health; no unrestricted private-data browsing. |
| Fresh AI assistant (390×844) | Fresh AI unified assistant and permissioned tools | UI surface exists; trained Fresh model/runtime and all assistant actions are not proven complete. | Verify truthful capability state, tool permissions, confirmation before sensitive actions, cancellation and error/retry states. |
| Creator monetization (390×844) | Wallet/treasury/payment rails and creator ledger | UI/foundations exist; production payout readiness is not proven. | Verify supported provider/country, fees, eligibility, idempotency, reconciliation, refunds/chargebacks and actual settlement evidence. |

## Cross-screen quality gates

Every screen must be checked against:
- Small-screen widths: 320, 360, 390 and 430 CSS px; landscape and responsive desktop where relevant.
- WCAG 2.2 AA target: contrast, scalable text, semantic names, keyboard/focus order, touch-target size, reduced motion, captions/transcripts, alt text and localization/RTL.
- States: loading, empty, offline/slow network, denied permission, unsupported format/device, validation, server error, retry, processing and success confirmed by the real service.
- Navigation: entry, back, route switching, refresh/deep link, session expiry and preserving appropriate state.
- Data integrity: no fabricated viewers, metrics, balances, earnings, publishing success or live state.
- Security: server-side authorization, role separation, workspace membership, RLS/API checks, secret redaction and auditable privileged actions.

## Known risks to resolve before visual redesign

1. **Do not merge the two Homes.** The global Home is `feed` and the Flow Home is `fresh-flow`; preserve both.
2. **Home CSS has layered style passes.** The stylesheet contains repeated declarations and media-query overrides. Do not rewrite wholesale; capture computed styles/screenshots first and make the smallest targeted changes.
3. **Design vs. implementation may differ.** The Figma overview frame is named “Discover everything”, while the current Flow overview route renders the Shorts experience. This needs a deliberate product decision after inspecting the real frame and running UI—not an automatic Home rewrite.
4. **Prototype is not finished.** The design contract records that native screen-to-screen prototype transitions were not completed. A frame or clickable-looking control is not evidence of a working prototype or product feature.
5. **Figma inspection is currently rate-limited.** The last MCP attempt returned the Starter-plan call-limit message. This audit therefore uses repository code and the checked-in design contract, not a claim of a fresh visual inspection of Figma.
6. **Production is not visually verified by this document.** No deployed browser/device test is claimed here.

## Exit criteria

This audit can be marked complete only after:
- The actual Figma frames are reviewed at full resolution.
- Native prototype transitions are created and tested.
- Each of the 10 frames has an explicit route/component/API contract and a capability status.
- Screenshots and accessibility results are captured at the target viewport sizes.
- Changes are limited to Fresh Flow and genuinely evidenced defects; the universal Home remains unchanged unless a separate, approved finding justifies a change.
- Automated checks and production/device smoke tests pass for the changed user journeys.

