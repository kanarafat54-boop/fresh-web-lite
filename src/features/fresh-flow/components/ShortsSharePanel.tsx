import { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabase";
import { listAcceptedConnections } from "../../workspaces/connectionService";
import { sendMessage } from "../../workspaces/messagingService";

type Person = { id: string; name: string };
type Props = {
  url: string;
  text: string;
  signedIn: boolean;
  onClose: () => void;
  /** Called only after a share really happened, so counts and telemetry never overstate. */
  onShared: (channel: "messages" | "copy" | "native") => void;
};

/** Share panel (spec section 6). Only destinations that have a working backend are active. */
export default function ShortsSharePanel({ url, text, signedIn, onClose, onShared }: Props) {
  const [people, setPeople] = useState<Person[] | null>(null);
  const [sent, setSent] = useState<Set<string>>(new Set());
  const [note, setNote] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    if (!signedIn) { setPeople([]); return; }
    let cancelled = false;
    (async () => {
      try {
        const ids = await listAcceptedConnections();
        if (ids.length === 0) { if (!cancelled) setPeople([]); return; }
        const { data } = await supabase.from("user_public_profiles").select("id, full_name, username").in("id", ids);
        if (!cancelled) setPeople(((data ?? []) as any[]).map((row) => ({ id: row.id, name: row.full_name || row.username || "Fresh member" })));
      } catch { if (!cancelled) setPeople([]); }
    })();
    return () => { cancelled = true; };
  }, [signedIn]);

  const sendTo = async (person: Person) => {
    setBusyId(person.id); setNote(null);
    try {
      await sendMessage(person.id, `${text} ${url}`);
      setSent((current) => new Set(current).add(person.id));
      onShared("messages");
    } catch (cause) {
      setNote(cause instanceof Error ? cause.message : "Could not send the message.");
    } finally { setBusyId(null); }
  };

  const copy = async () => {
    try { await navigator.clipboard.writeText(`${text} ${url}`); setNote("Link copied."); onShared("copy"); }
    catch { setNote("Fresh could not copy the link on this device."); }
  };

  const native = async () => {
    try { await navigator.share({ title: "Fresh Short", text, url }); onShared("native"); }
    catch (error) { if (!(error instanceof DOMException && error.name === "AbortError")) setNote("Fresh could not open sharing on this device."); }
  };

  return (
    <div className="comment-panel-backdrop" onClick={onClose}>
      <div className="comment-panel post-menu-sheet shorts-share-panel" role="dialog" aria-modal="true" aria-label="Share this Short" onClick={(event) => event.stopPropagation()}>
        <div className="comment-panel-header"><h3>Share</h3><button type="button" className="back-btn" onClick={onClose} aria-label="Close">✕</button></div>
        <section aria-label="Fresh Messages">
          <h4>Send in Fresh Messages</h4>
          {!signedIn && <p>Sign in to send this Short to your connections.</p>}
          {signedIn && people === null && <p>Loading your connections…</p>}
          {signedIn && people?.length === 0 && <p>You have no accepted connections yet. Messages go to accepted connections only.</p>}
          {people && people.length > 0 && (
            <ul className="shorts-share-people">
              {people.map((person) => (
                <li key={person.id}>
                  <span>{person.name}</span>
                  <button type="button" onClick={() => void sendTo(person)} disabled={busyId === person.id || sent.has(person.id)}>{sent.has(person.id) ? "Sent" : "Send"}</button>
                </li>
              ))}
            </ul>
          )}
        </section>
        <div className="shorts-share-rows">
          <button type="button" onClick={() => void copy()}>🔗 Copy link</button>
          {typeof navigator.share === "function" && <button type="button" onClick={() => void native()}>↗ Share to another app</button>}
          <button type="button" disabled title="Fresh Mail sending needs the mail service connection">✉ Fresh Mail — service connection needed</button>
          <button type="button" disabled title="Communities sharing needs its service connection">👥 Communities — service connection needed</button>
          <button type="button" disabled title="Stories sharing needs its service connection">◔ Stories — service connection needed</button>
        </div>
        {note && <p role="status" className="shorts-share-note">{note}</p>}
      </div>
    </div>
  );
}
