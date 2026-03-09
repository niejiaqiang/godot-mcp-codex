import { z } from 'zod';
import { getGodotConnection } from '../utils/godot_connection.js';
import { MCPTool, CommandResult } from '../utils/types.js';

interface ListDirectoryParams {
  path: string;
}

interface ReadTextFileParams {
  path: string;
}

interface SearchProjectFilesParams {
  query: string;
  root_path?: string;
  file_glob?: string;
  recursive?: boolean;
  case_sensitive?: boolean;
}

export const filesystemTools: MCPTool[] = [
  {
    name: 'list_directory',
    description: 'List files and subdirectories under a res:// directory',
    parameters: z.object({
      path: z.string()
        .describe('Project directory to inspect, relative or res:// prefixed'),
    }),
    execute: async ({ path }: ListDirectoryParams): Promise<string> => {
      const godot = getGodotConnection();

      try {
        const result = await godot.sendCommand<CommandResult>('list_directory', { path });
        const directories = Array.isArray(result.directories) ? result.directories : [];
        const files = Array.isArray(result.files) ? result.files : [];

        const lines = [
          `Directory: ${result.path ?? path}`,
          `Subdirectories: ${directories.length}`,
          `Files: ${files.length}`,
          '',
          ...directories.map((entry: any) => `[dir] ${entry.path}`),
          ...files.map((entry: any) => `[file] ${entry.path}`),
        ];

        return lines.join('\n').trim();
      } catch (error) {
        throw new Error(`Failed to list directory: ${(error as Error).message}`);
      }
    },
  },

  {
    name: 'read_text_file',
    description: 'Read a UTF-8 text file from the Godot project',
    parameters: z.object({
      path: z.string()
        .describe('Project file path to read, relative or res:// prefixed'),
    }),
    execute: async ({ path }: ReadTextFileParams): Promise<string> => {
      const godot = getGodotConnection();

      try {
        const result = await godot.sendCommand<CommandResult>('read_text_file', { path });
        const suffix = result.truncated ? '\n\n[truncated]' : '';
        return `File: ${result.path ?? path}\n\n${result.content ?? ''}${suffix}`;
      } catch (error) {
        throw new Error(`Failed to read text file: ${(error as Error).message}`);
      }
    },
  },

  {
    name: 'search_project_files',
    description: 'Search text across project files under res://',
    parameters: z.object({
      query: z.string()
        .describe('Text to search for'),
      root_path: z.string().optional()
        .describe('Directory to search under, defaults to res://'),
      file_glob: z.string().optional()
        .describe('Optional filename filter like "*.gd" or "*.tscn"'),
      recursive: z.boolean().optional()
        .describe('Whether to search subdirectories'),
      case_sensitive: z.boolean().optional()
        .describe('Whether the search should be case sensitive'),
    }),
    execute: async ({
      query,
      root_path,
      file_glob,
      recursive,
      case_sensitive,
    }: SearchProjectFilesParams): Promise<string> => {
      const godot = getGodotConnection();

      try {
        const result = await godot.sendCommand<CommandResult>('search_project_files', {
          query,
          root_path,
          file_glob,
          recursive,
          case_sensitive,
        });

        const matches = Array.isArray(result.matches) ? result.matches : [];
        if (matches.length === 0) {
          return `No matches found for "${query}" under ${result.root_path ?? root_path ?? 'res://'}`;
        }

        const formattedMatches = matches
          .map((match: any) => `${match.path}:${match.line} ${match.text}`)
          .join('\n');
        const truncatedNote = result.truncated ? '\n\n[truncated]' : '';

        return `Found ${matches.length} match(es) for "${query}" under ${result.root_path ?? root_path ?? 'res://'}:\n\n${formattedMatches}${truncatedNote}`;
      } catch (error) {
        throw new Error(`Failed to search project files: ${(error as Error).message}`);
      }
    },
  },
];
