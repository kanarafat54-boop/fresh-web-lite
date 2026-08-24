import { useEffect, useMemo, useState } from "react";
import { findMatches, type ConnectionProfile, type ConnectionQuery } from "../../core/connections";
import { supabase } from "../../lib/supabase";
import { getConnectionRequest, sendConnectionRequest } from "./connectionService";
import "./WorkspacePage.css";

const SIGNALS = ["interests", "skills", "goals", "communities", "projects", "professional", "location"] as const;

type ProfileRow = {
  user_id: string;
  bio: string;
  location: string | null;
  occupation: string | null;
  company: string | null;
};

const policy = {
  discoverable: true,
  scope: "global" as const,
  allowedSignals: [...SIGNALS],
  allowInboundRequests: true,
  allowOutboundRequests: true,
};

const words = (value: string | null | undefined): string[] =>
  (value ?? "")
    .split(/[,.;|\n]+/)
    .map((item) => item.trim())
    .filter(Boolean);

const toProfile = (row: ProfileRow): ConnectionProfile => ({
  userId: row.user_id,
  policy,
  signals: {
    interests: words(row.bio),
    skills: words(row.occupation),
    goals: words(row.bio),
    communities: words(row.company),
    projects: words(row.company),
    professional: words(row.occupation),
    location: words(row.location),
  },
  intents: ["collaboration", "professional"],
});

export default function CommunicationWorkspace() {
  const [viewer, setViewer] = useState<ConnectionProfile | null>(null);
  const [candidates, setCandidates] = useState<ConnectionProfile[]>([]);
  const [sent, setSent] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const { data: authData, error: authError } = await supabase.auth.getUser();
        if (authError) throw authError;
        if (!authData.user) throw new Error("Sign in to use Fresh Connect.");

        const { data, error: profileError } = await supabase
          .from("profile_details")
          .select("user_id, bio, location, occupation, company")
          .eq("visibility", "public");
        if (profileError) throw profileError;

        const profiles = ((data ?? []) as ProfileRow[]).map(toProfile);
        const current = profiles.find((profile) => profile.userId === authData.user.id);

        if (active) {
          setViewer(current ?? null);
          setCandidates(profiles.filter((profile) => profile.userId !== authData.user.id));
        }
      } catch (cause) {
        if (active) setError(cause instanceof Error ? cause.message : "Unable to load Fresh Connect.");
      } finally {
        if (active) setLoading(false);
      }
    };

    void load();
    return () => {
      active = false;
    };
  }, []);

  const query: ConnectionQuery | null = viewer
    ? { viewerId: viewer.userId, minimumScore: 1, signals: [...SIGNALS] }
    : null;
  const matches = useMemo(
    () => (viewer && query ? findMatches(viewer, candidates, query) : []),
    [viewer, candidates, query],
  );

  const connect = async (recipientId: string) => {
    setError(null);
    try {
      await sendConnectionRequest(recipientId);
      setSent((current) => ({ ...current, [recipientId]: true }));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to send connection request.");
    }
  };

  useEffect(() => {
    if (matches.length === 0) return;
    let active = true;
    const loadRequestStates = async () => {
      const states = await Promise.all(
        matches.map(async (match) => {
          try {
            const request = await getConnectionRequest(match.userId);
            return [match.userId, request?.status === "pending"] as const;
          } catch {
            return [match.userId, false] as const;
          }
        }),
      );
      if (active) setSent(Object.fromEntries(states));
    };
    void loadRequestStates();
    return () => {
      active = false;
    };
  }, [matches]);

  return (
    <section className="workspace-page" aria-label="Communication workspace">
      <header className="workspace-hero">
        <span className="workspace-eyebrow">Connect · Discover · Message</span>
        <h1>Fresh Connect</h1>
        <p>
          Discover real Fresh profiles using permitted signals. Connection requests are authenticated
          and persisted in Supabase rather than simulated in local UI state.
        </p>
      </header>

      <section className="workspace-section">
        <h2>Suggested connections</h2>
        {loading ? (
          <p className="workspace-empty">Loading real profiles…</p>
        ) : error ? (
          <p className="workspace-empty" role="alert">{error}</p>
        ) : !viewer ? (
          <p className="workspace-empty">Complete your public profile before Fresh can calculate matches.</p>
        ) : matches.length === 0 ? (
          <p className="workspace-empty">No eligible public profiles match your current signals yet.</p>
        ) : (
          <ul className="workspace-list">
            {matches.map((match) => (
              <li key={match.userId}>
                <h3>{match.userId}</h3>
                <p>{match.reasons.join(" · ") || "Compatible profile"}</p>
                <div className="workspace-meta">
                  <span className="workspace-pill">{match.overallScore}% match</span>
                  <span className="workspace-badge">confidence {Math.round(match.confidence * 100)}%</span>
                  {sent[match.userId] ? (
                    <span className="workspace-badge">Request pending</span>
                  ) : (
                    <button className="workspace-badge" onClick={() => void connect(match.userId)}>
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
