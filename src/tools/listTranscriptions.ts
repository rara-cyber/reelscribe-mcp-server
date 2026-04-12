import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import * as api from "../client.js";

export function register(server: McpServer) {
  server.tool(
    "list_transcriptions",
    "List your transcriptions with optional status filter. Returns a list with URL, platform, status, and transcript preview.",
    {
      status: z
        .enum(["submitted", "processing", "completed", "failed", "cancelled"])
        .optional()
        .describe("Filter by transcription status"),
    },
    async ({ status }) => {
      try {
        const result = await api.listTranscriptions({ status });

        const summary =
          result.total === 0
            ? "No transcriptions found."
            : `Found ${result.total} transcription(s).`;

        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({ summary, ...result }, null, 2),
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
