# Fresh AI UI/UX Design Constitution

**Status:** Design authority — pre-implementation
**Scope:** Fresh AI product experience across mobile, tablet, desktop, and future device surfaces
**Implementation rule:** This document defines the experience before UI code is changed. It does not authorize visual implementation by itself.

## 1. Purpose

Fresh AI must feel like a serious universal intelligence workspace, not a chatbot skin and not a collection of feature buttons.

The experience must make one sovereign intelligence foundation feel simple at first contact while allowing professional users to reach deep capability without navigating a maze.

The design target is not to imitate an existing product. Familiar interaction patterns may be used where they reduce learning cost, but Fresh AI must establish its own visual language, interaction model, trust model, and spatial hierarchy.

## 2. North-Star Experience

**One intelligence. One context. One workspace. Many capabilities.**

The user should be able to move naturally between conversation, research, creation, files, coding, analysis, memory, planning, and action without feeling that they entered unrelated applications.

Fresh AI should continuously answer four questions:

1. What does Fresh understand about the current task?
2. What can it do here?
3. What is it doing now?
4. What requires the user's approval or attention?

## 3. The Fresh AI Mental Model

Fresh AI is organized around three layers:

### Layer A — Conversation
The natural-language surface where the user speaks, types, attaches, points, or otherwise expresses intent.

### Layer B — Capability
The intelligence capability selected or inferred from the intent: research, creation, files, code, data, voice, knowledge, projects, tasks, media, and so on.

### Layer C — Execution
The controlled runtime that retrieves information, reasons, creates artifacts, invokes tools, verifies outcomes, requests approval, or stops safely.

The UI should expose these layers progressively rather than presenting them as three separate applications.

## 4. Fresh Identity: The Diamond Principle

The Fresh AI signature control is a **four-point intelligent diamond/crystal**.

The diamond is not decoration and must never be treated as jewelry. It represents a controlled intelligence surface.

The geometry should be:

- recognizable at tiny sizes;
- mathematically consistent across the design system;
- usable as an icon, button, status indicator, and larger workspace mark;
- visually distinctive without resembling a robot, chat bubble, or generic sparkle;
- accessible through shape, label, motion, and semantics rather than color alone.

The diamond should contain or reveal familiar symbols when a capability is active. Familiar symbols reduce learning cost; the diamond establishes Fresh identity.

## 5. Glass Language

Fresh glass is a **functional material language**, not a blur effect.

Glass surfaces must communicate hierarchy through:

- depth;
- translucency;
- edge definition;
- controlled reflection;
- subtle separation from the environment;
- motion tied to state;
- content priority.

Avoid excessive glass panels, permanent blur, neon overload, heavy gradients, ornamental borders, and visual noise.

The most important surface should always remain visually obvious even when many capabilities are available.

## 6. Glass Physics

Every glass surface should have a meaningful physical relationship to the content beneath or around it.

Define system-level tokens for:

- surface elevation;
- translucency;
- blur strength;
- border/edge strength;
- shadow depth;
- highlight intensity;
- corner geometry;
- interaction elevation;
- disabled depth;
- modal depth.

These must be centralized design tokens rather than individually tuned component effects.

## 7. One Composer, Many Abilities

Fresh AI should have one primary composer rather than separate input boxes for every capability.

The composer must support:

- text;
- voice;
- attachments;
- camera/context input;
- structured commands;
- multimodal continuation;
- capability discovery;
- approval requests;
- artifact continuation.

A user should be able to start with a sentence and finish with a researched answer, document, image, code change, analysis, or approved action without manually rebuilding context.

## 8. Progressive Disclosure

Fresh AI must be shallow for beginners and deep for professionals.

Default state: minimal controls.

Expanded state: contextual capabilities.

Advanced state: professional controls, execution details, evidence, artifacts, and configuration.

Do not display every available capability simply because it exists.

A capability becomes visible when it is relevant, requested, pinned, recently used, or intentionally discovered.

