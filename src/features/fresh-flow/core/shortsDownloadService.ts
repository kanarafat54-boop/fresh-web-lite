import { supabase, supabaseUrl } from "../../../lib/supabase";

export async function setShortDownloadPermission(
  userId: string,
  shortId: string,
  allowDownload: boolean,
): Promise<boolean> {
  const { data, error } = await supabase
    .from("shorts")
    .update({ allow_download: allowDownload })
    .eq("id", shortId)
    .eq("author_id", userId)
    .select("allow_download")
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) throw new Error("Only the creator can change this Short's download permission.");
  return data.allow_download === true;
}

/** Ask the server to verify the saved creator permission before issuing a short-lived download URL. */
export async function requestShortDownload(shortId: string): Promise<string> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error("Sign in to download this Short.");

  const response = await fetch("/api/ai/ask?__fresh_short_download=1", {
    method: "POST",
    headers: {
      authorization: `Bearer ${session.access_token}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({ shortId }),
  });
  const payload = await response.json().catch(() => ({})) as { signedUrl?: string; error?: string };
  if (!response.ok || !payload.signedUrl) throw new Error(payload.error || "Fresh could not prepare this download.");

  if (!supabaseUrl) throw new Error("Fresh storage is not configured.");
  const expectedOrigin = new URL(supabaseUrl).origin;
  const signed = new URL(payload.signedUrl);
  if (signed.protocol !== "https:" || signed.origin !== expectedOrigin) {
    throw new Error("Fresh returned an invalid download location.");
  }
  return signed.href;
}
