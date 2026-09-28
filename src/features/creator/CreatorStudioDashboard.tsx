import { useEffect, useMemo, useRef, useState } from "react";
import "./CreatorStudioDashboard.css";
import { supabase } from "../../lib/supabase";
import { useFreshId } from "../fresh-id/context/FreshIdContext";
import { useLayout } from "../../app/contexts/useLayout";
import { buildCreatorSuggestions } from "./creatorSuggestions";
import { publishFreshMedia, listCreatorPublishedMedia, saveCreatorDraft } from "./core/freshMediaRepository";
import { readCreateIntent, clearCreateIntent, markFeedRefresh, isShortCreateAction, type FreshFlowCreateIntent } from "./core/createIntent";

type Draft={id:string;kind:"post"|"short";content:string;media_url:string|null;status:string;created_at:string};
type MediaItem={id:string;kind:"post"|"short";title:string;text:string;mediaUrl:string|null;createdAt:string};

async function uploadMedia(userId:string,file:File):Promise<{url:string;kind:"image"|"video"}>{
  const isVideo=file.type.startsWith("video/"); const bucket=isVideo?"post-videos":"post-images";
  const path=`${userId}/creator-${crypto.randomUUID()}-${file.name.replace(/[^a-zA-Z0-9._-]/g,"_")}`;
  const {error}=await supabase.storage.from(bucket).upload(path,file,{upsert:false,contentType:file.type});
  if(error) throw error; const {data}=supabase.storage.from(bucket).getPublicUrl(path);
  return {url:data.publicUrl,kind:isVideo?"video":"image"};
}

