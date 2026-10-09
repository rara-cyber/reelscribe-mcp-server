# ReelScribe MCP Server

An [MCP (Model Context Protocol)](https://modelcontextprotocol.io) server that connects AI assistants to [ReelScribe](https://reelscribe.app) — transcribe Instagram Reels, TikTok videos, and YouTube videos directly from Claude, Cursor, Windsurf, and other MCP-compatible clients.

## Setup

### Hosted connector (Cloudflare Workers)

The endpoint is `https://reelscribe-mcp.sian-agency.workers.dev/mcp`; account sign-in requires
the OAuth and Cloudflare setup below. Once deployed, add it as a remote
connector in Claude or as an MCP connection in ChatGPT developer mode, then
sign in to your ReelScribe account and approve access. Directory publication is
a separate review process.

Hosted transcription returns a `requestId` immediately. Use `get_transcription`
with that ID to retrieve the transcript after processing; submitting a duplicate
returns the existing transcript. Hosted tools do not include purchase links.

#### Deploying

1. Deploy the accompanying ReelScribe API OAuth change, including the Convex
   `includeRetention` response on `/admin/get-user-by-clerk-id`.
2. In the production Clerk instance, create and advertise the custom scope
   `reelscribe:mcp`, with consent text explaining permission to read transcripts
   and credit balance, and submit transcriptions that spend credits. Enable
   CIMD client onboarding, require S256 PKCE, and set the default scopes to
   `reelscribe:mcp`. Keep opaque access tokens enabled. Allow the intended
   clients to request the custom scope; enable DCR only for clients needing it.
3. Authenticate Wrangler with permission to deploy Workers in the SIÁN account.
   If Wrangler lists multiple accounts, set `CLOUDFLARE_ACCOUNT_ID` to that account.
4. Run `bun run typecheck`, `bun test`, `bun run worker:build`, then
   `bun run worker:deploy`.
5. Verify `/health`, the public OAuth metadata, an unauthenticated `/mcp` 401
   challenge, and the complete sign-in and transcription flow in both clients.

The initial deployment uses `workers.dev` because the authenticated Cloudflare
account cannot access the `reelscribe.app` zone. After domain access is available,
add the custom-domain route for `mcp.reelscribe.app` in `wrangler.jsonc`, update
`RESOURCE` in `src/worker.ts`, and verify OAuth discovery again before switching clients.

The Worker holds no shared user API key or Clerk secret. It forwards each
caller's token to ReelScribe's API, which verifies it with Clerk and resolves
only that token's user. OAuth access permits reads and transcription submission;
deletion and account-setting writes remain unavailable through this scope.

Local stdio setup remains available below.

### 1. Get an API Key

Sign up at [reelscribe.app](https://reelscribe.app/sign-up) (25 free credits) and generate an API key from your [API settings](https://reelscribe.app/api).

### 2. Configure Your MCP Client

Add to your MCP client configuration:

**Claude Desktop** (`~/Library/Application Support/Claude/claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "reelscribe": {
      "command": "npx",
      "args": ["-y", "reelscribe-mcp-server"],
      "env": {
        "REELSCRIBE_API_KEY": "rs_your_api_key_here"
      }
    }
  }
}
```

**Claude Code** (`~/.claude.json` or project `.mcp.json`):

```json
{
  "mcpServers": {
    "reelscribe": {
      "command": "npx",
      "args": ["-y", "reelscribe-mcp-server"],
      "env": {
        "REELSCRIBE_API_KEY": "rs_your_api_key_here"
      }
    }
  }
}
```

**Cursor** (Settings > MCP):

```json
{
  "mcpServers": {
    "reelscribe": {
      "command": "npx",
      "args": ["-y", "reelscribe-mcp-server"],
      "env": {
        "REELSCRIBE_API_KEY": "rs_your_api_key_here"
      }
    }
  }
}
```

## Available Tools

| Tool | Description |
|------|-------------|
| `transcribe_video` | Submit a video URL for transcription (1 credit). Waits for and returns the transcript. |
| `get_transcription` | Get a transcription by ID or requestId. Returns full transcript text. |
| `list_transcriptions` | List **one page** of your transcriptions (default 20, max 200), newest first. Optional status filter. |
| `search_transcriptions` | Find transcriptions by the original video URL, within a bounded recent window. |
| `get_credits` | Check credit balance, subscription tier, stored transcription count, and retention. |
| `validate_url` | Check if a URL is supported without submitting. |

### Pagination

`list_transcriptions` returns a page, never a whole library. Pass `nextCursor`
back as `cursor` while `hasMore` is true to walk the rest.

The API does not report a library total, so this server does not invent one:
`libraryTotal` is a number only when a response provably covers the entire
result set (first page, no further pages), and `null` otherwise. For a
library-wide figure, `get_credits` reports `library.completedTranscriptions` —
itself a bounded count, flagged with `library.isCapped` when the real number is
higher.

Transcripts in list results are 500-character previews with the full length in
`transcriptChars`; call `get_transcription` with an id to read one in full.

### Storage and retention

There is no storage quota. Per-tier count limits were retired on 2026-07-31 —
a library is bounded by time instead, and `get_credits` reports the retention
that applies to the account (`unlimited` while subscribed, a rolling window
otherwise). Transcriptions created before the policy date are never
auto-deleted.

## Supported Platforms

- **Instagram** — Reels, Posts (`/p/`), IGTV (`/tv/`)
- **TikTok** — Videos, short links (`vm.tiktok.com`, `vt.tiktok.com`)
- **YouTube** — Videos, Shorts, short links (`youtu.be`)
- **Facebook** — Videos (`/watch?v=`, `/videos/`), Reels, short links (`fb.watch`)

## Example Usage

> "Transcribe this TikTok video: https://www.tiktok.com/@user/video/123456"

> "Check my credit balance"

> "List my completed transcriptions"

> "Did I already transcribe this video? https://www.instagram.com/reel/ABC123/"

## Pricing

- **Free**: 25 credits on signup
- **Creator**: $9.99/mo — 1,000 credits
- **Agency**: $24.99/mo — 3,000 credits
- **Enterprise**: $59.99/mo — 10,000 credits

Each transcription costs 1 credit. [View pricing](https://reelscribe.app/pricing)

## Changelog

### 2.0.0

Compatibility with the ReelScribe `/v1` API changes of 2026-07-31. **1.0.5 and
earlier report wrong numbers against the current API** and should be upgraded.

Breaking:

- `list_transcriptions` no longer reports `total`. That field became the length
  of the page when the endpoint went cursor-paginated, so 1.0.5 answered "how
  many transcriptions do I have?" with the page size — 100 for a library of
  2,000 — and nothing in the response revealed it. Replaced by `returned`
  (this page), `libraryTotal` (a number only when the response covers
  everything, otherwise `null`), `hasMore` and `nextCursor`.
- `list_transcriptions` returns 500-character transcript previews plus
  `transcriptChars`, not full transcript text. Use `get_transcription` for the
  full text.
- `get_credits` no longer reports `storage.limit`. Per-tier storage caps were
  retired; the API now returns `-1` ("no limit") for every tier, which rendered
  as "unlimited" and hid a real 30-day retention window. Replaced by
  `library.completedTranscriptions` / `library.isCapped` and a `retention`
  block.

Added:

- `cursor` and `limit` parameters on `list_transcriptions` (default 20, max 200).
- Facebook video and Reel URLs are validated locally, which the API has accepted
  all along — `validate_url` and `transcribe_video` used to reject them before a
  request was made.
- `search_transcriptions` reports `matchesReturned` and states that its window is
  bounded, so `found: false` is no longer readable as "never transcribed".

## Links

- [ReelScribe](https://reelscribe.app)
- [API Documentation](https://reelscribe.app/api)
- [MCP Protocol](https://modelcontextprotocol.io)

## License

MIT