## 9. Capability Constellation

The diamond may open a capability constellation rather than a conventional crowded menu.

The constellation should be organized semantically, not alphabetically. For example:

- Understand — conversation, knowledge, memory;
- Find — search, research, files;
- Create — image, video, audio, documents, 3D;
- Build — code, projects, design;
- Analyze — data, comparison, vision;
- Act — tasks, automation, apps, work;
- Trust — verification, evidence, safety.

This is a conceptual information architecture. Exact visual treatment must be decided before implementation.

## 10. Context Is a First-Class Input

Fresh AI should understand the object currently in focus.

Possible context objects include:

- a conversation;
- document;
- image;
- video;
- dataset;
- project;
- codebase;
- research collection;
- profile;
- Fresh Flow item;
- task;
- workspace artifact.

The interface should communicate context without requiring the user to repeat it.

## 11. The Fresh Rail

Fresh AI may use a thin contextual rail for controls that matter **now**.

The rail should change with the active object and task rather than becoming a permanent feature toolbar.

Example conceptual behavior:

- document → summarize, compare, edit, cite;
- research → sources, evidence, verify, save;
- image → inspect, transform, describe, create;
- code → explain, test, review, modify;
- project → plan, tasks, files, agents.

The rail must remain subordinate to the primary work surface.

## 12. Adaptive Response Surfaces

Fresh AI should not force every result into a chat bubble.

The response surface should adapt to the result:

- conversation → readable answer;
- research → evidence workspace;
- comparison → structured comparison;
- code → coding workspace;
- data → analysis workspace;
- creation → artifact workspace;
- files → document intelligence surface;
- task → execution/approval surface;
- multi-step work → persistent workspace.

The conversation remains the continuity layer, not the only presentation format.

## 13. State Architecture

Fresh AI must have explicit, truthful states.

Core states:

- idle;
- understanding;
- retrieving;
- researching;
- reasoning/processing;
- creating;
- executing;
- verifying;
- completed;
- needs approval;
- partially completed;
- blocked;
- failed;
- interrupted;
- offline/unavailable.

Animation, labels, iconography, and affordances must derive from this state model.

Never display a fake thinking animation as evidence of hidden reasoning.

## 14. Trust and Truth Presentation

When Fresh AI uses evidence or verification, the UI should expose useful trust information without exposing proprietary chain-of-thought.

Useful information includes:

- what was checked;
- which sources or artifacts support the result;
- whether evidence conflicts;
- whether information may be stale;
- confidence or qualification where appropriate;
- whether an action was verified;
- why an action was blocked or requires approval.

The user should understand the reliability boundary without being shown private internal reasoning traces.

## 15. Execution and Approval

Any action capable of changing user state, external state, money, permissions, publication, deletion, or other consequential state must have a clear execution boundary.

The interface must distinguish:

**Suggested → Prepared → Awaiting approval → Executing → Verified.**

Approval must be understandable and specific. Avoid vague confirmations such as “Continue?” when the actual consequence can be named.

## 16. Professional Mode Without a Professional-Only UI

Professional users should gain power through depth, not clutter.

Advanced capabilities should become available through:

- keyboard shortcuts;
- command entry;
- contextual menus;
- pinned capabilities;
- reusable workflows;
- project context;
- persistent artifacts;
- automation;
- structured outputs.

The default surface should remain approachable.

## 17. Multimodal Continuity

Changing modality must not reset the user's mental context.

Examples:

- type → speak → attach image → continue typing;
- inspect image → create artifact → revise by voice;
- research → save evidence → ask follow-up by voice;
- code → show screenshot → request diagnosis.

The transition should feel like changing instruments inside one intelligence rather than switching products.

## 18. Spatial Memory

The workspace should preserve meaningful context across navigation.

When a user returns to a project, research task, document, or creation, Fresh AI should restore the relevant working state where permitted.

