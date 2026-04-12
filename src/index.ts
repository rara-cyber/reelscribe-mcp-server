#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

import { register as registerTranscribe } from "./tools/transcribe.js";
import { register as registerGetTranscription } from "./tools/getTranscription.js";
import { register as registerListTranscriptions } from "./tools/listTranscriptions.js";
import { register as registerSearchTranscriptions } from "./tools/searchTranscriptions.js";
import { register as registerGetCredits } from "./tools/getCredits.js";
import { register as registerValidateUrl } from "./tools/validateUrl.js";

const server = new McpServer({
  name: "reelscribe",
  version: "1.0.0",
});

// Register all tools
registerTranscribe(server);
registerGetTranscription(server);
registerListTranscriptions(server);
registerSearchTranscriptions(server);
registerGetCredits(server);
registerValidateUrl(server);

// Start server with stdio transport
const transport = new StdioServerTransport();
await server.connect(transport);
