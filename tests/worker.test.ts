import { afterEach, expect, test } from "bun:test";
import worker from "../src/worker.js";

const realFetch = globalThis.fetch;
const env = { CLERK_ISSUER: "https://clerk.reelscribe.app" };
afterEach(() => { globalThis.fetch = realFetch; });

function request(method: string, params: unknown, token?: string) {
  return new Request("https://mcp.reelscribe.app/mcp", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json, text/event-stream",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  });
}

test("OAuth discovery is public and missing credentials receive a challenge", async () => {
  const discovery = await worker.fetch(new Request("https://mcp.reelscribe.app/.well-known/oauth-protected-resource/mcp"), env);
  expect(await discovery.json()).toMatchObject({ resource: "https://reelscribe-mcp.sian-agency.workers.dev/mcp", authorization_servers: [env.CLERK_ISSUER], scopes_supported: ["reelscribe:mcp"] });
  const response = await worker.fetch(request("tools/list", {}), env);
  expect(response.status).toBe(401);
  expect(response.headers.get("WWW-Authenticate")).toContain("oauth-protected-resource/mcp");
});

test("invalid and unavailable upstream authentication fail closed", async () => {
  globalThis.fetch = (async (_input: RequestInfo | URL) => new Response("{}", { status: 401 })) as typeof fetch;
  expect((await worker.fetch(request("tools/list", {}, "invalid"), env)).status).toBe(401);
  globalThis.fetch = (async (_input: RequestInfo | URL) => new Response("{}", { status: 503 })) as typeof fetch;
  expect((await worker.fetch(request("tools/list", {}, "invalid"), env)).status).toBe(503);
});

test("concurrent users keep their own credentials and hosted tools expose no upsell", async () => {
  const tokens: string[] = [];
  globalThis.fetch = (async (url: RequestInfo | URL, init?: RequestInit) => {
    const token = new Headers(init?.headers).get("Authorization")!;
    tokens.push(token);
    await new Promise(resolve => setTimeout(resolve, token.endsWith("alice") ? 10 : 1));
    return Response.json(String(url).endsWith("/auth") ? { authenticated: true } : { credits: token.endsWith("alice") ? 10 : 20, tier: "free", storageUsed: 0, retention: null });
  }) as typeof fetch;
  const responses = await Promise.all(["alice", "bob"].map(token => worker.fetch(request("tools/call", { name: "get_credits", arguments: {} }, token), env)));
  const results = await Promise.all(responses.map(r => r.json())) as any[];
  expect(results.map(r => JSON.parse(r.result.content[0].text).credits)).toEqual([10, 20]);
  expect(results.every(r => !r.result.content[0].text.includes("purchaseCreditsUrl"))).toBe(true);
  expect(tokens.sort()).toEqual(["Bearer alice", "Bearer alice", "Bearer bob", "Bearer bob"]);
});

test("untrusted browser origins and a misrouted auth response fail closed", async () => {
  const crossOrigin = request("tools/list", {}, "alice");
  crossOrigin.headers.set("Origin", "https://evil.example");
  expect((await worker.fetch(crossOrigin, env)).status).toBe(403);
  globalThis.fetch = (async (_input: RequestInfo | URL) => new Response("<html>SPA</html>")) as typeof fetch;
  expect((await worker.fetch(request("tools/list", {}, "alice"), env)).status).toBe(503);
});

test("hosted transcription returns the job promptly without polling", async () => {
  const paths: string[] = [];
  globalThis.fetch = (async (url: RequestInfo | URL) => {
    const path = new URL(String(url)).pathname;
    paths.push(path);
    return Response.json(path.endsWith("/auth") ? { authenticated: true } : { requestId: "job-1", status: "processing" });
  }) as typeof fetch;
  const response = await worker.fetch(request("tools/call", { name: "transcribe_video", arguments: { url: "https://www.instagram.com/reel/ABC123/" } }, "alice"), env);
  const result = await response.json() as any;
  expect(JSON.parse(result.result.content[0].text)).toMatchObject({ requestId: "job-1", status: "processing" });
  expect(paths).toEqual(["/v1/auth", "/v1/transcribe"]);
});

test("stateless initialization and tool discovery work across requests", async () => {
  globalThis.fetch = (async (_input: RequestInfo | URL) => Response.json({ authenticated: true })) as typeof fetch;
  const initialized = await worker.fetch(request("initialize", { protocolVersion: "2025-03-26", capabilities: {}, clientInfo: { name: "test", version: "1" } }, "alice"), env);
  expect(initialized.status).toBe(200);
  expect((await initialized.json() as any).result.serverInfo.name).toBe("reelscribe.app");
  const listed = await worker.fetch(request("tools/list", {}, "alice"), env);
  const tools = (await listed.json() as any).result.tools;
  expect(tools.map((tool: any) => tool.name).sort()).toEqual(["get_credits", "get_transcription", "list_transcriptions", "search_transcriptions", "transcribe_video", "validate_url"]);
  expect(tools.find((tool: any) => tool.name === "transcribe_video").annotations.destructiveHint).toBe(true);
  const invalid = await worker.fetch(request("tools/call", { name: "transcribe_video", arguments: { url: "https://evil.example/video" } }, "alice"), env);
  expect(JSON.parse((await invalid.json() as any).result.content[0].text).code).toBe("INVALID_URL");
});