Spatial continuity must never become hidden state that surprises the user. The user should be able to see what context is active and clear or switch it deliberately.

## 19. Fresh AI as a Workspace, Not a Feed

Fresh AI must resist attention-optimization patterns that turn intelligence into an endless engagement loop.

Avoid:

- infinite AI recommendation feeds as the default;
- unnecessary notifications;
- artificial urgency;
- gamified intelligence usage;
- manipulative streaks;
- dark-pattern confirmations.

The goal is successful completion of the user's objective, not maximizing time spent inside Fresh AI.

## 20. Accessibility Is Architectural

Accessibility must be designed into the interaction model.

Every important state and action must work through:

- touch;
- keyboard;
- screen readers;
- voice;
- high-contrast presentation;
- reduced motion;
- scalable text;
- non-color state indicators.

Diamond/glass identity must never depend exclusively on visual effects.

## 21. Responsive Continuity

Mobile, tablet, desktop, and future device surfaces should share one information architecture while adapting their spatial composition.

Do not simply shrink desktop UI onto mobile.

Mobile prioritizes focus and reachability.

Tablet prioritizes flexible workspace composition.

Desktop prioritizes simultaneous context and professional workflows.

Future immersive surfaces may prioritize spatial context, but must preserve the same Fresh AI semantics.

## 22. Motion Constitution

Motion must communicate causality.

Use motion to show:

- opening/closing;
- state transition;
- focus transfer;
- object movement;
- execution progress;
- completion;
- interruption.

Do not use animation merely to make the interface look expensive.

Motion should be short, interruptible, accessible, and performance-conscious.

## 23. Icon Constitution

Icons must use familiar symbols whenever a familiar symbol exists.

The Fresh signature comes from the surrounding geometry, material, behavior, and composition — not from replacing every known symbol with an invented glyph.

Core symbol families should have consistent optical weight and geometry for:

- microphone;
- search;
- attachment;
- camera;
- creation;
- research/evidence;
- code;
- data;
- project;
- task;
- automation;
- verification;
- safety;
- memory;
- library;
- settings;
- identity.

## 24. Universal Invocation

Fresh AI should be reachable consistently across Fresh Web Lite.

The invocation should preserve:

- active user identity;
- current ecosystem;
- current object;
- current task;
- permission context;
- relevant history;
- capability availability.

The same intelligence should therefore feel present in Fresh ID, Fresh Flow, workspaces, search, creation, and other ecosystems without duplicating separate AI products.

## 25. Fresh ID Relationship

Fresh ID is the user's identity and ownership layer.

Fresh AI may use permitted identity/context information, but it must not silently expose private profile information or infer permissions from visual proximity alone.

The UI should make identity, account, privacy, and authorization boundaries understandable.

## 26. Fresh Flow Relationship

Fresh Flow is a media ecosystem, not the identity of Fresh AI.

Fresh AI may intelligently operate on Fresh Flow content where permitted:

- understand;
- search;
- summarize;
- translate;
- moderate;
- organize;
- create;
- analyze;
- recommend within user-controlled boundaries.

Fresh Flow should retain its own media experience while using the same Fresh AI foundation.

## 27. Empty, Loading, Error, and Recovery States

Every capability must have intentional states before visual implementation.

Empty states should explain what is possible and provide a useful next action.

Loading states should indicate actual work categories rather than fake activity.

Errors should explain:

- what failed;
- what was preserved;
- what the user can do next;
- whether retry is safe.

Recovery should preserve work whenever technically possible.

## 28. Capability Availability Truth

The UI must derive capability availability from the canonical Fresh AI runtime contract.

Never visually advertise a capability as executable when the runtime reports it as contracted, training-required, approval-required, unavailable, or otherwise non-executable.

A capability can be discoverable before it is executable, but its status must be truthful.

## 29. Sovereign Model Identity

The UI must treat `fresh-unified-1` as the canonical Fresh AI model identity.

