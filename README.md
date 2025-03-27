# MCP Server for GitHub Actions Versions

This repository contains a Model Context Protocol (MCP) server for GitHub Actions Version.

This is a lightweight version of the GitHub MCP Server focusing on the GitHub Actions use case, allowing users to easily update their workflows with the latest versions of actions.


Building the MCP Server

```
docker build -t tgrall/mcp-github-actions-versions .
```


### Docker

```

{
  "mcpServers": {
    "github": {
      "command": "docker",
      "args": [
        "run",
        "-i",
        "--rm",
        "-e",
        "GITHUB_PERSONAL_ACCESS_TOKEN",
        "tgrall/mcp-github-actions-versions"
      ],
      "env": {
        "GITHUB_PERSONAL_ACCESS_TOKEN": "<YOUR_ACCESS_TOKEN>"
      }
    }
  }
}
```
