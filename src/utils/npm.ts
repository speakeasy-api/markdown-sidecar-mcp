import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { ConsoleLogger } from "../console-logger.js";

import path from 'path';
import fs from 'fs/promises';
import { findMarkdownFiles, findModuleRoot, toToolNameFormat } from "./util.js";

let requireResolve: NodeJS.RequireResolve | ((arg0: string) => string);
try {
  requireResolve = require.resolve;
} catch {
  // If in ESM, use createRequire
  const { createRequire } = await import("module");
  requireResolve = createRequire(import.meta.url).resolve;
}

export async function mountNpmDocs(
  server: McpServer,
  packageName: string,
  logger: ConsoleLogger,
  mcpPrimitive: "tool" | "resource",
  subDir?: string,
) {
  let pkgPath = path.dirname(requireResolve(packageName));
  pkgPath = await findModuleRoot(pkgPath);
  const docsDir = subDir ? path.join(pkgPath, subDir) : pkgPath;

  // Ensure the docs directory exists
  try {
    await fs.access(docsDir);
  } catch {
    throw new Error(`No docs found for ${packageName}`);
  }
  const markdownFiles = await findMarkdownFiles(docsDir);
  
  if (markdownFiles.length === 0) {
    throw new Error(`No markdown files found for ${packageName}`);
  }

  for (const file of markdownFiles) {
    const content = await fs.readFile(file, "utf-8");
    const relativePath = path.relative(pkgPath, file).replace(/\.md$/, '');
    
    if (!content) {
      logger.debug(`No content found for ${relativePath}`);
      continue;
    }

    // Initially set the title to the first line of the markdown content
    let title = content.split("\n")[0]?.trim() || "";
    
    for (const line of content.split("\n")) {
      // Check if the line starts with a markdown header (i.e., "#", "##", "###", etc.)
      if (line.startsWith("#")) {
        title = line.slice(2).trim();
        // Break the loop as we have found the first markdown header
        break;
      }
    }

    if (!title) {
      logger.debug(`No title found for ${relativePath}`);
      continue;
    }

    if (mcpPrimitive === "tool") {
      server.tool(toToolNameFormat(`docs-${packageName}-${relativePath}`), 
        title.trim(),
        () => { 
          return {
            content: [
              {
                type: "text",
                text: content,
              },
            ],
          }; 
        });
    } else {
      server.resource(
        `${packageName.toUpperCase()} - ${title.trim()}`,
        `docs://npmjs.com/package/${packageName}/${relativePath}/README.md`,
        async (uri) => {
          return {
            contents: [
              {
                uri: uri.toString(),
                text: content,
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

