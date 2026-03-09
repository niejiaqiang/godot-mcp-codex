#!/bin/bash
cd /Users/nie/Desktop/Game/local-tools/godot-mcp/server || exit 1
export MINIMAL_HTTP_HOST=127.0.0.1
export MINIMAL_HTTP_PORT=8766
export MINIMAL_HTTP_ENDPOINT=/mcp
exec node dist/minimal_http.js
