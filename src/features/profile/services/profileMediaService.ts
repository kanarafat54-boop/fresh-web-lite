import { supabase } from "../../../lib/supabase";

const MAX_IMAGE_BYTES = 8 * 1024 * 1024; // 8MB
const MAX_VIDEO_BYTES = 50 * 1024 * 1024; // 50MB
const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
const ALLOWED_VIDEO_TYPES = ["video/mp4", "video/webm", "video/quicktime"];

export class ProfileMediaError extends Error {}

function validateAvatarFile(file: File): void {
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) throw new ProfileMediaError("Avatar must be a JPEG, PNG, or WEBP image.");
  if (file.size > MAX_IMAGE_BYTES) throw new ProfileMediaError("Avatar must be under 8MB.");
}

function validateCoverFile(file: File): "image" | "video" {
  if (ALLOWED_IMAGE_TYPES.includes(file.type)) {
    if (file.size > MAX_IMAGE_BYTES) throw new ProfileMediaError("Cover image must be under 8MB.");
    return "image";
  }
  if (ALLOWED_VIDEO_TYPES.includes(file.type)) {
    if (file.size > MAX_VIDEO_BYTES) throw new ProfileMediaError("Cover video must be under 50MB.");
    return "video";
  }
  throw new ProfileMediaError("Cover must be a JPEG/PNG/WEBP image or an MP4/WEBM/MOV video.");
}

async function uploadToProfileMedia(userId: string, file: File, prefix: string): Promise<string> {
  const ext = file.name.split(".").pop() || "bin";
  const path = `${userId}/${prefix}-${crypto.randomUUID()}.${ext}`;
  const { error: uploadError } = await supabase.storage.from("profile-media").upload(path, file, { upsert: true });
  if (uploadError) throw new ProfileMediaError(`Upload failed: ${uploadError.message}`);
  const { data } = supabase.storage.from("profile-media").getPublicUrl(path);
  return data.publicUrl;
}

export async function uploadAvatar(userId: string, file: File): Promise<string> {
  validateAvatarFile(file);
  const url = await uploadToProfileMedia(userId, file, "avatar");
  const { error } = await supabase.from("profile_details").upsert({ user_id: userId, avatar_url: url }, { onConflict: "user_id" });
  if (error) throw new ProfileMediaError(error.message);
  return url;
}

export async function saveGeneratedAvatar(userId: string, dataUrl: string): Promise<void> {
  const { error } = await supabase.from("profile_details").upsert({ user_id: userId, avatar_url: dataUrl }, { onConflict: "user_id" });
  if (error) throw new ProfileMediaError(error.message);
}

export async function uploadCover(userId: string, file: File): Promise<{ url: string; isVideo: boolean }> {
  const kind = validateCoverFile(file);
  const url = await uploadToProfileMedia(userId, file, "cover");
  const { error } = await supabase.from("profile_details").upsert({ user_id: userId, cover_url: url }, { onConflict: "user_id" });
  if (error) throw new ProfileMediaError(error.message);
  return { url, isVideo: kind === "video" };
}

export function isVideoUrl(url: string): boolean {
  return /\.(mp4|webm|mov)(\?.*)?$/i.test(url);
}
