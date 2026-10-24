# Installing the ReelScribe MCP server

These steps are for an AI agent setting up ReelScribe for a user. Ignore the
"Deploying" section of the README: it is for the ReelScribe maintainers.

1. The user needs a ReelScribe account (https://reelscribe.app/sign-up, 25 free
   credits) and an API key from https://reelscribe.app/api. Keys start with `rs_`.
   Ask the user to paste the key into the config file themselves, or to give it
   to you only if they are comfortable doing so. Never log or echo it.
2. Node.js 18 or newer must be installed (`node --version`).
3. Add this server to the MCP settings file. Nothing needs to be cloned or built:

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

4. Check the setup by calling `get_credits`. It is free and returns the
   account's credit balance. An authentication error means the key is wrong or
   revoked.

New transcriptions cost 1 credit per video, so confirm with the user before
calling `transcribe_video`, `transcribe_bulk` or `transcribe_instagram_channel`.
Reads (`get_transcription`, `list_transcriptions`, `search_transcriptions`,
`list_jobs`, `get_credits`, `validate_url`) are free.

Docs: https://reelscribe.app/mcp
