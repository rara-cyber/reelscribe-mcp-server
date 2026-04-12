import * as api from "../client.js";
export function register(server) {
    server.tool("get_credits", "Check your ReelScribe credit balance, subscription tier, and storage usage. Each transcription costs 1 credit.", {}, async () => {
        try {
            const result = await api.getCredits();
            const tierNames = {
                free: "Free",
                creator: "Creator ($9.99/mo)",
                agency: "Agency ($24.99/mo)",
                enterprise: "Enterprise ($59.99/mo)",
            };
            return {
                content: [
                    {
                        type: "text",
                        text: JSON.stringify({
                            credits: result.credits,
                            tier: tierNames[result.tier] || result.tier,
                            subscriptionStatus: result.subscriptionStatus,
                            storage: {
                                used: result.storageUsed,
                                limit: result.storageLimit === -1
                                    ? "unlimited"
                                    : result.storageLimit,
                            },
                            purchaseCreditsUrl: "https://www.reelscribe.app/pricing",
                        }, null, 2),
                    },
                ],
            };
        }
        catch (err) {
            return {
                content: [
                    {
                        type: "text",
                        text: JSON.stringify({
                            error: true,
                            code: "API_ERROR",
                            message: err instanceof Error ? err.message : String(err),
                        }, null, 2),
                    },
                ],
            };
        }
    });
}
//# sourceMappingURL=getCredits.js.map