import { spawnSync } from "child_process";
import path from "path";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { ConsoleLogger } from "../console-logger.js";
import { findMarkdownFiles, toToolNameFormat } from "./util.js";

const pythonCommands = ["python3", "python"];

function getPythonHelp(packageName: string): string {

  for (const cmd of pythonCommands) {
    const { success, result } = tryPythonCommand(cmd, [
      "-c",
      `import ${packageName}; help(${packageName})`
    ]);
    
    if (success) {
      return result.stdout;
    }
  }
  
  throw new Error(`Failed to get help for package ${packageName}: Neither python nor python3 commands worked`);
}

function getPythonPackagePath(packageName: string): string {  
  for (const cmd of pythonCommands) {
    const { success, result } = tryPythonCommand(cmd, [
      "-c",
      `
import ${packageName}
import os.path
print(os.path.dirname(${packageName}.__file__))
`
    ]);
    
    if (success) {
      return result.stdout.trim();
    }
  }
  
  throw new Error(`Failed to get package path for ${packageName}: Neither python nor python3 commands worked`);
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

function tryPythonCommand(command: string, args: string[]): { success: boolean; result: any } {
  try {
    const result = spawnSync(command, args, { encoding: "utf-8" });
    if (!result.error && result.status === 0) {
      return { success: true, result };
    }
    return { success: false, result };
  } catch {
    return { success: false, result: null };
  }
}

