/** Returns a YouTube embed URL, or null if the string is not a recognized YouTube link. */
export function youtubeEmbedUrl(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.hostname === "youtu.be") {
      const id = u.pathname.replace(/^\//, "").split("/")[0];
      if (id) return `https://www.youtube.com/embed/${id}`;
    }
    if (u.hostname.includes("youtube.com")) {
      const v = u.searchParams.get("v");
      if (v) return `https://www.youtube.com/embed/${v}`;
      const embed = u.pathname.match(/\/embed\/([^/?]+)/);
      if (embed?.[1]) return `https://www.youtube.com/embed/${embed[1]}`;
      const shorts = u.pathname.match(/\/shorts\/([^/?]+)/);
      if (shorts?.[1]) return `https://www.youtube.com/embed/${shorts[1]}`;
    }
  } catch {
    return null;
  }
  return null;
}

export function isDirectVideoUrl(url: string): boolean {
  return /\.(mp4|webm)(\?|$)/i.test(url);
}
