import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import * as api from "../client.js";
import { validateUrl } from "../validators.js";

const POLL_INTERVAL_MS = 3_000;
const MAX_WAIT_MS = 90_000;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function register(server: McpServer) {
  server.tool(
    "transcribe_video",
    "Submit a video URL for transcription and wait for the result. Supports Instagram Reels/Posts, TikTok videos, YouTube videos/Shorts, and Facebook videos/Reels. Costs 1 credit. Returns the full transcription when complete. There is no storage quota, so a submission is never rejected for having too many saved transcriptions.",
    { url: z.string().describe("Video URL (Instagram, TikTok, YouTube, or Facebook)") },
    async ({ url }) => {
      const validation = validateUrl(url);
      if (!validation.valid) {
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(
                { error: true, code: "INVALID_URL", message: validation.error },
                null,
                2
              ),
            },
          ],
        };
      }

      try {
        const result = await api.transcribe(validation.normalizedUrl!);

        // If duplicate, fetch and return the existing transcription directly
        if (result.duplicate && result.transcription?.id) {
          const existing = await api.getTranscription({ id: result.transcription.id });
          return {
            content: [
              {
                type: "text" as const,
                text: JSON.stringify(
                  { ...existing, platform: validation.platform, duplicate: true },
                  null,
                  2
                ),
              },
            ],
          };
        }

        // Poll until completed, failed, or timeout
        const requestId = result.requestId;
        const start = Date.now();

        while (Date.now() - start < MAX_WAIT_MS) {
          await sleep(POLL_INTERVAL_MS);
          const transcription = await api.getTranscription({ requestId });

          if (transcription.status === "completed" || transcription.status === "failed") {
            return {
              content: [
                {
                  type: "text" as const,
                  text: JSON.stringify(
                    { ...transcription, platform: validation.platform },
                    null,
                    2
                  ),
                },
              ],
            };
          }
        }

        // Timeout — return what we have so the user can check manually
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(
                {
                  requestId,
                  status: "processing",
                  platform: validation.platform,
                  message: "Transcription is still processing. Use get_transcription with this requestId to check later.",
                },
                null,
                2
              ),
            },
          ],
        };
      } catch (err) {
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(
                {
                  error: true,
                  code: "API_ERROR",
                  message: err instanceof Error ? err.message : String(err),
                },
                null,
                2
              ),
            },
          ],
        };
      }
    }
  );
}
