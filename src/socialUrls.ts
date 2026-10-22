// Vendored from rara-cyber/ig-transcribe shared/socialUrls.ts (PR 335, 2026-10-22).
// Keep in sync with that file: it is the parser the ReelScribe API itself uses.

// URL shapes for Threads, LinkedIn, X and Bluesky posts. Shared by the dashboard
// validators (src/utils/validators.ts) and the Convex workflow
// (convex/workflow/socialVideo.ts), so what the form accepts is exactly what
// the backend can resolve.

export type SocialPlatform = "threads" | "linkedin" | "x" | "bluesky";

// t.co, lnkd.in and threads.com/share/ are redirects to the real post; the
// backend follows them, the form just lets them through.
const SHORT_LINK_RE = /^https:\/\/(?:t\.co|lnkd\.in)\/[A-Za-z0-9_-]+|^https:\/\/(?:www\.)?threads\.(?:com|net)\/share\/[A-Za-z0-9_-]+/i;

export function isSocialShortLink(url: string): boolean {
  return SHORT_LINK_RE.test(url.trim());
}

// Embed-fixer mirrors people paste instead of the real X link.
const X_HOSTS = "(?:www\\.|mobile\\.)?(?:x|twitter|fxtwitter|vxtwitter|fixupx|fixvx)\\.com";

export function parseXStatusId(url: string): string | null {
  const m = url.match(
    new RegExp(`^https://${X_HOSTS}/(?:[A-Za-z0-9_]+|i(?:/web)?)/status(?:es)?/(\\d+)`, "i"),
  );
  return m ? m[1] : null;
}


export function parseThreadsShortcode(url: string): string | null {
  // /@user/post/CODE, or the 2023 launch-era /t/CODE.
  const m = url.match(/^https:\/\/(?:www\.)?threads\.(?:com|net)\/(?:@[\w.]+\/post|t)\/([A-Za-z0-9_-]+)/i);
  return m ? m[1] : null;
}

export function isLinkedInPostUrl(url: string): boolean {
  return /^https:\/\/(?:[a-z]{2,3}\.|www\.)?linkedin\.com\/(?:posts\/[^/?#\s]+|(?:embed\/)?feed\/update\/urn:li:(?:activity|ugcPost|share):\d+)/i.test(
    url,
  );
}

// bsky.app/profile/<handle or did>/post/<rkey>
export function parseBlueskyPost(url: string): { actor: string; rkey: string } | null {
  const m = url.match(/^https:\/\/(?:www\.)?bsky\.app\/profile\/([A-Za-z0-9.:_-]+)\/post\/([A-Za-z0-9]+)/i);
  return m ? { actor: m[1], rkey: m[2] } : null;
}

/**
 * Which of the four platforms `url` is a post on, and its canonical form
 * (tracking params stripped). Short links pass through unchanged. Null when
 * it is none of them.
 */
export function parseSocialPostUrl(raw: string): { platform: SocialPlatform; formattedUrl: string } | null {
  // Forgive what people actually paste: no scheme, http://, %3A-encoded URNs/DIDs.
  let url = raw.trim().replace(/%3A/gi, ":");
  if (/^http:\/\//i.test(url)) url = "https://" + url.slice(7);
  else if (!/^https:\/\//i.test(url) && /^(?:[\w-]+\.)*(?:x|twitter|fxtwitter|vxtwitter|fixupx|fixvx|threads|linkedin|bsky)\.(?:com|net|app)\/|^(?:t\.co|lnkd\.in)\//i.test(url)) {
    url = "https://" + url;
  }
  if (/^https:\/\/(?:t\.co)\//i.test(url) && isSocialShortLink(url)) return { platform: "x", formattedUrl: url };
  if (/^https:\/\/lnkd\.in\//i.test(url) && isSocialShortLink(url)) return { platform: "linkedin", formattedUrl: url };
  if (/threads\.(?:com|net)\/share\//i.test(url) && isSocialShortLink(url)) return { platform: "threads", formattedUrl: url };

  const xId = parseXStatusId(url);
  if (xId) {
    const handle = url.match(/\.com\/([A-Za-z0-9_]+)\/status/i)?.[1];
    const user = handle && handle.toLowerCase() !== "i" ? handle : "i";
    return { platform: "x", formattedUrl: `https://x.com/${user}/status/${xId}` };
  }

  const code = parseThreadsShortcode(url);
  if (code) {
    const user = url.match(/\/@([\w.]+)\/post\//)?.[1] ?? "_"; // /t/ links name no user
    return { platform: "threads", formattedUrl: `https://www.threads.com/@${user}/post/${code}` };
  }

  const bsky = parseBlueskyPost(url);
  if (bsky) return { platform: "bluesky", formattedUrl: `https://bsky.app/profile/${bsky.actor}/post/${bsky.rkey}` };

  if (isLinkedInPostUrl(url)) {
    // Every shape carries the post's URN; feed/update/<urn> is the one page
    // that always renders it, so dedup and fetching both key on that.
    const urn = url.match(/urn:li:(activity|ugcPost|share):(\d+)/i) ?? url.match(/[-/](activity|ugcPost|share)-(\d+)/i);
    if (urn) return { platform: "linkedin", formattedUrl: `https://www.linkedin.com/feed/update/urn:li:${urn[1]}:${urn[2]}/` };
    const u = new URL(url);
    return { platform: "linkedin", formattedUrl: `https://www.linkedin.com${u.pathname}` };
  }
  return null;
}
