import { spawnSync } from "child_process";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { ConsoleLogger } from "../console-logger.js";
import { toToolNameFormat } from "./util.js";

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

export async function mountPyPiDocs(
  server: McpServer,
  packageName: string,
  logger: ConsoleLogger,
  mcpPrimitive: "tool" | "resource",
) {
  const helpText = getPythonHelp(packageName);
  
  if (mcpPrimitive === "tool") {
    server.tool(
      toToolNameFormat(`${packageName}-help`),
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
}
