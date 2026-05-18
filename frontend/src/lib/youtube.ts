/** Normalize any YouTube URL to watch format for Gemini / API. */
export function toYoutubeWatchUrl(url: string): string {
  const embed = url.match(/(?:youtube\.com\/embed\/|youtu\.be\/)([A-Za-z0-9_-]{6,})/);
  if (embed?.[1]) return `https://www.youtube.com/watch?v=${embed[1]}`;
  try {
    const u = new URL(url);
    const v = u.searchParams.get("v");
    if (v) return `https://www.youtube.com/watch?v=${v}`;
  } catch { /* ignore */ }
  return url;
}

/** Embed URL for iframe player. */
export function toYoutubeEmbedUrl(url: string): string {
  const watch = toYoutubeWatchUrl(url);
  try {
    const u = new URL(watch);
    const v = u.searchParams.get("v");
    if (v) return `https://www.youtube.com/embed/${v}`;
  } catch { /* ignore */ }
  const m = url.match(/(?:embed\/|v=|youtu\.be\/)([A-Za-z0-9_-]{6,})/);
  if (m?.[1]) return `https://www.youtube.com/embed/${m[1]}`;
  return url;
}
