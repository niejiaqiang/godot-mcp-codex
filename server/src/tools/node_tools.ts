import { z } from 'zod';
import { getGodotConnection } from '../utils/godot_connection.js';
import { MCPTool, CommandResult } from '../utils/types.js';

/**
 * Type definitions for node tool parameters
 */
interface CreateNodeParams {
  parent_path: string;
  node_type: string;
  node_name: string;
}

interface DeleteNodeParams {
  node_path: string;
}

interface UpdateNodePropertyParams {
  node_path: string;
  property: string;
  value: any;
}

interface GetNodePropertiesParams {
  node_path: string;
}

interface GetNodeSubtreeParams {
  node_path: string;
}

interface ListNodesParams {
  parent_path: string;
}

interface FindNodesParams {
  parent_path: string;
  name_contains?: string;
  node_type?: string;
  recursive?: boolean;
}

interface BatchUpdateNodePropertiesParams {
  updates: Array<{
    node_path: string;
    property: string;
    value: any;
  }>;
}

interface InspectControlLayoutsParams {
  parent_path: string;
  recursive?: boolean;
  include_hidden?: boolean;
}

interface DiagnoseLayoutIssuesParams {
  parent_path: string;
  recursive?: boolean;
  include_hidden?: boolean;
}

interface AutoFixLayoutIssuesParams {
  parent_path: string;
  recursive?: boolean;
  include_hidden?: boolean;
  clamp_to_parent?: boolean;
}

interface AlignControlsParams {
  node_paths: string[];
  axis: string;
  spacing?: number;
}

/**
 * Definition for node tools - operations that manipulate nodes in the scene tree
 */
