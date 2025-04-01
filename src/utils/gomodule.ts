import { spawnSync } from "child_process";
import path from "path";
import fs from "fs/promises";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { ConsoleLogger } from "../console-logger.js";
import { findMarkdownFiles, toToolNameFormat } from "./util.js";

function resolveGoModulePath(moduleName: string, workingDir: string): string {
  const result = spawnSync(
    "go",
    ["list", "-m", "-f", "{{.Dir}}", moduleName],
    {
      cwd: workingDir,
    }
  );
  
  return result.stdout.toString().trim();
}

export async function mountGoDocs(
  server: McpServer,
  moduleName: string,
  workingDir: string,
  logger: ConsoleLogger,
  mcpPrimitive: "tool" | "resource",
  docsSubDir?: string,
) {
  const modulePath = resolveGoModulePath(moduleName, workingDir);
  const docsDir = docsSubDir ? path.join(modulePath, docsSubDir) : modulePath;

  try {
    await fs.access(docsDir);
  } catch {
    throw new Error(`No docs found for Go module ${moduleName}`);
  }

  const markdownFiles = await findMarkdownFiles(docsDir, []);

  if (markdownFiles.length === 0) {
    throw new Error(`No markdown files found for ${moduleName}`);
  }

  for (const file of markdownFiles) {
    const relativePath = path.relative(modulePath, file.path).replace(/\.md$/, '');

    if (mcpPrimitive === "tool") {
      server.tool(
        toToolNameFormat(`docs-${moduleName}-${relativePath}`),
        file.title.trim(),
        () => ({
          content: [
            {
              type: "text",
              text: file.content,
            },
          ],
        }),
      );
    } else {
      server.resource(
        `${moduleName} - ${file.title.trim()}`,
        `docs://pkg.go.dev/${moduleName}/${relativePath}`,
        async (uri) => ({
          contents: [
            {
              uri: uri.toString(),
              text: file.content,
              mimeType: "text/markdown",
            },
          ],
        }),
      );
    }

    logger.debug(`Mounted ${relativePath} from Go module`);
  }
}
