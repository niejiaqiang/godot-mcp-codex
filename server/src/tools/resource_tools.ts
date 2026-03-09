import { z } from 'zod';
import { getGodotConnection } from '../utils/godot_connection.js';
import { MCPTool, CommandResult } from '../utils/types.js';

interface ListResourcesParams {
  root_path?: string;
  type_filter?: string;
  recursive?: boolean;
}

interface GetResourceInfoParams {
  resource_path: string;
}

interface GetResourceDependenciesParams {
  resource_path: string;
}

export const resourceTools: MCPTool[] = [
  {
    name: 'list_resources',
    description: 'List Godot resources under a res:// path, optionally filtered by resource type',
    parameters: z.object({
      root_path: z.string().optional()
        .describe('Directory to scan, defaults to res://'),
      type_filter: z.string().optional()
        .describe('Optional Godot resource type filter such as "PackedScene" or "Texture2D"'),
      recursive: z.boolean().optional()
        .describe('Whether to recurse into subdirectories'),
    }),
    execute: async ({ root_path, type_filter, recursive }: ListResourcesParams): Promise<string> => {
      const godot = getGodotConnection();

      try {
        const result = await godot.sendCommand<CommandResult>('list_resources', {
          root_path,
          type_filter,
          recursive,
        });
        const resources = Array.isArray(result.resources) ? result.resources : [];

        if (resources.length === 0) {
          return `No resources found under ${result.root_path ?? root_path ?? 'res://'}`;
        }

        const formatted = resources
          .map((resource: any) => `${resource.type} ${resource.path}`)
          .join('\n');

        return `Found ${resources.length} resource(s) under ${result.root_path ?? root_path ?? 'res://'}:\n\n${formatted}`;
      } catch (error) {
        throw new Error(`Failed to list resources: ${(error as Error).message}`);
      }
    },
  },

  {
    name: 'get_resource_info',
    description: 'Inspect a Godot resource and summarize its stored properties',
    parameters: z.object({
      resource_path: z.string()
        .describe('Resource path to inspect, e.g. "res://themes/custom.tres"'),
    }),
    execute: async ({ resource_path }: GetResourceInfoParams): Promise<string> => {
      const godot = getGodotConnection();

      try {
        const result = await godot.sendCommand<CommandResult>('get_resource_info', {
          resource_path,
        });

        const lines = [
          `Resource: ${result.resource_path ?? resource_path}`,
          `Type: ${result.type ?? 'Unknown'}`,
          `Name: ${result.name ?? ''}`,
        ];

        if (result.width !== undefined && result.height !== undefined) {
          lines.push(`Size: ${result.width}x${result.height}`);
        }
        if (result.node_count !== undefined) {
          lines.push(`Node count: ${result.node_count}`);
        }
        if (result.base_type) {
          lines.push(`Base type: ${result.base_type}`);
        }
        if (result.length !== undefined) {
          lines.push(`Length: ${result.length}`);
        }

        const properties = result.properties && typeof result.properties === 'object'
          ? Object.entries(result.properties).map(([key, value]) => `${key}: ${JSON.stringify(value)}`)
          : [];

        if (properties.length > 0) {
          lines.push('', ...properties);
        }

        return lines.join('\n');
      } catch (error) {
        throw new Error(`Failed to get resource info: ${(error as Error).message}`);
      }
    },
  },

  {
    name: 'get_resource_dependencies',
    description: 'List resource dependencies declared by Godot for a given resource path',
    parameters: z.object({
      resource_path: z.string()
        .describe('Resource path to inspect, e.g. "res://scenes/main/Main.tscn"'),
    }),
    execute: async ({ resource_path }: GetResourceDependenciesParams): Promise<string> => {
      const godot = getGodotConnection();

      try {
        const result = await godot.sendCommand<CommandResult>('get_resource_dependencies', {
          resource_path,
        });
        const dependencies = Array.isArray(result.dependencies) ? result.dependencies : [];

        if (dependencies.length === 0) {
          return `No dependencies found for ${result.resource_path ?? resource_path}`;
        }

        return `Dependencies for ${result.resource_path ?? resource_path}:\n\n${dependencies.join('\n')}`;
      } catch (error) {
        throw new Error(`Failed to get resource dependencies: ${(error as Error).message}`);
      }
    },
  },
];
