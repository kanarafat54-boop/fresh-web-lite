import { supabase } from "../../../lib/supabase";
import { publishFreshShort, type PublishShortInput, type PublishShortResult } from "./publishFreshShort";

export type FreshPublishedMedia = { id:string; kind:"post"|"short"; authorId:string; text:string; mediaUrl:string|null; mediaKind:"image"|"video"|null; createdAt:string };

export async function publishFreshPost(input:{authorId:string;content:string;imageUrl?:string|null;videoUrl?:string|null}):Promise<FreshPublishedMedia>{
  const content=input.content.trim();
  if(!input.authorId) throw new Error("Sign in with Fresh ID to publish.");
  if(!content&&!input.imageUrl&&!input.videoUrl) throw new Error("A post needs text or media.");
  const {data,error}=await supabase.from("posts").insert({author_id:input.authorId,content,image_url:input.imageUrl??null,video_url:input.videoUrl??null}).select("id,author_id,content,image_url,video_url,created_at").single();
  if(error) throw new Error(error.message||"Could not publish post.");
  return {id:data.id,kind:"post",authorId:data.author_id,text:data.content??"",mediaUrl:data.video_url??data.image_url??null,mediaKind:data.video_url?"video":data.image_url?"image":null,createdAt:data.created_at};
}

export async function saveCreatorDraft(input:{userId:string;kind:"post"|"short";content:string;mediaUrl?:string|null;mediaKind?:"image"|"video"|null}){
  const {data,error}=await supabase.from("creator_drafts").insert({user_id:input.userId,kind:input.kind,content:input.content.trim(),media_url:input.mediaUrl??null,media_kind:input.mediaKind??null,status:"draft"}).select("id,kind,content,media_url,media_kind,status,created_at").single();
  if(error) throw new Error(error.message||"Could not save draft.");
  return data;
}

export async function listCreatorPublishedMedia(userId:string,limit=60):Promise<FreshPublishedMedia[]>{
  const [posts,shorts]=await Promise.all([
    supabase.from("posts").select("id,author_id,content,image_url,video_url,created_at").eq("author_id",userId).order("created_at",{ascending:false}).limit(limit),
    supabase.from("shorts").select("id,author_id,caption,video_url,created_at").eq("author_id",userId).order("created_at",{ascending:false}).limit(limit),
  ]);
  if(posts.error) throw new Error(posts.error.message);
  if(shorts.error) throw new Error(shorts.error.message);
  return [
    ...(posts.data??[]).map(row=>({id:row.id,kind:"post" as const,authorId:row.author_id,text:row.content??"",mediaUrl:row.video_url??row.image_url??null,mediaKind:row.video_url?"video" as const:row.image_url?"image" as const:null,createdAt:row.created_at})),
    ...(shorts.data??[]).map(row=>({id:row.id,kind:"short" as const,authorId:row.author_id,text:row.caption??"",mediaUrl:row.video_url??null,mediaKind:"video" as const,createdAt:row.created_at})),
  ].sort((a,b)=>b.createdAt.localeCompare(a.createdAt));
}

export async function publishFreshMedia(kind:"post"|"short",input:{authorId:string;content:string;mediaUrl?:string|null;mediaKind?:"image"|"video"|null;remixOfShortId?:string|null;duetOfShortId?:string|null}):Promise<FreshPublishedMedia>{
  if(kind==="post") return publishFreshPost({authorId:input.authorId,content:input.content,imageUrl:input.mediaKind==="image"?input.mediaUrl:null,videoUrl:input.mediaKind==="video"?input.mediaUrl:null});
  const shortInput:PublishShortInput={authorId:input.authorId,caption:input.content,videoUrl:input.mediaUrl??"",remixOfShortId:input.remixOfShortId,duetOfShortId:input.duetOfShortId};
  const published:PublishShortResult=await publishFreshShort(shortInput);
  return {id:published.id,kind:"short",authorId:published.author_id,text:published.caption??"",mediaUrl:published.video_url,mediaKind:"video",createdAt:published.created_at};
}
