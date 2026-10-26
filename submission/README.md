# ReelScribe directory submission materials

`plugin/` is the OpenAI submission package source. Its logo is generated from the existing ReelScribe app icon. It contains no credentials. From that directory, create the upload with `zip -r /tmp/reelscribe-plugin.zip .`.

The 2.3.0 package exposes nine transcription tools. The legacy `reelscribe:manage` scope is restricted to batch/channel submissions. Downloads, library management, analytics and settings stay in the web app. Existing October 14 live-test evidence below covers the original six tools only. The current package includes scoped CIMD OAuth and five positive/three negative review cases. These are a test plan, not a record of completed live tests. A dedicated reviewer account has been created, its password sign-in verified, and a completed public YouTube sample populated. Its credentials are stored in Bitwarden and the private Claude review form only. The reviewer account alone has a device-verification exception so reviewers can use the password without email OTP. On October 14, 2026, all six hosted tools passed live tests using the official MCP Inspector CLI and the reviewer account. Retrieval, listing, URL search, URL validation, credit reads, duplicate reuse, invalid URLs, missing IDs, an attempted account selector, and invalid credentials were checked. The test run spent 0 credits and its temporary API key was immediately revoked (authentication then returned HTTP 401). A new transcription job was not created during the Inspector run. OpenAI still needs an accessible demo-recording URL and its own portal checks. Keep reviewer credentials outside the ZIP.

OpenAI portal: https://platform.openai.com/plugins. The current account's upload flow asks for a verified developer identity even though organization settings show individual verification as approved. Resolve that requirement before uploading. Domain verification must use the exact challenge supplied by the portal; no challenge has been issued yet.

Claude submission: https://claude.ai/directory/manage/reelscribe. Submitted on October 14, 2026 and confirmed **In review**, under publisher SIÁN OÜ. Reviewer credentials and live-test results are supplied privately. The saved authentication configuration was verified as OAuth with Client ID Metadata Document (CIMD), matching the server’s discovery; automatic client registration is not enabled. The listing is not public in the directory until approved.

`server.json` is the official MCP Registry submission. Its description stays within the Registry’s 100-character limit. Version **2.3.0 was published on October 26, 2026** (2.2.1 on October 15) with the remote Streamable HTTP endpoint `https://reelscribe.app/api/mcp` and namespace `io.github.rara-cyber/reelscribe`. An independent Registry API read confirmed the record is active and latest. This Registry listing does not imply approval in the Claude or ChatGPT directories. Future Registry releases use its CLI:

```
mcp-publisher login github
mcp-publisher publish
```

Run those commands from this directory for an authorized version update. Registry guide: https://modelcontextprotocol.io/registry/quickstart.

## Other directories (status October 24, 2026)

| Directory | Status | How |
|---|---|---|
| Claude directory | Approved October 14 as community connector, **not yet published** | Publish at https://claude.ai/admin-settings/directory/submissions/reelscribe |
| Official MCP Registry | Live, 2.3.0 | `mcp-publisher` (above) |
| Glama | Auto-listed: server `rara-cyber/reelscribe-mcp-server` and connector `io.github.rara-cyber/reelscribe` | Commit the root `glama.json` to claim the server |
| PulseMCP | Not listed; submissions paused since September 3, 2026 | None needed: it ingests the Official Registry when it reopens |
| Smithery | Not listed, deliberately | Accounts and proxying shut down October 31, 2026 (https://smithery.ai/future); revisit its curated directory after that |
| mcp.so | Not listed; skipped for now (submission costs $39 one-time) | https://mcp.so/submit if reach there ever matters |
| awesome-mcp-servers | PR open: https://github.com/punkpeye/awesome-mcp-servers/pull/16715 | Section 🎥 Multimedia Process |
| Agensi | Live, free: https://www.agensi.io/skills/reelscribe-transcripts | Free skill, `agensi/` (below); edit via the listing's Update button, not a new submission |
| awesome-remote-mcp-servers | PR open: https://github.com/jaw9c/awesome-remote-mcp-servers/pull/1622 | Marked `OAuth2.1 🔐` (no DCR) |
| TensorBlock awesome-mcp-servers | PR open: https://github.com/TensorBlock/awesome-mcp-servers/pull/4467 | `docs/multimedia-processing.md` |
| mcpservers.org | Submitted October 24, free plan (review up to 2 weeks) | Contact hello@reelscribe.app |
| Gemini CLI extensions | Root `gemini-extension.json` (local stdio + API key setting) and repo topic `gemini-cli-extension` | Crawler indexes the default branch, so it goes live after this branch merges. Hosted OAuth is unusable there: Gemini CLI requires DCR |
| Docker MCP Catalog | Not submitted | Docker's gateway requires DCR (https://github.com/docker/mcp-gateway/issues/602); the hosted OAuth would fail. Revisit if DCR is enabled in Clerk or that issue ships |
| Cline MCP Marketplace | Not filed yet | Form requires confirming Cline installs from `llms-install.md`; test in Cline first, then file at https://github.com/cline/mcp-marketplace/issues/new?template=mcp-server-submission.yml with `submission/cline/logo.png` |
| ChatGPT / Codex plugin directory | Blocked October 24: portal still requires developer identity verification | Owner completes ID verification at https://platform.openai.com/plugins, then uploads the `plugin/` ZIP |

Listing copy:

- **Short (≤100):** Transcribe social videos, selected comments, URL batches and Instagram channels.
- **Long:** ReelScribe turns Instagram Reels, TikTok, YouTube and Facebook video URLs into transcripts from any MCP client. Nine tools: transcribe a video (optionally with top comments), batch URL lists, transcribe 1–50 reels from an Instagram channel, track jobs, and read, list and search saved transcripts. Hosted OAuth endpoint `https://reelscribe.app/api/mcp`, or local stdio via `npx -y reelscribe-mcp-server` with an API key. 25 free credits at sign-up, then 1 credit per video.
- **awesome-mcp-servers line:**
  `- [rara-cyber/reelscribe-mcp-server](https://github.com/rara-cyber/reelscribe-mcp-server) [![rara-cyber/reelscribe-mcp-server MCP server](https://glama.ai/mcp/servers/rara-cyber/reelscribe-mcp-server/badges/score.svg)](https://glama.ai/mcp/servers/rara-cyber/reelscribe-mcp-server) 📇 ☁️ 🏠 - Transcribe Instagram Reels, TikTok, YouTube and Facebook videos by URL, with optional top comments, URL batches and Instagram channel transcription.`

## Agensi

`agensi/reelscribe-transcripts/` is a free SKILL.md for https://www.agensi.io/sell. Unlike `plugin/skills/`, it carries its own setup steps, because Agensi buyers install it without the plugin's `.mcp.json`. Keep the tool guidance in both files in step. `gemini-extension.json` and `llms-install.md` at the repo root also carry setup steps, and the manifest's `version` must match `package.json`. Upload: `cd agensi && zip -r /tmp/reelscribe-transcripts.zip reelscribe-transcripts`.
