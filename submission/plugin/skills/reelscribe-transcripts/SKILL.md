---
name: reelscribe-transcripts
description: Transcribe supported video URLs through ReelScribe and retrieve or summarize the connected user's saved transcripts.
---

Use the ReelScribe MCP tools for the user's requested video or saved transcript.

- For a new video, validate its URL and check available credits. A new transcription spends 1 credit; get the user's authorization for that job before submitting it.
- The hosted `transcribe_video` returns a request ID. Retrieve that job with `get_transcription` to get its status and completed text. If processing is unfinished, report the pending job rather than inventing a transcript.
- `list_transcriptions` returns a page of previews, not the whole library. Follow its cursor when the request needs additional pages. Retrieve the full text before summarizing a preview.
- `search_transcriptions` searches a bounded recent-history window by original video URL. A missing match does not establish that the video was never transcribed.
- Credit, retention, analytics and job reads do not spend credits. Batch and channel submissions use the website credit and plan limits.
- Management actions require separate `reelscribe:manage` consent. Explain the scope of permanent deletion or cancellation before carrying out the user’s authorized request. Exports return expiring download links; files can be accessed by anyone holding their URL.
- Notification and tooltip preferences can be updated. Billing, API keys and account security open the authenticated website through `get_account_links`; no tool purchases plans or transfers funds.

If authentication is missing, use the connection's OAuth sign-in flow. Never ask the user to paste tokens or API keys into the conversation. Setup and limitations: https://reelscribe.app/mcp.
