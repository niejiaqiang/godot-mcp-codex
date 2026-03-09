#!/bin/bash
cd /Users/nie/Desktop/Game/local-tools/godot-mcp/server || exit 1
export MCP_HTTP_HOST=127.0.0.1
export MCP_HTTP_PORT=8765
export MCP_HTTP_ENDPOINT=/mcp
exec node dist/streamable_http.js
