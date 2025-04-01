import * as fs from 'fs/promises';
import * as path from 'path';

export interface MarkdownFileInfo {
  path: string;
  content: string;
  title: string;
}

export async function findMarkdownFiles(
  dir: string, 
  excludedDirs: string[],
): Promise<MarkdownFileInfo[]> {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    let files: MarkdownFileInfo[] = [];

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (excludedDirs.includes(path.basename(fullPath))) {
            continue;
        }
        files = files.concat(await findMarkdownFiles(fullPath, excludedDirs));
      } else if (entry.isFile() && entry.name.endsWith(".md")) {
        const content = await fs.readFile(fullPath, "utf-8");
        if (!content) continue;

        // Check if file only contains headers
        const lines = content.split("\n");
        const hasNonHeaderContent = lines.some(line => line.trim() && !line.startsWith("#"));
        if (!hasNonHeaderContent) continue;

        // Initially set the title to the first line of the markdown content
        let title = lines[0]?.trim() || "";
        
        // Look for the first markdown header
        for (const line of lines) {
          if (line.startsWith("#")) {
            title = line.slice(2).trim();
            break;
          }
        }

        if (!title) continue;

        files.push({
          path: fullPath,
          content,
          title
        });
      }
    }
    return files;
}

export function toToolNameFormat(str: string): string {
  return str.replace(/\//g, '-').replace(/[^a-zA-Z0-9-]/g, '').toLowerCase();
}