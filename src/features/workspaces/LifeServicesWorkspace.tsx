import EcosystemSurface from "./EcosystemSurface";

/** Digital Life Services — FWL ecosystem #12 (was missing from registry). */
export default function LifeServicesWorkspace() {
  return (
    <EcosystemSurface
      name="Digital Life Services"
      eyebrow="Everyday life · Location-aware"
      description="Connect Fresh with travel, food, transport, stays, events, and local services — without leaving your Fresh ID."
      domains={[
        { id: "travel", title: "Travel", description: "Trips, itineraries, and travel planning.", status: "pending" },
        { id: "food", title: "Food", description: "Dining, delivery, and local food discovery.", status: "pending" },
        { id: "transport", title: "Transportation", description: "Rides, routes, and mobility options.", status: "pending" },
        { id: "stay", title: "Accommodation", description: "Stays and lodging discovery.", status: "pending" },
        { id: "events", title: "Events", description: "Local and global events near you.", status: "pending" },
        { id: "local", title: "Local services", description: "Nearby services and lifestyle needs.", status: "pending" },
        { id: "maps", title: "Maps & location", description: "Location-aware discovery and planning.", status: "pending" },
        { id: "plan", title: "Personal planning", description: "Day plans, reservations, reminders.", status: "pending" },
      ]}
      note="Surface is live so this ecosystem is navigable. Providers and bookings are not connected yet — no fake reservations."
    />
  );
}
