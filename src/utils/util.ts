import * as fs from 'fs/promises';
import * as path from 'path';

export async function findModuleRoot(startPath: string): Promise<string> {
  let dir = startPath;
  if (dir.includes("dist") || dir.includes("build") || dir.includes("bin")) {
    while (dir !== "/") {
        const subDir = path.dirname(dir);
        if (path.basename(subDir) === "node_modules") {
          return dir;
        }
    
        dir = subDir;
      }
  }
  return dir;
}
  

export async function findMarkdownFiles(dir: string): Promise<string[]> {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    let files: string[] = [];

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        const excludedDirs = ["node_modules", "dist", "build", "bin"];
        if (excludedDirs.includes(path.basename(fullPath))) {
            continue;
        }
        files = files.concat(await findMarkdownFiles(fullPath));
      } else if (entry.isFile() && entry.name.endsWith(".md")) {
        files.push(fullPath);
      }
    }
    return files;
}

export function toToolNameFormat(str: string): string {
  return str.replace(/\//g, '-').replace(/[^a-zA-Z0-9-]/g, '').toLowerCase();
}