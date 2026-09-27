import EcosystemSurface from "./EcosystemSurface";

/** Opportunity Engine — part of Fresh Intelligence; was missing as a surface. */
export default function OpportunityWorkspace() {
  return (
    <EcosystemSurface
      name="Opportunity Engine"
      eyebrow="Intelligence · Goals · Matches"
      description="Surface opportunities aligned to your goals, skills, and context — jobs, collabs, learning, commerce, and community — without spam."
      domains={[
        { id: "goals", title: "Goal alignment", description: "Match opportunities to stated goals and Fresh context.", status: "pending" },
        { id: "work", title: "Work & freelancing", description: "Roles and gigs from Work ecosystem signals.", status: "pending" },
        { id: "learn", title: "Learning paths", description: "Courses and skills tied to your trajectory.", status: "pending" },
        { id: "create", title: "Creator collabs", description: "Collaboration and campaign matches.", status: "pending" },
        { id: "trade", title: "Commerce", description: "Relevant listings and service demand.", status: "pending" },
        { id: "community", title: "Community", description: "Groups and events that fit interests.", status: "pending" },
        { id: "trust", title: "Trust filter", description: "Only surface matches that pass Trust signals.", status: "pending" },
        { id: "notify", title: "Quiet alerts", description: "Optional notifications — never invented urgency.", status: "pending" },
      ]}
      note="No invented opportunities. When the engine is connected, matches will come from real Work, Marketplace, Learning, and Community data plus user goals."
    />
  );
}