export default function CreatorStudioDashboard(){
  const {user}=useFreshId(); const {setActiveRoute}=useLayout();
  const [mode,setMode]=useState<"post"|"short">("post"); const [content,setContent]=useState("");
  const [media,setMedia]=useState<{url:string;kind:"image"|"video"}|null>(null);
  const [drafts,setDrafts]=useState<Draft[]>([]); const [items,setItems]=useState<MediaItem[]>([]);
  const [analytics,setAnalytics]=useState<Record<string,number>>({}); const [loading,setLoading]=useState(true);
  const [publishing,setPublishing]=useState(false); const [message,setMessage]=useState<string|null>(null); const [error,setError]=useState<string|null>(null);
  const [suggestions,setSuggestions]=useState<ReturnType<typeof buildCreatorSuggestions>>([]); const [intentMeta,setIntentMeta]=useState<FreshFlowCreateIntent|null>(null);
  const editorRef=useRef<HTMLTextAreaElement|null>(null); const fileRef=useRef<HTMLInputElement|null>(null); const intentConsumedRef=useRef(false);

  useEffect(()=>{if(intentConsumedRef.current)return;intentConsumedRef.current=true;const intent=readCreateIntent();if(!intent)return;clearCreateIntent();setIntentMeta(intent);if(isShortCreateAction(intent.action)){setMode("short");if(intent.sourceCaption){const prefix=intent.action==="remix"?"Remix: ":intent.action==="duet"?"Duet: ":intent.action==="quote"?"Quote: ":"";setContent(`${prefix}${intent.sourceCaption}`);}requestAnimationFrame(()=>editorRef.current?.focus());}},[]);

  async function load(){
    if(!user){setLoading(false);return;} setLoading(true);setError(null);
    const [draftResult,libraryResult,analyticsResult]=await Promise.all([
      supabase.from("creator_drafts").select("id,kind,content,media_url,status,created_at").eq("user_id",user.id).order("created_at",{ascending:false}).limit(30),
      listCreatorPublishedMedia(user.id),
      supabase.from("user_content_analytics").select("*").eq("user_id",user.id).maybeSingle(),
    ]);
    if(draftResult.error)setError(draftResult.error.message); setDrafts((draftResult.data??[]) as Draft[]);
    setItems(libraryResult.map(item=>({...item,title:item.kind==="short"?"Short":"Post"})));
    setAnalytics((analyticsResult.data??{}) as Record<string,number>); setLoading(false);
  }
  useEffect(()=>{void load();},[user]);
  useEffect(()=>{setSuggestions(buildCreatorSuggestions({postCount:analytics.post_count??items.filter(i=>i.kind==="post").length,shortCount:analytics.short_count??items.filter(i=>i.kind==="short").length,shortViews:analytics.short_views??0,followers:analytics.follower_count??user?.stats.followerCount??0,drafts}));},[analytics,drafts,items,user]);

  async function saveDraft(){
    if(!user||(!content.trim()&&!media))return;setError(null);setMessage(null);
    try{const data=await saveCreatorDraft({userId:user.id,kind:mode,content,mediaUrl:media?.url,mediaKind:media?.kind??null});setDrafts(c=>[data as Draft,...c]);setContent("");setMedia(null);setMessage("Draft saved to your Fresh Creator workspace.");}
    catch(reason:unknown){setError(reason instanceof Error?reason.message:"Could not save draft.");}
  }

  async function publishNow(){
    if(!user||(!content.trim()&&!media))return;
    if(mode==="short"&&media?.kind!=="video"){setError("A Short requires a video upload.");return;}
    setPublishing(true);setError(null);setMessage(null);
    try{
      const published=await publishFreshMedia(mode,{authorId:user.id,content,mediaUrl:media?.url??null,mediaKind:media?.kind??null,remixOfShortId:intentMeta?.action==="remix"?intentMeta.sourceShortId??null:null,duetOfShortId:intentMeta?.action==="duet"?intentMeta.sourceShortId??null:null});
      setContent("");setMedia(null);setIntentMeta(null);
      if(published.kind==="short"){markFeedRefresh(published.id);setMessage("Short published to Fresh Flow. Opening feed…");}else setMessage("Post published to Fresh Flow.");
      await load();window.setTimeout(()=>setActiveRoute("fresh-flow"),400);
    }catch(reason:unknown){setError(reason instanceof Error?reason.message:"Publishing failed.");}
    finally{setPublishing(false);}
  }

  async function deleteDraft(id:string){if(!user)return;const {error:deleteError}=await supabase.from("creator_drafts").delete().eq("id",id).eq("user_id",user.id);if(deleteError)setError(deleteError.message);else setDrafts(c=>c.filter(d=>d.id!==id));}
  function restoreDraft(draft:Draft){setMode(draft.kind);setContent(draft.content);setMedia(draft.media_url?{url:draft.media_url,kind:draft.kind==="short"?"video":"image"}:null);setMessage("Draft restored into the editor.");}
  const kpis=useMemo(()=>[["Posts",analytics.post_count??items.filter(i=>i.kind==="post").length],["Shorts",analytics.short_count??items.filter(i=>i.kind==="short").length],["Short views",analytics.short_views??0],["Likes",analytics.short_likes??analytics.post_likes??0],["Reposts",analytics.short_reposts??0],["Followers",analytics.follower_count??user?.stats.followerCount??0]],[analytics,items,user]);

  if(!user)return <section className="creator-studio-dashboard"><div className="creator-empty"><h1>Creator Studio</h1><p>Sign in with Fresh ID to create, publish and measure your work.</p></div></section>;

  return <section className="creator-studio-dashboard">
    <header className="creator-studio-hero"><div><span className="workspace-eyebrow">FRESH CREATOR ECONOMY</span><h1>Creator Studio</h1><p>Create, publish, manage and understand your media from one professional workspace.</p>{intentMeta?.action&&<p className="creator-note">Opened from Fresh Flow{intentMeta.action!=="create"?` · ${intentMeta.action}`:""}. Publish a Short to return to the feed.</p>}</div><div className="creator-hero-actions"><button type="button" onClick={()=>setActiveRoute("fresh-flow")}>← Fresh Flow</button><button type="button" onClick={()=>void load()}>↻ Refresh live data</button></div></header>
    <div className="creator-kpis">{kpis.map(([label,value])=><div key={String(label)}><strong>{value}</strong><span>{label}</span></div>)}</div>
    {suggestions.length>0&&<section className="creator-panel creator-suggestions" aria-label="Fresh AI creator suggestions"><div className="creator-section-heading"><div><span className="workspace-eyebrow">FRESH AI</span><h2>Suggested next actions</h2></div><span>{suggestions.length}</span></div><div className="creator-suggestion-grid">{suggestions.map(s=><article className="creator-suggestion-card" key={s.id}><div><strong>{s.title}</strong><p>{s.reason}</p></div><button type="button" onClick={()=>{if(s.action==="post")setMode("post");else if(s.action==="short")setMode("short");else if(s.action==="drafts")document.getElementById("creator-drafts")?.scrollIntoView({behavior:"smooth",block:"center"});else void load();}}>{s.action==="refresh"?"Review":s.action==="drafts"?"Open drafts":s.action==="short"?"Create Short":"Create Post"}</button></article>)}</div></section>}
    <div className="creator-studio-grid">
      <section className="creator-editor"><div className="creator-section-heading"><div><span className="workspace-eyebrow">PUBLISHING</span><h2>Create media</h2></div><div className="creator-mode-switch"><button type="button" className={mode==="post"?"active":""} onClick={()=>setMode("post")}>Post</button><button type="button" className={mode==="short"?"active":""} onClick={()=>setMode("short")}>Short</button></div></div>
        <textarea ref={editorRef} value={content} onChange={e=>setContent(e.target.value)} placeholder={mode==="post"?"Write a post, announcement, idea or story…":"Write a Short caption…"}/>
        {media&&<div className="creator-media-preview">{media.kind==="video"?<video src={media.url} controls/>:<img src={media.url} alt="Selected media"/>}<button type="button" onClick={()=>setMedia(null)}>Remove media</button></div>}
        <input ref={fileRef} type="file" hidden accept={mode==="short"?"video/mp4,video/webm,video/quicktime":"image/jpeg,image/png,image/webp,video/mp4,video/webm,video/quicktime"} onChange={async e=>{const file=e.target.files?.[0];e.currentTarget.value="";if(!file||!user)return;try{setError(null);setMedia(await uploadMedia(user.id,file));setMessage("Media uploaded to Fresh storage.");}catch(reason:unknown){setError(reason instanceof Error?reason.message:"Media upload failed.");}}}/>
        <div className="creator-editor-actions"><button type="button" onClick={()=>fileRef.current?.click()}>＋ Add media</button><button type="button" onClick={()=>void saveDraft()} disabled={!content.trim()&&!media}>Save draft</button><button type="button" className="publish" onClick={()=>void publishNow()} disabled={publishing||(!content.trim()&&!media)}>{publishing?"Publishing…":"Publish now"}</button></div>
        {error&&<p className="creator-error">{error}</p>}{message&&<p className="creator-message">{message}</p>}<p className="creator-note">Creator is the canonical publishing boundary. Published posts and Shorts are read back from live Fresh data.</p>
      </section>
      <section className="creator-panel" id="creator-drafts"><div className="creator-section-heading"><div><span className="workspace-eyebrow">WORKSPACE</span><h2>Drafts</h2></div><span>{drafts.length}</span></div>{loading?<p>Loading…</p>:drafts.length?drafts.map(d=><article className="draft-row" key={d.id}><div><strong>{d.kind==="short"?"Short":"Post"} draft</strong><p>{d.content||"Media-only draft"}</p><small>{new Date(d.created_at).toLocaleString()}</small></div><div><button type="button" onClick={()=>restoreDraft(d)}>Edit</button><button type="button" onClick={()=>void deleteDraft(d.id)}>Delete</button></div></article>):<p className="creator-muted">No drafts yet.</p>}</section>
    </div>
    <section className="creator-panel"><div className="creator-section-heading"><div><span className="workspace-eyebrow">LIBRARY</span><h2>Published content</h2></div><span>{items.length} loaded</span></div>{items.length?<div className="creator-library">{items.slice(0,30).map(item=><article key={`${item.kind}-${item.id}`}><div className="creator-library-media">{item.mediaUrl?item.kind==="short"||/\.(mp4|webm|mov)(\?.*)?$/i.test(item.mediaUrl)?<video src={item.mediaUrl} muted/>:<img src={item.mediaUrl} alt=""/>:<span>{item.kind==="short"?"▶":"✎"}</span>}</div><div><span className="creator-kind">{item.kind}</span><strong>{item.text||"Media publication"}</strong><small>{new Date(item.createdAt).toLocaleString()}</small></div></article>)}</div>:<p className="creator-muted">Publish your first piece and it will appear here from live Fresh data.</p>}</section>
  </section>;
}