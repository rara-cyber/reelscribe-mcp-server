import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import * as defaultApi from '../client.js';
import type { ApiClient } from '../client.js';

const id = z.string().min(1).max(200);
const date = z.number().int().min(0).optional();
const filters = { owner: z.string().max(200).optional(), bulkJobId: id.optional(), requestId: id.optional(),
  startDate: date, endDate: date, status: z.enum(['completed', 'failed']).optional() };

export function register(server: McpServer, api: ApiClient = defaultApi) {
  const read = { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true };
  const write = { ...read, readOnlyHint: false, idempotentHint: false };
  const remove = { ...write, destructiveHint: true };
  server.tool('transcribe_bulk', 'Submit up to 1,000 video URLs as a batch. The account tier sets the actual batch limit; each new video costs 1 credit. Existing transcripts are reused. Returns a bulk job ID. Requires an API key or expanded reelscribe:manage consent.',
    { urls: z.array(z.string().url().max(2048)).min(1).max(1000) }, { ...remove, title: 'Transcribe bulk' }, p => reply(() => api.transcribeBulk(p)));
  server.tool('transcribe_instagram_channel', 'Transcribe up to 50 reels from an Instagram channel, optionally after a date. Paid plans only. Reserves 1 credit per requested reel under the same refund rules as the website. Requires an API key or expanded consent.',
    { channelUsername: z.string().regex(/^[\w.]+$/).max(100), reelCount: z.number().int().min(1).max(50), onlyPostsNewerThan: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional() }, { ...remove, title: 'Transcribe instagram channel' }, p => reply(() => api.transcribeBulk(p)));
  server.tool('list_jobs', 'List one page of batch/channel jobs or read progress for a specific bulk job ID. Results belong to the connected account.',
    { bulkJobId: id.optional(), cursor: z.string().optional() }, { ...read, title: 'List jobs' }, p => reply(() => api.listJobs(p)));
  server.tool('cancel_bulk_job', 'Cancel the remaining submitted/processing rows of a batch owned by the connected account. Refunds eligible credits once. Completed results remain available. Requires an API key or expanded consent.',
    { bulkJobId: id }, { ...remove, title: 'Cancel bulk job' }, p => reply(() => api.cancelBulkJob(p.bulkJobId)));
  server.tool('retry_transcription', 'Retry an eligible failed transcription owned by the connected account. Uses the website retry policy (maximum 3 retries). Requires an API key or expanded consent.',
    { transcriptionId: id }, { ...write, title: 'Retry transcription' }, p => reply(() => api.retryTranscription(p.transcriptionId)));
  server.tool('delete_transcriptions', 'Permanently delete selected completed/failed transcripts; in-flight rows are cancelled and refunded. Up to 500 IDs per request. Requires an API key or expanded consent.',
    { ids: z.array(id).min(1).max(500) }, { ...remove, title: 'Delete transcriptions' }, p => reply(() => api.deleteTranscriptions(p.ids)));
  server.tool('get_analytics', 'Read account analytics with creator, date, status, job and request filters. The capped flag identifies results limited to the website read budget.', filters, { ...read, title: 'Get analytics' }, p => reply(() => api.getAnalytics(p)));
  server.tool('export_transcriptions', 'Prepare a download: TXT, DOCX, JSON, SRT or VTT for one transcript; CSV or ZIP for up to 10,000 selected transcripts. Only owned completed rows are exported. Returns an export job ID; files expire after 24 hours. Requires an API key or expanded consent.',
    { ids: z.array(id).min(1).max(10000), format: z.enum(['txt', 'docx', 'json', 'srt', 'vtt', 'csv', 'zip']) }, { ...write, title: 'Export transcriptions' }, p => reply(() => api.startExport(p.ids, p.format)));
  server.tool('get_export', 'Read export status and the private download URL once ready. Download URLs grant file access to their holder and expire with the export after 24 hours.',
    { jobId: id }, { ...read, title: 'Get export' }, p => reply(() => api.getExport(p.jobId)));
  server.tool('get_settings', 'Read the account notification and tooltip preferences and transcript retention policy.', {}, { ...read, title: 'Get settings' }, () => reply(() => api.getSettings()));
  server.tool('update_settings', 'Update the website notification/tooltip preferences. Requires an API key or expanded consent.',
    { toastNotifications: z.boolean().optional(), tooltipsEnabled: z.boolean().optional() }, { ...write, title: 'Update settings' }, p => reply(() => api.updateSettings(p)));
  server.tool('get_account_links', 'Get the authenticated website pages for billing, API-key management, account security, and the full dashboard.', {}, { ...read, title: 'Get account links' }, async () => reply(async () => ({
    dashboard: 'https://reelscribe.app/dashboard', billing: 'https://reelscribe.app/pricing',
    apiKeys: 'https://reelscribe.app/api', settings: 'https://reelscribe.app/settings', analytics: 'https://reelscribe.app/analytics',
  })));
}

async function reply(run: () => Promise<unknown>) {
  try { return { content: [{ type: 'text' as const, text: JSON.stringify(await run(), null, 2) }] }; }
  catch (error) { return { isError: true, content: [{ type: 'text' as const, text: JSON.stringify({ error: true, message: error instanceof Error ? error.message : String(error) }) }] }; }
}
