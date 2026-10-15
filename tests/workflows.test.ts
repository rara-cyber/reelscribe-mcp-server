import { afterEach, expect, test } from 'bun:test';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { createServer } from '../src/server.js';
import { createApiClient } from '../src/client.js';
import { validateUrl } from '../src/validators.js';
const original = globalThis.fetch;
afterEach(() => { globalThis.fetch = original; });

async function connected() {
  const calls: { path: string; method: string; body: unknown; token: string | null }[] = [];
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    calls.push({ path: new URL(String(input)).pathname, method: init?.method || 'GET', body: init?.body ? JSON.parse(String(init.body)) : null, token: new Headers(init?.headers).get('Authorization') });
    return Response.json({ success: true, jobId: 'export-own', bulkJobId: 'batch-own' });
  }) as typeof fetch;
  const server = createServer(createApiClient(() => 'rs_account-only'));
  const client = new Client({ name: 'parity-test', version: '1' });
  const [a, b] = InMemoryTransport.createLinkedPair(); await server.connect(a); await client.connect(b);
  return { server, client, calls };
}

test('transcription tools use only the first-party account-scoped API and flag credit spending', async () => {
  const { server, client, calls } = await connected();
  try {
    const { tools } = await client.listTools();
    expect(tools).toHaveLength(9);
    for (const name of ['transcribe_bulk','transcribe_instagram_channel']) expect(tools.find(t => t.name === name)?.annotations?.destructiveHint).toBe(true);
    for (const name of ['delete_transcriptions', 'cancel_bulk_job', 'retry_transcription', 'export_transcriptions', 'get_export', 'get_analytics', 'get_settings', 'update_settings', 'get_account_links']) expect(tools.some(t => t.name === name)).toBe(false);
    const operations = [
      ['transcribe_bulk', { urls: ['https://youtu.be/jNQXAC9IVRw'] }, '/v1/bulk-transcribe', 'POST'],
      ['transcribe_instagram_channel', { channelUsername: 'creator', reelCount: 2, onlyPostsNewerThan: '2026-01-01' }, '/v1/bulk-transcribe', 'POST'],
      ['list_jobs', { bulkJobId: 'batch-own' }, '/v1/jobs', 'GET'],
    ] as const;
    for (const [name, args, path, method] of operations) {
      const result = await client.callTool({ name, arguments: args }); expect(result.isError).not.toBe(true);
      expect(calls.at(-1)).toMatchObject({ path, method, token: 'Bearer rs_account-only' });
    }
  } finally { await client.close(); await server.close(); }
});

test('invalid batches are rejected before a request', async () => {
  const { server, client, calls } = await connected();
  try {
    for (const [name, args] of [['transcribe_bulk', { urls: [] }], ['transcribe_instagram_channel', { channelUsername: 'creator', reelCount: 51 }], ['transcribe_instagram_channel', { channelUsername: '../invalid', reelCount: 1 }]] as const) {
      const result = await client.callTool({ name, arguments: args }); expect(result.isError).toBe(true);
    }
    expect(calls).toHaveLength(0);
    const removed = await client.callTool({ name: 'delete_transcriptions', arguments: { ids: ['own'] } });
    expect(removed.isError).toBe(true); expect(calls).toHaveLength(0);
  } finally { await client.close(); await server.close(); }
});

test('Facebook share links and slugged permalinks match website support', () => {
  for (const url of ['https://facebook.com/share/r/Abc123/','https://m.facebook.com/share/v/Abc123/','https://facebook.com/creator/videos/a-video/123/']) expect(validateUrl(url).valid).toBe(true);
});
