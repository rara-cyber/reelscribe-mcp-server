# ReelScribe MCP Server

An [MCP (Model Context Protocol)](https://modelcontextprotocol.io) server that connects AI assistants to [ReelScribe](https://reelscribe.app) — transcribe Instagram Reels, TikTok videos, and YouTube videos directly from Claude, Cursor, Windsurf, and other MCP-compatible clients.

## Setup

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
| `transcribe_video` | Submit a video URL for transcription (1 credit). Returns requestId. |
| `get_transcription` | Get a transcription by ID or requestId. Returns full transcript text. |
| `list_transcriptions` | List your transcriptions with optional status filter. |
| `search_transcriptions` | Find a transcription by the original video URL. |
| `get_credits` | Check credit balance, subscription tier, and storage usage. |
| `validate_url` | Check if a URL is supported without submitting. |

## Supported Platforms

- **Instagram** — Reels, Posts (`/p/`), IGTV (`/tv/`)
- **TikTok** — Videos, short links (`vm.tiktok.com`, `vt.tiktok.com`)
- **YouTube** — Videos, Shorts, short links (`youtu.be`)

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

## Links

- [ReelScribe](https://reelscribe.app)
- [API Documentation](https://reelscribe.app/api)
- [MCP Protocol](https://modelcontextprotocol.io)

## License

MIT
