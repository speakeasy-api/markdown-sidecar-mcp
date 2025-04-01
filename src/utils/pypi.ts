import { spawnSync } from "child_process";
import path from "path";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { ConsoleLogger } from "../console-logger.js";
import { findMarkdownFiles, toToolNameFormat } from "./util.js";

function getPythonHelp(packageName: string): string {
  const result = spawnSync(
    "python3",
    ["-c", `import ${packageName}; help(${packageName})`],
    {
      encoding: "utf-8",
    }
  );
  
  if (result.error) {
    throw new Error(`Failed to get help for package ${packageName}: ${result.error.message}`);
  }
  
  return result.stdout;
}

function getPythonPackagePath(packageName: string): string {
  const result = spawnSync(
    "python3",
    ["-c", `
import ${packageName}
import os.path
print(os.path.dirname(${packageName}.__file__))
`],
    {
      encoding: "utf-8",
    }
  );

  if (result.error) {
    throw new Error(`Failed to get package path for ${packageName}: ${result.error.message}`);
  }

  return result.stdout.trim();
}

export async function mountPyPiDocs(
  server: McpServer,
  packageName: string,
  logger: ConsoleLogger,
  mcpPrimitive: "tool" | "resource",
) {
  const helpText = getPythonHelp(packageName);
  
  // Mount Python help documentation
  if (mcpPrimitive === "tool") {
    server.tool(
      toToolNameFormat(`docs-${packageName}-help`),
      `${packageName} python help documentation`,
      () => ({
        content: [
          {
            type: "text",
            text: helpText,
          },
        ],
      }),
    );
  } else {
    server.resource(
      `${packageName} - Help Documentation`,
      `docs://pypi.org/project/${packageName}/help`,
      async (uri) => ({
        contents: [
          {
            uri: uri.toString(),
            text: helpText,
            mimeType: "text/plain",
          },
        ],
      }),
    );
  }

  logger.debug(`Mounted Python help documentation for ${packageName}`);

  // Find and mount markdown files if available
  const pkgPath = getPythonPackagePath(packageName);
  const markdownFiles = await findMarkdownFiles(pkgPath, []);

  if (markdownFiles.length === 0) {
    logger.debug(`No markdown files found for ${packageName}`);
    return;
  }

  for (const file of markdownFiles) {
    const relativePath = path.relative(pkgPath, file.path).replace(/\.md$/, '');
    
    if (mcpPrimitive === "tool") {
      server.tool(
        toToolNameFormat(`docs-${packageName}-${relativePath}`),
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
        `${packageName} - ${file.title.trim()}`,
        `docs://pypi.org/project/${packageName}/${relativePath}/README.md`,
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

    logger.debug(`Mounted ${relativePath} from Python package`);
  }
}
