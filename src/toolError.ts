import { ApiRequestError } from "./client.js";

export const EXPECTED_TOOL_ERROR = "ExpectedToolError";

export class ExpectedToolError extends Error {
  override name = EXPECTED_TOOL_ERROR;
}

export function toolApiError(error: unknown, code?: "API_ERROR"): Error {
  const message = error instanceof Error ? error.message : String(error);
  const text = JSON.stringify({ error: true, code, message }, null, code ? 2 : undefined);
  if (error instanceof ApiRequestError && isExpectedRejection(error)) {
    return new ExpectedToolError(text);
  }
  return new Error(text, { cause: error });
}

function isExpectedRejection({ status, code, message }: ApiRequestError): boolean {
  switch (status) {
    case 400:
      return code === "INVALID_REQUEST" || code === "INVALID_URL" ||
        message.startsWith("Unsupported URL format. Please provide ");
    case 401:
      return code === "UNAUTHORIZED";
    case 402:
      return code === "INSUFFICIENT_CREDITS" || message === "Insufficient credits";
    case 403:
      return code === "FORBIDDEN" || message === "Upgrade required";
    case 404:
      return message === "Job not found" || message === "Transcription not found";
    case 409:
      return message === "All URLs are duplicates";
    case 429:
      return code === "RATE_LIMITED";
    default:
      return false;
  }
}
