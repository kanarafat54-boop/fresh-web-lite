import { useCallback, useEffect, useState, type FormEvent } from "react";
import { supabase } from "../../lib/supabase";
import "./FreshMailPanel.css";

type Mailbox = { email_address: string; status: string };
type MailMessage = {
  id: string;
  direction: "inbound" | "outbound";
  from_address: string;
  to_addresses: string[];
  subject: string;
  text_body: string;
  status: string;
  created_at: string;
  sent_at: string | null;
  received_at: string | null;
};
type MailApiResponse = {
  ok?: boolean;
  error?: string;
  messages?: MailMessage[];
  mailbox?: Mailbox | null;
  status?: string;
};

function makeIdempotencyKey(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `mail-${Date.now()}-${Math.random().toString(36).slice(2, 14)}`;
}

export default function FreshMailPanel() {
  const [messages, setMessages] = useState<MailMessage[]>([]);
  const [mailbox, setMailbox] = useState<Mailbox | null>(null);
  const [toDraft, setToDraft] = useState("");
  const [subjectDraft, setSubjectDraft] = useState("");
  const [textDraft, setTextDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [needsAuth, setNeedsAuth] = useState(false);
  const [retryKey, setRetryKey] = useState<string | null>(null);
  const [localPartDraft, setLocalPartDraft] = useState("");
  const [provisioning, setProvisioning] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) throw sessionError;
      const token = sessionData.session?.access_token;
      if (!token) {
        setNeedsAuth(true);
        setMessages([]);
        setMailbox(null);
        setError("Sign in with Fresh ID to use external email.");
        return;
      }
      setNeedsAuth(false);
      const response = await fetch("/api/mail", {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      const payload = await response.json().catch(() => ({})) as MailApiResponse;
      if (!response.ok) throw new Error(payload.error || "Fresh Mail could not load.");
      setMessages(payload.messages ?? []);
      setMailbox(payload.mailbox ?? null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Fresh Mail could not load.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const provisionMailbox = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (provisioning || mailbox) return;
    setProvisioning(true);
    setError(null);
    setNotice(null);
    try {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) throw sessionError;
      const token = sessionData.session?.access_token;
      if (!token) {
        setNeedsAuth(true);
        throw new Error("Sign in with Fresh ID before creating a mailbox.");
      }
      const response = await fetch("/api/mail?provision=1", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ localPart: localPartDraft }),
      });
      const payload = await response.json().catch(() => ({})) as MailApiResponse;
      if (!response.ok) throw new Error(payload.error || "Fresh Mail could not create this mailbox.");
      setMailbox(payload.mailbox ?? null);
      setLocalPartDraft("");
      setNotice("Your Fresh Mail address is assigned and ready.");
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Fresh Mail could not create this mailbox.");
    } finally {
      setProvisioning(false);
    }
  };

  const send = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (sending || !mailbox) return;
    setSending(true);
    setError(null);
    setNotice(null);
    try {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) throw sessionError;
      const token = sessionData.session?.access_token;
      if (!token) {
        setNeedsAuth(true);
        throw new Error("Your Fresh ID session has expired. Sign in again.");
      }
      const to = toDraft.split(/[;,\n]+/).map((address) => address.trim()).filter(Boolean);
      const idempotencyKey = retryKey ?? makeIdempotencyKey();
      setRetryKey(idempotencyKey);
      const response = await fetch("/api/mail", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          to,
          subject: subjectDraft,
          text: textDraft,
          idempotencyKey,
        }),
      });
      const payload = await response.json().catch(() => ({})) as MailApiResponse;
      if (!response.ok) throw new Error(payload.error || "Fresh Mail could not send this email.");
      if (payload.status === "sent") {
        setNotice("Resend accepted your email request. Delivery to the recipient is not confirmed yet.");
      } else {
        setNotice("The message is still being reconciled. Refresh the inbox before trying again.");
      }
      setRetryKey(null);
      setToDraft("");
      setSubjectDraft("");
      setTextDraft("");
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Fresh Mail could not send this email.");
    } finally {
      setSending(false);
    }
  };

  return (
    <section className="fresh-mail-panel" aria-labelledby="fresh-mail-title">
      <header className="fresh-mail-header">
        <div>
          <p className="fresh-mail-eyebrow">External email · Separate from Fresh Connect chat</p>
          <h2 id="fresh-mail-title">Fresh Mail</h2>
          <p className="fresh-mail-intro">
            Read and send real email when an active mailbox is assigned to your Fresh ID.
          </p>
        </div>
        <button type="button" className="fresh-mail-secondary" onClick={() => void load()} disabled={loading}>
          {loading ? "Refreshing…" : "Refresh inbox"}
        </button>
      </header>

      {mailbox ? (
        <div className="fresh-mail-address" aria-label="Your Fresh Mail address">
          <span>Your mailbox</span>
          <strong>{mailbox.email_address}</strong>
        </div>
      ) : (
        <form className="fresh-mail-compose" onSubmit={(event) => void provisionMailbox(event)}>
          <h3>Create your Fresh Mail address</h3>
          <p className="fresh-mail-help">
            Choose a unique address name. It can only be assigned after Fresh Mail’s sending and receiving domain is verified.
          </p>
          <label>
            Email address name
            <input
              type="text"
              value={localPartDraft}
              onChange={(event) => setLocalPartDraft(event.target.value.toLowerCase())}
              minLength={3}
              maxLength={32}
              pattern="[a-z0-9](?:[a-z0-9._-]*[a-z0-9])"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              placeholder="e.g. memphis.arafat"
              aria-describedby="fresh-mail-address-help"
              required
              disabled={provisioning || loading || needsAuth}
            />
          </label>
          <p id="fresh-mail-address-help" className="fresh-mail-help">3–32 characters: lowercase letters, numbers, dots, underscores, or hyphens. Your domain is added after verification.</p>
          <button type="submit" className="fresh-mail-primary" disabled={provisioning || loading || needsAuth || !localPartDraft.trim()}>
            {provisioning ? "Checking domain…" : "Create mailbox"}
          </button>
        </form>
      )}

      {needsAuth && (
        <p className="fresh-mail-error" role="alert">Sign in with Fresh ID to access Fresh Mail.</p>
      )}
      {error && <p className="fresh-mail-error" role="alert">{error}</p>}
      {notice && <p className="fresh-mail-notice" role="status">{notice}</p>}

      <form className="fresh-mail-compose" onSubmit={(event) => void send(event)}>
        <h3>Compose email</h3>
        <label>
          To
          <input
            type="text"
            inputMode="email"
            autoComplete="email"
            value={toDraft}
            onChange={(event) => { setRetryKey(null); setToDraft(event.target.value); }}
            placeholder="recipient@example.com"
            aria-describedby="fresh-mail-recipient-help"
            required
            disabled={!mailbox || sending}
          />
        </label>
        <p id="fresh-mail-recipient-help" className="fresh-mail-help">Use one or more addresses separated by commas or semicolons (up to 10).</p>
        <label>
          Subject
          <input
            type="text"
            value={subjectDraft}
            onChange={(event) => { setRetryKey(null); setSubjectDraft(event.target.value); }}
            maxLength={200}
            placeholder="Email subject"
            required
            disabled={!mailbox || sending}
          />
        </label>
        <label>
          Message
          <textarea
            value={textDraft}
            onChange={(event) => { setRetryKey(null); setTextDraft(event.target.value); }}
            maxLength={100000}
            rows={5}
            placeholder="Write your email…"
            required
            disabled={!mailbox || sending}
          />
        </label>
        <button type="submit" className="fresh-mail-primary" disabled={!mailbox || sending || !toDraft.trim() || !subjectDraft.trim() || !textDraft.trim()}>
          {sending ? "Sending…" : "Send email"}
        </button>
      </form>

      <section className="fresh-mail-inbox" aria-labelledby="fresh-mail-inbox-title">
        <div className="fresh-mail-inbox-heading">
          <h3 id="fresh-mail-inbox-title">Inbox and sent</h3>
          <span>{messages.length} {messages.length === 1 ? "message" : "messages"}</span>
        </div>
        {loading ? (
          <p className="fresh-mail-empty">Loading messages…</p>
        ) : messages.length === 0 ? (
          <p className="fresh-mail-empty">No email messages yet. Messages appear here after the provider accepts them or an inbound email is received.</p>
        ) : (
          <ul className="fresh-mail-list">
            {messages.map((message) => (
              <li key={message.id} className="fresh-mail-message">
                <div className="fresh-mail-message-top">
                  <span className={message.direction === "inbound" ? "fresh-mail-tag fresh-mail-tag-inbound" : "fresh-mail-tag"}>
                    {message.direction === "inbound" ? "Received" : "Sent"}
                  </span>
                  <time dateTime={message.created_at}>{new Date(message.created_at).toLocaleString()}</time>
                </div>
                <h4>{message.subject || "(no subject)"}</h4>
                <p className="fresh-mail-message-meta">
                  {message.direction === "inbound" ? `From: ${message.from_address}` : `To: ${message.to_addresses.join(", ")}`}
                </p>
                <p className="fresh-mail-message-body">{message.text_body || "(No plain-text body)"}</p>
                <p className="fresh-mail-message-status">Status: {message.status === "sent" ? "Accepted by provider — delivery not confirmed" : message.status}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </section>
  );
}
