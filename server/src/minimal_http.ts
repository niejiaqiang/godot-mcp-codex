import { randomUUID } from 'node:crypto';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { createMcpExpressApp } from '@modelcontextprotocol/sdk/server/express.js';
import { isInitializeRequest } from '@modelcontextprotocol/sdk/types.js';

function createServer(): McpServer {
  const server = new McpServer({
    name: 'CodexMinimalHttpTest',
    version: '1.0.0',
  });

  server.registerTool('ping', {
    description: 'Return a simple pong response',
    inputSchema: {
      type: 'object',
      properties: {
        message: {
          type: 'string',
        },
      },
      additionalProperties: false,
    } as any,
  }, async ({ message }: any) => {
    return {
      content: [
        {
          type: 'text' as const,
          text: message ? `pong:${message}` : 'pong',
        },
      ],
    };
  });

  server.registerResource('status', 'test://status', {
    mimeType: 'application/json',
  }, async () => {
    return {
      contents: [
        {
          uri: 'test://status',
          mimeType: 'application/json',
          text: JSON.stringify({
            ok: true,
            server: 'CodexMinimalHttpTest',
          }),
        },
      ],
    };
  });

  return server;
}

async function main() {
  const host = process.env.MINIMAL_HTTP_HOST || '127.0.0.1';
  const port = Number(process.env.MINIMAL_HTTP_PORT || '8766');
  const endpoint = process.env.MINIMAL_HTTP_ENDPOINT || '/mcp';

  const app = createMcpExpressApp({ host });
  const transports: Record<string, StreamableHTTPServerTransport> = {};

  app.all(endpoint, async (req: any, res: any) => {
    console.error('MINIMAL HTTP request', {
      method: req.method,
      url: req.url,
      accept: req.headers['accept'],
      contentType: req.headers['content-type'],
      sessionId: req.headers['mcp-session-id'],
    });

    try {
      const sessionId = req.headers['mcp-session-id'] as string | undefined;
      let transport: StreamableHTTPServerTransport | undefined;

      if (req.method === 'POST' && isInitializeRequest(req.body)) {
        transport = new StreamableHTTPServerTransport({
          sessionIdGenerator: () => randomUUID(),
          enableJsonResponse: true,
          onsessioninitialized: (newSessionId) => {
            transports[newSessionId] = transport!;
          },
          onsessionclosed: (closedSessionId) => {
            delete transports[closedSessionId];
          },
        });

        const server = createServer();
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
      console.error('Error handling minimal MCP request:', error);
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
      console.error('Failed to start minimal HTTP MCP server:', error);
      process.exit(1);
    }

    console.error(`Minimal MCP HTTP server running at http://${host}:${port}${endpoint}`);
  });
}

main().catch((error) => {
  console.error('Failed to start minimal HTTP MCP server:', error);
  process.exit(1);
});
