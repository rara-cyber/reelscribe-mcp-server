import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import * as defaultApi from '../client.js';
import type { ApiClient } from '../client.js';

const id = z.string().min(1).max(200);
export function register(server: McpServer, api: ApiClient = defaultApi) {
  const read = { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true };
  const submit = { ...read, readOnlyHint: false, idempotentHint: false, destructiveHint: true };
  server.tool('transcribe_bulk', 'Submit up to 1,000 video URLs as a batch. The account tier sets the actual batch limit; each new video costs 1 credit. Existing transcripts are reused. Returns a bulk job ID. Requires an API key or additional batch transcription consent.',
    { urls: z.array(z.string().url().max(2048)).min(1).max(1000) }, { ...submit, title: 'Transcribe bulk' }, p => reply(() => api.transcribeBulk(p)));
  server.tool('transcribe_instagram_channel', 'Transcribe up to 50 reels from an Instagram channel, optionally after a date. Paid plans only. Reserves 1 credit per requested reel under the same refund rules as the website. Requires an API key or additional batch transcription consent.',
    { channelUsername: z.string().regex(/^[\w.]+$/).max(100), reelCount: z.number().int().min(1).max(50), onlyPostsNewerThan: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional() }, { ...submit, title: 'Transcribe instagram channel' }, p => reply(() => api.transcribeBulk(p)));
  server.tool('list_jobs', 'List one page of batch/channel jobs or read progress for a specific bulk job ID. Results belong to the connected account.',
    { bulkJobId: id.optional(), cursor: z.string().optional() }, { ...read, title: 'List jobs' }, p => reply(() => api.listJobs(p)));

}

async function reply(run: () => Promise<unknown>) {
  try { return { content: [{ type: 'text' as const, text: JSON.stringify(await run(), null, 2) }] }; }
  catch (error) { return { isError: true, content: [{ type: 'text' as const, text: JSON.stringify({ error: true, message: error instanceof Error ? error.message : String(error) }) }] }; }
}