export const nodeTools: MCPTool[] = [
  {
    name: 'create_node',
    description: 'Create a new node in the Godot scene tree',
    parameters: z.object({
      parent_path: z.string()
        .describe('Path to the parent node where the new node will be created (e.g. "/root", "/root/MainScene")'),
      node_type: z.string()
        .describe('Type of node to create (e.g. "Node2D", "Sprite2D", "Label")'),
      node_name: z.string()
        .describe('Name for the new node'),
    }),
    execute: async ({ parent_path, node_type, node_name }: CreateNodeParams): Promise<string> => {
      const godot = getGodotConnection();
      
      try {
        const result = await godot.sendCommand<CommandResult>('create_node', {
          parent_path,
          node_type,
          node_name,
        });
        
        return `Created ${node_type} node named "${node_name}" at ${result.node_path}`;
      } catch (error) {
        throw new Error(`Failed to create node: ${(error as Error).message}`);
      }
    },
  },

  {
    name: 'delete_node',
    description: 'Delete a node from the Godot scene tree',
    parameters: z.object({
      node_path: z.string()
        .describe('Path to the node to delete (e.g. "/root/MainScene/Player")'),
    }),
    execute: async ({ node_path }: DeleteNodeParams): Promise<string> => {
      const godot = getGodotConnection();
      
      try {
        await godot.sendCommand('delete_node', { node_path });
        return `Deleted node at ${node_path}`;
      } catch (error) {
        throw new Error(`Failed to delete node: ${(error as Error).message}`);
      }
    },
  },

  {
    name: 'update_node_property',
    description: 'Update a property of a node in the Godot scene tree',
    parameters: z.object({
      node_path: z.string()
        .describe('Path to the node to update (e.g. "/root/MainScene/Player")'),
      property: z.string()
        .describe('Name of the property to update (e.g. "position", "text", "modulate")'),
      value: z.any()
        .describe('New value for the property'),
    }),
    execute: async ({ node_path, property, value }: UpdateNodePropertyParams): Promise<string> => {
      const godot = getGodotConnection();
      
      try {
        const result = await godot.sendCommand<CommandResult>('update_node_property', {
          node_path,
          property,
          value,
        });
        
        return `Updated property "${property}" of node at ${node_path} to ${JSON.stringify(value)}`;
      } catch (error) {
        throw new Error(`Failed to update node property: ${(error as Error).message}`);
      }
    },
  },

  {
    name: 'get_node_properties',
    description: 'Get all properties of a node in the Godot scene tree',
    parameters: z.object({
      node_path: z.string()
        .describe('Path to the node to inspect (e.g. "/root/MainScene/Player")'),
    }),
    execute: async ({ node_path }: GetNodePropertiesParams): Promise<string> => {
      const godot = getGodotConnection();
      
      try {
        const result = await godot.sendCommand<CommandResult>('get_node_properties', { node_path });
        
        // Format properties for display
        const formattedProperties = Object.entries(result.properties)
          .map(([key, value]) => `${key}: ${JSON.stringify(value)}`)
          .join('\n');
        
        return `Properties of node at ${node_path}:\n\n${formattedProperties}`;
      } catch (error) {
        throw new Error(`Failed to get node properties: ${(error as Error).message}`);
      }
    },
  },

  {
    name: 'get_node_subtree',
    description: 'Get a serialized subtree for a specific node path',
    parameters: z.object({
      node_path: z.string()
        .describe('Path to the node subtree to inspect'),
    }),
    execute: async ({ node_path }: GetNodeSubtreeParams): Promise<string> => {
      const godot = getGodotConnection();

      try {
        const result = await godot.sendCommand<CommandResult>('get_node_subtree', { node_path });
        return `Fetched subtree for ${result.node_path}`;
      } catch (error) {
        throw new Error(`Failed to get node subtree: ${(error as Error).message}`);
      }
    },
  },

  {
    name: 'list_nodes',
    description: 'List all child nodes under a parent node in the Godot scene tree',
    parameters: z.object({
      parent_path: z.string()
        .describe('Path to the parent node (e.g. "/root", "/root/MainScene")'),
    }),
    execute: async ({ parent_path }: ListNodesParams): Promise<string> => {
      const godot = getGodotConnection();
      
      try {
        const result = await godot.sendCommand<CommandResult>('list_nodes', { parent_path });
        
        if (result.children.length === 0) {
          return `No child nodes found under ${parent_path}`;
        }
        
        // Format children for display
        const formattedChildren = result.children
          .map((child: any) => `${child.name} (${child.type}) - ${child.path}`)
          .join('\n');
        
        return `Children of node at ${parent_path}:\n\n${formattedChildren}`;
      } catch (error) {
        throw new Error(`Failed to list nodes: ${(error as Error).message}`);
      }
    },
  },

  {
    name: 'find_nodes',
    description: 'Find nodes under a parent by partial name and/or type',
    parameters: z.object({
      parent_path: z.string()
        .describe('Path to the parent node to search under'),
      name_contains: z.string().optional()
        .describe('Optional case-insensitive partial node name match'),
      node_type: z.string().optional()
        .describe('Optional node class to filter by (e.g. "Panel", "Button", "Control")'),
      recursive: z.boolean().optional()
        .describe('Whether to search recursively under the parent node'),
    }),
    execute: async ({ parent_path, name_contains, node_type, recursive = true }: FindNodesParams): Promise<string> => {
      const godot = getGodotConnection();

      try {
        const result = await godot.sendCommand<CommandResult>('find_nodes', {
          parent_path,
          name_contains,
          node_type,
          recursive,
        });

        if (!result.matches || result.matches.length === 0) {
          return `No matching nodes found under ${parent_path}`;
        }

        const formattedMatches = result.matches
          .map((match: any) => `${match.name} (${match.type}) - ${match.path}`)
          .join('\n');

        return `Found ${result.count} matching nodes under ${parent_path}:\n\n${formattedMatches}`;
      } catch (error) {
        throw new Error(`Failed to find nodes: ${(error as Error).message}`);
      }
    },
  },

  {
    name: 'batch_update_node_properties',
    description: 'Update multiple node properties in a single editor action',
    parameters: z.object({
      updates: z.array(z.object({
        node_path: z.string()
          .describe('Path to the node to update'),
        property: z.string()
          .describe('Name of the property to update'),
        value: z.any()
          .describe('New value for the property'),
      })).min(1)
        .describe('List of node property updates to apply'),
    }),
    execute: async ({ updates }: BatchUpdateNodePropertiesParams): Promise<string> => {
      const godot = getGodotConnection();

      try {
        const result = await godot.sendCommand<CommandResult>('batch_update_node_properties', {
          updates,
        });

        return `Updated ${result.count} node properties in one batch action`;
      } catch (error) {
        throw new Error(`Failed to batch update node properties: ${(error as Error).message}`);
      }
    },
  },

  {
    name: 'inspect_control_layouts',
    description: 'Inspect layout snapshots for Control nodes under a parent',
    parameters: z.object({
      parent_path: z.string()
        .describe('Path to the parent node to inspect under'),
      recursive: z.boolean().optional()
        .describe('Whether to inspect nested controls recursively'),
      include_hidden: z.boolean().optional()
        .describe('Whether to include hidden controls in the results'),
    }),
    execute: async ({ parent_path, recursive = true, include_hidden = false }: InspectControlLayoutsParams): Promise<string> => {
      const godot = getGodotConnection();

      try {
        const result = await godot.sendCommand<CommandResult>('inspect_control_layouts', {
          parent_path,
          recursive,
          include_hidden,
        });

        return `Captured ${result.count} control layout snapshots under ${parent_path}`;
      } catch (error) {
        throw new Error(`Failed to inspect control layouts: ${(error as Error).message}`);
      }
    },
  },

  {
    name: 'diagnose_layout_issues',
    description: 'Detect off-screen, overlap, and anchor/offset issues in a Control subtree',
    parameters: z.object({
      parent_path: z.string()
        .describe('Path to the parent node to diagnose under'),
      recursive: z.boolean().optional()
        .describe('Whether to diagnose nested controls recursively'),
      include_hidden: z.boolean().optional()
        .describe('Whether to include hidden controls in the diagnosis'),
    }),
    execute: async ({ parent_path, recursive = true, include_hidden = false }: DiagnoseLayoutIssuesParams): Promise<string> => {
      const godot = getGodotConnection();

      try {
        const result = await godot.sendCommand<CommandResult>('diagnose_layout_issues', {
          parent_path,
          recursive,
          include_hidden,
        });

        if (!result.issues || result.issues.length === 0) {
          return `No layout issues found under ${parent_path}`;
        }

        const formattedIssues = result.issues
          .map((issue: any) => `[${issue.severity}] ${issue.type} - ${issue.path}: ${issue.message}`)
          .join('\n');

        return `Found ${result.issue_count} layout issues under ${parent_path}:\n\n${formattedIssues}`;
      } catch (error) {
        throw new Error(`Failed to diagnose layout issues: ${(error as Error).message}`);
      }
    },
  },

  {
    name: 'auto_fix_layout_issues',
    description: 'Apply safe automatic fixes for common Godot Control layout issues',
    parameters: z.object({
      parent_path: z.string()
        .describe('Path to the parent node to fix under'),
      recursive: z.boolean().optional()
        .describe('Whether to fix nested controls recursively'),
      include_hidden: z.boolean().optional()
        .describe('Whether to include hidden controls in the fixes'),
      clamp_to_parent: z.boolean().optional()
        .describe('Whether to clamp control positions back inside their parent bounds'),
    }),
    execute: async ({ parent_path, recursive = true, include_hidden = false, clamp_to_parent = true }: AutoFixLayoutIssuesParams): Promise<string> => {
      const godot = getGodotConnection();

      try {
        const result = await godot.sendCommand<CommandResult>('auto_fix_layout_issues', {
          parent_path,
          recursive,
          include_hidden,
          clamp_to_parent,
        });

        if (!result.fixes || result.fixes.length === 0) {
          return `No automatic layout fixes were needed under ${parent_path}`;
        }

        const formattedFixes = result.fixes
          .map((fix: any) => `${fix.path}: ${fix.fix}`)
          .join('\n');

        return `Applied ${result.fix_count} layout fixes under ${parent_path}:\n\n${formattedFixes}`;
      } catch (error) {
        throw new Error(`Failed to auto-fix layout issues: ${(error as Error).message}`);
      }
    },
  },

  {
    name: 'align_controls',
    description: 'Align multiple Control nodes along an edge, center, or simple flow axis',
    parameters: z.object({
      node_paths: z.array(z.string()).min(2)
        .describe('List of Control node paths to align'),
      axis: z.enum(['left', 'right', 'top', 'bottom', 'hcenter', 'vcenter', 'horizontal_flow', 'vertical_flow'])
        .describe('Alignment axis or flow direction'),
      spacing: z.number().optional()
        .describe('Optional spacing to use for horizontal_flow or vertical_flow'),
    }),
    execute: async ({ node_paths, axis, spacing = 0 }: AlignControlsParams): Promise<string> => {
      const godot = getGodotConnection();

      try {
        const result = await godot.sendCommand<CommandResult>('align_controls', {
          node_paths,
          axis,
          spacing,
        });

        return `Aligned ${result.updated_count} controls using ${axis}`;
      } catch (error) {
        throw new Error(`Failed to align controls: ${(error as Error).message}`);
      }
    },
  },
];
