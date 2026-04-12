import { z } from "zod";
import * as api from "../client.js";
import { validateUrl } from "../validators.js";
export function register(server) {
    server.tool("transcribe_video", "Submit a video URL for transcription. Supports Instagram Reels/Posts, TikTok videos, and YouTube videos/Shorts. Costs 1 credit. Returns a requestId to check status later.", { url: z.string().describe("Video URL (Instagram, TikTok, or YouTube)") }, async ({ url }) => {
        const validation = validateUrl(url);
        if (!validation.valid) {
            return {
                content: [
                    {
                        type: "text",
                        text: JSON.stringify({ error: true, code: "INVALID_URL", message: validation.error }, null, 2),
                    },
                ],
            };
        }
        try {
            const result = await api.transcribe(validation.normalizedUrl);
            return {
                content: [
                    {
                        type: "text",
                        text: JSON.stringify({
                            ...result,
                            platform: validation.platform,
                            tip: result.duplicate
                                ? "This video was already transcribed. Use get_transcription to see the result."
                                : "Transcription submitted. Use get_transcription with the requestId to check status.",
                        }, null, 2),
                    },
                ],
            };
        }
        catch (err) {
            return {
                content: [
                    {
                        type: "text",
                        text: JSON.stringify({
                            error: true,
                            code: "API_ERROR",
                            message: err instanceof Error ? err.message : String(err),
                        }, null, 2),
                    },
                ],
            };
        }
    });
}
//# sourceMappingURL=transcribe.js.map