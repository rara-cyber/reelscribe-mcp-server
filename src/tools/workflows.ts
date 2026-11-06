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
  server.tool('transcribe_instagram_channel', `Transcribe up to 50 reels from an Instagram channel. Paid plans only. Reserves 1 credit per requested reel under the same refund rules as the website, so only reels actually transcribed are charged. Requires an API key or additional batch transcription consent.

Without direction it takes the channel's newest reels, optionally after a date. It cannot reach past those, so asking twice finds nothing new.

Use direction when the user wants more from a channel they have already started, such as "5 more" or "the next ones". direction: "older" continues back through reels they do not have yet. direction: "newer" fetches reels posted since their most recent one, oldest of those first if there are more than requested. If the user did not say which they want, ask them before calling: older reels, or new posts since last time. Take the channel from the conversation; past channel jobs also record channelUsername.

The reply can report fewer reels than requested, or status "nothing_found" with no job. Tell the user. If it includes nextCursor, the search ran out of time, so call again with that cursor and the remaining count.`,
    {
      channelUsername: z.string().regex(/^[\w.]+$/).max(100),
      reelCount: z.number().int().min(1).max(50),
      onlyPostsNewerThan: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().describe('Cannot be combined with direction'),
      direction: z.enum(['older', 'newer']).optional().describe('Continue a channel the user has already started'),
      cursor: z.string().min(1).max(1024).optional().describe('nextCursor from a previous older request'),
    }, { ...submit, title: 'Transcribe instagram channel' }, p => reply(() => api.transcribeBulk(p)));
  server.tool('list_jobs', 'List one page of batch/channel jobs or read progress for a specific bulk job ID. Results belong to the connected account.',
    { bulkJobId: id.optional(), cursor: z.string().optional() }, { ...read, title: 'List jobs' }, p => reply(() => api.listJobs(p)));

}

async function reply(run: () => Promise<unknown>) {
  try { return { content: [{ type: 'text' as const, text: JSON.stringify(await run(), null, 2) }] }; }
  catch (error) { return { isError: true, content: [{ type: 'text' as const, text: JSON.stringify({ error: true, message: error instanceof Error ? error.message : String(error) }) }] }; }
}
