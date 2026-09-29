import { useEffect, useState } from "react";
import { useFreshId } from "../fresh-id/context/FreshIdContext";
import { createMarketplaceListing } from "../../core/platform/freshPlatformRuntime";
import { supabase } from "../../lib/supabase";
import "./WorkspacePage.css";

type Listing = { id: string; title: string; description: string; listing_type: string; price_minor: number | null; currency_code: string | null; seller_id: string };

export default function MarketplaceWorkspace() {
  const { user, isGuest } = useFreshId();
  const [listings, setListings] = useState<Listing[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [message, setMessage] = useState("Live marketplace data.");
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase.from("fresh_marketplace_listings").select("id,title,description,listing_type,price_minor,currency_code,seller_id").eq("status", "published").order("created_at", { ascending: false }).limit(24);
    if (error) setMessage(error.message); else setListings((data ?? []) as Listing[]);
    setLoading(false);
  };

  useEffect(() => { void load(); }, []);

  const publish = async () => {
    if (!user || isGuest || !title.trim()) return;
    try {
      await createMarketplaceListing({ sellerId: user.id, title: title.trim(), description: description.trim(), priceMinor: price.trim() ? Number(price) : null, currencyCode: price.trim() ? "UGX" : null });
      setTitle(""); setDescription(""); setPrice(""); setMessage("Listing created as a draft. Publish it after review.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Could not create listing."); }
  };

  return (
    <section className="workspace-page" aria-label="Marketplace workspace">
      <header className="workspace-hero"><span className="workspace-eyebrow">Discover · Buy · Sell</span><h1>Fresh Marketplace</h1><p>Real marketplace listings backed by Fresh platform data. Seller actions create durable records; settlement remains behind the Treasury boundary.</p></header>
      {user && !isGuest && <section className="workspace-section"><h2>Create a listing</h2><div className="workspace-card"><input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="What are you offering?" /><textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Describe the product or service" /><input value={price} onChange={(e) => setPrice(e.target.value)} inputMode="numeric" placeholder="Price in UGX (optional)" /><button type="button" onClick={() => void publish()} disabled={!title.trim()}>Save listing</button></div></section>}
      <section className="workspace-section"><h2>Published listings</h2>{loading ? <p className="workspace-empty">Loading marketplace…</p> : listings.length === 0 ? <p className="workspace-empty">No published listings yet.</p> : <div className="workspace-grid">{listings.map((l) => <article key={l.id} className="workspace-card"><h3>{l.title}</h3><p>{l.description || "No description provided."}</p><div className="workspace-meta"><span className="workspace-pill">{l.price_minor == null ? "Contact seller" : l.price_minor.toLocaleString() + " " + (l.currency_code ?? "")}</span><span className="workspace-badge">{l.listing_type}</span></div></article>)}</div>}<p className="workspace-empty" role="status">{message}</p></section>
    </section>
  );
}
