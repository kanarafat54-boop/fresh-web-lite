import { HOME_ECOSYSTEMS } from "./productJourney";
import "./HomeEcosystemGrid.css";

type Props = {
  onOpen: (route: string) => void;
};

/**
 * Mockup panels 4 & 7 — ecosystem tiles on Main / Full Home
 */
export default function HomeEcosystemGrid({ onOpen }: Props) {
  return (
    <section className="fwl-eco-grid" aria-label="Top ecosystems">
      <div className="fwl-eco-grid__head">
        <div>
          <span className="fwl-eco-grid__eyebrow">TOP ECOSYSTEMS</span>
          <h2>Explore 32 ecosystems</h2>
        </div>
        <button type="button" onClick={() => onOpen("discovery")}>
          See all
        </button>
      </div>
      <div className="fwl-eco-grid__tiles">
        {HOME_ECOSYSTEMS.map((eco) => (
          <button
            key={eco.id}
            type="button"
            className={`fwl-eco-tile tone-${eco.tone}`}
            onClick={() => onOpen(eco.route)}
          >
            <span className="fwl-eco-tile__dot" aria-hidden="true" />
            <strong>{eco.label}</strong>
          </button>
        ))}
      </div>
    </section>
  );
}
