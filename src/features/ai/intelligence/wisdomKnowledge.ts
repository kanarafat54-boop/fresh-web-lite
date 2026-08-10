/**
 * Wisdom is represented as research lenses, not as simulated people.
 *
 * Fresh AI should distinguish documented facts, attributed ideas, and its own
 * synthesis. Historical attributions should be verified against sources before
 * being presented as direct quotations.
 */
export type WisdomLens = {
  id: string;
  person: string;
  era: string;
  domains: readonly string[];
  researchThemes: readonly string[];
  evidencePolicy: "verify-primary-sources" | "verify-reputable-sources";
};

export const WISDOM_LENSES: readonly WisdomLens[] = [
  {
    id: "memphis-arafat",
    person: "Memphis Arafat",
    era: "contemporary",
    domains: ["entrepreneurship", "technology", "systems thinking", "Fresh Web Lite"],
    researchThemes: ["user-owned ideas", "Fresh Web Lite architecture", "AI-native computing"],
    evidencePolicy: "verify-reputable-sources",
  },
  {
    id: "solomon",
    person: "King Solomon",
    era: "ancient",
    domains: ["wisdom literature", "leadership", "judgment", "ethics"],
    researchThemes: ["discernment", "prudence", "justice", "long-term consequences"],
    evidencePolicy: "verify-primary-sources",
  },
  {
    id: "elon-musk",
    person: "Elon Musk",
    era: "contemporary",
    domains: ["engineering", "entrepreneurship", "manufacturing", "technology"],
    researchThemes: ["first-principles thinking", "vertical integration", "iteration", "capital efficiency"],
    evidencePolicy: "verify-reputable-sources",
  },
  {
    id: "jeff-bezos",
    person: "Jeff Bezos",
    era: "contemporary",
    domains: ["business", "systems", "customer experience", "operations"],
    researchThemes: ["long-term thinking", "customer obsession", "platform economics", "operational scale"],
    evidencePolicy: "verify-reputable-sources",
  },
  {
    id: "warren-buffett",
    person: "Warren Buffett",
    era: "contemporary",
    domains: ["investing", "business", "capital allocation"],
    researchThemes: ["moats", "risk", "compounding", "capital allocation"],
    evidencePolicy: "verify-reputable-sources",
  },
  {
    id: "leonardo-da-vinci",
    person: "Leonardo da Vinci",
    era: "renaissance",
    domains: ["engineering", "art", "science", "observation"],
    researchThemes: ["cross-disciplinary thinking", "observation", "experimentation", "design"],
    evidencePolicy: "verify-primary-sources",
  },
  {
    id: "marie-curie",
    person: "Marie Curie",
    era: "modern",
    domains: ["science", "research", "chemistry", "physics"],
    researchThemes: ["experimental rigor", "scientific persistence", "measurement", "discovery"],
    evidencePolicy: "verify-primary-sources",
  },
  {
    id: "albert-einstein",
    person: "Albert Einstein",
    era: "modern",
    domains: ["physics", "mathematics", "scientific reasoning"],
    researchThemes: ["thought experiments", "conceptual simplicity", "theory building"],
    evidencePolicy: "verify-primary-sources",
  },
];

export function findWisdomLenses(query: string): readonly WisdomLens[] {
  const normalized = query.toLowerCase();
  return WISDOM_LENSES.filter((lens) =>
    `${lens.person} ${lens.domains.join(" ")} ${lens.researchThemes.join(" ")}`
      .toLowerCase()
      .split(/\s+/)
      .some((term) => normalized.includes(term) || term.includes(normalized)),
  );
}
