import { useMemo, useState } from "react";
import { findMatches, type ConnectionProfile, type ConnectionQuery } from "../../core/connections";
import "./WorkspacePage.css";

const SIGNALS = ["interests", "skills", "goals", "communities", "projects", "professional"] as const;

const policy = {
  discoverable: true,
  scope: "global" as const,
  allowedSignals: [...SIGNALS],
  allowInboundRequests: true,
  allowOutboundRequests: true,
};

const viewer: ConnectionProfile = {
  userId: "me",
  policy,
  signals: {
    interests: ["AI", "Design", "Startups"],
    skills: ["TypeScript", "Product"],
    goals: ["Build Fresh", "Find collaborators"],
    communities: ["Builders", "Creators"],
    projects: ["Fresh Web Lite"],
    professional: ["Founder"],
  },
  intents: ["collaboration"],
};

const candidates: ConnectionProfile[] = [
  {
    userId: "u1",
    policy,
    signals: { interests: ["AI", "Design"], skills: ["TypeScript"], goals: ["Build products"], professional: ["Engineer"] },
    intents: ["collaboration"],
  },
  {
    userId: "u2",
    policy,
    signals: { interests: ["Startups"], communities: ["Creators"], goals: ["Grow audience"], professional: ["Creator"] },
    intents: ["community"],
  },
  {
    userId: "u3",
    policy,
    signals: { skills: ["Design"], projects: ["Fresh Academy"], professional: ["Designer"] },
    intents: ["collaboration"],
  },
];

const query: ConnectionQuery = { viewerId: "me", minimumScore: 1, signals: [...SIGNALS] };

export default function CommunicationWorkspace() {
  const [sent, setSent] = useState<Record<string, boolean>>({});
  const matches = useMemo(() => findMatches(viewer, candidates, query), []);

  return (
    <section className="workspace-page" aria-label="Communication workspace">
      <header className="workspace-hero">
        <span className="workspace-eyebrow">Connect · Discover · Message</span>
        <h1>Fresh Connect</h1>
        <p>
          Discover people, communities, and collaborators based on shared signals and intents.
          The match engine scores compatibility from your allowed signals — you stay in control.
        </p>
      </header>

      <section className="workspace-section">
        <h2>Suggested connections</h2>
        {matches.length === 0 ? (
          <p className="workspace-empty">No matches yet. Broaden your discovery policy to see more people.</p>
        ) : (
          <ul className="workspace-list">
            {matches.map((m) => (
              <li key={m.userId}>
                <h3>{m.userId}</h3>
                <p>{m.reasons.join(" · ") || "Compatible profile"}</p>
                <div className="workspace-meta">
                  <span className="workspace-pill">{m.overallScore}% match</span>
                  <span className="workspace-badge">confidence {Math.round(m.confidence * 100)}%</span>
                  {sent[m.userId] ? (
                    <span className="workspace-badge">Request sent</span>
                  ) : (
                    <button className="workspace-badge" onClick={() => setSent((s) => ({ ...s, [m.userId]: true }))}>
                      Connect
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </section>
  );
}
