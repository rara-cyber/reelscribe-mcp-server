import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import * as defaultApi from "../client.js";
import type { ApiClient } from "../client.js";
import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from "../client.js";
import type { Transcription, TranscriptionList } from "../client.js";

/**
 * Transcript characters kept per row in a list response.
 *
 * A page can be 200 rows and a transcript runs to several thousand characters,
 * so returning full text here would push the better part of a megabyte through
 * a model's context for a request that is usually "what have I got?". The full
 * text is one `get_transcription` call away.
 */
export const PREVIEW_CHARS = 500;

export interface TranscriptionPreview {
  id: string;
  url: string;
  platform: string | null;
  status: string;
  owner: string | null;
  caption: string | null;
  duration: number | null;
  createdAt: number;
  transcriptPreview: string | null;
  transcriptChars: number | null;
  transcriptTruncated: boolean;
}

export function toPreview(t: Transcription): TranscriptionPreview {
  const full = t.transcription ?? null;
  return {
    id: t.id,
    url: t.url,
    platform: t.platform,
    status: t.status,
    owner: t.owner,
    // Captions are routinely longer than the transcript preview itself and are
    // rarely what the model is reasoning over.
    caption: t.caption ? t.caption.slice(0, 200) : null,
    duration: t.duration,
    createdAt: t.createdAt,
    transcriptPreview: full ? full.slice(0, PREVIEW_CHARS) : null,
    transcriptChars: full ? full.length : null,
    transcriptTruncated: full !== null && full.length > PREVIEW_CHARS,
  };
}

/**
 * Shape one page for a model.
 *
 * This is the function the 1.0.5 bug lived in. It rendered
 * `Found ${result.total} transcription(s)` — and since 2026-07-31 `total` is the
 * length of the page, so an agent asked "how many transcriptions do I have?"
 * was told 100 by a library of 2,000, with nothing in the payload to suggest
 * otherwise. Nothing here reads `total`, no field is named `total`, and
 * `libraryTotal` is explicitly null whenever the answer is genuinely unknown —
 * a null an agent has to handle beats a number it will quote.
 *
 * `requestedCursor` is what the caller passed in: a first page that reports no
 * further pages really is the complete set for the query, and that is the only
 * case in which a total can be stated at all.
 */
export function buildListPayload(
  result: TranscriptionList,
  requestedCursor?: string
) {
  const rows = result.transcriptions ?? [];
  const hasMore = result.hasMore ?? false;
  const isFirstPage = !requestedCursor;
  // The whole set was returned only if we started at the beginning and the API
  // says there is nothing after this page.
  const isCompleteSet = isFirstPage && !hasMore;

  const previews = rows.map(toPreview);
  const anyTruncated = previews.some((p) => p.transcriptTruncated);

  const notes: string[] = [];
  if (!isCompleteSet) {
    notes.push(
      "`returned` counts THIS PAGE only and is not the number of transcriptions " +
        "in the library. The API does not report a library total, so `libraryTotal` " +
        "is null and no total can be stated from this response. To enumerate " +
        "everything, keep calling list_transcriptions with `cursor` set to " +
        "`nextCursor` until `hasMore` is false. For a library-wide figure, " +
        "get_credits reports `library.completedTranscriptions`."
    );
  }
  if (anyTruncated) {
    notes.push(
      `Transcripts are previews (first ${PREVIEW_CHARS} characters; ` +
        "`transcriptChars` is the full length). Call get_transcription with an " +
        "id to read one in full."
    );
  }

  const summary =
    rows.length === 0
      ? isCompleteSet
        ? "No transcriptions found."
        : "No transcriptions on this page."
      : isCompleteSet
        ? `Showing all ${rows.length} transcription(s) matching this query.`
        : `Showing ${rows.length} transcription(s) on this page — not the full library.`;

  return {
    summary,
    returned: rows.length,
    // Non-null only when this response provably covers the whole result set.
    libraryTotal: isCompleteSet ? rows.length : null,
    hasMore,
    nextCursor: result.nextCursor ?? null,
    ...(notes.length ? { notes } : {}),
    transcriptions: previews,
  };
}

export function register(server: McpServer, api: ApiClient = defaultApi) {
  server.tool(
    "list_transcriptions",
    `List ONE PAGE of your transcriptions, newest first (default ${DEFAULT_PAGE_SIZE}, max ${MAX_PAGE_SIZE}). ` +
      "This is a page, not a count of the library: the API does not report a library " +
      "total, so never present the number of rows returned as the number of " +
      "transcriptions the user has. When `hasMore` is true, more pages exist — pass " +
      "`nextCursor` back as `cursor`. Only when `libraryTotal` is non-null is the " +
      "count complete. Transcripts are returned as previews; use get_transcription " +
      "with an id for the full text, or get_credits for a library-wide count of " +
      "completed transcriptions.",
    {
      status: z
        .enum(["submitted", "processing", "completed", "failed", "cancelled"])
        .optional()
        .describe("Filter by transcription status"),
      cursor: z
        .string()
        .optional()
        .describe("`nextCursor` from a previous call, to fetch the following page"),
      limit: z
        .number()
        .int()
        .min(1)
        .max(MAX_PAGE_SIZE)
        .optional()
        .describe(
          `Rows per page (default ${DEFAULT_PAGE_SIZE}, max ${MAX_PAGE_SIZE})`
        ),
    },
    { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    async ({ status, cursor, limit }) => {
      try {
        const result = await api.listTranscriptions({
          status,
          cursor,
          limit: limit ?? DEFAULT_PAGE_SIZE,
        });

        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(buildListPayload(result, cursor), null, 2),
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
