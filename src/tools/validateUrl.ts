import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { validateUrl } from "../validators.js";

export function register(server: McpServer) {
  server.tool(
    "validate_url",
    "Check if a URL is a supported video platform (Instagram, TikTok, YouTube) without submitting for transcription. Returns the detected platform and normalized URL.",
    {
      url: z.string().describe("URL to validate"),
    },
    async ({ url }) => {
      const result = validateUrl(url);
      return {
        content: [
          { type: "text" as const, text: JSON.stringify(result, null, 2) },
        ],
      };
    }
  );
}
