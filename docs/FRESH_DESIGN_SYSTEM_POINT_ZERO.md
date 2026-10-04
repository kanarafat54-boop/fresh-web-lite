# Fresh Design System — Point 0

## Contract
**Design rules → tokens → primitives → icons → surfaces → ecosystems.**

The design system is the platform-wide visual and interaction contract. Ecosystems consume it; they do not fork it.

## Principles
- Universal: one platform, personalized representation.
- Simple: expose the smallest useful interface for the current intent.
- Consistent: one meaning, one canonical pattern.
- Adaptive: device, network, language and accessibility change representation, not meaning.
- Accessible: touch, keyboard, voice, camera and assistive input are first-class.
- Fast: lightweight primitives and progressive enhancement.
- Trustworthy: permissions, states, consequences and recovery are understandable.
- Authentic: optimize for usefulness and genuine engagement.
- Extensible: new capabilities consume shared primitives.

## Canonical contracts
- Minimum interactive target: 44px.
- Visible focus-visible treatment is required.
- Reduced motion must be respected.
- Icon-only controls require an accessible name.
- Essential meaning must not depend on color alone.
- Native HTML semantics come before ARIA.
- Primary content flows are vertical by default on small screens.
- Public startup branding is Fresh Web Lite; personal identity belongs in Fresh ID/Profile/Personal Space.

## Icon policy
`src/core/design/icons/registry.ts` owns semantic meaning. `src/components/Icons.tsx` remains a compatibility surface until consumers are migrated. New icons must be added to the registry first and must not introduce synonymous meanings.

## Surface policy
Advanced capability should remain discoverable without overwhelming the default experience. Implementation details, secrets and internal architecture never become user-facing UI.

## Evolution
Token changes are global changes. Primitive changes must preserve semantic meaning across ecosystems. Ecosystem-specific styling is allowed only when it does not create a competing visual language.
