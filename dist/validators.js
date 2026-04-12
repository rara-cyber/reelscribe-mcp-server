/**
 * URL validation for supported platforms.
 * Ported from src/utils/validators.ts — standalone, no app dependencies.
 */
const MAX_URL_LENGTH = 2048;
const SUSPICIOUS_PATTERNS = [
    "javascript:",
    "data:",
    "vbscript:",
    "<script",
    "onclick",
    "onerror",
    "%3cscript",
];
function isSuspicious(url) {
    const lower = url.toLowerCase();
    return SUSPICIOUS_PATTERNS.some((p) => lower.includes(p));
}
function validateInstagram(url) {
    let parsed;
    try {
        parsed = new URL(url);
    }
    catch {
        return { valid: false, error: "Invalid URL format" };
    }
    if (parsed.protocol !== "https:") {
        return { valid: false, error: "Only HTTPS URLs are supported" };
    }
    const validHosts = ["instagram.com", "www.instagram.com"];
    if (!validHosts.includes(parsed.hostname)) {
        return { valid: false, error: "Not an Instagram URL" };
    }
    const match = url.match(/instagram\.com\/(reels?|p|tv)\/([A-Za-z0-9_-]{6,})/i);
    if (!match) {
        return { valid: false, error: "Invalid Instagram URL format. Expected /reel/, /p/, or /tv/ path." };
    }
    const pathType = match[1].toLowerCase() === "reels" ? "reel" : match[1].toLowerCase();
    const id = match[2];
    const normalizedUrl = `https://www.instagram.com/${pathType}/${id}/`;
    return { valid: true, platform: "instagram", normalizedUrl };
}
function validateTikTok(url) {
    let parsed;
    try {
        parsed = new URL(url);
    }
    catch {
        return { valid: false, error: "Invalid URL format" };
    }
    if (parsed.protocol !== "https:") {
        return { valid: false, error: "Only HTTPS URLs are supported" };
    }
    const validHosts = [
        "tiktok.com",
        "www.tiktok.com",
        "vm.tiktok.com",
        "vt.tiktok.com",
    ];
    if (!validHosts.includes(parsed.hostname)) {
        return { valid: false, error: "Not a TikTok URL" };
    }
    // Full URL: tiktok.com/@username/video/1234567890
    const fullMatch = url.match(/tiktok\.com\/@[\w.-]+\/video\/(\d+)/i);
    if (fullMatch) {
        const normalized = url.match(/tiktok\.com\/(@[\w.-]+\/video\/\d+)/i);
        const normalizedUrl = `https://www.tiktok.com/${normalized[1]}/`;
        return { valid: true, platform: "tiktok", normalizedUrl };
    }
    // Short link: vm.tiktok.com/xxxxx or vt.tiktok.com/xxxxx
    const shortMatch = url.match(/^https:\/\/(?:vm|vt)\.tiktok\.com\/[A-Za-z0-9]+\/?$/i);
    if (shortMatch) {
        const normalizedUrl = url.endsWith("/") ? url : url + "/";
        return { valid: true, platform: "tiktok", normalizedUrl };
    }
    return { valid: false, error: "Invalid TikTok URL format. Expected /@username/video/ID or short link." };
}
function validateYouTube(url) {
    const lower = url.toLowerCase();
    const isYT = lower.includes("youtube.com/watch") ||
        lower.includes("youtube.com/shorts") ||
        lower.includes("youtu.be/") ||
        lower.includes("m.youtube.com/watch") ||
        lower.includes("m.youtube.com/shorts");
    if (!isYT) {
        return { valid: false, error: "Not a YouTube URL" };
    }
    // youtube.com/watch?v=ID
    const watchMatch = url.match(/(?:youtube\.com|m\.youtube\.com)\/watch\?v=([a-zA-Z0-9_-]+)/i);
    if (watchMatch) {
        return {
            valid: true,
            platform: "youtube",
            normalizedUrl: `https://www.youtube.com/watch?v=${watchMatch[1]}`,
        };
    }
    // youtube.com/shorts/ID
    const shortsMatch = url.match(/(?:youtube\.com|m\.youtube\.com)\/shorts\/([a-zA-Z0-9_-]+)/i);
    if (shortsMatch) {
        return {
            valid: true,
            platform: "youtube",
            normalizedUrl: `https://www.youtube.com/shorts/${shortsMatch[1]}`,
        };
    }
    // youtu.be/ID
    const shortMatch = url.match(/youtu\.be\/([a-zA-Z0-9_-]+)/i);
    if (shortMatch) {
        return {
            valid: true,
            platform: "youtube",
            normalizedUrl: `https://www.youtube.com/watch?v=${shortMatch[1]}`,
        };
    }
    return { valid: false, error: "Could not extract video ID from YouTube URL" };
}
/**
 * Validate a video URL and detect platform.
 * Returns platform, normalized URL, or error.
 */
export function validateUrl(url) {
    const trimmed = url.trim();
    if (!trimmed) {
        return { valid: false, error: "URL is required" };
    }
    if (trimmed.length > MAX_URL_LENGTH) {
        return { valid: false, error: `URL exceeds maximum length of ${MAX_URL_LENGTH} characters` };
    }
    if (isSuspicious(trimmed)) {
        return { valid: false, error: "URL contains suspicious content" };
    }
    // Try YouTube first (youtu.be could match before other checks)
    const ytResult = validateYouTube(trimmed);
    if (ytResult.valid)
        return ytResult;
    // Try Instagram
    const igResult = validateInstagram(trimmed);
    if (igResult.valid)
        return igResult;
    // Try TikTok
    const ttResult = validateTikTok(trimmed);
    if (ttResult.valid)
        return ttResult;
    return {
        valid: false,
        error: "Unsupported URL. Provide an Instagram, TikTok, or YouTube video URL.",
    };
}
//# sourceMappingURL=validators.js.map