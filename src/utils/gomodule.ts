import { spawnSync } from "child_process";
import path from "path";
import fs from "fs/promises";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { ConsoleLogger } from "../console-logger.js";
import { findMarkdownFiles, toToolNameFormat } from "./util.js";

function resolveGoModulePath(moduleName: string): string {

  const result = spawnSync(
    "go",
    ["list", "-m", "-f", "{{.Dir}}", moduleName],
    {
      cwd: "/Users/ryanalbert/speakeasy-registry",
    }
  );
  
  return result.stdout.toString().trim();
}

export async function mountGoDocs(
  server: McpServer,
  moduleName: string,
  logger: ConsoleLogger,
  mcpPrimitive: "tool" | "resource",
  subDir?: string,
) {
  const modulePath = resolveGoModulePath(moduleName);
  const docsDir = subDir ? path.join(modulePath, subDir) : modulePath;

  try {
    await fs.access(docsDir);
  } catch {
    throw new Error(`No docs found for Go module ${moduleName}`);
  }

  const markdownFiles = await findMarkdownFiles(docsDir);

  if (markdownFiles.length === 0) {
    throw new Error(`No markdown files found for ${moduleName}`);
  }

  for (const file of markdownFiles) {
    const content = await fs.readFile(file, "utf-8");
    const relativePath = path.relative(modulePath, file).replace(/\.md$/, '');

    if (!content) {
      logger.debug(`No content found for ${relativePath}`);
      continue;
    }

    let title = content.split("\n")[0]?.trim() || "";
    for (const line of content.split("\n")) {
      if (line.startsWith("#")) {
        title = line.slice(2).trim();
        break;
      }
    }

    if (!title) {
      logger.debug(`No title found for ${relativePath}`);
      continue;
    }

    if (mcpPrimitive === "tool") {
      server.tool(
        toToolNameFormat(`docs-${moduleName}-${relativePath}`),
        title.trim(),
        () => ({
          content: [
            {
              type: "text",
              text: content,
            },
          ],
        }),
      );
    } else {
      server.resource(
        `${moduleName} - ${title.trim()}`,
        `docs://pkg.go.dev/${moduleName}/${relativePath}`,
        async (uri) => ({
          contents: [
            {
              uri: uri.toString(),
              text: content,
              mimeType: "text/markdown",
            },
          ],
        }),
      );
    }

    logger.debug(`Mounted ${relativePath} from Go module`);
  }
}
