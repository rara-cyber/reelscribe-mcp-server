---
name: reelscribe-transcripts
description: Transcribe Instagram Reels, TikTok, YouTube and Facebook videos from a URL, and retrieve, search or summarize saved transcripts, through the ReelScribe MCP server. Use when the user shares a social video link and wants its words, a summary, hooks, captions or quotes, or asks about videos they already transcribed.
---

# ReelScribe transcripts

This skill drives the ReelScribe MCP server. It does nothing on its own: every
action is a ReelScribe tool call to reelscribe.app, made with the user's own
account. It makes no other network calls.

## Setup (once)

The user needs a ReelScribe account (https://reelscribe.app/sign-up, 25 free
credits) and the ReelScribe MCP server connected. If no `reelscribe` tools are
available, tell the user to connect one of these and stop:

- **Hosted, OAuth sign-in** (Claude, ChatGPT and other clients with remote MCP
  OAuth): add `https://reelscribe.app/api/mcp` as a remote connector, then
  sign in and approve access.
- **Local, API key** (Claude Code, Cursor, Windsurf and other stdio clients):
  generate a key at https://reelscribe.app/api and add to the MCP config:

  ```json
  {
    "mcpServers": {
      "reelscribe": {
        "command": "npx",
        "args": ["-y", "reelscribe-mcp-server"],
        "env": { "REELSCRIBE_API_KEY": "rs_your_api_key_here" }
      }
    }
  }
  ```

The key goes in the config file only. Never ask the user to paste a key or
token into the conversation.

## Using the tools

- **New video:** run `validate_url`, then `get_credits`. A new transcription
  costs 1 credit, so confirm with the user before calling `transcribe_video`.
  Set `includeComments: true` only if they want top comments too (Instagram,
  TikTok, YouTube; still 1 credit).
- **Getting the text:** the hosted server returns a request ID. Call
  `get_transcription` with it. If the job is still processing, say so. Never
  invent or guess a transcript.
- **Already transcribed?** Use `search_transcriptions` with the video URL. It
  only covers recent history, so no match does not prove the video was never
  transcribed. Submitting a duplicate returns the existing transcript.
- **Browsing the library:** `list_transcriptions` returns one page of previews,
  newest first, not the whole library. Follow its cursor for more, and fetch
  the full text with `get_transcription` before summarizing.
- **Many videos:** `transcribe_bulk` takes a URL list, and
  `transcribe_instagram_channel` takes 1–50 reels from a channel. Both spend
  1 credit per new video and follow the user's plan limits, so state the
  maximum cost and get a yes first. Track them with `list_jobs`.
- Reads (`get_credits`, `list_jobs`, transcript reads) spend no credits.

Downloads, deleting, retries, analytics, settings and billing live in the web
app at https://reelscribe.app/dashboard, not in these tools. If the user asks
for them, point them there.

Docs and limits: https://reelscribe.app/mcp
