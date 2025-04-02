import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import express from "express";
import { LocalContext } from "../../cli.js";
import {
  ConsoleLoggerLevel,
  createConsoleLogger,
} from "../../console-logger.js";
import { createMCPServer } from "../../server.js";

interface StartCommandFlags {
  readonly transport: "stdio" | "sse";
  readonly port: number;
  readonly "log-level": ConsoleLoggerLevel;
  readonly env?: [string, string][];
  readonly packageName: string;
  readonly workingDir: string;
  readonly registry: "npm" | "gomodules" | "pypi";
  readonly docsSubDir?: string | undefined;
  readonly mcpPrimitive: "tool" | "resource";
}

export async function main(this: LocalContext, flags: StartCommandFlags) {
  flags.env?.forEach(([key, value]) => {
    process.env[key] = value;
  });

  switch (flags.transport) {
    case "stdio":
      await startStdio(flags);
      break;
    case "sse":
      await startSSE(flags);
      break;
    default:
      throw new Error(`Invalid transport: ${flags.transport}`);
  }
}

async function startStdio(flags: StartCommandFlags) {
  const logger = createConsoleLogger(flags["log-level"]);
  const transport = new StdioServerTransport();
  const server = await createMCPServer({
    package: flags.packageName,
    workingDir: flags.workingDir,
    registry: flags.registry,
    logger,
    docsSubDir: flags.docsSubDir,
    mcpPrimitive: flags.mcpPrimitive,
  });
  await server.connect(transport);

  const abort = async () => {
    await server.close();
    process.exit(0);
  };
  process.on("SIGTERM", abort);
  process.on("SIGINT", abort);
}

async function startSSE(flags: StartCommandFlags) {
  const logger = createConsoleLogger(flags["log-level"]);
  const app = express();
  const mcpServer = await createMCPServer({
    package: flags.packageName,
    workingDir: flags.workingDir,
    registry: flags.registry,
    logger,
    docsSubDir: flags.docsSubDir,
    mcpPrimitive: flags.mcpPrimitive,
  });
  let transport: SSEServerTransport | undefined;
  const controller = new AbortController();

  app.get("/sse", async (_req, res) => {
    transport = new SSEServerTransport("/message", res);

    await mcpServer.connect(transport);

    mcpServer.server.onclose = async () => {
      res.end();
    };
  });

  app.post("/message", async (req, res) => {
    if (!transport) {
      throw new Error("Server transport not initialized");
    }

    await transport.handlePostMessage(req, res);
  });

  const httpServer = app.listen(flags.port, "0.0.0.0", () => {
    const ha = httpServer.address();
    const host = typeof ha === "string" ? ha : `${ha?.address}:${ha?.port}`;
    logger.info("MCP HTTP server started", { host });
  });

  let closing = false;
  controller.signal.addEventListener("abort", async () => {
    if (closing) {
      logger.info("Received second signal. Forcing shutdown.");
      process.exit(1);
    }
    closing = true;

    logger.info("Shutting down MCP server");

    await mcpServer.close();

    logger.info("Shutting down HTTP server");

    const timer = setTimeout(() => {
      logger.info("Forcing shutdown");
      process.exit(1);
    }, 5000);

    httpServer.close(() => {
      clearTimeout(timer);
      logger.info("Graceful shutdown complete");
      process.exit(0);
    });
  });

  const abort = () => controller.abort();
  process.on("SIGTERM", abort);
  process.on("SIGINT", abort);
}
