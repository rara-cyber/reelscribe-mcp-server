import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { createApiClient } from "./client.js";
import { createServer } from "./server.js";

interface Env {
  CLERK_ISSUER: string;
}

const RESOURCE = "https://mcp.reelscribe.app/mcp";
const METADATA = "https://mcp.reelscribe.app/.well-known/oauth-protected-resource/mcp";
const HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, GET, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Authorization, Content-Type, Accept, MCP-Protocol-Version, MCP-Session-Id",
  "Access-Control-Expose-Headers": "WWW-Authenticate, MCP-Session-Id",
  "Cache-Control": "no-store",
};

function response(body: unknown, status = 200, headers: Record<string, string> = {}) {
  return Response.json(body, { status, headers: { ...HEADERS, ...headers } });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const path = new URL(request.url).pathname;
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: HEADERS });
    if (path === "/health") return response({ healthy: true });
    if (path === "/.well-known/oauth-protected-resource" || path === "/.well-known/oauth-protected-resource/mcp") {
      return response({ resource: RESOURCE, authorization_servers: [env.CLERK_ISSUER], scopes_supported: ["reelscribe:mcp"], bearer_methods_supported: ["header"], resource_name: "ReelScribe", resource_documentation: "https://reelscribe.app/mcp" });
    }
    if (path !== "/mcp") return response({ error: "not_found" }, 404);
    const origin = request.headers.get("Origin");
    if (origin && !["https://chatgpt.com", "https://claude.ai", "https://reelscribe.app", "https://www.reelscribe.app"].includes(origin)) {
      return response({ error: "origin_not_allowed" }, 403);
    }

    const token = request.headers.get("Authorization")?.match(/^Bearer\s+(\S+)$/i)?.[1];
    const challenge = () => response({ error: "unauthorized" }, 401, { "WWW-Authenticate": `Bearer resource_metadata="${METADATA}", scope="reelscribe:mcp"` });
    if (!token || token.length > 8192) return challenge();

    // Validate before tools/list or initialize, too; the API enforces Clerk scope and ownership.
    let auth: Response;
    try {
      auth = await fetch("https://reelscribe.app/v1/auth", { headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(10_000) });
    } catch {
      return response({ error: "authentication_unavailable" }, 503);
    }
    if (auth.status === 401 || auth.status === 403) return challenge();
    if (!auth.ok) return response({ error: "authentication_unavailable" }, 503);
    try {
      if ((await auth.json() as { authenticated?: unknown }).authenticated !== true) {
        return response({ error: "authentication_unavailable" }, 503);
      }
    } catch {
      return response({ error: "authentication_unavailable" }, 503);
    }

    // Each request gets a server and credential closure; no user state is shared between requests.
    const server = createServer(createApiClient(() => token), true);
    const transport = new WebStandardStreamableHTTPServerTransport({ sessionIdGenerator: undefined, enableJsonResponse: true });
    await server.connect(transport);
    try {
      const result = await transport.handleRequest(request);
      const headers = new Headers(result.headers);
      for (const [key, value] of Object.entries(HEADERS)) headers.set(key, value);
      return new Response(await result.arrayBuffer(), { status: result.status, headers });
    } finally {
      await server.close();
    }
  },
};
