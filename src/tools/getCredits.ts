import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import * as defaultApi from "../client.js";
import type { ApiClient } from "../client.js";
import type { Credits, Retention } from "../client.js";

const tierNames: Record<string, string> = {
  free: "Free",
  creator: "Creator ($9.99/mo)",
  agency: "Agency ($24.99/mo)",
  enterprise: "Enterprise ($59.99/mo)",
};

function iso(epochMs: number): string {
  return new Date(epochMs).toISOString();
}

/**
 * Say what retention actually means for this account, in words.
 *
 * Every sentence is built from the values the API returned — the rule lives in
 * convex/retention.ts and is deliberately not restated here, because a mirrored
 * copy of a deletion policy that drifts tells users their data is safe when it
 * is not.
 */
function describeRetention(r: Retention): string {
  const floor = iso(r.policyDate);
  switch (r.mode) {
    case "unlimited":
      return "Subscription active — nothing is deleted automatically.";
    case "lapsing":
      return (
        "Subscription has ended. Transcriptions created on or after " +
        `${floor} are deleted` +
        (r.deletesAfter ? ` on ${iso(r.deletesAfter)}` : "") +
        `. Anything created before ${floor} is kept.`
      );
    case "rolling":
      return (
        `Transcriptions created on or after ${floor} are deleted ` +
        `${r.retentionDays} days after they are created. Anything created ` +
        `before ${floor} is kept.`
      );
  }
}

export function buildCreditsPayload(result: Credits) {
  const capped = result.storageUsedCapped;
  const retention = result.retention;

  return {
    credits: result.credits,
    tier: tierNames[result.tier] || result.tier,
    subscriptionStatus: result.subscriptionStatus,
    library: {
      completedTranscriptions: result.storageUsed,
      // The API answers this with a bounded probe rather than a full count, so
      // the number is a floor once the probe fills up.
      isCapped: capped,
      ...(capped
        ? {
            note:
              `The real number of completed transcriptions is HIGHER than ` +
              `${result.storageUsed} — the API stops counting at that point. ` +
              `Report it as "${result.storageUsed}+", never as an exact total.`,
          }
        : {}),
    },
    // There is no storage quota. Per-tier count caps were retired on 2026-07-31;
    // what bounds a library now is time, so retention is reported in its place.
    retention: {
      mode: retention?.mode ?? null,
      summary: retention
        ? describeRetention(retention)
        : "Retention information was not returned by the API.",
      retentionDays: retention?.retentionDays ?? null,
      deletesAfter: retention?.deletesAfter ? iso(retention.deletesAfter) : null,
      policyDate: retention ? iso(retention.policyDate) : null,
    },
    purchaseCreditsUrl: "https://reelscribe.app/pricing",
  };
}

export function register(server: McpServer, api: ApiClient = defaultApi, showPurchaseLink = true) {
  server.tool(
    "get_credits",
    "Check your ReelScribe credit balance, subscription tier, how many completed " +
      "transcriptions are stored, and how long they are kept. Each transcription " +
      "costs 1 credit. There is no storage quota — a library is bounded by time " +
      "(see `retention`), not by a count limit. `library.completedTranscriptions` " +
      "is a bounded count: when `library.isCapped` is true the real number is " +
      "higher, so quote it as \"N+\".",
    {},
    { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    async () => {
      try {
        const result = await api.getCredits();

        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({ ...buildCreditsPayload(result), ...(!showPurchaseLink ? { tier: result.tier, purchaseCreditsUrl: undefined } : {}) }, null, 2),
            },
          ],
        };
      } catch (err) {
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(
                {
                  error: true,
                  code: "API_ERROR",
                  message: err instanceof Error ? err.message : String(err),
                },
                null,
                2
              ),
            },
          ],
        };
      }
    }
  );
}
