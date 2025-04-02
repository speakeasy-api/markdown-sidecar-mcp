import { buildCommand } from "@stricli/core";
import * as z from "zod";
import { consoleLoggerLevels } from "../../console-logger.js";

export const startCommand = buildCommand({
  loader: async () => {
    const { main } = await import("./impl.js");
    return main;
  },
  parameters: {
    flags: {
      transport: {
        kind: "enum",
        brief: "The transport to use for communicating with the server",
        default: "stdio",
        values: ["stdio", "sse"],
      },
      workingDir: {
        kind: "parsed",
        brief: "The working directory to run the docs server from",
        parse: (val: string) => {
          return z.string().nonempty().parse(val);
        },
      },
      packageName: {
        kind: "parsed",
        brief: "The package to mount markdown docs for",
        parse: (val: string) => z.string().nonempty().parse(val),
      },
      registry: {
        kind: "enum",
        brief: "The registry the package belongs to",
        default: "npm",
        values: ["npm", "gomodules", "pypi"],
      },
      docsSubDir: {
        kind: "parsed",
        brief: "The optional subdirectory of the package to mount markdown docs for",
        optional: true,
        parse: (val) => {
          return z.string().parse(val);
        },
      },
      mcpPrimitive: {
        kind: "enum",
        brief: "The MCP primitive to structure markdown content as",
        default: "tool",
        values: ["tool", "resource"],
      },
      port: {
        kind: "parsed",
        brief: "The port to use when the SSE transport is enabled",
        default: "2718",
        parse: (val: string) =>
          z.coerce.number().int().gte(0).lt(65536).parse(val),
      },
      "log-level": {
        kind: "enum",
        brief: "The log level to use for the server",
        default: "info",
        values: consoleLoggerLevels,
      },
      env: {
        kind: "parsed",
        brief: "Environment variables made available to the server",
        optional: true,
        variadic: true,
        parse: (val: string) => {
          const sepIdx = val.indexOf("=");
          if (sepIdx === -1) {
            throw new Error("Invalid environment variable format");
          }

          const key = val.slice(0, sepIdx);
          const value = val.slice(sepIdx + 1);

          return [
            z.string().nonempty({
              message: "Environment variable key must be a non-empty string",
            }).parse(key),
            z.string().nonempty({
              message: "Environment variable value must be a non-empty string",
            }).parse(value),
          ] satisfies [string, string];
        },
      },
    },
  },
  docs: {
    brief: "Run the Model Context Protocol server",
  },
});