Provider names must not appear as Fresh AI's hidden or alternate model identity.

External providers, if ever exposed as optional tools, must be clearly separated from Fresh AI itself and must never be silently substituted for the sovereign model.

## 30. No Secret Architecture Leakage

The public product experience must not expose:

- API keys;
- internal source paths;
- private implementation details;
- proprietary prompts;
- hidden chain-of-thought;
- internal credentials;
- infrastructure secrets;
- unnecessary internal service names.

Trust information should be useful and user-facing, not an architecture dump.

## 31. Design Token Architecture

Before component implementation, define a single token layer for:

- typography;
- spacing;
- radius;
- elevation;
- glass/material;
- icon sizing;
- control sizing;
- motion;
- focus states;
- accessibility states;
- breakpoints;
- light/dark themes;
- high-contrast variants.

Components should consume tokens rather than inventing local values.

## 32. Component Architecture

The future implementation should separate:

1. semantic capability state;
2. interaction state;
3. visual state;
4. platform adaptation.

The same capability must not require duplicated business logic for mobile and desktop.

UI components must consume canonical runtime contracts rather than recreating capability availability locally.

## 33. Performance Constitution

Visual sophistication must not compromise responsiveness.

Glass effects, motion, media previews, AI streams, and workspace transitions must degrade gracefully on constrained devices.

Prefer compositing-friendly effects, lazy rendering, virtualization, progressive media loading, and minimal persistent surfaces.

The interface should feel fast before it feels elaborate.

## 34. Security and Privacy by Interaction

Privacy should be visible when it matters.

Users should understand:

- what context Fresh AI can access;
- what files are in scope;
- what memory is being used;
- when an external connection is involved;
- what an action will change;
- how to revoke or clear access.

Privacy controls should be understandable without forcing users to become security engineers.

## 35. The Intelligence Contract

Every visible AI interaction must satisfy this sequence conceptually:

**Intent → Context → Capability → Permission → Execution → Verification → Result.**

If any required boundary fails, Fresh AI should stop or downgrade safely rather than pretending success.

## 36. The Five-Second Rule

Within approximately five seconds of first exposure, a new user should understand:

- where to ask Fresh AI something;
- where to speak;
- how to attach or provide context;
- where additional capabilities live;
- what the current context is.

Within deeper use, professionals should discover substantially more power without the first screen becoming a control panel.

## 37. The No-Decoration Rule

No visual element exists merely because it looks futuristic.

For every control or surface, design review must answer:

1. Why does it exist?
2. Why is it visible now?
3. What happens when activated?
4. Is the action executable?
5. What state does it enter?
6. What happens if it fails?
7. Can the user recover?
8. Is the same action already available elsewhere?

If these answers are weak, remove or redesign the element.

## 38. The Fresh AI Quality Bar

A design is not considered complete merely because it looks polished.

It must be:

- understandable;
- discoverable;
- truthful;
- accessible;
- responsive;
- reversible where appropriate;
- privacy-aware;
- capability-aware;
- platform-consistent;
- extensible;
- visually distinctive;
- operationally connected to the real runtime.

## 39. Pre-Implementation Gate

No major Fresh AI UI implementation should begin until these are agreed:

- diamond geometry;
- glass/material token system;
- icon family;
- composer architecture;
- capability discovery model;
- contextual rail behavior;
- response-surface taxonomy;
- state machine and motion language;
- trust/evidence presentation;
- approval patterns;
- responsive composition;
- accessibility rules;
- dark/light/high-contrast behavior;
- performance budgets;
- Fresh ID/Fresh Flow integration boundaries.

## 40. Final Design Principle

Fresh AI should feel like an instrument of human capability.

It should be calm when the task is simple, powerful when the task is complex, transparent when trust matters, cautious when action is consequential, and nearly invisible when intelligence is simply helping the user move forward.

**Do not build a prettier chatbot. Build the intelligence workspace of Fresh Web Lite.**
