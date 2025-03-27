#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';

import * as release from './operations/release.js';

import {
  GitHubError,
  GitHubValidationError,
  GitHubResourceNotFoundError,
  GitHubAuthenticationError,
  GitHubPermissionError,
  GitHubRateLimitError,
  GitHubConflictError,
  isGitHubError,
} from './common/errors.js';

import { VERSION } from "./common/version.js";
import { parseRepository } from "./common/utils.js";

const server = new Server(
  {
    name: "mcp-github-actions-versions",
    version: VERSION,
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

function formatGitHubError(error: GitHubError): string {
  let message = `GitHub API Error: ${error.message}`;
  
  if (error instanceof GitHubValidationError) {
    message = `Validation Error: ${error.message}`;
    if (error.response) {
      message += `\nDetails: ${JSON.stringify(error.response)}`;
    }
  } else if (error instanceof GitHubResourceNotFoundError) {
    message = `Not Found: ${error.message}`;
  } else if (error instanceof GitHubAuthenticationError) {
    message = `Authentication Failed: ${error.message}`;
  } else if (error instanceof GitHubPermissionError) {
    message = `Permission Denied: ${error.message}`;
  } else if (error instanceof GitHubRateLimitError) {
    message = `Rate Limit Exceeded: ${error.message}\nResets at: ${error.resetAt.toISOString()}`;
  } else if (error instanceof GitHubConflictError) {
    message = `Conflict: ${error.message}`;
  }

  return message;
}

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "get_action_versions",
        description: "List all the releases, versions of a GitHub Action",
        inputSchema: zodToJsonSchema(release.GetActionReleaseSchema),
      },
      {
        name: "get_latest_action_version",
        description: "Get the latest release, version of a GitHub Action. Use this tool to get the latest version of a GitHub Action, and keep your workflow files up to date. (using tag_name or sha)",
        inputSchema: zodToJsonSchema(release.GetActionReleaseSchema),
      }
  ],
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  try {
    if (!request.params.arguments) {
      throw new Error("Arguments are required");
    }

    switch (request.params.name) {

        case "get_action_versions": {
            const args = release.GetActionReleaseSchema.parse(request.params.arguments);
            const { owner, repo } = parseRepository(args);
            const releases = await release.listReleases(owner, repo);
            return {
              content: [{ type: "text", text: JSON.stringify(releases, null, 2) }],
            };
        }

        case "get_latest_action_version": {
            const args = release.GetActionReleaseSchema.parse(request.params.arguments);
            const { owner, repo } = parseRepository(args);
            const releases = await release.getLatestRelease(owner, repo);
            return {
              content: [{ type: "text", text: JSON.stringify(releases, null, 2) }],
            };
        }

      default:
        throw new Error(`Unknown tool: ${request.params.name}`);
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new Error(`Invalid input: ${JSON.stringify(error.errors)}`);
    }
    if (isGitHubError(error)) {
      throw new Error(formatGitHubError(error));
    }
    throw error;
  }
});

async function runServer() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("GitHub Actions Release MCP Server running on stdio");
}

runServer().catch((error) => {
  console.error("Fatal error in main():", error);
  process.exit(1);
});