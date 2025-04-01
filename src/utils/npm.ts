import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { ConsoleLogger } from "../console-logger.js";

import path from 'path';
import fs from 'fs/promises';
import { findMarkdownFiles, toToolNameFormat } from "./util.js";
import { createRequire } from 'module';

async function findPackageFromDir(startDir: string, packageName: string): Promise<string> {
  console.error("Looking for package from directory:", startDir);
  const require = createRequire(path.join(startDir, 'package.json'));
  
  try {
    const pkgPath = path.dirname(require.resolve(packageName));
    console.error("Found package at:", pkgPath);
    return pkgPath;
  } catch (e) {
    throw new Error(`Could not find package ${packageName} from ${startDir}`);
  }
}

export async function mountNpmDocs(
  server: McpServer,
  packageName: string,
  workingDir: string,
  logger: ConsoleLogger,
  mcpPrimitive: "tool" | "resource",
  subDir?: string,
) {
  const pkgPath = await findPackageFromDir(workingDir, packageName);
  const docsDir = subDir ? path.join(pkgPath, subDir) : pkgPath;

  // Ensure the docs directory exists
  try {
    await fs.access(docsDir);
  } catch {
    throw new Error(`No docs found for ${packageName}`);
  }

  const markdownFiles = await findMarkdownFiles(docsDir, ["node_modules", "dist", "build", "bin"]);
  
  if (markdownFiles.length === 0) {
    throw new Error(`No markdown files found for ${packageName}`);
  }

  for (const file of markdownFiles) {
    const relativePath = path.relative(pkgPath, file.path).replace(/\.md$/, '');
    
    if (mcpPrimitive === "tool") {
      server.tool(toToolNameFormat(`docs-${packageName}-${relativePath}`), 
        file.title.trim(),
        () => { 
          return {
            content: [
              {
                type: "text",
                text: file.content,
              },
            ],
          }; 
        });
    } else {
      server.resource(
        `${packageName.toUpperCase()} - ${file.title.trim()}`,
        `docs://npmjs.com/package/${packageName}/${relativePath}/README.md`,
        async (uri) => {
          return {
            contents: [
              {
                uri: uri.toString(),
                text: file.content,
                mimeType: "text/markdown",
              },
            ],
          };
        }
      );
    }

    logger.debug(`Mounted ${relativePath} as markdown resource`);
  }
}

async function findNPMModuleRoot(startPath: string): Promise<string> {
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
  

