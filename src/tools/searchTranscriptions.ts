import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import * as api from "../client.js";

export function register(server: McpServer) {
  server.tool(
    "search_transcriptions",
    "Search for a transcription by the original video URL. Returns the most recent match. Useful for checking if a video has already been transcribed.",
    {
      url: z.string().describe("The video URL to search for"),
    },
    async ({ url }) => {
      try {
        const result = await api.searchTranscriptionsByUrl(url);

        if (result.total === 0) {
          return {
            content: [
              {
                type: "text" as const,
                text: JSON.stringify(
                  {
                    found: false,
                    message: "No transcription found for this URL.",
                  },
                  null,
                  2
                ),
              },
            ],
          };
        }

        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(
                { found: true, transcription: result.transcriptions[0] },
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
