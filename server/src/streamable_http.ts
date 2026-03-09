import { randomUUID } from 'node:crypto';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { createMcpExpressApp } from '@modelcontextprotocol/sdk/server/express.js';
import { isInitializeRequest } from '@modelcontextprotocol/sdk/types.js';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { nodeTools } from './tools/node_tools.js';
import { scriptTools } from './tools/script_tools.js';
import { sceneTools } from './tools/scene_tools.js';
import { editorTools } from './tools/editor_tools.js';
import { getGodotConnection } from './utils/godot_connection.js';
import { MCPTool } from './utils/types.js';
import { sceneListResource, sceneStructureResource } from './resources/scene_resources.js';
import { scriptResource, scriptListResource, scriptMetadataResource } from './resources/script_resources.js';
import { projectStructureResource, projectSettingsResource, projectResourcesResource } from './resources/project_resources.js';
import { editorStateResource, selectedNodeResource, currentScriptResource } from './resources/editor_resources.js';

type LegacyResource = {
  uri: string;
  name: string;
  mimeType?: string;
  load: () => Promise<{ text: string; metadata?: Record<string, unknown> }>;
};

function normalizeResourceUri(uri: string): string {
  if (uri.includes('://')) {
    return uri;
  }

  if (uri.startsWith('godot/')) {
    return `godot://${uri.slice('godot/'.length)}`;
  }

  return `godot://${uri}`;
}

function extractInputSchema(tool: MCPTool): Record<string, unknown> {
  return zodToJsonSchema(tool.parameters, {
    target: 'jsonSchema7',
    $refStrategy: 'none',
  }) as Record<string, unknown>;
}

function registerLegacyTool(server: McpServer, tool: MCPTool): void {
  server.registerTool(tool.name, {
    description: tool.description,
    inputSchema: extractInputSchema(tool) as any,
  }, async (args: any) => {
    const text = await tool.execute(args);
    return {
      content: [
        {
          type: 'text' as const,
          text,
        },
      ],
    };
  });
}

function registerLegacyResource(server: McpServer, resource: LegacyResource): void {
  const resourceUri = normalizeResourceUri(resource.uri);

  server.registerResource(resource.name, resourceUri, {
    mimeType: resource.mimeType ?? 'text/plain',
  }, async () => {
    const result = await resource.load();
    return {
      contents: [
        {
          uri: resourceUri,
          mimeType: resource.mimeType ?? 'text/plain',
          text: result.text,
        },
      ],
    };
  });
}

function buildServer(): McpServer {
  const server = new McpServer({
    name: 'GodotMCP',
    version: '1.0.0',
  });

  [...nodeTools, ...scriptTools, ...sceneTools, ...editorTools].forEach((tool) => {
    registerLegacyTool(server, tool);
  });

  [
    sceneListResource,
    scriptListResource,
    projectStructureResource,
    projectSettingsResource,
    projectResourcesResource,
    editorStateResource,
    selectedNodeResource,
    currentScriptResource,
    sceneStructureResource,
    scriptResource,
    scriptMetadataResource,
  ].forEach((resource) => {
    registerLegacyResource(server, resource as LegacyResource);
  });

  return server;
}

async function main() {
  const host = process.env.MCP_HTTP_HOST || '127.0.0.1';
  const port = Number(process.env.MCP_HTTP_PORT || '8765');
  const endpoint = process.env.MCP_HTTP_ENDPOINT || '/mcp';

  const app = createMcpExpressApp({ host });
  const transports: Record<string, StreamableHTTPServerTransport> = {};

  app.all(endpoint, async (req: any, res: any) => {
    try {
      console.error('HTTP MCP request', {
        method: req.method,
        url: req.url,
        accept: req.headers['accept'],
        contentType: req.headers['content-type'],
        sessionId: req.headers['mcp-session-id'],
      });

      const sessionId = req.headers['mcp-session-id'] as string | undefined;
      let transport: StreamableHTTPServerTransport | undefined;

      if (req.method === 'POST' && isInitializeRequest(req.body)) {
        transport = new StreamableHTTPServerTransport({
          sessionIdGenerator: () => randomUUID(),
          enableJsonResponse: true,
          onsessioninitialized: (newSessionId) => {
            transports[newSessionId] = transport!;
          },
        });

        transport.onclose = () => {
          const activeSessionId = transport?.sessionId;
          if (activeSessionId) {
            delete transports[activeSessionId];
          }
        };

        const server = buildServer();
        await server.connect(transport);
      } else if (sessionId && transports[sessionId]) {
        transport = transports[sessionId];
      } else {
        res.status(404).json({
          jsonrpc: '2.0',
          error: {
            code: -32000,
            message: 'Session not found',
          },
          id: null,
        });
        return;
      }

      await transport.handleRequest(req, res, req.body);
    } catch (error) {
      console.error('Error handling MCP request:', error);
      if (!res.headersSent) {
        res.status(500).json({
          jsonrpc: '2.0',
          error: {
            code: -32603,
            message: 'Internal server error',
          },
          id: null,
        });
      }
    }
  });

  app.listen(port, host, (error?: Error) => {
    if (error) {
      console.error('Failed to start Streamable HTTP server:', error);
      process.exit(1);
    }

    console.error(`Godot MCP Streamable HTTP server running at http://${host}:${port}${endpoint}`);
  });

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
}

main().catch((error) => {
  console.error('Failed to start Streamable HTTP server:', error);
  process.exit(1);
});
