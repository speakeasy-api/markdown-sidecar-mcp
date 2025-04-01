import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { ConsoleLogger } from "../console-logger.js";
import { spawnSync } from "child_process";
import path from 'path';
import fs from 'fs/promises';
import { findMarkdownFiles, toToolNameFormat } from "./util.js";

function getGitRoot(): string {
  try {
    const result = spawnSync('git', ['rev-parse', '--show-toplevel'], { encoding: 'utf-8' });
    if (result.status === 0) {
      return result.stdout.trim();
    }
  } catch {
    // If git command fails, fall back to process.cwd()
  }
  return process.cwd();
}

async function findPackageFromDir(startDir: string = getGitRoot(), packageName: string): Promise<string> {
  const packagePath = path.join(startDir, "node_modules", packageName);
  try {
    await fs.access(packagePath);
    return packagePath;
  } catch {
    throw new Error(`Could not find package ${packageName} in ${startDir}/node_modules`);
  }
}

export async function mountNpmDocs(
  server: McpServer,
  packageName: string,
  workingDir: string = getGitRoot(),
  logger: ConsoleLogger,
  mcpPrimitive: "tool" | "resource",
  docsSubDir?: string,
) {
  const pkgPath = await findPackageFromDir(workingDir, packageName);
  const docsDir = docsSubDir ? path.join(pkgPath, docsSubDir) : pkgPath;

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
