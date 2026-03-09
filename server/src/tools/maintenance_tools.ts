import { createHash } from 'node:crypto';
import { readFile, readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { z } from 'zod';
import { MCPTool } from '../utils/types.js';

const LOCAL_PLUGIN_ROOT = '/Users/nie/Desktop/Game/local-tools/godot-mcp/addons/godot_mcp';
const PROJECT_PLUGIN_ROOT = '/Users/nie/Desktop/Game/Godot/AshProtocolGodot/addons/godot_mcp';

async function collectFiles(root: string, prefix = ''): Promise<string[]> {
  const dir = path.join(root, prefix);
  const entries = await readdir(dir, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const relativePath = path.join(prefix, entry.name);
    if (entry.isDirectory()) {
      files.push(...await collectFiles(root, relativePath));
    } else if (entry.isFile()) {
      files.push(relativePath);
    }
  }

  return files.sort();
}

async function hashFile(filePath: string): Promise<string> {
  const content = await readFile(filePath);
  return createHash('sha256').update(content).digest('hex');
}

async function exists(targetPath: string): Promise<boolean> {
  try {
    await stat(targetPath);
    return true;
  } catch {
    return false;
  }
}

export const maintenanceTools: MCPTool[] = [
  {
    name: 'get_plugin_sync_status',
    description: 'Compare the local Godot MCP plugin source with the project-installed plugin copy',
    parameters: z.object({}),
    execute: async (): Promise<string> => {
      const localFiles = await collectFiles(LOCAL_PLUGIN_ROOT);
      const projectFiles = await collectFiles(PROJECT_PLUGIN_ROOT);
      const allFiles = Array.from(new Set([...localFiles, ...projectFiles])).sort();

      const missingInProject: string[] = [];
      const missingInLocal: string[] = [];
      const changed: string[] = [];

      for (const relativePath of allFiles) {
        const localPath = path.join(LOCAL_PLUGIN_ROOT, relativePath);
        const projectPath = path.join(PROJECT_PLUGIN_ROOT, relativePath);
        const hasLocal = await exists(localPath);
        const hasProject = await exists(projectPath);

        if (hasLocal && !hasProject) {
          missingInProject.push(relativePath);
          continue;
        }

        if (!hasLocal && hasProject) {
          missingInLocal.push(relativePath);
          continue;
        }

        const [localHash, projectHash] = await Promise.all([
          hashFile(localPath),
          hashFile(projectPath),
        ]);

        if (localHash !== projectHash) {
          changed.push(relativePath);
        }
      }

      if (missingInProject.length === 0 && missingInLocal.length === 0 && changed.length === 0) {
        return 'Godot MCP plugin copies are in sync';
      }

      const sections: string[] = [];
      if (missingInProject.length > 0) {
        sections.push(`Missing in project plugin copy:\n${missingInProject.join('\n')}`);
      }
      if (missingInLocal.length > 0) {
        sections.push(`Missing in local source copy:\n${missingInLocal.join('\n')}`);
      }
      if (changed.length > 0) {
        sections.push(`Changed files:\n${changed.join('\n')}`);
      }

      return sections.join('\n\n');
    },
  },
];
