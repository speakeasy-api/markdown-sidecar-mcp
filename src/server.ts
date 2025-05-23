import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { ConsoleLogger } from "./console-logger.js";
import { mountNpmDocs } from "./utils/npm.js";
import { mountGoDocs } from "./utils/gomodule.js";
import { mountPyPiDocs } from "./utils/pypi.js";

export async function createMCPServer(deps: {
  package: string;
  workingDir: string;
  registry: string;
  logger: ConsoleLogger;
  docsSubDir?: string | undefined;
  mcpPrimitive: "tool" | "resource";
}) {
  const server = new McpServer({
    name: "Supporting Markdown Docs",
    version: "1.0.0",
  });

  switch (deps.registry) {
    case "npm":
      await mountNpmDocs(server, deps.package, deps.workingDir,deps.logger, deps.mcpPrimitive, deps.docsSubDir);
      break;
    case "gomodules":
      await mountGoDocs(server, deps.package, deps.workingDir, deps.logger, deps.mcpPrimitive, deps.docsSubDir);
      break;
    case "pypi":
      await mountPyPiDocs(server, deps.package, deps.workingDir,deps.logger, deps.mcpPrimitive);
      break;
    default:
      throw new Error(`Unsupported registry: ${deps.registry}`);
  }

  return server;
}
