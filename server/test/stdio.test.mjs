import assert from 'node:assert/strict';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

test('stdio server initializes and exposes Godot tools', { timeout: 15000 }, async () => {
  const serverPath = fileURLToPath(new URL('../dist/index.js', import.meta.url));
  const transport = new StdioClientTransport({
    command: process.execPath,
    args: [serverPath],
    stderr: 'pipe',
  });
  const client = new Client({ name: 'godot-mcp-smoke', version: '1.0.0' });

  try {
    await client.connect(transport);
    const { tools } = await client.listTools();
    const names = new Set(tools.map((tool) => tool.name));
    assert.ok(names.has('find_nodes'));
    assert.ok(names.has('read_text_file'));
  } finally {
    await client.close();
  }
});
