# ReelScribe directory submission materials

`plugin/` is the OpenAI submission package source. Its logo is generated from the existing ReelScribe app icon. It contains no credentials. From that directory, create the upload with `zip -r /tmp/reelscribe-plugin.zip .`.

The 2.2.0 package requests both `reelscribe:mcp` and explicitly granted `reelscribe:manage` scopes. It describes all eighteen tools and updates the deletion review case. Existing October 14 live-test evidence below covers the original six tools only. The current package includes scoped CIMD OAuth and five positive/three negative review cases. These are a test plan, not a record of completed live tests. A dedicated reviewer account has been created, its password sign-in verified, and a completed public YouTube sample populated. Its credentials are stored in Bitwarden and the private Claude review form only. The reviewer account alone has a device-verification exception so reviewers can use the password without email OTP. On October 14, 2026, all six hosted tools passed live tests using the official MCP Inspector CLI and the reviewer account. Retrieval, listing, URL search, URL validation, credit reads, duplicate reuse, invalid URLs, missing IDs, an attempted account selector, and invalid credentials were checked. The test run spent 0 credits and its temporary API key was immediately revoked (authentication then returned HTTP 401). A new transcription job was not created during the Inspector run. OpenAI still needs an accessible demo-recording URL and its own portal checks. Keep reviewer credentials outside the ZIP.

OpenAI portal: https://platform.openai.com/plugins. The current account's upload flow asks for a verified developer identity even though organization settings show individual verification as approved. Resolve that requirement before uploading. Domain verification must use the exact challenge supplied by the portal; no challenge has been issued yet.

Claude submission: https://claude.ai/directory/manage/reelscribe. Submitted on October 14, 2026 and confirmed **In review**, under publisher SIÁN OÜ. Reviewer credentials and live-test results are supplied privately. The saved authentication configuration was verified as OAuth with Client ID Metadata Document (CIMD), matching the server’s discovery; automatic client registration is not enabled. The listing is not public in the directory until approved.

`server.json` is the official MCP Registry submission, validated against its schema. It uses the remote Streamable HTTP endpoint and GitHub namespace `io.github.rara-cyber/reelscribe`. No existing ReelScribe registry entry was found during preparation. The registry's publication flow uses its CLI:

```
mcp-publisher login github
mcp-publisher publish
```

Run those commands from this directory after completing ownership authorization and deciding to publish. Registry guide: https://modelcontextprotocol.io/registry/quickstart.
