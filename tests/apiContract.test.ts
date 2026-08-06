/**
 * End-to-end tool tests against a stubbed ReelScribe v1 API.
 *
 * These drive the real registered MCP tools over an in-memory transport rather
 * than calling the payload builders directly, so a tool description and the
 * string a model actually receives are both covered. The regression they exist
 * to pin is the 1.0.5 behaviour: `Found ${result.total} transcription(s)`, where
 * `total` became the PAGE length on 2026-07-31 — an agent asking "how many
 * transcriptions do I have?" was told 100 by a library of 2,000, confidently and
 * undetectably.
 */

import { describe, expect, test, afterEach } from "bun:test";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";

import { register as registerList } from "../src/tools/listTranscriptions.js";
import { register as registerCredits } from "../src/tools/getCredits.js";
import { register as registerSearch } from "../src/tools/searchTranscriptions.js";
import type { Transcription } from "../src/client.js";

const realFetch = globalThis.fetch;
process.env.REELSCRIBE_API_KEY ??= "rs_" + "0".repeat(32);

interface Call {
  url: string;
}

/** Stub the API with one canned JSON body; returns the requests that were made. */
function stubApi(body: unknown): Call[] {
  const calls: Call[] = [];
  globalThis.fetch = (async (input: RequestInfo | URL) => {
    calls.push({ url: String(input) });
    return new Response(JSON.stringify(body), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }) as typeof fetch;
  return calls;
}

afterEach(() => {
  globalThis.fetch = realFetch;
});

async function connect(
  register: (server: McpServer) => void
): Promise<Client> {
  const server = new McpServer({ name: "test", version: "0.0.0" });
  register(server);
  const [clientTransport, serverTransport] =
    InMemoryTransport.createLinkedPair();
  const client = new Client({ name: "test-client", version: "0.0.0" });
  await Promise.all([
    client.connect(clientTransport),
    server.connect(serverTransport),
  ]);
  return client;
}

async function callTool(
  register: (server: McpServer) => void,
  name: string,
  args: Record<string, unknown> = {}
): Promise<{ text: string; json: any }> {
  const client = await connect(register);
  const result: any = await client.callTool({ name, arguments: args });
  const text: string = result.content[0].text;
  return { text, json: JSON.parse(text) };
}

function row(i: number, transcriptChars = 4_000): Transcription {
  return {
    id: `t${i}`,
    requestId: `r${i}`,
    url: `https://www.instagram.com/reel/ABC${i}/`,
    platform: "instagram",
    status: "completed",
    transcription: "x".repeat(transcriptChars),
    createdAt: 1_760_000_000_000 + i,
    completedAt: 1_760_000_000_500 + i,
    caption: null,
    hashtags: null,
    mentions: null,
    owner: "someone",
    duration: 30,
    stats: null,
    segments: null,
    thumbnailUrl: null,
    videoTimestamp: null,
    errorMessage: null,
    errorType: null,
  };
}

// ---------------------------------------------------------------------------
// The page-vs-total regression
// ---------------------------------------------------------------------------

describe("list_transcriptions: a page is never reported as a total", () => {
  /** Exactly what the live API returns for a library larger than one page. */
  const PAGE_OF_A_LARGER_LIBRARY = {
    transcriptions: Array.from({ length: 100 }, (_, i) => row(i)),
    // `total` is the PAGE length. 1.0.5 rendered this as the library total.
    total: 100,
    nextCursor: "cursor-page-2",
    hasMore: true,
  };

  test("never states a total when more pages exist", async () => {
    stubApi(PAGE_OF_A_LARGER_LIBRARY);
    const { text, json } = await callTool(registerList, "list_transcriptions");

    // The exact 1.0.5 string, and any close relative of it.
    expect(text).not.toContain("Found 100 transcription");
    expect(text).not.toMatch(/Found \d+ transcription/);
    // `total` must not appear as a field name at all — it is the trap.
    expect(json).not.toHaveProperty("total");
    expect(Object.keys(json)).not.toContain("total");

    // The unknown must be surfaced as unknown, not omitted.
    expect(json.libraryTotal).toBeNull();
    expect(json.returned).toBe(100);
    expect(json.hasMore).toBe(true);
    expect(json.nextCursor).toBe("cursor-page-2");
    expect(json.summary).toContain("not the full library");
    expect(json.notes.join(" ")).toContain("does not report a library total");
  });

  test("no number in the payload can be read as a library size", async () => {
    stubApi(PAGE_OF_A_LARGER_LIBRARY);
    const { json } = await callTool(registerList, "list_transcriptions");

    // Every top-level number must be either the page size or explicitly page-scoped.
    const numericFields = Object.entries(json).filter(
      ([, v]) => typeof v === "number"
    );
    expect(numericFields.map(([k]) => k).sort()).toEqual(["returned"]);
  });

  test("states a total only when the response provably covers everything", async () => {
    stubApi({
      transcriptions: [row(1, 10), row(2, 10)],
      total: 2,
      nextCursor: null,
      hasMore: false,
    });
    const { json } = await callTool(registerList, "list_transcriptions");

    expect(json.libraryTotal).toBe(2);
    expect(json.returned).toBe(2);
    expect(json.hasMore).toBe(false);
    expect(json.summary).toContain("all 2 transcription(s)");
  });

  test("a last page reached by cursor is still not a total", async () => {
    stubApi({
      transcriptions: [row(1, 10)],
      total: 1,
      nextCursor: null,
      hasMore: false,
    });
    // `cursor` set means earlier pages exist that this response cannot see.
    const { json } = await callTool(registerList, "list_transcriptions", {
      cursor: "cursor-page-2",
    });

    expect(json.libraryTotal).toBeNull();
    expect(json.summary).toContain("not the full library");
  });

  test("the tool description warns against reading a page as a count", async () => {
    const client = await connect(registerList);
    const { tools } = await client.listTools();
    const description = tools.find(
      (t) => t.name === "list_transcriptions"
    )!.description!;

    expect(description).toContain("ONE PAGE");
    expect(description).toContain("does not report a library");
    expect(description.toLowerCase()).toContain("nextcursor");
  });

  test("sends cursor and a bounded limit to the API", async () => {
    const calls = stubApi({
      transcriptions: [],
      total: 0,
      nextCursor: null,
      hasMore: false,
    });
    await callTool(registerList, "list_transcriptions", {
      cursor: "abc",
      limit: 50,
      status: "completed",
    });

    const url = new URL(calls[0].url);
    expect(url.searchParams.get("cursor")).toBe("abc");
    expect(url.searchParams.get("limit")).toBe("50");
    expect(url.searchParams.get("status")).toBe("completed");
  });

  test("defaults to a page size rather than whatever the API defaults to", async () => {
    const calls = stubApi({
      transcriptions: [],
      total: 0,
      nextCursor: null,
      hasMore: false,
    });
    await callTool(registerList, "list_transcriptions");
    expect(new URL(calls[0].url).searchParams.get("limit")).toBe("20");
  });

  test("transcripts are previewed, with the full length reported", async () => {
    stubApi({
      transcriptions: [row(1, 4_000)],
      total: 1,
      nextCursor: null,
      hasMore: false,
    });
    const { json } = await callTool(registerList, "list_transcriptions");

    const item = json.transcriptions[0];
    expect(item.transcriptPreview).toHaveLength(500);
    expect(item.transcriptChars).toBe(4_000);
    expect(item.transcriptTruncated).toBe(true);
    expect(json.notes.join(" ")).toContain("get_transcription");
  });
});

// ---------------------------------------------------------------------------
// Credits: the post-2026-07-31 shape
// ---------------------------------------------------------------------------

describe("get_credits: retention replaces the retired storage quota", () => {
  const LIVE_SHAPE = {
    credits: 12,
    tier: "free",
    subscriptionStatus: null,
    storageUsed: 2_000,
    storageUsedCapped: true,
    storageLimit: -1,
    retention: {
      mode: "rolling",
      deletesAfter: null,
      retentionDays: 30,
      policyDate: Date.UTC(2026, 6, 31),
    },
  };

  test("reports a capped count as a floor, never as an exact total", async () => {
    stubApi(LIVE_SHAPE);
    const { json } = await callTool(registerCredits, "get_credits");

    expect(json.library.completedTranscriptions).toBe(2_000);
    expect(json.library.isCapped).toBe(true);
    expect(json.library.note).toContain("HIGHER than 2000");
    expect(json.library.note).toContain('"2000+"');
  });

  test("omits the caveat when the count is exact", async () => {
    stubApi({ ...LIVE_SHAPE, storageUsed: 7, storageUsedCapped: false });
    const { json } = await callTool(registerCredits, "get_credits");

    expect(json.library.completedTranscriptions).toBe(7);
    expect(json.library.isCapped).toBe(false);
    expect(json.library.note).toBeUndefined();
  });

  test("reports retention and no storage limit", async () => {
    stubApi(LIVE_SHAPE);
    const { text, json } = await callTool(registerCredits, "get_credits");

    expect(json.retention.mode).toBe("rolling");
    expect(json.retention.retentionDays).toBe(30);
    expect(json.retention.policyDate).toBe("2026-07-31T00:00:00.000Z");
    expect(json.retention.summary).toContain("30 days after they are created");

    // The retired quota must not reappear in any form — "unlimited" storage is
    // the claim that hides a 30-day deletion window.
    expect(json).not.toHaveProperty("storage");
    expect(text).not.toContain("storageLimit");
    expect(text).not.toContain("unlimited");
  });

  test("describes a lapsing subscription with its deletion date", async () => {
    const deletesAfter = Date.UTC(2026, 8, 1);
    stubApi({
      ...LIVE_SHAPE,
      subscriptionStatus: "canceled",
      retention: {
        mode: "lapsing",
        deletesAfter,
        retentionDays: 30,
        policyDate: Date.UTC(2026, 6, 31),
      },
    });
    const { json } = await callTool(registerCredits, "get_credits");

    expect(json.retention.mode).toBe("lapsing");
    expect(json.retention.deletesAfter).toBe("2026-09-01T00:00:00.000Z");
    expect(json.retention.summary).toContain("2026-09-01T00:00:00.000Z");
  });

  test("an active subscription is described as losing nothing", async () => {
    stubApi({
      ...LIVE_SHAPE,
      subscriptionStatus: "active",
      tier: "creator",
      retention: {
        mode: "unlimited",
        deletesAfter: null,
        retentionDays: 30,
        policyDate: Date.UTC(2026, 6, 31),
      },
    });
    const { json } = await callTool(registerCredits, "get_credits");

    expect(json.retention.mode).toBe("unlimited");
    expect(json.retention.summary).toContain("nothing is deleted automatically");
  });
});

// ---------------------------------------------------------------------------
// Search: a bounded search is not proof about the library
// ---------------------------------------------------------------------------

describe("search_transcriptions: a miss is scoped, not absolute", () => {
  test("a miss says what was actually searched", async () => {
    stubApi({ transcriptions: [], total: 0 });
    const { json } = await callTool(registerSearch, "search_transcriptions", {
      url: "https://www.instagram.com/reel/ZZZ/",
    });

    expect(json.found).toBe(false);
    expect(json.message).toContain("bounded window");
    expect(json.message).toContain("older match may exist");
  });

  test("a hit reports how many matches came back, not a library count", async () => {
    stubApi({ transcriptions: [row(1, 10), row(2, 10)], total: 2 });
    const { json } = await callTool(registerSearch, "search_transcriptions", {
      url: "instagram.com/reel/ABC",
    });

    expect(json.found).toBe(true);
    expect(json.matchesReturned).toBe(2);
    expect(json.transcription.id).toBe("t1");
    expect(json.otherMatches).toHaveLength(1);
    expect(json).not.toHaveProperty("total");
    expect(json.note).toContain("not proof about the whole library");
  });
});
