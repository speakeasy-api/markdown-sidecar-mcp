<div align="center">
 <a href="https://www.speakeasy.com/" target="_blank">
   <picture>
       <img width="500" src="https://github.com/user-attachments/assets/90832ba3-1513-497d-b7cf-29368ece57c8" alt="Speakeasy">
   </picture>
 </a>
</div>

# Markdown Sidecar MCP Server 

This provides a structured way to serve and access markdown documentation from an MCP server for NPM packages, Go Modules, or PyPi packages. It enables informed code generation by exposing these markdown files as `resources` or `tools`.

> [!NOTE]  
> Note: Many PyPi packages do not have markdown docs exposed, so this library will also mount python `help` root docs by default.


This is designed to be executed from within a project directory where the requested packages are already installed locally. Access always stays within your local environments working directory.

## Installation

TODO

## Arguments

- `workingDir`: The working directory of your repo.
- `packageName`: The name of the package or module to request
- `registry`: Registry the package will be found in (`npm`, `gomodules`, or `pypi`)
- `docsSubDir`: [OPTIONAL] The specific subdirectory to look for markdown docs in. Defaults to package root.
- `mcpPrimitive`: [OPTIONAL] The MCP primitive to expose from the server (`tool` or `resource`). This defaults to `tool`, some clients do not currently support resources.

## Cursor Installation Steps

Add the following server definition to your `.cursor/mcp.json` file:

```json
{
  "mcpServers": {
    "sidecar": {
      "command": "npx",
      "args": [
        "-y", "--package", "markdown-sidecar-mcp",
        "--",
        "mcp", "start",
        "--workingDir", "{REPO_WORKING_DIR}",
        "--packageName", "{PACKAGE_NAME}",
        "--registry", "npm"
      ]
    }
  }
}
```

## Development

```bash
# Install dependencies
npm i

# Build
npm run build

# Watch mode
npm run watch
```

## Contributing

1. Fork the repository
2. Create your feature branch 
3. Commit your changes and push them up
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
