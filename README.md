This provides a structured way to serve and access markdown documentation from an MCP server for NPM packages, Go Modules, or PyPi packages. It enables informed code generation by exposing these markdown files as `resources` or `tools`.

Note: Many PyPi packages do not have markdown docs exposed, so this library will also mount python `help` root docs by default.

This is designed to be executed from within a project directory where the requested packages are already installed locally. Access always stays within your local environment.

## Arguments

- `package_name`: The name of the package or module to request
- `registry`: Registry the package will be found in (`npm`, `gomodules`, or `pypi`)
- `subDir`: [OPTIONAL] The specific subdirectory to look for markdown docs in. Defaults to root.
- `mcpPrimitive`: [OPTIONAL] The MCP primitive to expose from the server (`tool` or `resource`). This defaults to `tool`, some clients do not currently support resources.

## Cursor Installation Steps

Add the following server definition to your `.cursor/mcp.json` file:

```json
{
  "mcpServers": {
    "sidecar": {
      "command": "npx",
      "args": [
        "-y", "--package", "mcp-markdown-sidecar",
        "--",
        "mcp", "start",
        "--package_name", "{PACKAGE_NAME}",
        "--registry", "npm"
      ]
    }
  }
}
```