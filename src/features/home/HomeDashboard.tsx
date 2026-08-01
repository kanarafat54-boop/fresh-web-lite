import { useState } from "react";
import {
  AIIcon,
  WalletIcon,
  FilmIcon,
  SearchIcon
} from "../../components/Icons";

export default function HomeDashboard() {

  const [active, setActive] = useState("");

  const cards = [
    {
      title:"Fresh AI",
      text:"Your intelligent digital assistant",
      icon:<AIIcon size={30}/>,
      color:"ai"
    },
    {
      title:"Fresh Wallet",
      text:"Your digital economy",
      icon:<WalletIcon size={30}/>,
      color:"wallet"
    },
    {
      title:"Creator Studio",
      text:"Create and publish",
      icon:<FilmIcon size={30}/>,
      color:"creator"
    },
    {
      title:"Smart Search",
      text:"Discover with AI",
      icon:<SearchIcon size={30}/>,
      color:"search"
    }
  ];

  return (
    <div className="home-dashboard">

      <section className="welcome-card">
        <AIIcon size={36}/>
        <div>
          <h2>Fresh Web Lite</h2>
          <p>Your personal digital ecosystem.</p>
        </div>
      </section>


      <section className="dashboard-grid">

      {cards.map(card => (
        <button
          key={card.title}
          className={`dashboard-card ${card.color}`}
          onClick={() => setActive(card.title)}
        >
          {card.icon}
          <h3>{card.title}</h3>
          <p>{card.text}</p>
        </button>
      ))}

      </section>


      {active && (
        <div className="module-preview">
          Opening <strong>{active}</strong>...
        </div>
      )}

    </div>
  );
}
