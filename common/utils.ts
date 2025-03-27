// Simplified version from https://github.com/modelcontextprotocol/servers
// focusing on GitHub API to get GitHib Actions Version (Release API)

import { getUserAgent } from "universal-user-agent";
import { createGitHubError } from "./errors.js";
import { VERSION } from "./version.js";

type RequestOptions = {
  method?: string;
  body?: unknown;
  headers?: Record<string, string>;
}

async function parseResponseBody(response: Response): Promise<unknown> {
  const contentType = response.headers.get("content-type");
  if (contentType?.includes("application/json")) {
    return response.json();
  }
  return response.text();
}

export function buildUrl(baseUrl: string, params: Record<string, string | number | undefined>): string {
  const url = new URL(baseUrl);
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined) {
      url.searchParams.append(key, value.toString());
    }
  });
  return url.toString();
}

const USER_AGENT = `tgrall/mcp-github-actions-version/v${VERSION} ${getUserAgent()}`;

export async function githubRequest(
  url: string,
  options: RequestOptions = {}
): Promise<unknown> {
  const headers: Record<string, string> = {
    "Accept": "application/vnd.github.v3+json",
    "Content-Type": "application/json",
    "User-Agent": USER_AGENT,
    ...options.headers,
  };

  if (process.env.GITHUB_PERSONAL_ACCESS_TOKEN) {
    headers["Authorization"] = `Bearer ${process.env.GITHUB_PERSONAL_ACCESS_TOKEN}`;
  }

  // TODO : implement support for GHE.com & GHES
  const apiUrl = "https://api.github.com" + url;

  const response = await fetch(apiUrl, {
    method: options.method || "GET",
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  const responseBody = await parseResponseBody(response);

  if (!response.ok) {
    throw createGitHubError(response.status, responseBody);
  }

  return responseBody;
}

/**
 * Parse repository information from different format inputs
 * Handles both a single string in format "owner/repo" or separate owner and repository fields
 */
export function parseRepository(args: { owner: string, repository?: string }): { owner: string, repo: string } {
  // Case: Combined format in owner field (e.g., "actions/checkout")
  if (args.repository === undefined) {
    const parts = args.owner.split('/');
    if (parts.length !== 2) {
      throw new Error("Repository must be in format 'owner/repo'");
    }
    return { owner: parts[0], repo: parts[1] };
  }
  
  // Case: Separate owner and repository fields
  return { owner: args.owner, repo: args.repository };
}

/**
 * Input schema for a GitHub release
 */
export interface GitHubRelease {
  name: string;
  published_at: string;
  html_url: string;
  target_commitish: string;
  prerelease: boolean;
  draft: boolean;
  tag_name: string;
  // ... other fields that are not used in the simplified version
}

/**
 * Interface for a Git Reference object
 */
export interface GitReference {
  ref: string;
  node_id: string;
  url: string;
  object: {
    type: string;
    sha: string; // SHA for the reference (40 characters)
    url: string;
  };
}

/**
 * Simplified schema for GitHub release information
 */
export interface SimplifiedGitHubRelease {
  tag_name: string;
  name: string;
  sha: string;
  published_at: string;
  html_url: string;
  target_commitish: string;
  prerelease: boolean;
  draft: boolean;
}

/**
 * Simplifies a GitHub release object by extracting only the necessary fields
 * @param release The full GitHub release object
 * @returns A simplified version containing only the required fields
 */
export async function simplifyGitHubRelease(
  owner: string, 
  repo: string, 
  release: GitHubRelease, 
  withSHA: boolean = false
): Promise<SimplifiedGitHubRelease> {

  let sha = '';
  
  if (withSHA) {
    const tagUrl = `/repos/${owner}/${repo}/git/refs/tags/${release.tag_name}`;
    const tagResponse = await githubRequest(tagUrl) as GitReference; 
    sha = tagResponse.object.sha;
  }

  return {
    tag_name: release.tag_name,
    name: release.name || release.tag_name, // Fallback to tag_name if name is not available
    published_at: release.published_at,
    html_url: release.html_url,
    target_commitish: release.target_commitish,
    prerelease: release.prerelease,
    draft: release.draft,
    sha
  };
}

