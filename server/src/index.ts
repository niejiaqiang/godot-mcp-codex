import { FastMCP } from 'fastmcp';
import { nodeTools } from './tools/node_tools.js';
import { scriptTools } from './tools/script_tools.js';
import { sceneTools } from './tools/scene_tools.js';
import { editorTools } from './tools/editor_tools.js';
import { filesystemTools } from './tools/filesystem_tools.js';
import { maintenanceTools } from './tools/maintenance_tools.js';
import { resourceTools } from './tools/resource_tools.js';
import { signalTools } from './tools/signal_tools.js';
import { getGodotConnection } from './utils/godot_connection.js';

// Import resources
import { 
  sceneListResource, 
  sceneStructureResource,
  sceneByPathResourceTemplate
} from './resources/scene_resources.js';
import { 
  scriptResource, 
  scriptListResource,
  scriptMetadataResource,
  scriptByPathResourceTemplate
} from './resources/script_resources.js';
import { 
  projectStructureResource,
  projectSettingsResource,
  projectResourcesResource 
} from './resources/project_resources.js';
import { 
  editorStateResource,
  selectedNodeResource,
  currentScriptResource 
} from './resources/editor_resources.js';
import { nodeSubtreeResourceTemplate } from './resources/node_resources.js';

/**
 * Main entry point for the Godot MCP server
 */
async function main() {
  console.error('Starting Godot MCP server...');

  // Create FastMCP instance
  const server = new FastMCP({
    name: 'GodotMCP',
    version: '1.0.0',
  });

  // Register all tools
  [...nodeTools, ...scriptTools, ...sceneTools, ...editorTools, ...filesystemTools, ...resourceTools, ...signalTools, ...maintenanceTools].forEach(tool => {
    server.addTool(tool);
  });

  // Register all resources
  // Static resources
  server.addResource(sceneListResource);
  server.addResource(scriptListResource);
  server.addResource(projectStructureResource);
  server.addResource(projectSettingsResource);
  server.addResource(projectResourcesResource);
  server.addResource(editorStateResource);
  server.addResource(selectedNodeResource);
  server.addResource(currentScriptResource);
  server.addResource(sceneStructureResource);
  server.addResource(scriptResource);
  server.addResource(scriptMetadataResource);
  server.addResourceTemplate(sceneByPathResourceTemplate as any);
  server.addResourceTemplate(scriptByPathResourceTemplate as any);
  server.addResourceTemplate(nodeSubtreeResourceTemplate as any);

  const transport = (process.env.MCP_TRANSPORT || 'stdio').toLowerCase();
  const ssePort = Number(process.env.MCP_SSE_PORT || '8765');
  const sseEndpoint = (process.env.MCP_SSE_ENDPOINT || '/sse') as `/${string}`;

  if (transport === 'sse') {
    await server.start({
      transportType: 'sse',
      sse: {
        port: ssePort,
        endpoint: sseEndpoint,
      },
    });
    console.error(`Godot MCP server started in SSE mode at http://127.0.0.1:${ssePort}${sseEndpoint}`);
  } else {
    await server.start({
      transportType: 'stdio',
    });
    console.error('Godot MCP server started in stdio mode');
  }

  // Warm up the Godot websocket in the background without blocking MCP startup.
  const godot = getGodotConnection();
  godot.connect()
    .then(() => {
      console.error('Successfully connected to Godot WebSocket server');
    })
    .catch((error) => {
      const err = error as Error;
      console.warn(`Could not connect to Godot: ${err.message}`);
      console.warn('Will retry connection when commands are executed');
    });

  // Handle cleanup
  const cleanup = async () => {
    console.error('Shutting down Godot MCP server...');
    godot.disconnect();
    await server.stop();
    process.exit(0);
  };

  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);
}

// Start the server
main().catch(error => {
  console.error('Failed to start Godot MCP server:', error);
  process.exit(1);
});
