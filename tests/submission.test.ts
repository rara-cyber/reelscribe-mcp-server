import { expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
const read=(file:string)=>JSON.parse(readFileSync(new URL('../'+file,import.meta.url),'utf8'));
test('directory artifacts request the deployed management scope and match the release version',()=>{
 const version=read('package.json').version;
 expect(read('submission/server.json').version).toBe(version);
 expect(read('submission/plugin/.codex-plugin/plugin.json').version).toBe(version);
 expect(read('submission/plugin/.mcp.json').mcpServers.reelscribe.extensions['com.openai'].auth.baseScopes).toEqual(['reelscribe:mcp','reelscribe:manage']);
 expect(read('submission/plugin/.codex-plugin/plugin.json').interface.longDescription).toContain('permanently delete');
 expect(read('submission/plugin/.codex-plugin/plugin.json').interface.developerName).toBe('SIÁN OÜ');
});
