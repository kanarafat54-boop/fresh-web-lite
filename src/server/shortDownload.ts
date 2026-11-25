const PUBLIC_SHORT_VIDEO_PREFIX = "/storage/v1/object/public/post-videos/";

export function extractShortVideoObjectPath(
  videoUrl: string,
  supabaseUrl: string,
  authorId: string,
): string | null {
  try {
    const media = new URL(videoUrl);
    const project = new URL(supabaseUrl);
    if (media.protocol !== "https:" || media.origin !== project.origin) return null;
    if (!media.pathname.startsWith(PUBLIC_SHORT_VIDEO_PREFIX)) return null;

    const encodedPath = media.pathname.slice(PUBLIC_SHORT_VIDEO_PREFIX.length);
    const objectPath = encodedPath.split("/").map((part) => decodeURIComponent(part)).join("/");
    const segments = objectPath.split("/");
    if (!objectPath || segments.length < 2 || segments.some((part) => !part || part === "." || part === "..")) return null;
    if (segments[0] !== authorId) return null;
    if (objectPath.includes("\\") || objectPath.includes("\0")) return null;
    return objectPath;
  } catch {
    return null;
  }
}

export function shortDownloadFilename(shortId: string): string {
  return `fresh-short-${shortId}.mp4`;
}
