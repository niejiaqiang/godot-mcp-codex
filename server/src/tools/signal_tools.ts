import { z } from 'zod';
import { getGodotConnection } from '../utils/godot_connection.js';
import { MCPTool, CommandResult } from '../utils/types.js';

interface ListNodeSignalsParams {
  node_path: string;
}

interface ConnectNodeSignalParams {
  source_node_path: string;
  signal_name: string;
  target_node_path: string;
  method_name: string;
  flags?: number;
}

interface GetNodeSignalInfoParams {
  node_path: string;
  signal_name: string;
}

interface ListNodeSignalConnectionsParams {
  node_path: string;
  signal_name: string;
}

interface DisconnectNodeSignalParams {
  source_node_path: string;
  signal_name: string;
  target_node_path: string;
  method_name: string;
}

interface DisconnectAllNodeSignalConnectionsParams {
  node_path: string;
  signal_name: string;
}

export const signalTools: MCPTool[] = [
  {
    name: 'list_node_signals',
    description: 'List the signals exposed by a node in the Godot scene tree',
    parameters: z.object({
      node_path: z.string()
        .describe('Path to the node to inspect (e.g. "/root/MainScene/Button")'),
    }),
    execute: async ({ node_path }: ListNodeSignalsParams): Promise<string> => {
      const godot = getGodotConnection();

      try {
        const result = await godot.sendCommand<CommandResult>('list_node_signals', {
          node_path,
        });

        if (!result.signals || result.signals.length === 0) {
          return `No signals found on node at ${node_path}`;
        }

        const formattedSignals = result.signals
          .map((signal: any) => {
            const args = Array.isArray(signal.args) && signal.args.length > 0
              ? signal.args.map((arg: any) => `${arg.name ?? 'arg'}:${arg.type ?? 'Variant'}`).join(', ')
              : 'no args';
            return `${signal.name} (${args})`;
          })
          .join('\n');

        return `Signals for node at ${node_path}:\n\n${formattedSignals}`;
      } catch (error) {
        throw new Error(`Failed to list node signals: ${(error as Error).message}`);
      }
    },
  },

  {
    name: 'get_node_signal_info',
    description: 'Get details for a specific signal on a node, including its current connections',
    parameters: z.object({
      node_path: z.string()
        .describe('Path to the node exposing the signal'),
      signal_name: z.string()
        .describe('Signal name to inspect'),
    }),
    execute: async ({ node_path, signal_name }: GetNodeSignalInfoParams): Promise<string> => {
      const godot = getGodotConnection();

      try {
        const result = await godot.sendCommand<CommandResult>('get_node_signal_info', {
          node_path,
          signal_name,
        });

        const signal = result.signal ?? {};
        const connections = Array.isArray(signal.connections) ? signal.connections : [];
        const args = Array.isArray(signal.args) && signal.args.length > 0
          ? signal.args.map((arg: any) => `${arg.name ?? 'arg'}:${arg.type ?? 'Variant'}`).join(', ')
          : 'no args';
        const formattedConnections = connections.length > 0
          ? connections
              .map((connection: any) => `${connection.target_node_path || '<non-node target>'}.${connection.method_name} [flags=${connection.flags}]`)
              .join('\n')
          : 'No active connections';

        return `Signal "${signal_name}" on ${node_path}\nArgs: ${args}\nConnections: ${connections.length}\n\n${formattedConnections}`;
      } catch (error) {
        throw new Error(`Failed to get node signal info: ${(error as Error).message}`);
      }
    },
  },

  {
    name: 'list_node_signal_connections',
    description: 'List all connections attached to a specific node signal',
    parameters: z.object({
      node_path: z.string()
        .describe('Path to the node exposing the signal'),
      signal_name: z.string()
        .describe('Signal name to inspect'),
    }),
    execute: async ({ node_path, signal_name }: ListNodeSignalConnectionsParams): Promise<string> => {
      const godot = getGodotConnection();

      try {
        const result = await godot.sendCommand<CommandResult>('list_node_signal_connections', {
          node_path,
          signal_name,
        });

        if (!result.connections || result.connections.length === 0) {
          return `No connections found for signal "${signal_name}" on ${node_path}`;
        }

        const formattedConnections = result.connections
          .map((connection: any) => `${connection.target_node_path || '<non-node target>'}.${connection.method_name} [flags=${connection.flags}]`)
          .join('\n');

        return `Connections for signal "${signal_name}" on ${node_path}:\n\n${formattedConnections}`;
      } catch (error) {
        throw new Error(`Failed to list node signal connections: ${(error as Error).message}`);
      }
    },
  },

  {
    name: 'connect_node_signal',
    description: 'Connect a signal from one node to a method on another node',
    parameters: z.object({
      source_node_path: z.string()
        .describe('Path to the node emitting the signal'),
      signal_name: z.string()
        .describe('Signal name on the source node'),
      target_node_path: z.string()
        .describe('Path to the node receiving the callback'),
      method_name: z.string()
        .describe('Method name to call on the target node'),
      flags: z.number().int().optional()
        .describe('Optional Godot connect flags; defaults to CONNECT_PERSIST'),
    }),
    execute: async ({
      source_node_path,
      signal_name,
      target_node_path,
      method_name,
      flags,
    }: ConnectNodeSignalParams): Promise<string> => {
      const godot = getGodotConnection();

      try {
        const result = await godot.sendCommand<CommandResult>('connect_node_signal', {
          source_node_path,
          signal_name,
          target_node_path,
          method_name,
          flags,
        });

        if (result.already_connected) {
          return `Signal "${signal_name}" from ${source_node_path} is already connected to ${target_node_path}.${method_name}`;
        }

        return `Connected signal "${signal_name}" from ${source_node_path} to ${target_node_path}.${method_name}`;
      } catch (error) {
        throw new Error(`Failed to connect node signal: ${(error as Error).message}`);
      }
    },
  },

  {
    name: 'disconnect_all_node_signal_connections',
    description: 'Disconnect every connection currently attached to a specific node signal',
    parameters: z.object({
      node_path: z.string()
        .describe('Path to the node exposing the signal'),
      signal_name: z.string()
        .describe('Signal name whose connections should be removed'),
    }),
    execute: async ({
      node_path,
      signal_name,
    }: DisconnectAllNodeSignalConnectionsParams): Promise<string> => {
      const godot = getGodotConnection();

      try {
        const result = await godot.sendCommand<CommandResult>('disconnect_all_node_signal_connections', {
          node_path,
          signal_name,
        });

        return `Disconnected ${result.disconnected_count ?? 0} connection(s) from signal "${signal_name}" on ${node_path}`;
      } catch (error) {
        throw new Error(`Failed to disconnect all node signal connections: ${(error as Error).message}`);
      }
    },
  },

  {
    name: 'disconnect_node_signal',
    description: 'Disconnect a signal from one node to a method on another node',
    parameters: z.object({
      source_node_path: z.string()
        .describe('Path to the node emitting the signal'),
      signal_name: z.string()
        .describe('Signal name on the source node'),
      target_node_path: z.string()
        .describe('Path to the node receiving the callback'),
      method_name: z.string()
        .describe('Method name currently connected on the target node'),
    }),
    execute: async ({
      source_node_path,
      signal_name,
      target_node_path,
      method_name,
    }: DisconnectNodeSignalParams): Promise<string> => {
      const godot = getGodotConnection();

      try {
        const result = await godot.sendCommand<CommandResult>('disconnect_node_signal', {
          source_node_path,
          signal_name,
          target_node_path,
          method_name,
        });

        if (result.was_connected === false) {
          return `Signal "${signal_name}" from ${source_node_path} was not connected to ${target_node_path}.${method_name}`;
        }

        return `Disconnected signal "${signal_name}" from ${source_node_path} to ${target_node_path}.${method_name}`;
      } catch (error) {
        throw new Error(`Failed to disconnect node signal: ${(error as Error).message}`);
      }
    },
  },
];
