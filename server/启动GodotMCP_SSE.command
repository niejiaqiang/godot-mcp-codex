#!/bin/bash
cd /Users/nie/Desktop/Game/local-tools/godot-mcp/server || exit 1
export MCP_TRANSPORT=sse
export MCP_SSE_PORT=8765
export MCP_SSE_ENDPOINT=/sse
exec node dist/index.js
