/**
 * ReelScribe v1 API client.
 * All HTTP calls to the production API go through this module.
 */

const API_BASE = "https://reelscribe.app/v1";

export interface ApiError {
  error: { code: string; message: string; status: number };
}

export interface TranscribeResult {
  requestId: string;
  status: string;
  message: string;
  duplicate?: boolean;
  transcription?: {
    id: string;
    status: string;
    transcription: string | null;
    createdAt: number;
  };
}

export interface Transcription {
  id: string;
  requestId: string | null;
  url: string;
  platform: string | null;
  status: string;
  transcription: string | null;
  createdAt: number;
  completedAt: number | null;
  caption: string | null;
  hashtags: string[] | null;
  mentions: string[] | null;
  owner: string | null;
  duration: number | null;
  stats: { likes: number | null; views: number | null; comments: number | null } | null;
  segments: unknown[] | null;
  thumbnailUrl: string | null;
  videoTimestamp: string | null;
  errorMessage: string | null;
  errorType: string | null;
}

/** Rows this client asks for per page. Well under MAX_PAGE_SIZE on purpose. */
export const DEFAULT_PAGE_SIZE = 20;

/**
 * Largest page GET /v1/transcriptions will serve.
 *
 * The API clamps rather than erroring, so asking for more is safe — this bound
 * exists so a tool schema can reject an obviously wrong number up front.
 */
export const MAX_PAGE_SIZE = 200;

export interface TranscriptionList {
  transcriptions: Transcription[];
  /**
   * The number of rows in THIS PAGE — never a library total.
   *
   * GET /v1/transcriptions became cursor-paginated on 2026-07-31, and the API
   * deliberately does not compute a library total: doing so costs the read the
   * pagination exists to avoid (api/v1.js `handleTranscriptions`). Before that
   * date the endpoint returned everything, so `total` and "how many do I have"
   * happened to coincide — they no longer do.
   *
   * Nothing in this package reads it. Counts are derived from
   * `transcriptions.length`, which cannot silently change meaning.
   */
  total: number;
  /** Pass back as `cursor` for the next page; null when the list is exhausted. */
  nextCursor?: string | null;
  /** True when further pages exist. Absent on the `?url=` search response. */
  hasMore?: boolean;
}

/** How long this account's transcriptions are kept. */
export type RetentionMode =
  /** Subscription active — nothing is auto-deleted. */
  | "unlimited"
  /** Never subscribed — each transcription expires `retentionDays` after creation. */
  | "rolling"
  /** Subscription ended — the whole library goes at `deletesAfter`. */
  | "lapsing";

export interface Retention {
  mode: RetentionMode;
  /** Epoch ms the library is deleted. `lapsing` only; null otherwise. */
  deletesAfter: number | null;
  /** Rolling-window length in days. */
  retentionDays: number;
  /** Epoch ms grandfather floor — nothing created before this is auto-deleted. */
  policyDate: number;
}

export interface Credits {
  credits: number;
  tier: string;
  subscriptionStatus: string | null;
  /**
   * Completed transcriptions. A bounded probe, not a guaranteed exact count —
   * see `storageUsedCapped`.
   */
  storageUsed: number;
  /** True when the real number of completed transcriptions exceeds `storageUsed`. */
  storageUsedCapped: boolean;
  retention: Retention;
  // `storageLimit` is still on the wire but is deliberately not read here. Per-tier
  // count caps were retired on 2026-07-31 and the API now hardcodes -1 ("no limit")
  // for every tier; storage is bounded by time instead. `retention` is the real
  // constraint, so reporting a limit at all would only mislead.
}

function getApiKey(): string {
  const key = process.env.REELSCRIBE_API_KEY;
  if (!key) {
    throw new Error(
      "REELSCRIBE_API_KEY environment variable is not set. " +
        "Get your API key at https://reelscribe.app/api"
    );
  }
  return key;
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${getApiKey()}`,
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  const body = await res.json();

  if (!res.ok) {
    const err = body as ApiError;
    throw new Error(
      err.error?.message || `API request failed with status ${res.status}`
    );
  }

  return body as T;
}

export async function transcribe(url: string): Promise<TranscribeResult> {
  return request<TranscribeResult>("/transcribe", {
    method: "POST",
    body: JSON.stringify({ url }),
  });
}

export async function getTranscription(params: {
  id?: string;
  requestId?: string;
}): Promise<Transcription> {
  const searchParams = new URLSearchParams();
  if (params.id) searchParams.set("id", params.id);
  if (params.requestId) searchParams.set("requestId", params.requestId);
  return request<Transcription>(`/transcriptions?${searchParams}`);
}

export async function listTranscriptions(params?: {
  status?: string;
  cursor?: string;
  limit?: number;
}): Promise<TranscriptionList> {
  const searchParams = new URLSearchParams();
  if (params?.status) searchParams.set("status", params.status);
  if (params?.cursor) searchParams.set("cursor", params.cursor);
  if (params?.limit) searchParams.set("limit", String(params.limit));
  const qs = searchParams.toString();
  return request<TranscriptionList>(`/transcriptions${qs ? `?${qs}` : ""}`);
}

export async function searchTranscriptionsByUrl(
  url: string
): Promise<TranscriptionList> {
  const searchParams = new URLSearchParams({ url });
  return request<TranscriptionList>(`/transcriptions?${searchParams}`);
}

export async function getCredits(): Promise<Credits> {
  return request<Credits>("/credits");
}
