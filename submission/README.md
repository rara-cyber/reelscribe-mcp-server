# ReelScribe directory submission materials

`plugin/` is the OpenAI submission package source. Its logo is generated from the existing ReelScribe app icon. It contains no credentials. From that directory, create the upload with `zip -r /tmp/reelscribe-plugin.zip .`.

The package includes scoped CIMD OAuth and five positive/three negative review cases. These are a test plan, not a record of completed live tests. A dedicated reviewer account has been created, its password sign-in verified, and a completed public YouTube sample populated. Its credentials are stored in Bitwarden and the private Claude review form only. The reviewer account alone has a device-verification exception so reviewers can use the password without email OTP. Before review, complete all-tool MCP Inspector tests and add an accessible demo-recording URL in the private submission workflow. Keep reviewer credentials outside the ZIP.

OpenAI portal: https://platform.openai.com/plugins. The current account's upload flow asks for a verified developer identity even though organization settings show individual verification as approved. Resolve that requirement before uploading. Domain verification must use the exact challenge supplied by the portal; no challenge has been issued yet.

Claude portal: https://claude.ai/directory/manage/new/connector. A browser draft has been filled with the endpoint, logo, use cases, publisher, and OAuth settings. Claude says drafts are kept in the current tab until it is closed; keep the handoff tab open. The final submission has not been sent.

`server.json` is the official MCP Registry submission, validated against its schema. It uses the remote Streamable HTTP endpoint and GitHub namespace `io.github.rara-cyber/reelscribe`. No existing ReelScribe registry entry was found during preparation. The registry's publication flow uses its CLI:

```
mcp-publisher login github
mcp-publisher publish
```

Run those commands from this directory after completing ownership authorization and deciding to publish. Registry guide: https://modelcontextprotocol.io/registry/quickstart.
