/** Fresh Web Lite — universal accessible reaction picker for Posts, Shorts and all Fresh media. */
import { useRef, useState } from "react";
import { UNIVERSAL_REACTIONS, type UniversalReactionKind } from "../../../core/interactions/FreshReactionModel";
import { interactionA11y, onActivation } from "../../../core/interactions/InteractionA11y";

const EMOJI: Record<UniversalReactionKind, string> = { like:"👍",love:"❤️",laugh:"😂",wow:"😮",celebrate:"🎉",support:"🤝",curious:"🤔",inspire:"✨",insightful:"💡",agree:"👍",disagree:"👎",helpful:"💙",question:"❓",respect:"🙏",fire:"🔥",sad:"😢",angry:"😡",custom:"➕" };

/** Solid heart used for Shorts likes, drawn in the current text colour (white by default, pink once liked). */
const HeartGlyph=()=><svg width="30" height="30" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false"><path d="M12 20.6c-.3 0-.6-.1-.8-.3C6.4 16.4 3 13.4 3 9.6 3 6.9 5.1 5 7.5 5c1.7 0 3.4.9 4.5 2.5C13.1 5.9 14.8 5 16.5 5 18.9 5 21 6.9 21 9.6c0 3.8-3.4 6.8-8.2 10.7-.2.2-.5.3-.8.3Z"/></svg>;

interface ReactionPickerProps { myReaction:string|null; count:number; disabled?:boolean; variant?:"feed"|"short"; onReact:(type:string)=>void; }

export function ReactionPicker({ myReaction,count,disabled,variant="feed",onReact }:ReactionPickerProps) {
 const [showPicker,setShowPicker]=useState(false); const timerRef=useRef<ReturnType<typeof setTimeout>|null>(null); const longPressedRef=useRef(false);
 function startPress(){longPressedRef.current=false;timerRef.current=setTimeout(()=>{longPressedRef.current=true;setShowPicker(true)},400)}
 function endPress(){if(timerRef.current)clearTimeout(timerRef.current);if(!longPressedRef.current&&!showPicker)onReact(myReaction||"like")}
 function pick(type:UniversalReactionKind){onReact(type);setShowPicker(false)}
 const btnClass=variant==="short"?(myReaction?"short-like-btn liked":"short-like-btn"):(myReaction?"like-btn liked":"like-btn");
 return <div className="reaction-wrap">
  {showPicker&&<div className="reaction-popup-backdrop" role="presentation" onClick={()=>setShowPicker(false)}><div className={variant==="short"?"reaction-popup short-variant":"reaction-popup"} role="menu" aria-label="Choose a reaction" onClick={e=>e.stopPropagation()}>
   {UNIVERSAL_REACTIONS.map(type=><button key={type} type="button" role="menuitem" className="reaction-option" aria-label={interactionA11y.reactionLabel(type,myReaction===type)} aria-pressed={myReaction===type} onClick={()=>pick(type)} onKeyDown={e=>onActivation(e,()=>pick(type))}><span aria-hidden="true">{EMOJI[type]}</span></button>)}
  </div></div>}
  <button type="button" className={btnClass} disabled={disabled} aria-label={`${myReaction||"Like"}, ${count} reactions`} aria-haspopup="menu" aria-expanded={showPicker} onPointerDown={startPress} onPointerUp={endPress} onPointerCancel={()=>timerRef.current&&clearTimeout(timerRef.current)} onPointerLeave={()=>timerRef.current&&clearTimeout(timerRef.current)} onKeyDown={e=>onActivation(e,()=>onReact(myReaction||"like"))}><span aria-hidden="true" style={{fontSize:variant==="short"?"1.5rem":"1.05rem"}}>{variant==="short"&&(!myReaction||myReaction==="like"||myReaction==="love")?<HeartGlyph/>:myReaction?EMOJI[myReaction as UniversalReactionKind]||"👍":"👍"}</span>{variant==="short"?<span>{count}</span>:count}</button>
 </div>;
}
