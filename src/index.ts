#!/usr/bin/env node

import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

import { createServer } from "./server.js";

const server = createServer();

// Start server with stdio transport
const transport = new StdioServerTransport();
await server.connect(transport);
