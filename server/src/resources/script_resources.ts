import { Resource } from 'fastmcp';
import { getGodotConnection } from '../utils/godot_connection.js';

function decodeTemplatePath(path: string): string {
  try {
    return decodeURIComponent(path);
  } catch {
    return path;
  }
}

/**
 * Resource that provides the content of the currently edited script.
 */
export const scriptResource: Resource = {
    uri: 'godot/script',
    name: 'Current Godot Script Content',
    mimeType: 'text/plain',
    async load() {
        const godot = getGodotConnection();

        try {
            const currentScript = await godot.sendCommand('get_current_script');

            if (!currentScript || !currentScript.script_found || !currentScript.script_path) {
                return {
                    text: '',
                    metadata: {
                        script_found: false,
                        error: 'No script currently being edited'
                    }
                };
            }

            const result = await godot.sendCommand('get_script', {
                script_path: currentScript.script_path
            });

            return {
                text: result.content,
                metadata: {
                    path: result.script_path,
                    script_found: true,
                    language: result.script_path.endsWith('.gd') ? 'gdscript' :
                        result.script_path.endsWith('.cs') ? 'csharp' : 'unknown'
                }
            };
        } catch (error) {
            console.error('Error fetching script content:', error);
            throw error;
        }
    }
};

/**
 * Resource that provides a list of all scripts in the project
 */
export const scriptListResource: Resource = {
  uri: 'godot/scripts',
  name: 'Godot Script List',
  mimeType: 'application/json',
  async load() {
    const godot = getGodotConnection();
    
    try {
      // Call a command on the Godot side to list all scripts
      const result = await godot.sendCommand('list_project_files', {
        extensions: ['.gd', '.cs']
      });
      
      if (result && result.files) {
        return {
          text: JSON.stringify({
            scripts: result.files,
            count: result.files.length,
            gdscripts: result.files.filter((f: string) => f.endsWith('.gd')),
            csharp_scripts: result.files.filter((f: string) => f.endsWith('.cs'))
          })
        };
      } else {
        return {
          text: JSON.stringify({
            scripts: [],
            count: 0,
            gdscripts: [],
            csharp_scripts: []
          })
        };
      }
    } catch (error) {
      console.error('Error fetching script list:', error);
      throw error;
    }
  }
};

/**
 * Resource that provides metadata for a specific script, including classes and methods
 */
export const scriptMetadataResource: Resource = {
    uri: 'godot/script/metadata',
    name: 'Current Godot Script Metadata',
    mimeType: 'application/json',
    async load() {
        const godot = getGodotConnection();

        try {
            const currentScript = await godot.sendCommand('get_current_script');

            if (!currentScript || !currentScript.script_found || !currentScript.script_path) {
                return {
                    text: JSON.stringify({
                        script_found: false,
                        error: 'No script currently being edited'
                    })
                };
            }

            const result = await godot.sendCommand('get_script_metadata', {
                path: currentScript.script_path
            });

            return {
                text: JSON.stringify({
                    script_found: true,
                    ...result
                })
            };
        } catch (error) {
            console.error('Error fetching script metadata:', error);
            throw error;
        }
    }
};

export const scriptByPathResourceTemplate = {
    uriTemplate: 'godot://script/by-path/{path}',
    name: 'Godot Script By Path',
    mimeType: 'text/plain',
    arguments: [
        {
            name: 'path',
            description: 'URL-encoded Godot script path, e.g. res%3A%2F%2Fscripts%2Fplayer.gd'
        }
    ],
    async load({ path }: { path: string }) {
        const godot = getGodotConnection();
        const scriptPath = decodeTemplatePath(path);

        const result = await godot.sendCommand('get_script', {
            script_path: scriptPath
        });

        return {
            text: result.content,
            metadata: {
                path: result.script_path,
                language: result.script_path.endsWith('.gd') ? 'gdscript' :
                    result.script_path.endsWith('.cs') ? 'csharp' : 'unknown'
            }
        };
    }
};
