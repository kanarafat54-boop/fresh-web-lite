import { supabase } from "../../../lib/supabase";
import { publishFreshShort, type PublishShortInput, type PublishShortResult } from "./publishFreshShort";

export type FreshLongVideoMetadata = {
  title: string;
  description: string;
  category: string;
  tags: string[];
  visibility: "public" | "unlisted";
  scheduledAt?: string | null;
  thumbnailUrl?: string | null;
};
export type FreshPublishedMedia = { id:string; kind:"post"|"short"; authorId:string; text:string; mediaUrl:string|null; mediaKind:"image"|"video"|null; createdAt:string; title?:string|null; thumbnailUrl?:string|null; videoStatus?:string|null; scheduledAt?:string|null };

export async function publishFreshPost(input:{authorId:string;content:string;imageUrl?:string|null;videoUrl?:string|null;longVideoMetadata?:FreshLongVideoMetadata}):Promise<FreshPublishedMedia>{
  const content=input.content.trim();
  if(!input.authorId) throw new Error("Sign in with Fresh ID to publish.");
  if(!content&&!input.imageUrl&&!input.videoUrl&&!input.longVideoMetadata?.title.trim()) throw new Error("A post needs text or media.");
  if(input.longVideoMetadata && !input.videoUrl) throw new Error("A Long Video needs an uploaded video file.");
  const metadata=input.longVideoMetadata;
  const scheduledAt=metadata?.scheduledAt ? new Date(metadata.scheduledAt) : null;
  if(scheduledAt && Number.isNaN(scheduledAt.getTime())) throw new Error("Choose a valid publishing date and time.");
  if(scheduledAt && scheduledAt.getTime() <= Date.now()) throw new Error("Choose a future time to schedule this video.");
  const {data,error}=await supabase.from("posts").insert({
    author_id:input.authorId,content,image_url:input.imageUrl??null,video_url:input.videoUrl??null,
    ...(metadata ? {
      video_title:metadata.title.trim(), video_description:metadata.description.trim(),
      video_category:metadata.category.trim(), video_tags:metadata.tags,
      video_thumbnail_url:metadata.thumbnailUrl??null, video_visibility:metadata.visibility,
      video_status:scheduledAt ? "scheduled" : "published",
      video_scheduled_at:scheduledAt?.toISOString()??null,
      video_published_at:scheduledAt ? null : new Date().toISOString(),
    } : {}),
  }).select("id,author_id,content,image_url,video_url,created_at,video_title,video_thumbnail_url,video_status,video_scheduled_at").single();
  if(error) throw new Error(error.message||"Could not publish post.");
  return {id:data.id,kind:"post",authorId:data.author_id,text:data.content??"",mediaUrl:data.video_url??data.image_url??null,mediaKind:data.video_url?"video":data.image_url?"image":null,createdAt:data.created_at,title:data.video_title??null,thumbnailUrl:data.video_thumbnail_url??null,videoStatus:data.video_status??null,scheduledAt:data.video_scheduled_at??null};
}

export async function saveCreatorDraft(input:{userId:string;kind:"post"|"short";content:string;mediaUrl?:string|null;mediaKind?:"image"|"video"|null;longVideoMetadata?:FreshLongVideoMetadata}){
  const {data,error}=await supabase.from("creator_drafts").insert({user_id:input.userId,kind:input.kind,content:input.content.trim(),media_url:input.mediaUrl??null,media_kind:input.mediaKind??null,long_video_metadata:input.longVideoMetadata??{},status:"draft"}).select("id,kind,content,media_url,media_kind,status,created_at,long_video_metadata").single();
  if(error) throw new Error(error.message||"Could not save draft.");
  return data;
}

export async function listCreatorPublishedMedia(userId:string,limit=60):Promise<FreshPublishedMedia[]>{
  const [posts,shorts]=await Promise.all([
    supabase.from("posts").select("id,author_id,content,image_url,video_url,created_at,video_title,video_thumbnail_url,video_status,video_scheduled_at").eq("author_id",userId).order("created_at",{ascending:false}).limit(limit),
    supabase.from("shorts").select("id,author_id,caption,video_url,created_at").eq("author_id",userId).order("created_at",{ascending:false}).limit(limit),
  ]);
  if(posts.error) throw new Error(posts.error.message);
  if(shorts.error) throw new Error(shorts.error.message);
  return [
    ...(posts.data??[]).map(row=>({id:row.id,kind:"post" as const,authorId:row.author_id,text:row.content??"",mediaUrl:row.video_url??row.image_url??null,mediaKind:row.video_url?"video" as const:row.image_url?"image" as const:null,createdAt:row.created_at,title:row.video_title??null,thumbnailUrl:row.video_thumbnail_url??null,videoStatus:row.video_status??null,scheduledAt:row.video_scheduled_at??null})),
    ...(shorts.data??[]).map(row=>({id:row.id,kind:"short" as const,authorId:row.author_id,text:row.caption??"",mediaUrl:row.video_url??null,mediaKind:"video" as const,createdAt:row.created_at})),
  ].sort((a,b)=>b.createdAt.localeCompare(a.createdAt));
}

export async function publishFreshMedia(kind:"post"|"short",input:{authorId:string;content:string;mediaUrl?:string|null;mediaKind?:"image"|"video"|null;remixOfShortId?:string|null;duetOfShortId?:string|null;longVideoMetadata?:FreshLongVideoMetadata}):Promise<FreshPublishedMedia>{
  if(kind==="post") return publishFreshPost({authorId:input.authorId,content:input.content,imageUrl:input.mediaKind==="image"?input.mediaUrl:null,videoUrl:input.mediaKind==="video"?input.mediaUrl:null,longVideoMetadata:input.longVideoMetadata});
  const shortInput:PublishShortInput={authorId:input.authorId,caption:input.content,videoUrl:input.mediaUrl??"",remixOfShortId:input.remixOfShortId,duetOfShortId:input.duetOfShortId};
  const published:PublishShortResult=await publishFreshShort(shortInput);
  return {id:published.id,kind:"short",authorId:published.author_id,text:published.caption??"",mediaUrl:published.video_url,mediaKind:"video",createdAt:published.created_at};
}
