# Godot MCP Codex

A Godot MCP toolkit focused on practical editor automation for Codex, Claude, and other MCP clients. It combines a Godot editor plugin with a FastMCP server so AI agents can inspect scenes, edit nodes and scripts, diagnose UI layout issues, work with signals, search project files, and inspect resources.

## Features

- **Stable `stdio` workflow** for Codex and other desktop MCP clients
- **Scene and node automation** for creating, querying, and editing Godot content
- **Script editing support** with read, write, and template generation
- **UI layout diagnostics** including subtree snapshots, issue detection, auto-fix, and alignment helpers
- **Signal tooling** to inspect, connect, disconnect, and audit node signal wiring
- **Project file access** for directory listing, text reads, and search under `res://`
- **Resource inspection** for resource listing, metadata inspection, and dependency lookups
- **Optional SSE / HTTP transports** for environments that support them

## Quick Setup

### 1. Clone the Repository

```bash
git clone https://github.com/niejiaqiang/godot-mcp-codex.git
cd godot-mcp-codex
```

### 2. Set Up the MCP Server

```bash
cd server
npm install
npm run build
# Return to project root
cd ..
```

### 3. Configure Your MCP Client

Add the following configuration to your MCP client (Codex, Claude Desktop, Claude Code, or another compatible client):
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
   > **Note**: Replace `PATH_TO_YOUR_PROJECT` with the absolute path to where you have this repository stored.

Restart your MCP client after saving the config.

### 4. Open the Example Project in Godot

1. Open Godot Engine
2. Select "Import" and navigate to the cloned repository
3. Open the `project.godot` file
4. The MCP plugin is already enabled in this example project

## Using MCP with AI Clients

After setup, you can work with your Godot project directly from Codex, Claude, or another MCP client using natural language.

### Example Prompts

```
@mcp godot-mcp-codex read godot://script/current

I need help optimizing my player movement code. Can you suggest improvements?
```

```
@mcp godot-mcp-codex run get_current_scene

Add a cube in the middle of the scene and then make a camera that is looking at the cube.
```

```
@mcp godot-mcp-codex read godot://scene/current

Create an enemy AI that patrols between waypoints and attacks the player when in range.
```

### Natural Language Tasks Claude Can Perform

- "Create a main menu with play, options, and quit buttons"
- "Add collision detection to the player character"
- "Implement a day/night cycle system"
- "Refactor this code to use signals instead of direct references"
- "Debug why my player character falls through the floor sometimes"

## Available Resources and Commands

### Resource Endpoints
- `godot://script/current` - The currently open script
- `godot://scene/current` - The currently open scene
- `godot://project/info` - Project metadata and settings
- `godot://scene/by-path/{path}` - A scene by explicit `res://` path
- `godot://script/by-path/{path}` - A script by explicit `res://` path
- `godot://node/subtree/{path}` - A serialized node subtree

### Command Categories:

#### High-value Tools
- `find_nodes`, `get_node_subtree`, `batch_update_node_properties`
- `inspect_control_layouts`, `diagnose_layout_issues`, `auto_fix_layout_issues`, `align_controls`
- `list_node_signals`, `get_node_signal_info`, `list_node_signal_connections`
- `connect_node_signal`, `disconnect_node_signal`, `disconnect_all_node_signal_connections`
- `list_directory`, `read_text_file`, `search_project_files`
- `list_resources`, `get_resource_info`, `get_resource_dependencies`
- `get_plugin_sync_status`

## Troubleshooting

### Connection Issues
- Ensure the plugin is enabled in Godot's Project Settings
- Check the Godot console for any error messages
- Verify the server is running when Claude Desktop launches it


### Plugin Not Working
- Reload Godot project after any configuration changes
- Check for error messages in the Godot console
- Make sure all paths in your Claude Desktop config are absolute and correct

## Adding the Plugin to Your Own Godot Project

If you want to use the MCP plugin in your own Godot project:

1. Copy the `addons/godot_mcp` folder to your Godot project's `addons` directory
2. Open your project in Godot
3. Go to Project > Project Settings > Plugins
4. Enable the "Godot MCP" plugin

## Notes About Layout

This repo intentionally contains:
- the source MCP repo under the root
- the Godot plugin under `addons/godot_mcp`
- the Node/FastMCP server under `server`

In consuming Godot projects, you should copy or sync only `addons/godot_mcp` into the target project's `addons` directory.

## Documentation

For more detailed information, check the documentation in the `docs` folder:

- [Getting Started](docs/getting-started.md)
- [Installation Guide](docs/installation-guide.md)
- [Command Reference](docs/command-reference.md)
- [Architecture](docs/architecture.md)

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
