# Godot MCP Codex

English | [中文](./README.md)

A Godot MCP toolkit focused on practical editor automation for Codex, Claude, and other MCP clients. It combines a Godot editor plugin with a FastMCP Node server so AI agents can inspect scenes, edit nodes and scripts, diagnose UI layout issues, manage signals, search project files, and inspect resources.

## Can Others Use It Directly?

Yes, but this is a local-development MCP setup, not a hosted cloud service.

Users still need to:

1. `git clone` this repository locally
2. Open a local Godot project with the `addons/godot_mcp` plugin enabled

Why:
- the MCP server runs locally on the user's machine
- the Godot plugin must exist inside a local Godot project

So the normal workflow is: clone locally, build locally, enable the plugin locally, then connect your MCP client.

## How To Use It With Your Own Game Project

You do not need to turn this repository itself into your game repository.

There are two common workflows:

### Option A: Open the example project in this repo

Good for validating the full pipeline quickly.

1. Clone this repo
2. Install server dependencies and build
3. Open the root `project.godot` in Godot
4. Point your MCP client at `server/dist/index.js`

### Option B: Integrate it into your own Godot game project

Good for real production use.

1. Clone this repo somewhere local
2. Copy `addons/godot_mcp` into your own Godot project's `addons/`
3. Open your own project in Godot and enable the plugin
4. Keep your MCP client pointing at this repo's `server/dist/index.js`

So:
- you do not need to open your game project before cloning
- the normal order is clone first, then wire the plugin into your Godot project

## Quick Start

### 1. Clone the repository

```bash
git clone https://github.com/niejiaqiang/godot-mcp-codex.git
cd godot-mcp-codex
```

### 2. Build the MCP server

```bash
cd server
npm install
npm run build
cd ..
```

### 3. Configure your MCP client

Add a config similar to this in Codex, Claude Desktop, Claude Code, or another compatible MCP client:

```json
{
  "mcpServers": {
    "godot-mcp-codex": {
      "command": "node",
      "args": [
        "PATH_TO_YOUR_PROJECT/server/dist/index.js"
      ],
      "env": {
        "MCP_TRANSPORT": "stdio"
      }
    }
  }
}
```

Replace `PATH_TO_YOUR_PROJECT` with the actual absolute path on your machine.

### 4. Enable the plugin in Godot

If you use the built-in example project:

1. Open Godot
2. Import the root `project.godot`
3. Confirm the plugin is enabled

If you use your own game project:

1. Copy `addons/godot_mcp` into your project's `addons/`
2. Open your project in Godot
3. Enable `Godot MCP` under `Project > Project Settings > Plugins`

## Key Features

- Stable `stdio` workflow for desktop MCP clients
- Scene and node automation
- Script reading, editing, and template generation
- UI layout inspection, diagnostics, auto-fix, and alignment helpers
- Signal inspection and wiring tools
- Project file listing, reading, and search under `res://`
- Resource listing, metadata inspection, and dependency lookup
- Optional SSE / HTTP transports where supported

## High-Value Tools

- `find_nodes`, `get_node_subtree`, `batch_update_node_properties`
- `inspect_control_layouts`, `diagnose_layout_issues`, `auto_fix_layout_issues`, `align_controls`
- `list_node_signals`, `get_node_signal_info`, `list_node_signal_connections`
- `connect_node_signal`, `disconnect_node_signal`, `disconnect_all_node_signal_connections`
- `list_directory`, `read_text_file`, `search_project_files`
- `list_resources`, `get_resource_info`, `get_resource_dependencies`
- `create_theme_resource`, `assign_theme_to_control`
- `get_plugin_sync_status`

## Repository Layout

This repo intentionally contains:
- the MCP source repo at the root
- the Godot plugin under `addons/godot_mcp`
- the Node / FastMCP server under `server`
- a small example Godot project for validation

When integrating into your own Godot game, you typically only copy or sync `addons/godot_mcp` into the target project.

## Non-Essential Files Removed

The repo has been cleaned up to remove clearly personal or unrelated files such as:
- `.DS_Store`
- `CLAUDE.md`
- `claude_desktop_config.json`

The example project files are kept intentionally so new users can validate the setup quickly.

## Documentation

See the `docs/` directory for more:

- [Getting Started](docs/getting-started.md)
- [Installation Guide](docs/installation-guide.md)
- [Command Reference](docs/command-reference.md)
- [Architecture](docs/architecture.md)

## License

This project is released under the MIT License. See [LICENSE](LICENSE).
