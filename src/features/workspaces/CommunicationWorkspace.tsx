import { useEffect, useMemo, useState } from "react";
import { findMatches, type ConnectionProfile, type ConnectionQuery } from "../../core/connections";
import { supabase } from "../../lib/supabase";
import {
  getConnectionRequest,
  sendConnectionRequest,
  cancelConnectionRequest,
  listIncomingRequests,
  respondToConnectionRequest,
  listAcceptedConnections,
  type ConnectionRequest,
} from "./connectionService";
import { listThread, sendMessage, markThreadRead, getUnreadCounts, type DirectMessage } from "./messagingService";
import { useFreshId } from "../fresh-id/context/FreshIdContext";
import { useLayout } from "../../app/contexts/useLayout";
import "./WorkspacePage.css";
import FreshMailPanel from "./FreshMailPanel";

const SIGNALS = ["interests", "skills", "goals", "communities", "projects", "professional", "location"] as const;

type ProfileRow = {
  user_id: string;
  bio: string;
  location: string | null;
  occupation: string | null;
  company: string | null;
};

type NameRow = { id: string; full_name: string | null; username: string | null };

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

function displayName(names: Record<string, NameRow>, userId: string): string {
  const row = names[userId];
  if (!row) return userId;
  return row.full_name?.trim() || (row.username ? `@${row.username}` : userId);
}

