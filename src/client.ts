/**
 * ReelScribe v1 API client.
 * All HTTP calls to the production API go through this module.
 */

const API_BASE = "https://www.reelscribe.app/v1";

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

export interface TranscriptionList {
  transcriptions: Transcription[];
  total: number;
}

export interface Credits {
  credits: number;
  tier: string;
  subscriptionStatus: string | null;
  storageUsed: number;
  storageLimit: number;
}

function getApiKey(): string {
  const key = process.env.REELSCRIBE_API_KEY;
  if (!key) {
    throw new Error(
      "REELSCRIBE_API_KEY environment variable is not set. " +
        "Get your API key at https://www.reelscribe.app/api"
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
}): Promise<TranscriptionList> {
  const searchParams = new URLSearchParams();
  if (params?.status) searchParams.set("status", params.status);
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
