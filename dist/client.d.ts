/**
 * ReelScribe v1 API client.
 * All HTTP calls to the production API go through this module.
 */
export interface ApiError {
    error: {
        code: string;
        message: string;
        status: number;
    };
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
    stats: {
        likes: number | null;
        views: number | null;
        comments: number | null;
    } | null;
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
export declare function transcribe(url: string): Promise<TranscribeResult>;
export declare function getTranscription(params: {
    id?: string;
    requestId?: string;
}): Promise<Transcription>;
export declare function listTranscriptions(params?: {
    status?: string;
}): Promise<TranscriptionList>;
export declare function searchTranscriptionsByUrl(url: string): Promise<TranscriptionList>;
export declare function getCredits(): Promise<Credits>;