export default function CommunicationWorkspace() {
  const { setAuthView } = useFreshId();
  const { setActiveRoute } = useLayout();
  const [viewer, setViewer] = useState<ConnectionProfile | null>(null);
  const [candidates, setCandidates] = useState<ConnectionProfile[]>([]);
  const [names, setNames] = useState<Record<string, NameRow>>({});
  const [sent, setSent] = useState<Record<string, boolean>>({});
  const [incoming, setIncoming] = useState<ConnectionRequest[]>([]);
  const [acceptedIds, setAcceptedIds] = useState<string[]>([]);
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [needsAuth, setNeedsAuth] = useState(false);

  const [activeThreadUserId, setActiveThreadUserId] = useState<string | null>(null);
  const [threadMessages, setThreadMessages] = useState<DirectMessage[]>([]);
  const [messageDraft, setMessageDraft] = useState("");
  const [threadLoading, setThreadLoading] = useState(false);
  const [threadError, setThreadError] = useState<string | null>(null);
  const [myUserId, setMyUserId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    setNeedsAuth(false);
    try {
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError) throw authError;
      if (!authData.user) {
        setNeedsAuth(true);
        setError("Sign in with Fresh ID to discover people, send requests, and message.");
        setLoading(false);
        return;
      }
      setMyUserId(authData.user.id);

      const { data, error: profileError } = await supabase
        .from("profile_details")
        .select("user_id, bio, location, occupation, company")
        .eq("visibility", "public");
      if (profileError) throw profileError;

      const profiles = ((data ?? []) as ProfileRow[]).map(toProfile);
      const current = profiles.find((profile) => profile.userId === authData.user.id);
      const others = profiles.filter((profile) => profile.userId !== authData.user.id);

      const [incomingRequests, accepted, unread] = await Promise.all([
        listIncomingRequests(),
        listAcceptedConnections(),
        getUnreadCounts(),
      ]);

      const nameIds = new Set<string>([
        authData.user.id,
        ...others.map((p) => p.userId),
        ...incomingRequests.map((r) => r.requester_id),
        ...accepted,
      ]);

      let nameMap: Record<string, NameRow> = {};
      if (nameIds.size > 0) {
        const { data: nameRows, error: nameError } = await supabase
          .from("users")
          .select("id, full_name, username")
          .in("id", Array.from(nameIds));
        if (nameError) throw nameError;
        nameMap = Object.fromEntries(((nameRows ?? []) as NameRow[]).map((row) => [row.id, row]));
      }

      setViewer(current ?? null);
      setCandidates(others);
      setNames(nameMap);
      setIncoming(incomingRequests);
      setAcceptedIds(accepted);
      setUnreadCounts(unread);
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : "Unable to load Fresh Connect.";
      setError(message);
      if (/sign in|auth|session|missing/i.test(message)) setNeedsAuth(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
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

  const respond = async (requesterId: string, accept: boolean) => {
    setError(null);
    try {
      await respondToConnectionRequest(requesterId, accept);
      setIncoming((current) => current.filter((r) => r.requester_id !== requesterId));
      if (accept) setAcceptedIds((current) => [...current, requesterId]);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to respond to request.");
    }
  };

  const openThread = async (otherUserId: string) => {
    setActiveThreadUserId(otherUserId);
    setThreadError(null);
    setThreadLoading(true);
    try {
      const messages = await listThread(otherUserId);
      setThreadMessages(messages);
      await markThreadRead(otherUserId);
      setUnreadCounts((current) => ({ ...current, [otherUserId]: 0 }));
    } catch (cause) {
      setThreadError(cause instanceof Error ? cause.message : "Unable to load messages.");
    } finally {
      setThreadLoading(false);
    }
  };

  const send = async () => {
    if (!activeThreadUserId) return;
    setThreadError(null);
    try {
      const message = await sendMessage(activeThreadUserId, messageDraft);
      setThreadMessages((current) => [...current, message]);
      setMessageDraft("");
    } catch (cause) {
      setThreadError(cause instanceof Error ? cause.message : "Unable to send message.");
    }
  };

  return (
    <section className="workspace-page" aria-label="Communication workspace">
      <header className="workspace-hero">
        <span className="workspace-eyebrow">Connect · Discover · Message</span>
        <h1>Fresh Connect</h1>
        <p>
          Discover real Fresh profiles using permitted signals. Connection requests and messages are authenticated and
          persisted in Supabase rather than simulated in local UI state.
        </p>
      </header>

      <FreshMailPanel />

      {error && (
        <div className="workspace-empty" role="alert" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <p style={{ margin: 0 }}>{error}</p>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {needsAuth && (
              <button
                type="button"
                className="workspace-pill"
                onClick={() => {
                  setAuthView("form");
                  setActiveRoute("auth-signin");
                }}
              >
                Sign in
              </button>
            )}
            <button type="button" className="workspace-badge" onClick={() => void load()}>
              Retry
            </button>
            <button type="button" className="workspace-badge" onClick={() => setActiveRoute("fresh-flow")}>
              Explore Flow
            </button>
          </div>
        </div>
      )}

      {incoming.length > 0 && (
        <section className="workspace-section">
          <h2>Requests waiting on you</h2>
          <ul className="workspace-list">
            {incoming.map((request) => (
              <li key={request.id}>
                <h3>{displayName(names, request.requester_id)}</h3>
                <div className="workspace-meta">
                  <button type="button" className="workspace-badge" onClick={() => void respond(request.requester_id, true)}>
                    Accept
                  </button>
                  <button type="button" className="workspace-badge" onClick={() => void respond(request.requester_id, false)}>
                    Decline
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="workspace-section">
        <h2>Suggested connections</h2>
        {loading ? (
          <p className="workspace-empty">Loading real profiles…</p>
        ) : needsAuth ? (
          <p className="workspace-empty">Sign in to see people you can connect with.</p>
        ) : !viewer ? (
          <p className="workspace-empty">Complete your public profile before Fresh can calculate matches.</p>
        ) : matches.length === 0 ? (
          <p className="workspace-empty">No eligible public profiles match your current signals yet.</p>
        ) : (
          <ul className="workspace-list">
            {matches.map((match) => (
              <li key={match.userId}>
                <h3>{displayName(names, match.userId)}</h3>
                <p>{match.reasons.join(" · ") || "Compatible profile"}</p>
                <div className="workspace-meta">
                  <span className="workspace-pill">{match.overallScore}% match</span>
                  <span className="workspace-badge">confidence {Math.round(match.confidence * 100)}%</span>
                  {acceptedIds.includes(match.userId) ? (
                    <button type="button" className="workspace-badge" onClick={() => void openThread(match.userId)}>
                      Message
                    </button>
                  ) : sent[match.userId] ? (
                    <button
                      type="button"
                      className="workspace-badge"
                      onClick={() =>
                        void cancelConnectionRequest(match.userId).then(() =>
                          setSent((c) => ({ ...c, [match.userId]: false })),
                        )
                      }
                    >
                      Request pending · Cancel
                    </button>
                  ) : (
                    <button type="button" className="workspace-badge" onClick={() => void connect(match.userId)}>
                      Connect
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {acceptedIds.length > 0 && (
        <section className="workspace-section">
          <h2>Messages</h2>
          <div className="workspace-grid">
            {acceptedIds.map((id) => (
              <button
                key={id}
                type="button"
                className={`workspace-card ${activeThreadUserId === id ? "workspace-pill" : ""}`}
                onClick={() => void openThread(id)}
              >
                <h3>
                  {displayName(names, id)}
                  {unreadCounts[id] ? ` (${unreadCounts[id]})` : ""}
                </h3>
              </button>
            ))}
          </div>

          {activeThreadUserId && (
            <div className="workspace-card" style={{ marginTop: 12 }}>
              <h3>{displayName(names, activeThreadUserId)}</h3>
              {threadLoading ? (
                <p className="workspace-empty">Loading messages…</p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 300, overflowY: "auto" }}>
                  {threadMessages.length === 0 ? (
                    <p className="workspace-empty">No messages yet. Say hello.</p>
                  ) : (
                    threadMessages.map((m) => (
                      <div
                        key={m.id}
                        style={{
                          alignSelf: m.sender_id === myUserId ? "flex-end" : "flex-start",
                          background: m.sender_id === myUserId ? "var(--surface-2)" : "transparent",
                          border: "1px solid var(--border)",
                          borderRadius: 8,
                          padding: "6px 10px",
                          maxWidth: "80%",
                        }}
                      >
                        <p style={{ margin: 0 }}>{m.body}</p>
                        <small style={{ opacity: 0.6 }}>{new Date(m.created_at).toLocaleTimeString()}</small>
                      </div>
                    ))
                  )}
                </div>
              )}

              {threadError && (
                <div className="workspace-empty" role="alert" style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                  <span>{threadError}</span>
                  <button type="button" className="workspace-badge" onClick={() => void openThread(activeThreadUserId)}>
                    Retry
                  </button>
                </div>
              )}

              <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                <input
                  value={messageDraft}
                  onChange={(e) => setMessageDraft(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && void send()}
                  placeholder="Write a message…"
                  aria-label="Write a message"
                  style={{
                    flex: 1,
                    background: "var(--surface-2)",
                    border: "1px solid var(--border)",
                    borderRadius: 8,
                    color: "var(--text)",
                    padding: "8px 10px",
                  }}
                />
                <button type="button" className="workspace-pill" onClick={() => void send()}>
                  Send
                </button>
              </div>
            </div>
          )}
        </section>
      )}
    </section>
  );
}
