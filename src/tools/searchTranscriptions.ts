import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import * as api from "../client.js";
import type { TranscriptionList } from "../client.js";

/**
 * The `?url=` search is a substring match over a bounded window of the caller's
 * most recent transcriptions, capped at a fixed number of matches — so both a
 * miss and the match count are "within what was searched", not "in the library".
 *
 * The exact bounds are server-side constants (convex/readBudget.ts) and are not
 * restated here: a copy of them would read as fact and drift silently. What is
 * reported instead is what this response actually contains.
 */
const BOUNDED_SEARCH_NOTE =
  "This searches a bounded window of your most recent transcriptions and " +
  "returns a capped number of matches, so it is not proof about the whole " +
  "library — an older match may exist and not appear here.";

export function buildSearchPayload(result: TranscriptionList) {
  // Never `result.total`: on the list route that field is a page length, and
  // reading it here would keep the same trap alive in a second place.
  const matches = result.transcriptions ?? [];

  if (matches.length === 0) {
    return {
      found: false,
      matchesReturned: 0,
      message: `No transcription found for this URL. ${BOUNDED_SEARCH_NOTE}`,
    };
  }

  return {
    found: true,
    matchesReturned: matches.length,
    // Newest first, as returned by the API.
    transcription: matches[0],
    ...(matches.length > 1
      ? {
          otherMatches: matches.slice(1).map((t) => ({
            id: t.id,
            url: t.url,
            status: t.status,
            createdAt: t.createdAt,
          })),
        }
      : {}),
    note: BOUNDED_SEARCH_NOTE,
  };
}

export function register(server: McpServer) {
  server.tool(
    "search_transcriptions",
    "Find transcriptions whose original video URL contains the given string. " +
      "Returns the newest match in full, plus ids of any other matches. Useful " +
      "for checking whether a video has already been transcribed. The search " +
      "covers a bounded window of your most recent transcriptions and returns a " +
      "capped number of matches, so `found: false` means \"not found in that " +
      "window\" — it does not prove the video was never transcribed, and " +
      "`matchesReturned` is not a library-wide count.",
    {
      url: z.string().describe("The video URL to search for"),
    },
    async ({ url }) => {
      try {
        const result = await api.searchTranscriptionsByUrl(url);

        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(buildSearchPayload(result), null, 2),
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
