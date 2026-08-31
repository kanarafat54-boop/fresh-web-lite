import AppLayout from "../layouts/AppLayout";

const destinations = [
  { id: "discover", label: "Discover", description: "Media, news, search and knowledge" },
  { id: "connect", label: "Connect", description: "Stories, groups, communities and messages" },
  { id: "create", label: "Create", description: "Create, publish, remix and build" },
  { id: "learn", label: "Learn", description: "Courses, research and skills" },
  { id: "move", label: "Move", description: "Wallet, ownership and commerce" },
  { id: "think", label: "Think", description: "Fresh AI, memory and automation" },
] as const;

export default function AppRoutes() {
  return (
    <AppLayout>
      <section className="fresh-home" aria-labelledby="fresh-home-title">
        <header>
          <p className="fresh-home-kicker">Fresh Web Lite</p>
          <h1 id="fresh-home-title">What do you want to do?</h1>
          <p>Six simple directions into a much larger connected system.</p>
        </header>

        <nav className="fresh-home-directions" aria-label="Fresh directions">
          {destinations.map((destination) => (
            <button
              key={destination.id}
              type="button"
              className="fresh-home-direction"
              aria-label={`${destination.label}: ${destination.description}`}
            >
              <span className="fresh-home-direction-title">{destination.label}</span>
              <span className="fresh-home-direction-description">{destination.description}</span>
            </button>
          ))}
        </nav>
      </section>
    </AppLayout>
  );
}
