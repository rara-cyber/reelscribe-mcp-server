/**
 * URL validation for supported platforms.
 * Ported from src/utils/validators.ts — standalone, no app dependencies.
 */
export interface ValidateResult {
    valid: boolean;
    platform?: "instagram" | "tiktok" | "youtube";
    normalizedUrl?: string;
    error?: string;
}
/**
 * Validate a video URL and detect platform.
 * Returns platform, normalized URL, or error.
 */
export declare function validateUrl(url: string): ValidateResult;
