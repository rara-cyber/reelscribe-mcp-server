import { z } from "zod";
import * as api from "../client.js";
export function register(server) {
    server.tool("get_transcription", "Get a transcription by its ID or requestId. Returns the full transcription text when completed, or status/error info if still processing or failed.", {
        id: z.string().optional().describe("Transcription ID (from list results)"),
        requestId: z
            .string()
            .optional()
            .describe("Request ID (from transcribe_video result)"),
    }, async ({ id, requestId }) => {
        if (!id && !requestId) {
            return {
                content: [
                    {
                        type: "text",
                        text: JSON.stringify({
                            error: true,
                            code: "INVALID_REQUEST",
                            message: "Provide either id or requestId",
                        }, null, 2),
                    },
                ],
            };
        }
        try {
            const result = await api.getTranscription({ id, requestId });
            return {
                content: [
                    { type: "text", text: JSON.stringify(result, null, 2) },
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
//# sourceMappingURL=getTranscription.js.map