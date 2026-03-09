import { getGodotConnection } from '../utils/godot_connection.js';

function decodeTemplatePath(path: string): string {
  try {
    return decodeURIComponent(path);
  } catch {
    return path;
  }
}

export const nodeSubtreeResourceTemplate = {
  uriTemplate: 'godot://node/subtree/{path}',
  name: 'Godot Node Subtree',
  mimeType: 'application/json',
  arguments: [
    {
      name: 'path',
      description: 'URL-encoded Godot node path, e.g. %2Froot%2FHudRoot%2FTopContainer',
    },
  ],
  async load({ path }: { path: string }) {
    const godot = getGodotConnection();
    const nodePath = decodeTemplatePath(path);
    const result = await godot.sendCommand('get_node_subtree', {
      node_path: nodePath,
    });

    return {
      text: JSON.stringify(result),
    };
  },
};
