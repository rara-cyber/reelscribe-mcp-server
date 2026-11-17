import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import * as defaultApi from "../client.js";
import type { ApiClient } from "../client.js";
import { ExpectedToolError, toolApiError } from "../toolError.js";

export function register(server: McpServer, api: ApiClient = defaultApi) {
  server.tool(
    "get_transcription",
    "Get a transcription by its ID or requestId. Returns the full transcription text and any extracted comments when completed, or status/error info if still processing or failed.",
    {
      id: z.string().optional().describe("Transcription ID"),
      requestId: z
        .string()
        .optional()
        .describe("Transcription job request ID"),
    },
    { title: "Get transcription", readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    async ({ id, requestId }) => {
      if (!id && !requestId) {
        throw new ExpectedToolError(JSON.stringify({
          error: true,
          code: "INVALID_REQUEST",
          message: "Provide either id or requestId",
        }, null, 2));
      }

      try {
        const result = await api.getTranscription({ id, requestId });
        return {
          content: [
            { type: "text" as const, text: JSON.stringify(result, null, 2) },
          ],
        };
      } catch (err) {
        throw toolApiError(err, "API_ERROR");
      }
    }
  );
}
