import EcosystemSurface from "./EcosystemSurface";

/** Discovery — FWL ecosystem #7 (was missing as a dedicated surface). */
export default function DiscoveryWorkspace() {
  return (
    <EcosystemSurface
      name="Discovery"
      eyebrow="Find · People · Knowledge · Opportunity"
      description="One place to find information, people, products, services, communities, and opportunities across Fresh."
      domains={[
        { id: "search", title: "Universal search", description: "Cross-ecosystem search entry (uses platform search when open).", status: "surface" },
        { id: "web", title: "Web discovery", description: "Connected web and research paths.", status: "pending" },
        { id: "news", title: "News", description: "News via Fresh Flow News/Posts.", status: "live" },
        { id: "places", title: "Places", description: "Places and location discovery.", status: "pending" },
        { id: "products", title: "Products", description: "Product discovery across Marketplace.", status: "surface" },
        { id: "services", title: "Services", description: "Service discovery and matching.", status: "pending" },
        { id: "people", title: "People", description: "Profiles and people search via Fresh ID.", status: "surface" },
        { id: "communities", title: "Communities", description: "Community discovery.", status: "surface" },
        { id: "knowledge", title: "Knowledge", description: "Knowledge library and research themes.", status: "pending" },
        { id: "ai-rec", title: "AI recommendations", description: "Intent-based suggestions from Fresh AI.", status: "surface" },
        { id: "opp", title: "Opportunity discovery", description: "Routes into the Opportunity Engine surface.", status: "surface" },
      ]}
      note="Discovery owns find-intent. Fresh Flow owns media; Marketplace owns commerce listings. This surface coordinates — it does not invent results."
    />
  );
}
