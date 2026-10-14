import { afterEach, expect, test } from "bun:test";
import worker from "../src/worker.js";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { createServer } from "../src/server.js";
import { createApiClient } from "../src/client.js";

const originalFetch = globalThis.fetch;
afterEach(() => { globalThis.fetch = originalFetch; });
const env = { CLERK_ISSUER: "https://clerk.reelscribe.app" };
function request(method: string, params: unknown) {
  return new Request("https://reelscribe-mcp.sian-agency.workers.dev/mcp", {
    method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json, text/event-stream", Authorization: "Bearer test" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  });
}

test("MCP exposes a boolean comment opt-in with platform and selection limits", async () => {
  globalThis.fetch = (async (_input: RequestInfo | URL) => Response.json({ authenticated: true })) as typeof fetch;
  const result = await (await worker.fetch(request("tools/list", {}), env)).json() as any;
  const tool = result.result.tools.find((tool: any) => tool.name === "transcribe_video");
  expect(tool.inputSchema.properties.includeComments.type).toBe("boolean");
  expect(tool.inputSchema.required).not.toContain("includeComments");
  expect(tool.inputSchema.properties.includeComments.description).toContain("Instagram, TikTok and YouTube");
  expect(tool.inputSchema.properties.includeComments.description).toContain("not the full thread");
});

for (const includeComments of [undefined, false, true]) {
  test(`MCP forwards comments only when explicitly enabled (${includeComments})`, async () => {
    const bodies: unknown[] = [];
    globalThis.fetch = (async (url: RequestInfo | URL, init?: RequestInit) => {
      if (String(url).endsWith("/auth")) return Response.json({ authenticated: true });
      bodies.push(JSON.parse(String(init?.body)));
      return Response.json({ requestId: "job", status: "processing" });
    }) as typeof fetch;
    await worker.fetch(request("tools/call", { name: "transcribe_video", arguments: {
      url: "https://www.youtube.com/watch?v=vXUPEow4Itw", ...(includeComments !== undefined && { includeComments }),
    } }), env);
    expect(bodies).toEqual([{ url: "https://www.youtube.com/watch?v=vXUPEow4Itw", ...(includeComments && { includeComments: true }) }]);
  });
}

test("MCP rejects Facebook comment extraction without creating a job", async () => {
  const calls: string[] = [];
  globalThis.fetch = (async (url: RequestInfo | URL) => { calls.push(String(url)); return Response.json({ authenticated: true }); }) as typeof fetch;
  const response = await worker.fetch(request("tools/call", { name: "transcribe_video", arguments: {
    url: "https://www.facebook.com/reel/123456789/", includeComments: true,
  } }), env);
  const result = await response.json() as any;
  expect(JSON.parse(result.result.content[0].text).code).toBe("INVALID_OPTION");
  expect(calls).toEqual(["https://reelscribe.app/v1/auth"]);
});

test("MCP retrieves saved comment text unchanged and cannot enable it with a string", async () => {
  const comments = [{ text: "<script>sample</script>", author: "creator", likes: 2, isPinned: false, isCreator: true }];
  const calls: string[] = [];
  globalThis.fetch = (async (url: RequestInfo | URL) => {
    calls.push(String(url));
    return Response.json(String(url).endsWith("/auth") ? { authenticated: true } : { status: "completed", comments });
  }) as typeof fetch;
  const result = await (await worker.fetch(request("tools/call", { name: "get_transcription", arguments: { requestId: "saved" } }), env)).json() as any;
  expect(JSON.parse(result.result.content[0].text).comments).toEqual(comments);
  calls.length = 0;
  const invalid = await (await worker.fetch(request("tools/call", { name: "transcribe_video", arguments: {
    url: "https://www.youtube.com/watch?v=vXUPEow4Itw", includeComments: "true",
  } }), env)).json() as any;
  expect(invalid.result.isError).toBe(true);
  expect(calls).toEqual(["https://reelscribe.app/v1/auth"]);
});

test("local MCP forwards the opt-in and explains duplicate reuse without extracting again", async () => {
  const bodies: unknown[] = [];
  globalThis.fetch = (async (url: RequestInfo | URL, init?: RequestInit) => {
    if (String(url).endsWith("/transcribe")) {
      bodies.push(JSON.parse(String(init?.body)));
      return Response.json({ duplicate: true, transcription: { id: "saved" } });
    }
    return Response.json({ id: "saved", status: "completed", comments: null });
  }) as typeof fetch;
  const server = createServer(createApiClient(() => "test"));
  const client = new Client({ name: "test", version: "1" });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  await Promise.all([client.connect(clientTransport), server.connect(serverTransport)]);
  try {
    const result = await client.callTool({ name: "transcribe_video", arguments: {
      url: "https://youtu.be/vXUPEow4Itw", includeComments: true,
    } }) as any;
    const payload = JSON.parse(result.content[0].text);
    expect(bodies).toEqual([{ url: "https://www.youtube.com/watch?v=vXUPEow4Itw", includeComments: true }]);
    expect(payload).toMatchObject({ duplicate: true, comments: null });
    expect(payload.note).toContain("no new comments were extracted");
  } finally { await client.close(); await server.close(); }
});
