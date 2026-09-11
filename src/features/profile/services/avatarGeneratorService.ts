/**
 * Real, honest procedural avatar generator -- deterministic geometric SVG
 * art, seeded by the user's identity plus a fresh nonce per regeneration.
 * This is NOT neural image generation and is never described as "AI" here;
 * no image-generation model exists anywhere in this codebase yet. If real
 * AI-generated avatars are wanted, that needs an actual image-gen API
 * integrated first, not a relabeled procedural pattern.
 */
const PALETTES: Array<[string, string]> = [
  ["#6f30ff", "#11a7e7"], ["#ff3b67", "#ffb238"], ["#14c79a", "#0aa6ff"],
  ["#f5a623", "#ff5a3c"], ["#9b5cff", "#4f8ef7"], ["#2dd4bf", "#6366f1"],
];

function hashSeed(seed: string): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash << 5) - hash + seed.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function seededRandom(seed: number) {
  let value = seed || 1;
  return () => {
    value = (value * 1103515245 + 12345) & 0x7fffffff;
    return value / 0x7fffffff;
  };
}

export function generateAvatarSvg(seedText: string): string {
  const rand = seededRandom(hashSeed(`${seedText}-${Date.now()}-${Math.random()}`));
  const palette = PALETTES[Math.floor(rand() * PALETTES.length)];
  const shapes = Array.from({ length: 5 }, () => ({
    cx: 20 + rand() * 60,
    cy: 20 + rand() * 60,
    r: 10 + rand() * 22,
    color: rand() > 0.5 ? palette[0] : palette[1],
    opacity: 0.55 + rand() * 0.35,
  }));
  const circles = shapes
    .map((s) => `<circle cx="${s.cx.toFixed(1)}" cy="${s.cy.toFixed(1)}" r="${s.r.toFixed(1)}" fill="${s.color}" opacity="${s.opacity.toFixed(2)}" />`)
    .join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><clipPath id="c"><circle cx="50" cy="50" r="50"/></clipPath></defs><g clip-path="url(#c)"><rect width="100" height="100" fill="#0b0d12"/>${circles}</g></svg>`;
}

export function svgToDataUrl(svg: string): string {
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}
