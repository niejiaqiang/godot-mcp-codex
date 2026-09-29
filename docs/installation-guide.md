# Godot MCP installation

This repository runs locally. The Godot editor addon accepts commands on `127.0.0.1:9080`, and the Node server exposes MCP tools to your client over stdio.

## Prerequisites

- Godot 4.x (verified with Godot 4.7.2)
- Node.js 18+ and npm
- An MCP client such as Codex or Claude Desktop

## Setup

1. Clone this repository.
2. Run `npm ci` and `npm run build` inside its `server` directory.
3. Copy `addons/godot_mcp` into your Godot project's `addons` directory.
4. Open that project in Godot and enable **Godot MCP** under **Project > Project Settings > Plugins**. The plugin starts listening automatically while the editor is open.
5. Configure your MCP client to launch `node` with the absolute path to this repository's `server/dist/index.js` as its argument. Use stdio transport.

For example, clients that accept an `mcpServers` JSON object can use:

```json
{
  "mcpServers": {
    "godot-mcp-codex": {
      "command": "node",
      "args": ["/absolute/path/to/godot-mcp-codex/server/dist/index.js"]
    }
  }
}
```

The MCP client starts the Node process when needed. Keep the Godot editor open to use tools that access the project. A failed editor connection is reported by the tool; the MCP server can still start and list its tools.

## Check the connection

Ask your client to call `get_project_info`. The response should show the name and path of the Godot project currently open in the editor. If it fails, confirm that the plugin is enabled and that no other process is using local port 9080. Check the Godot editor output and MCP client logs for details.
