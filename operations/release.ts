import { z } from "zod";
import { githubRequest, simplifyGitHubRelease, GitHubRelease, SimplifiedGitHubRelease, parseRepository } from "../common/utils.js";


export const GetActionReleaseSchema = z.object({
  owner: z.string().describe("Repository owner (username or organization)"),
  repository: z.string().optional().describe("The name of the repository"),
});


export async function listReleases(
  owner: string,
  repository: string
): Promise<SimplifiedGitHubRelease[]> {
  const { owner: repoOwner, repo: repoName } = parseRepository({ owner, repository });
  const url = `/repos/${repoOwner}/${repoName}/releases`;
  const releases = await githubRequest(url) as GitHubRelease[];

  // simplfiy the releases with await call
  const simplifiedReleases = await Promise.all(
    releases.map(release => simplifyGitHubRelease(repoOwner, repoName, release, false))
  );

  return simplifiedReleases
}

export async function getLatestRelease(
  owner: string,
  repository: string
): Promise<SimplifiedGitHubRelease> {
  const { owner: repoOwner, repo: repoName } = parseRepository({ owner, repository });
  const url = `/repos/${repoOwner}/${repoName}/releases/latest`;
  const release = await githubRequest(url) as GitHubRelease;
  return await simplifyGitHubRelease(repoOwner, repoName, release, true);
}

