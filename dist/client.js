/**
 * ReelScribe v1 API client.
 * All HTTP calls to the production API go through this module.
 */
const API_BASE = "https://www.reelscribe.app/api/v1";
function getApiKey() {
    const key = process.env.REELSCRIBE_API_KEY;
    if (!key) {
        throw new Error("REELSCRIBE_API_KEY environment variable is not set. " +
            "Get your API key at https://www.reelscribe.app/api");
    }
    return key;
}
async function request(path, options = {}) {
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
        const err = body;
        throw new Error(err.error?.message || `API request failed with status ${res.status}`);
    }
    return body;
}
export async function transcribe(url) {
    return request("/transcribe", {
        method: "POST",
        body: JSON.stringify({ url }),
    });
}
export async function getTranscription(params) {
    const searchParams = new URLSearchParams();
    if (params.id)
        searchParams.set("id", params.id);
    if (params.requestId)
        searchParams.set("requestId", params.requestId);
    return request(`/transcriptions?${searchParams}`);
}
export async function listTranscriptions(params) {
    const searchParams = new URLSearchParams();
    if (params?.status)
        searchParams.set("status", params.status);
    const qs = searchParams.toString();
    return request(`/transcriptions${qs ? `?${qs}` : ""}`);
}
export async function searchTranscriptionsByUrl(url) {
    const searchParams = new URLSearchParams({ url });
    return request(`/transcriptions?${searchParams}`);
}
export async function getCredits() {
    return request("/credits");
}
//# sourceMappingURL=client.js.map