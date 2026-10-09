import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ApiClient } from "./client.js";
import { register as transcribe } from "./tools/transcribe.js";
import { register as get } from "./tools/getTranscription.js";
import { register as list } from "./tools/listTranscriptions.js";
import { register as search } from "./tools/searchTranscriptions.js";
import { register as credits } from "./tools/getCredits.js";
import { register as validate } from "./tools/validateUrl.js";

export function createServer(api?: ApiClient, hosted = false) {
  const server = new McpServer({ name: "reelscribe.app", version: "2.0.0" });
  transcribe(server, api, !hosted);
  get(server, api);
  list(server, api);
  search(server, api);
  credits(server, api, !hosted);
  validate(server);
  return server;
}
