# Demo Time MCP

Demo Time MCP is a package that provides Model Context Protocol (MCP) server capabilities for the [Demo Time](https://demotime.show/) extension. It enables advanced scripting, automation, and integration features for live coding demos and presentations in Visual Studio Code.

## What this package does

This package implements a Model Context Protocol (MCP) server for Demo Time. It enables AI assistants and other MCP-compatible clients to:

- **Search through Demo Time documentation** using natural language queries

## Usage

To set up and use the MCP server, refer to the instructions for your MCP host, such as [Visual Studio Code](https://code.visualstudio.com/docs/copilot/chat/mcp-servers#_add-an-mcp-server). The Demo Time MCP server is published on npm under [@demotime/mcp](https://www.npmjs.com/package/@demotime/mcp).

Use the following values:

- Type: `stdio`
- Command: `npx`
- Arguments:
  - `-y`
  - `@demotime/mcp`
- Environment: `none`

### Configuration for Visual Studio Code

Configure the MCP server in your workspace by creating or editing `.vscode/mcp.json`:

   ```jsonc
   {
     "servers": {
       "Demo Time": {
         "type": "stdio",
         "command": "npx",
         "args": ["-y", "@demotime/mcp"],
       }
     }
   }
   ```

3. Reconnect the MCP server in Visual Studio Code

## Example Demo Step (Open a File)

```json
{
  "action": "open",
  "path": "src/content/docs/actions/file.mdx"
}
```

## Resources

- [Demo Time Documentation](https://demotime.show/)

## License

See [LICENSE](./LICENSE) for details.
