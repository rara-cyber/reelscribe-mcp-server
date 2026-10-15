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

test('management tools use only the first-party account-scoped API and flag deletion/credit spending', async () => {
  const { server, client, calls } = await connected();
  try {
    const { tools } = await client.listTools();
    expect(tools).toHaveLength(18);
    for (const name of ['delete_transcriptions','cancel_bulk_job','transcribe_bulk','transcribe_instagram_channel']) expect(tools.find(t => t.name === name)?.annotations?.destructiveHint).toBe(true);
    const operations = [
      ['transcribe_bulk', { urls: ['https://youtu.be/jNQXAC9IVRw'] }, '/v1/bulk-transcribe', 'POST'],
      ['transcribe_instagram_channel', { channelUsername: 'creator', reelCount: 2, onlyPostsNewerThan: '2026-01-01' }, '/v1/bulk-transcribe', 'POST'],
      ['retry_transcription', { transcriptionId: 'own' }, '/v1/retry-transcription', 'POST'],
      ['cancel_bulk_job', { bulkJobId: 'batch-own' }, '/v1/cancel-bulk-job', 'POST'],
      ['delete_transcriptions', { ids: ['own'] }, '/v1/transcriptions', 'DELETE'],
      ['export_transcriptions', { ids: ['own'], format: 'docx' }, '/v1/exports', 'POST'],
      ['get_export', { jobId: 'export-own' }, '/v1/exports', 'GET'],
      ['list_jobs', { bulkJobId: 'batch-own' }, '/v1/jobs', 'GET'],
      ['get_analytics', { owner: 'creator', startDate: 123 }, '/v1/analytics', 'GET'],
      ['update_settings', { tooltipsEnabled: false }, '/v1/settings', 'PATCH'],
      ['get_settings', {}, '/v1/settings', 'GET'],
    ] as const;
    for (const [name, args, path, method] of operations) {
      const result = await client.callTool({ name, arguments: args }); expect(result.isError).not.toBe(true);
      expect(calls.at(-1)).toMatchObject({ path, method, token: 'Bearer rs_account-only' });
    }
    const before = calls.length; await client.callTool({ name: 'get_account_links', arguments: {} }); expect(calls.length).toBe(before);
  } finally { await client.close(); await server.close(); }
});

test('invalid batch counts/IDs and export formats are rejected before a request', async () => {
  const { server, client, calls } = await connected();
  try {
    for (const [name, args] of [['transcribe_bulk',{urls:[]}],['transcribe_instagram_channel',{channelUsername:'creator',reelCount:51}],['delete_transcriptions',{ids:[]}],['export_transcriptions',{ids:['own'],format:'exe'}]]) {
      const result = await client.callTool({ name: name as string, arguments: args as Record<string,unknown> }); expect(result.isError).toBe(true);
    }
    expect(calls).toHaveLength(0);
  } finally { await client.close(); await server.close(); }
});

test('Facebook share links and slugged permalinks match website support', () => {
  for (const url of ['https://facebook.com/share/r/Abc123/','https://m.facebook.com/share/v/Abc123/','https://facebook.com/creator/videos/a-video/123/']) expect(validateUrl(url).valid).toBe(true);
});
